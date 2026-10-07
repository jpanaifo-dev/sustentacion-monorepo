import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export type ExtractedDefenseFields = {
  title?: string;
  office_number?: string;
  scheduled_date?: string;
  start_time?: string;
  modality?: 'PRESENTIAL' | 'VIRTUAL';
};

export type ActaOcrResult = {
  fields: ExtractedDefenseFields;
  text: string;
  pages: number;
};

const months: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10',
  noviembre: '11', diciembre: '12',
};

const clean = (value: string) => value.replace(/\s+/g, ' ').replace(/[|]+/g, '').trim();

const toIsoDate = (value: string): string | undefined => {
  const numeric = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;
  const textual = value.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})\b/i);
  if (!textual) return undefined;
  const month = months[textual[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()];
  return month ? `${textual[3]}-${month}-${textual[1].padStart(2, '0')}` : undefined;
};

const parseTime = (text: string): string | undefined => {
  const match = text.match(/\b(\d{1,2})[:.](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)?/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = match[2];
  const meridiem = match[3]?.replace(/\s/g, '').toLowerCase();
  if (meridiem?.startsWith('p') && hour < 12) hour += 12;
  if (meridiem?.startsWith('a') && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
};

const lineAfter = (text: string, labels: string[]) => {
  const lines = text.split(/\r?\n/).map(clean).filter(Boolean);
  const label = labels.join('|');
  const labelPattern = new RegExp(`^(?:${label})\\s*(?:[:\\-]|$)`, 'i');
  for (let index = 0; index < lines.length; index += 1) {
    if (!labelPattern.test(lines[index])) continue;
    const inline = clean(lines[index].replace(labelPattern, ''));
    if (inline.length > 4) return inline;
    const next = lines.slice(index + 1, index + 3).find((line) => line.length > 4 && !/^(?:fecha|hora|modalidad|oficio|documento)\b/i.test(line));
    if (next) return next;
  }
  return undefined;
};

export const parseActaText = (text: string): ExtractedDefenseFields => {
  const normalized = text.replace(/\u00a0/g, ' ');
  const title = lineAfter(normalized, [
    'título de la investigación', 'titulo de la investigacion', 'título de tesis', 'titulo de tesis',
    'título de la tesis', 'titulo de la tesis', 'tema de tesis', 'tema de la tesis', 'título', 'titulo', 'tema', 'tesis',
  ]);
  const officeMatch = normalized.match(/(?:n(?:úmero|umero)?\s+de\s+)?(?:oficio|documento|acta)\s*(?:n[.°º]?\s*)?[:\-#]?\s*([A-Z0-9][A-Z0-9./-]{4,})/i);
  const dateMatch = normalized.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b|\b\d{1,2}\s+de\s+[a-záéíóú]+\s+de\s+\d{4}\b/i);
  const date = dateMatch ? toIsoDate(dateMatch[0]) : undefined;
  const modality = /\bvirtual\b/i.test(normalized) ? 'VIRTUAL' : /\bpresencial\b/i.test(normalized) ? 'PRESENTIAL' : undefined;
  return {
    title: title && title.length > 4 ? title : undefined,
    office_number: officeMatch?.[1]?.trim(),
    scheduled_date: date,
    start_time: parseTime(normalized),
    modality,
  };
};

const fileToCanvas = async (file: File): Promise<HTMLCanvasElement[]> => {
  if (file.type !== 'application/pdf') {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('No se pudo leer la imagen.')); });
      const canvas = document.createElement('canvas');
      const scale = Math.min(2, 1800 / image.width);
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      return [canvas];
    } finally { URL.revokeObjectURL(url); }
  }

  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: HTMLCanvasElement[] = [];
  for (let index = 1; index <= Math.min(pdf.numPages, 10); index += 1) {
    const page = await pdf.getPage(index);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
    pages.push(canvas);
  }
  return pages;
};

export const extractActaFields = async (file: File, onProgress?: (value: number) => void): Promise<ActaOcrResult> => {
  const pages = await fileToCanvas(file);
  const worker = await createWorker('spa', 1, { logger: (message) => onProgress?.(Math.round(message.progress * 100)) });
  try {
    const chunks: string[] = [];
    for (const page of pages) {
      const result = await worker.recognize(page);
      chunks.push(result.data.text);
    }
    const text = chunks.join('\n');
    return { fields: parseActaText(text), text, pages: pages.length };
  } finally {
    await worker.terminate();
  }
};
