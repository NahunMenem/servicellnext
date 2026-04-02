type MonitoreoItem = Record<string, unknown>;

export type ConsultaOption = {
  id: string;
  paciente: string;
  descripcion: string;
  estado: string;
  label: string;
};

export type MedicoOption = {
  id: string;
  nombre: string;
  especialidad: string;
  estado: string;
  label: string;
};

function getMonitoreoBaseUrl() {
  return process.env.MONITOREO_API_URL?.trim() ?? "";
}

function getMonitoreoToken() {
  return process.env.MONITOREO_API_TOKEN?.trim() ?? "";
}

function getConsultasPath() {
  return process.env.MONITOREO_CONSULTAS_PATH?.trim() || "/monitoreo/consultas";
}

function getMedicosPath() {
  return process.env.MONITOREO_MEDICOS_PATH?.trim() || "/monitoreo/medicos";
}

function ensureLeadingSlash(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildMonitoreoUrl(path: string) {
  const baseUrl = getMonitoreoBaseUrl();
  if (!baseUrl) {
    throw new Error("Falta configurar MONITOREO_API_URL en el entorno.");
  }

  return new URL(ensureLeadingSlash(path), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
}

async function fetchMonitoreo(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getMonitoreoToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const response = await fetch(buildMonitoreoUrl(path), {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `La API de monitoreo respondio con ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("La API de monitoreo no devolvio JSON.");
  }

  return response.json();
}

function readString(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function findNestedObject(item: MonitoreoItem, key: string) {
  const value = item[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MonitoreoItem)
    : null;
}

function pickValue(item: MonitoreoItem, keys: string[]) {
  for (const key of keys) {
    const direct = readString(item[key]);
    if (direct) {
      return direct;
    }
  }

  for (const containerKey of ["paciente", "medico", "doctor", "consulta"]) {
    const nested = findNestedObject(item, containerKey);
    if (!nested) {
      continue;
    }

    for (const key of keys) {
      const nestedValue = readString(nested[key]);
      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return "";
}

function getItems(payload: unknown): MonitoreoItem[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is MonitoreoItem => !!item && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;
  for (const key of ["items", "results", "data", "consultas", "medicos"]) {
    const value = objectPayload[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is MonitoreoItem => !!item && typeof item === "object");
    }
  }

  return [];
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function buildConsultaLabel(consulta: Omit<ConsultaOption, "label">) {
  const pieces = [consulta.paciente, consulta.descripcion, consulta.estado].filter(Boolean);
  return pieces.join(" - ") || `Consulta ${consulta.id}`;
}

function buildMedicoLabel(medico: Omit<MedicoOption, "label">) {
  const pieces = [medico.nombre, medico.especialidad, medico.estado].filter(Boolean);
  return pieces.join(" - ") || `Medico ${medico.id}`;
}

function normalizeConsulta(item: MonitoreoItem): ConsultaOption | null {
  const id = pickValue(item, ["consulta_id", "id"]);
  if (!id) {
    return null;
  }

  const consulta = {
    id,
    paciente: pickValue(item, ["paciente", "paciente_nombre", "nombre_paciente", "nombre", "full_name"]),
    descripcion: pickValue(item, ["motivo", "descripcion", "detalle", "tipo", "observaciones"]),
    estado: pickValue(item, ["estado", "status"])
  };

  return {
    ...consulta,
    label: buildConsultaLabel(consulta)
  };
}

function normalizeMedico(item: MonitoreoItem): MedicoOption | null {
  const id = pickValue(item, ["medico_id", "id"]);
  if (!id) {
    return null;
  }

  const medico = {
    id,
    nombre: pickValue(item, ["nombre", "apellido_nombre", "display_name", "full_name"]),
    especialidad: pickValue(item, ["especialidad", "especialidad_nombre", "specialty"]),
    estado: pickValue(item, ["estado", "status"])
  };

  return {
    ...medico,
    label: buildMedicoLabel(medico)
  };
}

export async function searchConsultas(query: string) {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("q", query.trim());
  }

  const suffix = searchParams.toString();
  const payload = await fetchMonitoreo(suffix ? `${getConsultasPath()}?${suffix}` : getConsultasPath());
  return uniqueById(getItems(payload).map(normalizeConsulta).filter((item): item is ConsultaOption => !!item));
}

export async function searchMedicos(query: string) {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("q", query.trim());
  }

  const suffix = searchParams.toString();
  const payload = await fetchMonitoreo(suffix ? `${getMedicosPath()}?${suffix}` : getMedicosPath());
  return uniqueById(getItems(payload).map(normalizeMedico).filter((item): item is MedicoOption => !!item));
}

export async function assignConsultaManual(consultaId: string, medicoId: string, forzarEnCamino: boolean) {
  const path = `/monitoreo/consultas/${encodeURIComponent(consultaId)}/asignar_manual`;
  return fetchMonitoreo(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      medico_id: medicoId,
      forzar_en_camino: forzarEnCamino
    })
  });
}
