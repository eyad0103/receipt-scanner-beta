import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { log } from '../logging/index.js';

const TRAINING_DIR = join(process.cwd(), 'training-data');

async function ensureTrainingDir() {
  try {
    await mkdir(TRAINING_DIR, { recursive: true });
  } catch {
  }
}

export interface TrainingImageMeta {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  imagePath: string;
  metadataPath: string;
  ocrResult?: any;
  consentVersion: string;
}

export async function saveTrainingImage(
  file: Express.Multer.File,
  ocrResult?: any
): Promise<TrainingImageMeta> {
  await ensureTrainingDir();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
  const filename = `${id}.${ext}`;
  const imagePath = join(TRAINING_DIR, filename);
  const metadataPath = join(TRAINING_DIR, `${id}.json`);

  await writeFile(imagePath, file.buffer);

  const meta: TrainingImageMeta = {
    id,
    filename,
    originalName: file.originalname,
    uploadedAt: new Date().toISOString(),
    imagePath,
    metadataPath,
    ocrResult,
    consentVersion: '1.0',
  };

  await writeFile(metadataPath, JSON.stringify(meta, null, 2));

  log.info('Training image saved', { id, filename: file.originalname, size: file.size });
  return meta;
}

export async function getTrainingImages(): Promise<TrainingImageMeta[]> {
  const fs = await import('fs/promises');
  try {
    const files = await fs.readdir(TRAINING_DIR);
    const metas: TrainingImageMeta[] = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readFile(join(TRAINING_DIR, file), 'utf-8');
          metas.push(JSON.parse(content));
        } catch {
        }
      }
    }
    return metas.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } catch {
    return [];
  }
}

export async function getTrainingImage(id: string): Promise<TrainingImageMeta | null> {
  const metas = await getTrainingImages();
  return metas.find(m => m.id === id) || null;
}

export async function deleteTrainingImage(id: string): Promise<boolean> {
  const fs = await import('fs/promises');
  const meta = await getTrainingImage(id);
  if (!meta) return false;
  try {
    await fs.unlink(meta.imagePath);
    await fs.unlink(meta.metadataPath);
    return true;
  } catch {
    return false;
  }
}