import { describe, expect, it } from "vitest";
import { parseFormSchema, themeSchema } from "../src/index.ts";

describe("themeSchema", () => {
  it("parses valid theme and applies defaults", () => {
    const res = themeSchema.safeParse({});
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.accentColor).toBe("#4f46e5");
      expect(res.data.font).toBe("sans");
      expect(res.data.darkMode).toBe("auto");
    }
  });

  it("validates custom hex colors", () => {
    expect(themeSchema.safeParse({ accentColor: "#e11d48" }).success).toBe(true);
    expect(themeSchema.safeParse({ accentColor: "#059669" }).success).toBe(true);
    expect(themeSchema.safeParse({ accentColor: "invalid" }).success).toBe(false);
    expect(themeSchema.safeParse({ accentColor: "123456" }).success).toBe(false);
  });

  it("validates font options", () => {
    expect(themeSchema.safeParse({ font: "sans" }).success).toBe(true);
    expect(themeSchema.safeParse({ font: "serif" }).success).toBe(true);
    expect(themeSchema.safeParse({ font: "mono" }).success).toBe(true);
    expect(themeSchema.safeParse({ font: "comic-sans" }).success).toBe(false);
  });

  it("parses formSchema with optional theme", () => {
    const formWithoutTheme = {
      title: "Simple Form",
      sections: [
        {
          id: "s_1",
          fields: [
            {
              id: "f_1",
              type: "short_text",
              label: "Name",
              required: true,
              validation: {},
            },
          ],
        },
      ],
    };

    const parsed1 = parseFormSchema(formWithoutTheme);
    expect(parsed1.success).toBe(true);

    const formWithTheme = {
      ...formWithoutTheme,
      theme: {
        accentColor: "#0284c7",
        font: "serif",
        headerImage: "https://example.com/banner.png",
        darkMode: "dark",
      },
    };

    const parsed2 = parseFormSchema(formWithTheme);
    expect(parsed2.success).toBe(true);
    if (parsed2.success) {
      expect(parsed2.data.theme?.accentColor).toBe("#0284c7");
      expect(parsed2.data.theme?.font).toBe("serif");
      expect(parsed2.data.theme?.headerImage).toBe("https://example.com/banner.png");
      expect(parsed2.data.theme?.darkMode).toBe("dark");
    }
  });
});
