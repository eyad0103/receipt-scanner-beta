"""
OCR Microservice - SmolVLM (primary) + EasyOCR (fallback)
"""

import os
import io
import re
import time
import base64
import logging
import tempfile
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum

import httpx
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OCR Microservice", version="3.0.0")

SMOLVLM_URL = os.environ.get("SMOLVLM_URL", "http://localhost:8000/scan")

class OCROption(str, Enum):
    AUTO = "auto"
    SMOLVLM = "smolvlm"
    EASYOCR = "easyocr"

@dataclass
class OCRResult:
    text: str
    confidence: float
    language: str
    engine: str
    items: List[Dict[str, Any]]
    merchant: Optional[str] = None
    total: Optional[float] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    date: Optional[str] = None
    time: Optional[str] = None
    raw_data: Optional[Dict] = None

class OCRResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    engine_used: str
    processing_time_ms: int

ARABIC_TOTAL_KEYWORDS = [
    'الإجمالي', 'المجموع', 'الاجمالي', 'المبلغ', 'الاجمالى', 'الإجمالى',
    'total', 'grand total', 'amount due', 'balance due', 'amount', 'sum',
]

ARABIC_DATE_KEYWORDS = [
    'التاريخ', 'التاربخ', 'تاريخ', 'date',
]

ARABIC_MERCHANT_EXCLUDE = [
    'total', 'subtotal', 'tax', 'vat', 'cash', 'card', 'date', 'time',
    'الإجمالي', 'المجموع', 'ضريبة', 'الضريبة', 'المبلغ', 'الدفع',
    'visa', 'master', 'change', 'balance', 'bill number', 'bill no', 'bll nubeer',
    'bill', 'order', 'order #', 'ticket', 'table', 'tisch', 'guest', 'cashier',
    'register', 'tax invoice', 'invoice', 'vat no', 'tel', 'phone', 'fax',
    'welcome', 'thank you', 'receipt', 'ref', 'st#', 'op#', 'trans#'
]

ARABIC_ITEM_EXCLUDE = [
    'total', 'subtotal', 'tax', 'vat', 'cash', 'card', 'date', 'time',
    'الإجمالي', 'المجموع', 'الضريبة', 'المبلغ', 'الدفع', 'balance',
    'change', 'visa', 'master', 'طريقة', 'نوع', 'رقم', 'الباقى',
    'bill number', 'bill no', 'bll nubeer', 'order #', 'tax invoice',
    'thank you', 'subtotal'
]

HEADER_GARBAGE_PATTERNS = [
    r'^(bill\s*(number|no|\:)|bll\s*nubeer)',
    r'^(order\s*(number|no|\:|\#))',
    r'^(ticket\s*(number|no|\:|\#))',
    r'^(table\s*(number|no|\:|\#))',
    r'^(invoice|tax\s*invoice|receipt)',
    r'^(welcome|thank\s*you)',
    r'^(cashier|register|reg\s*\#)',
    r'^(tel|phone|fax)\:?',
]

def is_valid_merchant_name(name: Optional[str]) -> bool:
    if not name or not isinstance(name, str):
        return False
    cleaned = name.strip()
    if len(cleaned) < 2 or len(cleaned) > 80:
        return False
    cleaned_lower = cleaned.lower()

    # Reject item lines with prices or quantities (e.g. "1 BEF SALAD £5)", "2 WATER 2.75")
    if re.search(r'[£$€]\s*\d+', cleaned):
        return False
    if re.search(r'\d+[.,]\d{2}', cleaned):
        return False
    if re.search(r'^\d+\s+[a-zA-Z\u0600-\u06FF]', cleaned):
        return False

    for kw in ARABIC_MERCHANT_EXCLUDE:
        if kw in cleaned_lower:
            return False
    for pat in HEADER_GARBAGE_PATTERNS:
        if re.search(pat, cleaned_lower):
            return False
    return True


def parse_receipt_text(text: str) -> Dict[str, Any]:
    """Parse VLM output (JSON or plain text) into structured receipt data."""
    text = text.strip()

    # Clean markdown codeblock wrappers if present
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    # Clean common encoding issues before parsing
    clean = text.replace('\ufffd', '').replace('??', '')
    
    # Try to find JSON object in the text
    json_start = clean.find('{')
    json_end = clean.rfind('}')
    if json_start >= 0 and json_end > json_start:
        json_str = clean[json_start:json_end + 1]
        try:
            data = json.loads(json_str)
            result = _parse_vlm_json(data)
            if result.get("items") or result.get("total") or result.get("merchant"):
                return result
        except (json.JSONDecodeError, ValueError):
            pass

    # Fall back to line-by-line text parsing
    return _parse_vlm_plaintext(text)


def _parse_vlm_json(data: Dict[str, Any]) -> Dict[str, Any]:
    """Parse SmolVLM JSON output format into canonical schema."""
    merchant = None
    total = None
    subtotal = None
    tax = None
    date = None
    time_str = None
    items: List[Dict[str, Any]] = []

    SKIP_NAMES = {'cash', 'total', 'subtotal', 'tax', 'change', 'payment', 'card', 'visa', 'master'}

    # 1. Extract Items (Standard JSON schema: "items": [...])
    raw_items = data.get("items")
    if isinstance(raw_items, list):
        for entry in raw_items:
            if isinstance(entry, dict):
                name = str(entry.get("name") or entry.get("item") or "").strip()
                if not name or name.lower() in SKIP_NAMES:
                    continue
                qty = entry.get("quantity") or entry.get("qty") or 1
                try:
                    qty = int(qty)
                except (ValueError, TypeError):
                    qty = 1
                price = entry.get("price") or entry.get("unitPrice") or entry.get("total") or 0
                try:
                    price_val = float(str(price).replace(",", "").replace("$", ""))
                    if price_val > 0:
                        items.append({
                            "name": name,
                            "quantity": qty,
                            "price": price_val,
                            "confidence": 0.95
                        })
                except (ValueError, TypeError):
                    pass

    # Format 2: Arabic/Legacy receipts - menu array with nm/price
    if not items:
        menu = data.get("menu", [])
        if isinstance(menu, list):
            for entry in menu:
                if not isinstance(entry, dict):
                    continue
                name = entry.get("nm", "").strip()
                if not name or name.lower() in SKIP_NAMES:
                    continue
                price_str = entry.get("cashprice") or entry.get("price") or "0"
                if "/" in str(price_str):
                    price_str = str(price_str).split("/")[0]
                try:
                    price_val = float(str(price_str).replace(",", "").replace("$", ""))
                    if price_val > 0:
                        items.append({"name": name, "quantity": 1, "price": price_val, "confidence": 0.9})
                except (ValueError, TypeError):
                    pass

    # Format 3: English receipts - item/price/sub/total
    if not items:
        item_name = str(data.get("item") or "").strip()
        price_str = data.get("price", "")
        sub_items = data.get("sub", [])
        if item_name and item_name.lower() not in SKIP_NAMES:
            if "/" in str(price_str):
                price_str = str(price_str).split("/")[0]
            try:
                price_val = float(str(price_str).replace(",", "").replace("$", ""))
                if price_val > 0:
                    items.append({"name": item_name, "quantity": 1, "price": price_val, "confidence": 0.9})
            except (ValueError, TypeError):
                pass
        if isinstance(sub_items, list):
            for sub in sub_items:
                if isinstance(sub, str):
                    parts = sub.rsplit(" ", 1)
                    if len(parts) == 2:
                        sub_name, sub_price = parts
                        try:
                            p = float(sub_price.replace(",", "").replace("$", ""))
                            if p > 0:
                                items.append({"name": sub_name.strip(), "quantity": 1, "price": p, "confidence": 0.8})
                        except (ValueError, TypeError):
                            pass

    # 2. Extract Total
    total_data = data.get("total")
    if isinstance(total_data, dict):
        for key in ["cashprice", "totalprice", "price", "amount", "total"]:
            val = total_data.get(key)
            if val is not None:
                try:
                    t = float(str(val).replace(",", "").replace("$", "").replace("%", ""))
                    if 0 < t < 100000:
                        total = t
                        break
                except (ValueError, TypeError):
                    pass
    elif isinstance(total_data, (str, int, float)) and total_data is not None:
        try:
            t = float(str(total_data).replace(",", "").replace("$", "").replace("%", ""))
            if 0 < t < 100000:
                total = t
        except (ValueError, TypeError):
            pass

    # Extract subtotal & tax if present
    subtotal_val = data.get("subtotal")
    if subtotal_val is not None:
        try:
            subtotal = float(str(subtotal_val).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            pass

    tax_val = data.get("tax")
    if tax_val is not None:
        try:
            tax = float(str(tax_val).replace(",", "").replace("$", ""))
        except (ValueError, TypeError):
            pass

    # 2b. Tax Sanity Check & Reconciliation
    items_sum = sum(item["price"] for item in items) if items else 0
    if subtotal is None and items_sum > 0:
        subtotal = round(items_sum, 2)

    if tax is not None:
        ref = subtotal or total or 0
        if ref > 0 and (tax >= ref or tax > ref * 0.5):
            tax = None

    if subtotal is not None:
        calc_total = round(subtotal + (tax or 0), 2)
        if total is None:
            total = calc_total
        elif abs(total - calc_total) > 50 and items_sum > 0 and abs(items_sum - total) > 50:
            total = calc_total

    # Extract Currency
    currency = data.get("currency")
    if not currency:
        raw_str = json.dumps(data)
        if "£" in raw_str or "GBP" in raw_str:
            currency = "GBP"
        elif "€" in raw_str or "EUR" in raw_str:
            currency = "EUR"
        elif re.search(r'\bEGP\b|\bL\.E\.\b|\bLE\b|جنيه', raw_str, re.I):
            currency = "EGP"
        elif re.search(r'\bSAR\b|\bSR\b|ريال', raw_str, re.I):
            currency = "SAR"
        elif re.search(r'\bAED\b|درهم', raw_str, re.I):
            currency = "AED"
        elif "$" in raw_str or "USD" in raw_str:
            currency = "USD"
        else:
            currency = "USD"

    # 3. Extract Merchant Name
    for key in ["merchant", "store", "shop", "vendor", "name"]:
        val = data.get(key)
        if val and is_valid_merchant_name(str(val)):
            merchant = str(val).strip()
            break

    # 4. Extract Date & Time
    for key in ["date", "time", "receipt_date", "datetime"]:
        val = data.get(key)
        if val:
            val_str = str(val)
            date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})|(\d{4}[/-]\d{1,2}[/-]\d{1,2})', val_str)
            if date_match and not date:
                date = date_match.group(0)
            time_match = re.search(r'(\d{1,2}:\d{2}(?::\d{2})?)', val_str)
            if time_match and not time_str:
                time_str = time_match.group(1)

    return {
        "merchant": merchant,
        "total": total,
        "subtotal": subtotal,
        "tax": tax,
        "currency": currency,
        "date": date,
        "time": time_str,
        "items": items,
        "text": json.dumps(data)
    }


def _parse_vlm_plaintext(text: str) -> Dict[str, Any]:
    """Parse plain text OCR output into structured receipt data."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    merchant = None
    total = None
    date = None
    items: List[Dict[str, Any]] = []

    for line in lines:
        ll = line.lower()

        for kw in ARABIC_TOTAL_KEYWORDS:
            if kw in ll or kw in line:
                nums = re.findall(r'[\d,]+\.?\d*', line)
                if nums:
                    try:
                        val = float(nums[-1].replace(',', ''))
                        if val > 0:
                            total = val
                    except ValueError:
                        pass
                break

        date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', line)
        if date_match and not date:
            date = date_match.group(1)

        if not merchant and is_valid_merchant_name(line):
            price_match = re.search(r'\d+[.,]\d{2}', line)
            if not price_match and not re.match(r'^[\d\s/\-:]+$', line):
                if conf_guess(line) > 0.3:
                    merchant = line

    for line in lines:
        ll = line.lower()
        skip = False
        for kw in ARABIC_ITEM_EXCLUDE:
            if kw in ll or kw in line:
                skip = True
                break
        if skip:
            continue

        price_matches = re.findall(r'(\d+[,\.]\d{2})', line)
        if price_matches:
            item_name = re.sub(r'\d+[,\.]\d{2}', '', line).strip()
            item_name = re.sub(r'\s+', ' ', item_name).strip()
            if not item_name or len(item_name) < 1:
                continue
            for pm in price_matches:
                try:
                    price_val = float(pm.replace(',', ''))
                    if price_val > 0:
                        items.append({"name": item_name, "quantity": 1, "price": price_val, "confidence": 0.8})
                        break
                except ValueError:
                    pass

    return {"merchant": merchant, "total": total, "date": date, "items": items, "text": text}


def conf_guess(text: str) -> float:
    arabic_count = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    return min(1.0, arabic_count / max(len(text), 1) + 0.3)


class SmolVLMEngine:
    """Calls the SmolVLM receipt server on port 8000."""

    def __init__(self, url: str = SMOLVLM_URL):
        self.url = url
        self._last_check = 0.0

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.get(self.url.replace("/scan", "/docs"))
                ok = r.status_code == 200
                self._last_check = time.time() if ok else 0
                return ok
        except Exception:
            self._last_check = 0
            return False

    async def process(self, image_bytes: bytes) -> OCRResult:
        async with httpx.AsyncClient(timeout=300) as client:
            files = {"file": ("receipt.jpg", image_bytes, "image/jpeg")}
            r = await client.post(self.url, files=files)
            r.raise_for_status()

        data = r.json()
        if data.get("status") != "success":
            raise ValueError(data.get("message", "SmolVLM returned error"))

        raw_text = data["result"]
        parsed = parse_receipt_text(raw_text)

        return OCRResult(
            text=raw_text,
            confidence=0.9,
            language="ar",
            engine="smolvlm_256m",
            items=parsed.get("items", []),
            merchant=parsed.get("merchant"),
            total=parsed.get("total"),
            subtotal=parsed.get("subtotal"),
            tax=parsed.get("tax"),
            date=parsed.get("date"),
            time=parsed.get("time"),
            raw_data={"raw_output": raw_text},
        )


class EasyOCREngine:
    def __init__(self):
        self.reader = None
        self._initialized = False

    def _init(self):
        if self._initialized:
            return
        import easyocr
        self.reader = easyocr.Reader(['ar', 'en'], gpu=False, verbose=False)
        self._initialized = True
        logger.info("EasyOCR initialized (ar+en, CPU)")

    def _preprocess(self, image_path: str) -> str:
        """Upscale and enhance contrast for better OCR accuracy."""
        try:
            import cv2
            img = cv2.imread(image_path)
            if img is None:
                return image_path
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Upscale 2x for better digit recognition
            h, w = gray.shape
            if max(h, w) < 2000:
                gray = cv2.resize(gray, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
            # CLAHE for adaptive contrast (helps thermal receipts)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            gray = clahe.apply(gray)
            # Light sharpening kernel
            kernel = np.array([[0, -0.5, 0], [-0.5, 3, -0.5], [0, -0.5, 0]])
            gray = cv2.filter2D(gray, -1, kernel)
            # Save preprocessed image
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix="_pp.jpg")
            cv2.imwrite(tmp.name, gray, [cv2.IMWRITE_JPEG_QUALITY, 95])
            tmp.close()
            return tmp.name
        except Exception as e:
            logger.warning(f"Preprocessing failed, using original: {e}")
            return image_path

    def process(self, image_path: str) -> OCRResult:
        self._init()
        preprocessed_path = self._preprocess(image_path)
        cleanup_preproc = preprocessed_path != image_path
        try:
            result = self.reader.readtext(preprocessed_path)
        finally:
            if cleanup_preproc:
                try:
                    os.unlink(preprocessed_path)
                except Exception:
                    pass

        if not result:
            raise ValueError("No text detected")

        texts = [r[1] for r in result]
        confidences = [r[2] for r in result]
        bboxes = [r[0] for r in result]

        full_text = "\n".join(texts)
        avg_conf = sum(confidences) / len(confidences) if confidences else 0

        parsed = self._parse_receipt(texts, confidences, bboxes)

        return OCRResult(
            text=full_text,
            confidence=avg_conf,
            language="ar",
            engine="easyocr_ar_en",
            items=parsed["items"],
            merchant=parsed["merchant"],
            total=parsed["total"],
            date=parsed["date"],
            raw_data={"lines": texts, "confidences": confidences, "bboxes": bboxes},
        )

    def _parse_receipt(self, texts, confidences, bboxes) -> Dict[str, Any]:
        merchant = None
        total = None
        date = None
        items = []

        lines_with_y = []
        for i, (bbox, text, conf) in enumerate(zip(bboxes, texts, confidences)):
            avg_y = sum(p[1] for p in bbox) / 4 if bbox else 0
            lines_with_y.append((avg_y, i, text, conf))
        lines_with_y.sort(key=lambda x: x[0])

        total_candidates = []
        for avg_y, idx, text, conf in lines_with_y:
            t = text.strip()
            t_lower = t.lower()
            if not t or len(t) < 2:
                continue
            for kw in ARABIC_TOTAL_KEYWORDS:
                if kw in t_lower or kw in t:
                    nums = re.findall(r'[\d,]+\.?\d*', t)
                    if nums:
                        try:
                            val = float(nums[-1].replace(',', ''))
                            if val > 0:
                                total_candidates.append({"value": val, "y": avg_y, "confidence": conf})
                        except ValueError:
                            pass
                    break
            date_match = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', t)
            if date_match and not date:
                date = date_match.group(1)

        if total_candidates:
            total_candidates.sort(key=lambda x: (-x["confidence"], x["y"]))
            total = total_candidates[0]["value"]

        for avg_y, idx, text, conf in lines_with_y:
            t = text.strip()
            t_lower = t.lower()
            if not t or len(t) < 3:
                continue
            skip = False
            for kw in ARABIC_MERCHANT_EXCLUDE:
                if kw in t_lower or kw in t:
                    skip = True
                    break
            if skip:
                continue
            price_match = re.search(r'[\d]+[.,]\d{2}', t)
            if price_match:
                continue
            if re.match(r'^[\d\s/\-:]+$', t):
                continue
            if conf < 0.15:
                continue
            if not merchant:
                merchant = t
                break

        for avg_y, idx, text, conf in lines_with_y:
            t = text.strip()
            if not t or len(t) < 2:
                continue
            skip = False
            for kw in ARABIC_ITEM_EXCLUDE:
                if kw in t.lower() or kw in t:
                    skip = True
                    break
            if skip:
                continue
            price_matches = re.findall(r'(\d+[,\.]\d{2})', t)
            if price_matches:
                item_name = re.sub(r'\d+[,\.]\d{2}', '', t).strip()
                item_name = re.sub(r'\s+', ' ', item_name).strip()
                if not item_name or len(item_name) < 1:
                    continue
                # Prefer the LARGEST price match to avoid partial digit reads (e.g. 3.00 vs 36.00)
                best_price = None
                for pm in price_matches:
                    try:
                        price_val = float(pm.replace(',', ''))
                        if price_val > 0.5:  # ignore noise like 0.00
                            if best_price is None or price_val > best_price:
                                best_price = price_val
                    except ValueError:
                        pass
                if best_price is not None:
                    items.append({"name": item_name, "price": best_price, "confidence": conf})

        # Sanity check: if total is known and all item prices are tiny compared to total,
        # they may all be misread (missing a leading digit). Flag low confidence.
        if total and items:
            items_sum = sum(i["price"] for i in items)
            if items_sum > 0 and total > items_sum * 3 and len(items) >= 3:
                # Prices look like they're missing a leading digit - mark low confidence
                for item in items:
                    item["confidence"] = min(item["confidence"], 0.35)
                    item["_price_warning"] = "possible_misread"

        return {"merchant": merchant, "total": total, "date": date, "items": items}


class OCRService:
    def __init__(self):
        self.smolvlm = SmolVLMEngine()
        self.easyocr = EasyOCREngine()

    async def process(
        self,
        image_bytes: bytes,
        filename: str,
        option: OCROption = OCROption.AUTO,
    ) -> OCRResponse:
        start_time = time.time()

        if option == OCROption.SMOLVLM:
            return await self._try_smolvlm(image_bytes, start_time)
        elif option == OCROption.EASYOCR:
            return await self._try_easyocr(image_bytes, start_time)

        smolvlm_ok = await self.smolvlm.health_check()
        logger.info(f"SmolVLM health: {'online' if smolvlm_ok else 'offline'}")
        if smolvlm_ok:
            resp = await self._try_smolvlm(image_bytes, start_time)
            if resp.success:
                logger.info(f"Used SmolVLM ({resp.processing_time_ms}ms)")
                return resp
            logger.warning(f"SmolVLM failed, falling back to EasyOCR: {resp.error}")

        logger.info("Using EasyOCR fallback")
        return await self._try_easyocr(image_bytes, start_time)

    async def _try_smolvlm(self, image_bytes: bytes, start_time: float) -> OCRResponse:
        try:
            result = await self.smolvlm.process(image_bytes)
            return OCRResponse(
                success=True,
                result=result.__dict__,
                engine_used="smolvlm_256m",
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            logger.warning(f"SmolVLM failed: {e}")
            elapsed = int((time.time() - start_time) * 1000)
            return OCRResponse(success=False, error=str(e), engine_used="smolvlm_256m", processing_time_ms=elapsed)

    async def _try_easyocr(self, image_bytes: bytes, start_time: float) -> OCRResponse:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        try:
            result = self.easyocr.process(tmp_path)
            return OCRResponse(
                success=True,
                result=result.__dict__,
                engine_used="easyocr_ar_en",
                processing_time_ms=int((time.time() - start_time) * 1000),
            )
        except Exception as e:
            logger.error(f"EasyOCR failed: {e}")
            elapsed = int((time.time() - start_time) * 1000)
            return OCRResponse(success=False, error=str(e), engine_used="none", processing_time_ms=elapsed)
        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


ocr_service = OCRService()


@app.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(
    file: UploadFile = File(...),
    engine: str = Form(default="auto"),
):
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(400, "File must be an image")

        image_bytes = await file.read()
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(400, "Image too large (max 20MB)")

        result = await ocr_service.process(image_bytes=image_bytes, filename=file.filename or "image.jpg")
        return JSONResponse(content=result.model_dump())

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR endpoint error: {e}")
        raise HTTPException(500, f"OCR processing failed: {str(e)}")


@app.get("/health")
async def health():
    smolvlm_ok = await ocr_service.smolvlm.health_check()
    return {
        "status": "healthy",
        "service": "ocr-microservice",
        "smolvlm": "online" if smolvlm_ok else "offline",
        "easyocr": "ready",
    }


@app.get("/engines")
async def list_engines():
    smolvlm_ok = await ocr_service.smolvlm.health_check()
    return {
        "engines": [
            {"id": "smolvlm", "name": "SmolVLM-256M Receipt (Fine-tuned)", "type": "vlm",
             "best_for": "Arabic receipts, structured extraction", "status": "online" if smolvlm_ok else "offline"},
            {"id": "easyocr", "name": "EasyOCR Arabic+English", "type": "neural",
             "best_for": "Arabic receipts, fallback", "status": "ready"},
            {"id": "auto", "name": "Auto (SmolVLM -> EasyOCR)", "type": "fallback_chain",
             "best_for": "Production use", "status": "active"},
        ]
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
