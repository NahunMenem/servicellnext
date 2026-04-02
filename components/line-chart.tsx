"use client";

import { Expand, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Point = {
  label: string;
  value: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

export function LineChart({
  points,
  tone = "primary",
  highlightedLabels = {},
  highlightTone = "holiday",
  minGuideExcludeLabels = [],
  title,
  subtitle
}: {
  points: Point[];
  tone?: "primary" | "warm";
  highlightedLabels?: Record<string, string[]>;
  highlightTone?: "holiday";
  minGuideExcludeLabels?: string[];
  title?: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!points.length) {
    return <div className="cart-empty">No hay datos para mostrar.</div>;
  }

  const width = 640;
  const height = 220;
  const padding = 18;
  const max = Math.max(...points.map((point) => point.value), 1);
  const minCandidates = points.filter((point) => !minGuideExcludeLabels.includes(point.label));
  const min = Math.min(...(minCandidates.length ? minCandidates : points).map((point) => point.value));
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const chartPoints = points.map((point, index) => {
    const x = padding + index * stepX;
    const y = height - padding - (point.value / max) * (height - padding * 2);
    return {
      ...point,
      x,
      y,
      isMin: point.value === min && !minGuideExcludeLabels.includes(point.label)
    };
  });
  const minY = chartPoints.find((point) => point.isMin)?.y ?? height - padding;

  const path = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${path} L ${chartPoints.at(-1)?.x ?? padding} ${height - padding} L ${
    chartPoints[0]?.x ?? padding
  } ${height - padding} Z`;

  function renderChart(expanded = false) {
    return (
      <div className={`line-chart line-chart-${tone} ${expanded ? "line-chart-expanded" : ""}`}>
        <div className="line-chart-frame">
          <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" role="img">
            <line
              x1={padding}
              x2={width - padding}
              y1={minY}
              y2={minY}
              className="line-chart-min-guide"
            />
            <path d={areaPath} className="line-chart-area" />
            <path d={path} className="line-chart-path" />
            {chartPoints.map((point) => {
              const holidayNames = highlightedLabels[point.label];
              const isHighlighted = Boolean(holidayNames?.length);
              return (
                <g key={point.label}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={point.isMin ? "6" : isHighlighted ? "6" : "4.5"}
                    className={`line-chart-dot ${point.isMin ? "line-chart-dot-min" : ""} ${isHighlighted ? `line-chart-dot-${highlightTone}` : ""}`}
                  />
                  <title>
                    {isHighlighted
                      ? `${point.label}: ${formatMoney(point.value)} · Semana con feriado: ${holidayNames?.join(", ")}`
                      : `${point.label}: ${formatMoney(point.value)}`}
                  </title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`line-chart-shell ${open ? "is-open" : ""}`}>
      <button className="line-chart-expand" type="button" onClick={() => setOpen(true)}>
        <Expand size={16} strokeWidth={2} />
        Ver mas grande
      </button>
      <button
        aria-label={title ? `Ampliar grafico ${title}` : "Ampliar grafico"}
        className="line-chart-hitbox"
        type="button"
        onClick={() => setOpen(true)}
      >
        {renderChart()}
      </button>

      {mounted && open
        ? createPortal(
            <div className="modal-backdrop" onClick={() => setOpen(false)}>
              <div
                aria-labelledby={titleId}
                aria-modal="true"
                className="modal-panel modal-panel-wide card"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-head">
                  <div>
                    <h2 id={titleId}>{title ?? "Grafico ampliado"}</h2>
                    <p className="muted">
                      {subtitle ?? "Vista ampliada para revisar mejor el comportamiento del periodo."}
                    </p>
                  </div>
                  <button className="button secondary" type="button" onClick={() => setOpen(false)}>
                    <X size={16} strokeWidth={2} />
                    Cerrar
                  </button>
                </div>
                {renderChart(true)}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
