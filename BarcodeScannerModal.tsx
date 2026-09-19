import { useEffect, useRef, useState } from 'react';

// The Web BarcodeDetector API ships in Chromium-based browsers (desktop
// Chrome/Edge, Chrome for Android) but not Safari or Firefox as of writing.
// This feature-detects and falls back to a clear message rather than a
// silent failure — worth confirming on the actual devices staff will use.
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function BarcodeScannerModal({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  // onDetected (and onClose) are inline functions from the parent, so they
  // get a new identity on every parent re-render — which happens often
  // (toasts appearing/expiring, any unrelated state change). Reading them
  // through a ref means the camera-setup effect below never needs to treat
  // a fresh function reference as a reason to tear down and restart the
  // camera stream mid-scan.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    let stopped = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        const detector = new window.BarcodeDetector!({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });

        intervalId = setInterval(async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const results = await detector.detect(videoRef.current);
            if (results.length > 0 && !stopped) {
              // Stop polling the instant something's found, so a barcode
              // still in frame doesn't fire this several more times before
              // the parent has a chance to close the modal.
              stopped = true;
              if (intervalId) clearInterval(intervalId);
              onDetectedRef.current(results[0].rawValue);
            }
          } catch {
            // transient decode errors are normal mid-scan — ignore and keep trying
          }
        }, 300);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't access the camera — check that this site has camera permission.");
      });

    return () => {
      cancelled = true;
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // Deliberately only depends on `supported` — see the ref note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white border border-violet-100 dark:bg-neutral-900 dark:border-violet-900/40 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Scan Barcode</h3>

        {!supported && (
          <div className="bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 rounded-xl p-4 text-amber-700 dark:text-amber-400 text-sm">
            Barcode scanning isn't supported in this browser. Try Chrome on Android, or search for the item by name
            instead.
          </div>
        )}

        {supported && error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {supported && !error && (
          <div className="rounded-xl overflow-hidden bg-black aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white font-medium rounded-xl transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
