import React, { useRef, useState } from 'react';
import { FileText, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { extractActaFields, ExtractedDefenseFields } from '../../services/acta-ocr.service';

type Props = { onApply: (fields: ExtractedDefenseFields) => void };

export const ActaOcrUploader: React.FC<Props> = ({ onApply }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<{ fields: ExtractedDefenseFields; text: string; pages: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file?: File) => {
    if (!file) return;
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Selecciona un PDF o una imagen PNG, JPG o WEBP.');
      return;
    }
    setFileName(file.name);
    setResult(null);
    setError(null);
    setProgress(0);
    setIsProcessing(true);
    try {
      setResult(await extractActaFields(file, setProgress));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo procesar el acta.');
    } finally { setIsProcessing(false); }
  };

  const detected = result ? Object.values(result.fields).filter(Boolean).length : 0;

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="border-b border-slate-100 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-900"><FileText className="h-4 w-4 text-unap-navy" /> Cargar acta y completar datos</CardTitle>
        <CardDescription>El OCR se procesa en este navegador. Revisa los campos detectados antes de aplicarlos al formulario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => processFile(event.target.files?.[0])} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isProcessing} className="gap-2"><Upload className="h-4 w-4" /> Seleccionar acta</Button>
          {fileName && <span className="max-w-full truncate text-xs text-slate-600">{fileName}</span>}
        </div>
        {isProcessing && <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"><div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Analizando documento… {progress}%</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div></div>}
        {error && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
        {result && <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-emerald-900">{detected ? `${detected} campos detectados` : 'No se detectaron campos con seguridad'} · {result.pages} página(s)</p><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div><span className="font-semibold text-slate-500">Título</span><p className="text-slate-900">{result.fields.title || 'No detectado'}</p></div>
            <div><span className="font-semibold text-slate-500">Oficio / documento</span><p className="text-slate-900">{result.fields.office_number || 'No detectado'}</p></div>
            <div><span className="font-semibold text-slate-500">Fecha</span><p className="text-slate-900">{result.fields.scheduled_date || 'No detectada'}</p></div>
            <div><span className="font-semibold text-slate-500">Hora</span><p className="text-slate-900">{result.fields.start_time || 'No detectada'}</p></div>
          </div>
          <Button type="button" onClick={() => onApply(result.fields)} disabled={!detected} className="w-full sm:w-auto">Aplicar campos detectados</Button>
          <details className="rounded-md border border-emerald-100 bg-white/70 p-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">Ver texto reconocido</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans">{result.text || 'El OCR no devolvió texto.'}</pre>
          </details>
        </div>}
      </CardContent>
    </Card>
  );
};
