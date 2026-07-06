import { useEffect, useRef, useState } from 'react';
import { Loader2, ScanBarcode, X } from 'lucide-react';
import type { Food } from '../../db/schema';
import { Button } from '../../components/Button';
import { saveFood } from './nutritionLib';
import { BarcodeLookupError, lookupBarcode, type BarcodeProduct } from './openFoodFacts';

// BarcodeDetector is not yet in TypeScript's DOM lib.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

function getBarcodeDetector(): BarcodeDetectorCtor | null {
  const w = globalThis as { BarcodeDetector?: BarcodeDetectorCtor };
  return w.BarcodeDetector ?? null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the saved Food after the user confirms the OFF result. */
  onFoodReady: (food: Food) => void;
}

type Phase = 'scanning' | 'looking_up' | 'result' | 'not_found';

export function BarcodeScannerModal({ open, onClose, onFoodReady }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>('scanning');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [lastCode, setLastCode] = useState('');

  // Camera + detection loop.
  useEffect(() => {
    if (!open || phase !== 'scanning') return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const Detector = getBarcodeDetector();
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Kamera nicht verfügbar — nutze die manuelle Eingabe unten.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        if (!Detector) {
          setCameraError(
            'Dieser Browser hat keinen eingebauten Barcode-Erkenner — nutze die manuelle Eingabe unten.',
          );
          return;
        }
        const detector = new Detector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
        interval = setInterval(async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          try {
            const codes = await detector.detect(video);
            const code = codes[0]?.rawValue?.replace(/\D/g, '');
            if (code && code.length >= 8) {
              if (interval) clearInterval(interval);
              void handleCode(code);
            }
          } catch {
            // detection errors on single frames are expected — keep polling
          }
        }, 350);
      } catch {
        if (!cancelled) {
          setCameraError('Kamera-Zugriff verweigert — nutze die manuelle Eingabe unten.');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, phase]);

  useEffect(() => {
    if (!open) {
      setPhase('scanning');
      setError(null);
      setCameraError(null);
      setManualCode('');
      setProduct(null);
      setLastCode('');
    }
  }, [open]);

  const handleCode = async (code: string) => {
    setError(null);
    setLastCode(code);
    setPhase('looking_up');
    try {
      const result = await lookupBarcode(code);
      if (!result) {
        setPhase('not_found');
        return;
      }
      setProduct(result);
      setPhase('result');
    } catch (err) {
      setError(
        err instanceof BarcodeLookupError ? err.message : `Fehler: ${(err as Error).message}`,
      );
      setPhase('scanning');
    }
  };

  const confirm = async () => {
    if (!product) return;
    const food = await saveFood({
      name: product.name,
      brand: product.brand,
      per100g: product.per100g,
    });
    onFoodReady(food);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scannen"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-slate-900 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <ScanBarcode className="h-5 w-5" /> Barcode scannen
          </h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {phase === 'scanning' ? (
          <>
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-xl border-2 border-white/70" />
            </div>
            {cameraError ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{cameraError}</p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                Halte den Strichcode in den Rahmen. Benötigt Internet für die Produktsuche.
              </p>
            )}
            {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const code = manualCode.replace(/\D/g, '');
                if (code.length >= 8) void handleCode(code);
              }}
            >
              <input
                inputMode="numeric"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Barcode manuell eingeben…"
                aria-label="Barcode manuell eingeben"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
              />
              <Button type="submit" variant="secondary" disabled={manualCode.replace(/\D/g, '').length < 8}>
                Suchen
              </Button>
            </form>
          </>
        ) : null}

        {phase === 'looking_up' ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            Suche {lastCode} in Open Food Facts…
          </div>
        ) : null}

        {phase === 'not_found' ? (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Produkt {lastCode} ist nicht in der Datenbank. Du kannst es manuell anlegen oder die
              KI-Schätzung nutzen.
            </p>
            <Button variant="secondary" onClick={() => setPhase('scanning')}>
              Nochmal scannen
            </Button>
          </div>
        ) : null}

        {phase === 'result' && product ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="font-medium">{product.name}</div>
              {product.brand ? (
                <div className="text-xs text-slate-500">{product.brand}</div>
              ) : null}
              <div className="mt-2 grid grid-cols-4 gap-2 text-center text-sm tabular-nums">
                <Cell label="kcal" value={Math.round(product.per100g.kcal)} />
                <Cell label="P" value={Math.round(product.per100g.protein * 10) / 10} />
                <Cell label="KH" value={Math.round(product.per100g.carbs * 10) / 10} />
                <Cell label="F" value={Math.round(product.per100g.fat * 10) / 10} />
              </div>
              <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">
                pro 100 g · Quelle: Open Food Facts
              </p>
              {!product.complete ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  ⚠ Unvollständige Nährwerte in der Datenbank — bitte nach dem Anlegen prüfen.
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setPhase('scanning')}>
                Nochmal
              </Button>
              <Button className="flex-1" onClick={confirm}>
                Übernehmen &amp; Menge wählen
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
