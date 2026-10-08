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
  program_name?: string;
  advisor_name?: string;
  juror_names?: string[];
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

const cleanTitle = (value: string) => clean(value)
  .replace(/^["“”'«»\s]+|["“”'«»\s]+$/g, '')
  .replace(/\s+([,.;:])/g, '$1')
  .trim();

const cleanResolutionNumber = (value: string) => value
  .replace(/\s*[-–—]\s*/g, '-')
  .replace(/\s+/g, '')
  .toUpperCase();

const toIsoDate = (value: string): string | undefined => {
  const numeric = value.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;
  const textual = value.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de|del)\s+(\d{4})\b/i);
  if (!textual) return undefined;
  const month = months[textual[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()];
  return month ? `${textual[3]}-${month}-${textual[1].padStart(2, '0')}` : undefined;
};

const dateIn = (text: string): string | undefined => {
  const match = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b|\b\d{1,2}\s+de\s+[a-záéíóú]+\s+(?:de|del)\s+\d{4}\b/i);
  return match ? toIsoDate(match[0]) : undefined;
};

const parseTime = (text: string): string | undefined => {
  const match = text.match(/\b(\d{1,2})[:.](\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?|horas?)?/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  const meridiem = match[3]?.replace(/\s/g, '').toLowerCase();
  if (meridiem?.startsWith('p') && hour < 12) hour += 12;
  if (meridiem?.startsWith('a') && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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

const titleStopPattern = String.raw`(?:para\s+optar|para\s+obtener|autor(?:a|es)?|bachiller(?:es)?|tesista(?:s)?|asesor(?:a|es)?|jurado|art[ií]culo|se\s+resuelve|Iquitos\s*,|$)`;

const thesisTitle = (text: string): string | undefined => {
  // A resolution commonly wraps the thesis title over several OCR lines. Capture
  // everything after the label until a known administrative field begins.
  const labelled = text.match(new RegExp(
    String.raw`(?:tesis\s+)?denominada\s*:?\s*["“']?([\s\S]{5,900}?)(?=["”»]|\n\s*${titleStopPattern})`,
    'i',
  ));
  const extracted = labelled?.[1] && cleanTitle(labelled[1]);
  if (extracted && extracted.length >= 5) return extracted;

  return lineAfter(text, [
    'tesis denominada', 'denominada', 'título de la investigación', 'titulo de la investigacion',
    'título de tesis', 'titulo de tesis', 'título de la tesis', 'titulo de la tesis',
    'tema de tesis', 'tema de la tesis', 'título', 'titulo', 'tema', 'tesis',
  ]);
};

const officeNumber = (text: string): string | undefined => {
  // The requested field is specifically the code after "Que, mediante OFICIO".
  // Ignore resolution numbers and unrelated office references elsewhere.
  const marker = /que\s*[,;:]?\s*mediante\s+oficio\b/i;
  const start = text.search(marker);
  if (start < 0) return undefined;
  const markerText = text.slice(start).match(marker)?.[0];
  if (!markerText) return undefined;
  const tail = text.slice(start + markerText.length, start + markerText.length + 240);
  // Tolerate N°, Nº, No, Ne and line breaks. A 3+ digit prefix avoids dates.
  const code = tail.match(/(?:n\s*(?:[°ºo.]|e)?\s*)?[:#\-]?\s*(\d{3,}(?:\s*[-/]\s*[a-z0-9]+){1,6})/i);
  return code?.[1] ? cleanResolutionNumber(code[1]) : undefined;
};

const advisorName = (text: string): string | undefined => {
  const match = text.match(/teniendo\s+como\s+asesor(?:a)?\s+(?:al|a\s+la|a)\s+([^\n,;]+)/i);
  const value = match?.[1]?.replace(/\s+(?:y\s+)?(?:a\s+los\s+miembros|al\s+jurado|como\s+coasesor).*$/i, '').trim();
  return value ? clean(value.replace(/[.:;]+$/, '')) : undefined;
};

const postgraduateProgram = (text: string): string | undefined => {
  const match = text.match(/egresad[oa]\s+(?:del|de\s+la|de|el)\s+programa\s+(?:de\s+)?([\s\S]{3,260}?)(?=,|;|\.|\s+(?:para\s+optar|con\s+(?:la\s+)?tesis|con\s+el\s+proyecto|teniendo\s+como\s+asesor|a\s+los\s+miembros|conducente\s+al|quien)\b|$)/i);
  const value = match?.[1] && clean(match[1].replace(/[.:;]+$/, ''));
  return value && value.length > 2 ? value : undefined;
};

const jurorNames = (text: string): string[] => {
  const marker = /a\s+los\s+miembros\s+del\s+jurado\s+evaluador\s+y\s+dictaminador\s+conformado\s+por\s+los\s+siguientes\s+profesionales\s*:/i;
  const start = text.search(marker);
  if (start < 0) return [];
  const listStart = start + text.slice(start).match(marker)![0].length;
  const section = text.slice(listStart, listStart + 1400).replace(/\s+/g, ' ').trim();
  // A period inside common professional abbreviations (Dr., Mg., M.Sc.) is
  // not the end of the list; the first other period is.
  const abbreviation = /(?:dr|dra|mg|mtra|mtro|ing|lic|m|m\.sc|msc|ph\.d|phd)$/i;
  let end = section.length;
  for (let index = 0; index < section.length; index += 1) {
    if (section[index] !== '.') continue;
    const prefix = section.slice(0, index).trimEnd();
    const word = prefix.match(/[a-z.]+$/i)?.[0] || '';
    if (!abbreviation.test(word)) { end = index; break; }
  }
  return section.slice(0, end).split(',').map((name) => clean(name.replace(/^(?:y|e)\s+/i, '').replace(/^[\s:;\-]+|[\s:;\-]+$/g, ''))).filter((name) => name.length > 3);
};

export const parseActaText = (text: string): ExtractedDefenseFields => {
  const normalized = text.replace(/\u00a0/g, ' ');
  const title = thesisTitle(normalized);
  const extractedOfficeNumber = officeNumber(normalized);
  const normalizedWhitespace = normalized.replace(/[\r\n]+/g, ' ');
  const eventMarker = /acto[\s,;:.\-]*acad[eé]mico[\s,;:.\-]+que[\s,;:.\-]*se[\s,;:.\-]*realizar[aá][\s,;:.\-]*(?:el[\s,;:.\-]*)?d[ií]a[\s,;:.\-]*(?:la[\s,;:.\-]*)?hora[\s,;:.\-]*y[\s,;:.\-]*(?:el[\s,;:.\-]*)?lugar[\s,;:.\-]*que[\s,;:.\-]*se[\s,;:.\-]*indica\s*:?/i;
  const eventStart = normalizedWhitespace.search(eventMarker);
  const markerText = eventStart >= 0 ? normalizedWhitespace.slice(eventStart).match(eventMarker)?.[0] : undefined;
  const eventDetails = eventStart >= 0 && markerText
    ? normalizedWhitespace.slice(eventStart + markerText.length, eventStart + markerText.length + 1200)
    : '';
  // Do not use dates or times from headers or other paragraphs as a fallback.
  const date = eventDetails ? dateIn(eventDetails) : undefined;
  const modality = /\bvirtual\b/i.test(normalized) ? 'VIRTUAL' : /\bpresencial\b/i.test(normalized) ? 'PRESENTIAL' : undefined;
  return {
    title: title && title.length > 4 ? title : undefined,
    office_number: extractedOfficeNumber,
    scheduled_date: date,
    start_time: eventDetails ? parseTime(eventDetails) : undefined,
    modality,
    program_name: postgraduateProgram(normalizedWhitespace),
    advisor_name: advisorName(normalizedWhitespace),
    juror_names: jurorNames(normalizedWhitespace),
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
