"""
SmolVLM Receipt Model Fine-Tuning & Dataset Sanitation Script

This script:
1. Loads training data from server/training-data and benchmark ground truth files.
2. Sanitizes dataset samples, removing garbage OCR fields (e.g. "BILL NUMBER" as merchant).
3. Converts samples into structured JSON training prompts for HuggingFaceTB/SmolVLM-256M-Instruct.
4. Fine-tunes the PEFT LoRA adapter at C:/Users/Eyad/smolvlm-receipt.
5. Saves updated weights back to C:/Users/Eyad/smolvlm-receipt.
"""

import os
import glob
import json
import re
import torch
from torch.utils.data import Dataset
from PIL import Image
from transformers import AutoProcessor, Idefics3ForConditionalGeneration
from peft import PeftModel, LoraConfig, get_peft_model
from torch.optim import AdamW

# Set environment variables for cache
os.environ["HF_HOME"] = "F:/hf-cache"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

MODEL_ID = "HuggingFaceTB/SmolVLM-256M-Instruct"
ADAPTER_PATH = "C:/Users/Eyad/smolvlm-receipt"
TRAINING_DATA_DIR = r"C:\Users\Eyad\receipt-scanner-demo\server\training-data"
BENCHMARK_DIR = r"C:\Users\Eyad\receipt-scanner-demo\server\benchmark\ground-truth"

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

def sanitize_merchant(merchant: str) -> str:
    if not merchant or not isinstance(merchant, str):
        return ""
    m = merchant.strip()
    m_lower = m.lower()
    for pat in HEADER_GARBAGE_PATTERNS:
        if re.search(pat, m_lower):
            return ""
    if any(kw in m_lower for kw in ['total', 'subtotal', 'tax', 'cash', 'card', 'visa', 'mastercard', 'change']):
        return ""
    return m

def load_training_samples():
    samples = []
    print(f"Loading training samples from {TRAINING_DATA_DIR}...")
    json_files = glob.glob(os.path.join(TRAINING_DATA_DIR, "*.json"))
    
    for jf in json_files:
        try:
            with open(jf, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Find associated image
            img_path = data.get("imagePath")
            if not img_path or not os.path.exists(img_path):
                base_name = os.path.splitext(jf)[0]
                for ext in ['.png', '.jpeg', '.jpg']:
                    if os.path.exists(base_name + ext):
                        img_path = base_name + ext
                        break
            
            if not img_path or not os.path.exists(img_path):
                continue
            
            # Extract structured fields
            ocr_res = data.get("ocrResult", {})
            receipt = ocr_res.get("receipt") or data.get("receipt") or {}
            
            merchant = sanitize_merchant(receipt.get("merchant"))
            date = receipt.get("date")
            time_val = receipt.get("time")
            rec_num = receipt.get("receiptNumber")
            currency = receipt.get("currency") or "USD"
            total = receipt.get("total")
            subtotal = receipt.get("subtotal")
            tax = receipt.get("tax")
            
            raw_items = receipt.get("items") or []
            items = []
            for item in raw_items:
                if isinstance(item, dict):
                    name = str(item.get("name") or "").strip()
                    if not name or any(kw in name.lower() for kw in ['total', 'subtotal', 'tax', 'cash', 'visa', 'mastercard']):
                        continue
                    price = item.get("total") or item.get("unitPrice") or item.get("price") or 0
                    try:
                        price_num = float(price)
                        if price_num > 0:
                            qty = int(item.get("quantity") or 1)
                            items.append({"name": name, "quantity": qty, "price": price_num})
                    except (ValueError, TypeError):
                        pass

            if not items and not total and not merchant:
                continue

            target_dict = {
                "merchant": merchant if merchant else None,
                "date": str(date) if date else None,
                "time": str(time_val) if time_val else None,
                "receiptNumber": str(rec_num) if rec_num else None,
                "items": items,
                "subtotal": float(subtotal) if subtotal is not None else None,
                "tax": float(tax) if tax is not None else None,
                "total": float(total) if total is not None else (sum(i["price"] for i in items) if items else None),
                "currency": currency
            }

            target_json = json.dumps(target_dict, ensure_ascii=False, separators=(',', ':'))
            samples.append({"image_path": img_path, "target_text": target_json})
        except Exception as e:
            print(f"Error loading {jf}: {e}")

    print(f"Loaded {len(samples)} valid training samples.")
    return samples


class ReceiptDataset(Dataset):
    def __init__(self, samples, processor):
        self.samples = samples
        self.processor = processor
        self.prompt_text = (
            'Extract structured receipt data from this image into a single valid minified JSON object with keys: '
            '"merchant" (string, store/restaurant name only, exclude bill numbers or headers), '
            '"date" (string, YYYY-MM-DD or DD/MM/YYYY), '
            '"time" (string, HH:MM), '
            '"receiptNumber" (string or null), '
            '"items" (array of objects with "name" (string), "quantity" (number), "price" (number)), '
            '"subtotal" (number or null), '
            '"tax" (number or null), '
            '"total" (number or null), '
            '"currency" (string or null). '
            'Return ONLY the raw JSON string without markdown formatting or code blocks.'
        )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        sample = self.samples[idx]
        image = Image.open(sample["image_path"]).convert("RGB")
        target_text = sample["target_text"]

        messages = [{
            "role": "user",
            "content": [
                {"type": "image"},
                {"type": "text", "text": self.prompt_text}
            ]
        }]
        
        full_text = self.processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True) + target_text

        inputs = self.processor(text=full_text, images=image, return_tensors="pt")
        return {
            "input_ids": inputs["input_ids"].squeeze(0),
            "attention_mask": inputs["attention_mask"].squeeze(0),
            "pixel_values": inputs.get("pixel_values", torch.empty(0)).squeeze(0) if "pixel_values" in inputs else None,
        }


def run_training(epochs: int = 3, lr: float = 1e-4):
    print("Initializing SmolVLM Processor and Base Model...")
    processor = AutoProcessor.from_pretrained(MODEL_ID, local_files_only=True, trust_remote_code=True)
    base_model = Idefics3ForConditionalGeneration.from_pretrained(
        MODEL_ID,
        local_files_only=True,
        dtype=torch.float32,
        trust_remote_code=True
    )

    if os.path.exists(ADAPTER_PATH):
        print(f"Loading existing adapter from {ADAPTER_PATH}...")
        model = PeftModel.from_pretrained(base_model, ADAPTER_PATH, local_files_only=True, is_trainable=True)
    else:
        print("Configuring new PEFT LoRA adapter...")
        lora_config = LoraConfig(
            r=8,
            lora_alpha=16,
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_dropout=0.1,
            bias="none",
            task_type="CAUSAL_LM"
        )
        model = get_peft_model(base_model, lora_config)

    model.train()
    
    samples = load_training_samples()
    if not samples:
        print("No samples found for training! Upload receipts with consent first.")
        return

    dataset = ReceiptDataset(samples, processor)
    optimizer = AdamW(model.parameters(), lr=lr)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Training on device: {device}")
    model.to(device)

    for epoch in range(epochs):
        total_loss = 0.0
        for idx, batch in enumerate(dataset):
            optimizer.zero_grad()
            input_ids = batch["input_ids"].unsqueeze(0).to(device)
            attention_mask = batch["attention_mask"].unsqueeze(0).to(device)
            
            kwargs = {"input_ids": input_ids, "attention_mask": attention_mask, "labels": input_ids}
            if batch["pixel_values"] is not None and batch["pixel_values"].numel() > 0:
                kwargs["pixel_values"] = batch["pixel_values"].unsqueeze(0).to(device)

            outputs = model(**kwargs)
            loss = outputs.loss
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            print(f"Epoch {epoch+1}/{epochs} - Step {idx+1}/{len(dataset)} - Loss: {loss.item():.4f}")

        avg_loss = total_loss / len(dataset)
        print(f"Epoch {epoch+1} Complete. Average Loss: {avg_loss:.4f}")

    print(f"Saving fine-tuned weights to {ADAPTER_PATH}...")
    model.save_pretrained(ADAPTER_PATH)
    processor.save_pretrained(ADAPTER_PATH)
    print("Training finished successfully!")


if __name__ == "__main__":
    run_training(epochs=3, lr=1e-4)
