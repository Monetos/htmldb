import { db } from '../../db/database';
import type { BodyMeasurements, BodyMetric, PhotoView, ProgressPhoto } from '../../db/schema';
import { newId } from '../../lib/id';

export interface BodyMetricInput {
  id?: string;
  date: number;
  weightKg?: number;
  bodyFatPercent?: number;
  measurements?: BodyMeasurements;
  notes?: string;
}

function pruneMeasurements(m?: BodyMeasurements): BodyMeasurements | undefined {
  if (!m) return undefined;
  const entries = Object.entries(m).filter(([, v]) => v !== undefined && v !== null && !Number.isNaN(v));
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as BodyMeasurements;
}

export async function saveBodyMetric(input: BodyMetricInput): Promise<BodyMetric> {
  const measurements = pruneMeasurements(input.measurements);
  if (input.id) {
    await db.bodyMetrics.update(input.id, {
      date: input.date,
      weightKg: input.weightKg,
      bodyFatPercent: input.bodyFatPercent,
      measurements,
      notes: input.notes?.trim() || undefined,
    });
    const updated = await db.bodyMetrics.get(input.id);
    if (!updated) throw new Error('BodyMetric konnte nicht aktualisiert werden.');
    return updated;
  }
  const row: BodyMetric = {
    id: newId(),
    date: input.date,
    weightKg: input.weightKg,
    bodyFatPercent: input.bodyFatPercent,
    measurements,
    notes: input.notes?.trim() || undefined,
  };
  await db.bodyMetrics.add(row);
  return row;
}

export async function deleteBodyMetric(id: string): Promise<void> {
  await db.bodyMetrics.delete(id);
}

export async function deletePhoto(id: string): Promise<void> {
  await db.progressPhotos.delete(id);
}

export async function savePhoto(input: {
  date: number;
  imageBlob: Blob;
  view: PhotoView;
  notes?: string;
}): Promise<ProgressPhoto> {
  const photo: ProgressPhoto = {
    id: newId(),
    date: input.date,
    imageBlob: input.imageBlob,
    view: input.view,
    notes: input.notes?.trim() || undefined,
  };
  await db.progressPhotos.add(photo);
  return photo;
}

/* ─────────────── Image compression ─────────────── */

export interface CompressOptions {
  maxDimensionPx?: number;
  /** JPEG quality between 0 and 1. Default 0.85. */
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

/**
 * Computes the resize target so the longer edge ≤ maxDimension, preserving aspect.
 * Pure function so the compression maths is testable without a real canvas.
 */
export function computeResizeTarget(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  if (Math.max(width, height) <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const ratio = maxDimension / Math.max(width, height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/**
 * Decode a file to an HTMLImageElement.
 */
export function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err instanceof Error ? err : new Error('Bild konnte nicht geladen werden.'));
    };
    img.src = url;
  });
}

/**
 * Compresses an image File into a JPEG Blob with the longer edge limited to
 * `maxDimensionPx`. Falls back to the original blob if the canvas pipeline
 * isn't available (e.g. in jsdom unit tests).
 */
export async function compressImageBlob(
  file: Blob,
  { maxDimensionPx = 1600, quality = 0.85, mimeType = 'image/jpeg' }: CompressOptions = {},
): Promise<Blob> {
  if (typeof document === 'undefined') return file;
  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    return file;
  }
  const target = computeResizeTarget(img.naturalWidth, img.naturalHeight, maxDimensionPx);
  if (target.width === 0 || target.height === 0) return file;
  const canvas = document.createElement('canvas');
  canvas.width = target.width;
  canvas.height = target.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, target.width, target.height);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (b) => resolve(b ?? file),
      mimeType,
      quality,
    );
  });
}
