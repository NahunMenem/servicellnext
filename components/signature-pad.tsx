"use client";

import { useRef, useState } from "react";

export function SignaturePad({ nroOrden }: { nroOrden: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#0f172a";
    return context;
  }

  function getPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const firma = canvas.toDataURL("image/png");
    const response = await fetch("/api/guardar-firma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nroOrden, firma })
    });

    const data = (await response.json()) as { message: string };
    setMessage(data.message);
  }

  return (
    <div className="stack">
      <canvas
        ref={canvasRef}
        className="signature-pad"
        width={800}
        height={220}
        onPointerDown={(event) => {
          const context = getContext();
          if (!context) return;
          const position = getPosition(event);
          context.beginPath();
          context.moveTo(position.x, position.y);
          setDrawing(true);
        }}
        onPointerMove={(event) => {
          if (!drawing) return;
          const context = getContext();
          if (!context) return;
          const position = getPosition(event);
          context.lineTo(position.x, position.y);
          context.stroke();
        }}
        onPointerUp={() => setDrawing(false)}
        onPointerLeave={() => setDrawing(false)}
      />

      <div className="actions">
        <button
          className="button secondary"
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const context = canvas.getContext("2d");
            if (!context) return;
            context.clearRect(0, 0, canvas.width, canvas.height);
            setMessage(null);
          }}
        >
          Limpiar
        </button>
        <button className="button" type="button" onClick={save}>
          Guardar firma
        </button>
      </div>
      {message ? <div className="notice">{message}</div> : null}
    </div>
  );
}
