"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { LoaderCircle, RefreshCcw, Send, Stethoscope, UserRoundSearch } from "lucide-react";
import type { ConsultaOption, MedicoOption } from "@/lib/monitoreo";

type SearchResponse<T> = {
  items: T[];
  error?: string;
};

function OptionList<T extends { id: string; label: string }>({
  emptyText,
  items,
  loading,
  onSelect,
  selectedId
}: {
  emptyText: string;
  items: T[];
  loading: boolean;
  onSelect: (id: string) => void;
  selectedId: string;
}) {
  if (loading) {
    return (
      <div className="assignment-empty">
        <LoaderCircle className="assignment-spin" size={16} strokeWidth={2} />
        Cargando resultados...
      </div>
    );
  }

  if (!items.length) {
    return <div className="assignment-empty">{emptyText}</div>;
  }

  return (
    <div className="assignment-list" role="listbox">
      {items.map((item) => (
        <button
          key={item.id}
          className={`assignment-item ${selectedId === item.id ? "selected" : ""}`}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <strong>{item.label}</strong>
          <span className="muted">ID {item.id}</span>
        </button>
      ))}
    </div>
  );
}

export function ManualAssignmentShell() {
  const [consultaQuery, setConsultaQuery] = useState("");
  const [medicoQuery, setMedicoQuery] = useState("");
  const deferredConsultaQuery = useDeferredValue(consultaQuery);
  const deferredMedicoQuery = useDeferredValue(medicoQuery);
  const [consultas, setConsultas] = useState<ConsultaOption[]>([]);
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [selectedConsultaId, setSelectedConsultaId] = useState("");
  const [selectedMedicoId, setSelectedMedicoId] = useState("");
  const [consultaError, setConsultaError] = useState("");
  const [medicoError, setMedicoError] = useState("");
  const [loadingConsultas, setLoadingConsultas] = useState(false);
  const [loadingMedicos, setLoadingMedicos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forzarEnCamino, setForzarEnCamino] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadConsultas() {
      setLoadingConsultas(true);
      try {
        const response = await fetch(`/api/monitoreo/consultas?q=${encodeURIComponent(deferredConsultaQuery)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const data = (await response.json()) as SearchResponse<ConsultaOption>;
        if (cancelled) {
          return;
        }

        setConsultas(data.items);
        setConsultaError(response.ok ? "" : data.error ?? "No se pudieron cargar las consultas.");
      } catch {
        if (!cancelled) {
          setConsultas([]);
          setConsultaError("No se pudieron cargar las consultas.");
        }
      } finally {
        if (!cancelled) {
          setLoadingConsultas(false);
        }
      }
    }

    loadConsultas();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deferredConsultaQuery]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadMedicos() {
      setLoadingMedicos(true);
      try {
        const response = await fetch(`/api/monitoreo/medicos?q=${encodeURIComponent(deferredMedicoQuery)}`, {
          cache: "no-store",
          signal: controller.signal
        });
        const data = (await response.json()) as SearchResponse<MedicoOption>;
        if (cancelled) {
          return;
        }

        setMedicos(data.items);
        setMedicoError(response.ok ? "" : data.error ?? "No se pudieron cargar los medicos.");
      } catch {
        if (!cancelled) {
          setMedicos([]);
          setMedicoError("No se pudieron cargar los medicos.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMedicos(false);
        }
      }
    }

    loadMedicos();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [deferredMedicoQuery]);

  const selectedConsulta = useMemo(
    () => consultas.find((consulta) => consulta.id === selectedConsultaId) ?? null,
    [consultas, selectedConsultaId]
  );
  const selectedMedico = useMemo(
    () => medicos.find((medico) => medico.id === selectedMedicoId) ?? null,
    [medicos, selectedMedicoId]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!selectedConsultaId || !selectedMedicoId) {
      setNotice({ kind: "error", text: "Selecciona una consulta y un medico para continuar." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/monitoreo/asignaciones/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          consulta_id: selectedConsultaId,
          medico_id: selectedMedicoId,
          forzar_en_camino: forzarEnCamino
        })
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo confirmar la asignacion manual.");
      }

      setNotice({ kind: "success", text: "Asignacion manual enviada correctamente." });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo confirmar la asignacion manual."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Asignacion manual</h1>
          <p>Busca la consulta o paciente, elige un medico y confirma la asignacion en monitoreo.</p>
        </div>
      </div>

      {notice ? (
        <div className={`notice ${notice.kind === "success" ? "success" : ""}`} role="status">
          {notice.text}
        </div>
      ) : null}

      <form className="stack" onSubmit={handleSubmit}>
        <div className="grid cols-2">
          <section className="card stack">
            <div className="dashboard-section-title">
              <UserRoundSearch size={18} strokeWidth={1.9} />
              <strong>Consulta o paciente</strong>
            </div>
            <label className="field">
              <span>Buscar consulta</span>
              <input
                onChange={(event) => setConsultaQuery(event.target.value)}
                placeholder="Nombre del paciente, motivo o ID"
                value={consultaQuery}
              />
            </label>
            {consultaError ? <div className="notice">{consultaError}</div> : null}
            <OptionList
              emptyText="No hay consultas disponibles con ese criterio."
              items={consultas}
              loading={loadingConsultas}
              onSelect={setSelectedConsultaId}
              selectedId={selectedConsultaId}
            />
          </section>

          <section className="card stack">
            <div className="dashboard-section-title">
              <Stethoscope size={18} strokeWidth={1.9} />
              <strong>Medico</strong>
            </div>
            <label className="field">
              <span>Buscar medico</span>
              <input
                onChange={(event) => setMedicoQuery(event.target.value)}
                placeholder="Nombre, especialidad o ID"
                value={medicoQuery}
              />
            </label>
            {medicoError ? <div className="notice">{medicoError}</div> : null}
            <OptionList
              emptyText="No hay medicos disponibles con ese criterio."
              items={medicos}
              loading={loadingMedicos}
              onSelect={setSelectedMedicoId}
              selectedId={selectedMedicoId}
            />
          </section>
        </div>

        <section className="card stack">
          <div className="dashboard-section-title">
            <RefreshCcw size={18} strokeWidth={1.9} />
            <strong>Confirmacion</strong>
          </div>
          <div className="assignment-summary-grid">
            <article className="assignment-summary-card">
              <span className="muted">Consulta seleccionada</span>
              <strong>{selectedConsulta?.label ?? "Ninguna seleccionada"}</strong>
            </article>
            <article className="assignment-summary-card">
              <span className="muted">Medico seleccionado</span>
              <strong>{selectedMedico?.label ?? "Ninguno seleccionado"}</strong>
            </article>
          </div>
          <label className="assignment-checkbox">
            <input
              checked={forzarEnCamino}
              onChange={(event) => setForzarEnCamino(event.target.checked)}
              type="checkbox"
            />
            <span>Forzar en camino</span>
          </label>
          <div className="actions">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? (
                <LoaderCircle className="assignment-spin" size={16} strokeWidth={2} />
              ) : (
                <Send size={16} strokeWidth={2} />
              )}
              Confirmar asignacion manual
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
