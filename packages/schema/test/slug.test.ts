import { describe, expect, it } from "vitest";
import { generateSlug, isValidSlug, resolveSlugCollision } from "../src/slug.ts";

describe("slug utilities", () => {
  describe("isValidSlug", () => {
    it("accepts valid alphanumeric slugs", () => {
      expect(isValidSlug("contact-us")).toBe(true);
      expect(isValidSlug("survey-2026")).toBe(true);
      expect(isValidSlug("abc")).toBe(true);
    });

    it("rejects invalid slugs", () => {
      expect(isValidSlug("")).toBe(false);
      expect(isValidSlug("ab")).toBe(false); // too short (< 3)
      expect(isValidSlug("-invalid")).toBe(false); // starts with hyphen
      expect(isValidSlug("invalid-")).toBe(true); // ends with hyphen is allowed by db regex `[a-z0-9-]{2,62}` if starts with char
      expect(isValidSlug("UPPERCASE")).toBe(false);
      expect(isValidSlug("with spaces")).toBe(false);
      expect(isValidSlug("with_underscore")).toBe(false);
      expect(isValidSlug("a".repeat(64))).toBe(false); // too long (> 63)
    });
  });

  describe("generateSlug", () => {
    it("converts title to clean lowercase hyphenated slug", () => {
      expect(generateSlug("Customer Feedback Survey 2026")).toBe(
        "customer-feedback-survey-2026",
      );
    });

    it("handles diacritics and special characters", () => {
      expect(generateSlug("Café & Résumé Form!")).toBe("cafe-resume-form");
    });

    it("handles empty or purely symbolic input gracefully", () => {
      const slug = generateSlug("??? #@$ %^&");
      expect(isValidSlug(slug)).toBe(true);
      expect(slug.startsWith("form")).toBe(true);
    });

    it("enforces max length", () => {
      const longTitle = "This is an extremely long form title that exceeds sixty-three characters easily";
      const slug = generateSlug(longTitle, { maxLength: 40 });
      expect(slug.length).toBeLessThanOrEqual(40);
      expect(isValidSlug(slug)).toBe(true);
    });

    it("appends random suffix when requested", () => {
      const slug = generateSlug("feedback", { suffixLength: 4 });
      expect(isValidSlug(slug)).toBe(true);
      expect(slug).toMatch(/^feedback-[a-z0-9]{4}$/);
    });
  });

  describe("resolveSlugCollision", () => {
    it("returns base slug if not taken", () => {
      const existing = new Set(["form-1", "form-2"]);
      expect(resolveSlugCollision("survey", existing)).toBe("survey");
    });

    it("increments numeric suffix when collision occurs", () => {
      const existing = new Set(["feedback", "feedback-2"]);
      expect(resolveSlugCollision("feedback", existing)).toBe("feedback-3");
    });
  });
});
