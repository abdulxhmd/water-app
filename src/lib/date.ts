// All date handling in this app is local-time based (a "day" is the user's
// local calendar day). `new Date("YYYY-MM-DD")` parses as UTC midnight, which
// silently shifts the represented day in any timezone behind UTC. Every
// helper here stays in local time end to end to avoid that.

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Parses a "YYYY-MM-DD" string as a local-time midnight Date, not UTC. */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatShortDate(dateString: string): string {
  return parseLocalDate(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function getWeekRange(date: Date) {
  const current = new Date(date);
  current.setHours(0, 0, 0, 0);

  const dayIndex = current.getDay();
  const daysFromMonday = (dayIndex + 6) % 7;

  const start = new Date(current);
  start.setDate(current.getDate() - daysFromMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

export function getMonthRange(date: Date) {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    monthStart: formatLocalDate(monthStart),
    monthEnd: formatLocalDate(monthEnd),
  };
}

export function buildWeekDays<T extends { date: string; water_ml: number }>(
  startDate: string,
  entries: T[]
) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const byDate = new Map(entries.map((entry) => [entry.date, entry.water_ml]));
  const start = parseLocalDate(startDate);

  return labels.map((label, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const dateKey = formatLocalDate(current);

    return {
      label,
      date: dateKey,
      water: byDate.get(dateKey) ?? 0,
    };
  });
}

/** End-of-day boundary (23:59:59.999 local) for a "YYYY-MM-DD" date string. */
export function endOfLocalDay(dateString: string): Date {
  const end = parseLocalDate(dateString);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** The local calendar day immediately before the given date. */
export function getPreviousLocalDate(date: Date): Date {
  const previous = new Date(date);
  previous.setDate(date.getDate() - 1);
  return previous;
}
