const key = (slug: string, version: number) => `formit:draft:${slug}:v${version}`;

/** Drafts live in localStorage. Every access is guarded: storage can be disabled or full. */
export function loadDraft(slug: string, version: number): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key(slug, version));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function saveDraft(slug: string, version: number, answers: Record<string, unknown>): void {
  try {
    if (Object.keys(answers).length === 0) localStorage.removeItem(key(slug, version));
    else localStorage.setItem(key(slug, version), JSON.stringify(answers));
  } catch {
    /* ignore: drafts are best-effort */
  }
}

export function clearDraft(slug: string, version: number): void {
  try {
    localStorage.removeItem(key(slug, version));
  } catch {
    /* ignore */
  }
}
