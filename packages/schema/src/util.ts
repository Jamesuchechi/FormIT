/** Generate a stable, URL-safe id. Field/section/option ids are immutable once created. */
export function newId(prefix = "f"): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** True only for real calendar dates in strict YYYY-MM-DD form (rejects 2025-02-30). */
export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
