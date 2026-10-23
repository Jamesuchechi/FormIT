import { useEffect, useRef, useState } from "react";
import type { FieldInputProps } from "./types.ts";

export function SignatureInput({ field, value, onChange, ctl }: FieldInputProps<"signature">) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));
  const penColor = field.penColor || "#0f172a";

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Restore existing signature from value (data URL) if present
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (typeof value === "string" && value.startsWith("data:image/")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = value;
    }
  }, []);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    const { x, y } = getCoordinates(e);

    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // In case pointer wasn't captured
    }

    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <div
        className="relative w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden shadow-xs"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          id={ctl.id}
          width={600}
          height={160}
          aria-describedby={ctl.describedBy}
          aria-invalid={ctl.invalid}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="w-full h-40 cursor-crosshair block"
        />

        {/* Guideline across bottom */}
        <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-dashed border-neutral-300 dark:border-neutral-600 flex justify-end">
          <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 pb-1">
            Sign here
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>Use your finger, stylus, or mouse to sign.</span>
        {hasDrawn && (
          <button
            type="button"
            onClick={handleClear}
            className="text-red-600 hover:text-red-700 dark:text-red-400 font-medium hover:underline cursor-pointer"
          >
            Clear signature
          </button>
        )}
      </div>
    </div>
  );
}
