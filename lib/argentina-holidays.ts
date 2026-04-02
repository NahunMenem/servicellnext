const ARGENTINA_HOLIDAYS: Record<number, Array<{ date: string; name: string }>> = {
  2025: [
    { date: "2025-01-01", name: "Año Nuevo" },
    { date: "2025-03-03", name: "Carnaval" },
    { date: "2025-03-04", name: "Carnaval" },
    { date: "2025-03-24", name: "Día de la Memoria" },
    { date: "2025-04-02", name: "Malvinas" },
    { date: "2025-04-17", name: "Turístico" },
    { date: "2025-04-18", name: "Viernes Santo" },
    { date: "2025-05-01", name: "Día del Trabajador" },
    { date: "2025-05-02", name: "Turístico" },
    { date: "2025-05-25", name: "Revolución de Mayo" },
    { date: "2025-06-20", name: "Belgrano" },
    { date: "2025-07-09", name: "Independencia" },
    { date: "2025-08-15", name: "Turístico" },
    { date: "2025-08-17", name: "San Martín" },
    { date: "2025-10-10", name: "Diversidad Cultural" },
    { date: "2025-11-21", name: "Turístico" },
    { date: "2025-11-24", name: "Soberanía Nacional" },
    { date: "2025-12-08", name: "Inmaculada Concepción" },
    { date: "2025-12-25", name: "Navidad" }
  ],
  2026: [
    { date: "2026-01-01", name: "Año Nuevo" },
    { date: "2026-02-16", name: "Carnaval" },
    { date: "2026-02-17", name: "Carnaval" },
    { date: "2026-03-23", name: "Turístico" },
    { date: "2026-03-24", name: "Día de la Memoria" },
    { date: "2026-04-02", name: "Malvinas" },
    { date: "2026-04-03", name: "Viernes Santo" },
    { date: "2026-05-01", name: "Día del Trabajador" },
    { date: "2026-05-25", name: "Revolución de Mayo" },
    { date: "2026-06-20", name: "Belgrano" },
    { date: "2026-07-09", name: "Independencia" },
    { date: "2026-07-10", name: "Turístico" },
    { date: "2026-08-17", name: "San Martín" },
    { date: "2026-10-12", name: "Diversidad Cultural" },
    { date: "2026-11-23", name: "Soberanía Nacional" },
    { date: "2026-12-07", name: "Turístico" },
    { date: "2026-12-08", name: "Inmaculada Concepción" },
    { date: "2026-12-25", name: "Navidad" }
  ]
};

function parseDate(date: string) {
  return new Date(`${date}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function getHolidayWeekHighlights(weekStarts: string[]) {
  const highlights = new Map<string, string[]>();

  for (const weekStart of weekStarts) {
    const start = parseDate(weekStart);
    const end = addDays(start, 6);
    const years = new Set([start.getFullYear(), end.getFullYear()]);
    const holidayNames: string[] = [];

    for (const year of years) {
      for (const holiday of ARGENTINA_HOLIDAYS[year] ?? []) {
        const holidayDate = parseDate(holiday.date);
        if (holidayDate >= start && holidayDate <= end) {
          holidayNames.push(holiday.name);
        }
      }
    }

    if (holidayNames.length) {
      highlights.set(weekStart, holidayNames);
    }
  }

  return highlights;
}
