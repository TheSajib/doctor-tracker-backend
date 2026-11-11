export function todayIso(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isoDaysAgo(days, fromIso) {
  const [year, month, day] = fromIso.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() - days);
  return todayIso(date);
}

export function rangeStart(range, today) {
  if (!range || range === "any") return null;
  const days = range === "7d" ? 6 : range === "30d" ? 29 : range === "90d" ? 89 : null;
  if (days === null) return undefined;
  return isoDaysAgo(days, today);
}

export function lastNDays(count, fromIso) {
  return Array.from({ length: count }, (_, index) =>
    isoDaysAgo(count - 1 - index, fromIso),
  );
}

export function formatShortDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
