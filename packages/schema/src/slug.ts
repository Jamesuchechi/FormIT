/** Regex matching a valid FormIT slug: 3 to 63 chars, starts with a-z0-9, lowercase alphanumeric + hyphen. */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{2,62}$/;

/** Check if a string is a valid slug according to database constraints. */
export function isValidSlug(slug: string): boolean {
  return typeof slug === "string" && SLUG_REGEX.test(slug);
}

/** Generate a random alphanumeric suffix. */
function randomSuffix(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface SlugOptions {
  /** If specified, appends a random alphanumeric suffix of this length. Default is 0. */
  suffixLength?: number;
  /** Maximum total slug length (must be between 3 and 63). Default is 63. */
  maxLength?: number;
}

/**
 * Generate a database-safe slug from a form title.
 * Handles diacritics, punctuation, whitespace, and truncation.
 */
export function generateSlug(title: string, options: SlugOptions = {}): string {
  const { suffixLength = 0, maxLength = 63 } = options;
  const clampedMax = Math.min(Math.max(maxLength, 3), 63);

  // Normalize diacritics and convert to lowercase
  let clean = (title || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // If sanitized title is empty or too short, use fallback
  if (!clean) {
    clean = "form";
  }

  // Calculate available space for base slug when suffix is requested
  const suffixPart = suffixLength > 0 ? `-${randomSuffix(suffixLength)}` : "";
  const allowedBaseLen = clampedMax - suffixPart.length;

  if (clean.length > allowedBaseLen) {
    clean = clean.slice(0, allowedBaseLen).replace(/-+$/, "");
  }

  let finalSlug = `${clean}${suffixPart}`;

  // Ensure minimum length of 3 chars
  while (finalSlug.length < 3) {
    finalSlug += `-${randomSuffix(1)}`;
  }

  return finalSlug;
}

/**
 * Resolve a slug collision against a set of existing slugs.
 * Appends incrementing counters (-2, -3, ...) or random suffixes until unique.
 */
export function resolveSlugCollision(
  baseSlug: string,
  existingSlugs: Set<string> | string[],
): string {
  const existing = existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs);

  if (!existing.has(baseSlug) && isValidSlug(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (counter < 1000) {
    const candidate = `${baseSlug.slice(0, 58)}-${counter}`;
    if (!existing.has(candidate) && isValidSlug(candidate)) {
      return candidate;
    }
    counter++;
  }

  // Fallback to random suffix
  return generateSlug(baseSlug, { suffixLength: 4 });
}
