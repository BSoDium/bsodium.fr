import { describe, expect, it } from "vitest";
import { buildJsonSchema } from "./generate-json-schema";
import { CAREER_LIMITS, EMPTY_PROJECTION, parsePublishedProjection, publishedCareerSchema, type PublishedCareer } from "./published";

const place = { slug: "paris", name: "Paris", coordinates: { lat: 48.85, lon: 2.35 }, labelPriority: 50, body: [], images: [], related: [] };

const role = (extra: object = {}) => ({
  id: "studio-lead",
  title: "Lead engineer",
  org: "Example Studio",
  location: "Paris, France",
  start: "2024-03",
  highlights: ["Built the thing."],
  skills: ["React", "TypeScript"],
  ...extra,
});

const career = (extra: object = {}) => ({
  title: "Career",
  summary: "A profile statement of one paragraph.",
  updated: "2026-10",
  roles: [role()],
  education: [],
  languages: [],
  skills: [],
  links: [],
  ...extra,
});

const parse = (c: unknown, places: object[] = [place]) => parsePublishedProjection({ ...EMPTY_PROJECTION, places, career: c });
const ok = (c: unknown, places?: object[]) => expect(() => parse(c, places), JSON.stringify(c).slice(0, 160)).not.toThrow();
const bad = (c: unknown, re?: RegExp, places?: object[]) =>
  re ? expect(() => parse(c, places), JSON.stringify(c).slice(0, 160)).toThrow(re) : expect(() => parse(c, places), JSON.stringify(c).slice(0, 160)).toThrow();

describe("career (an optional singleton document, additive in schema version 1)", () => {
  it("old projections without it stay valid, and the key stays absent", () => {
    const legacy = { schemaVersion: 1, places: [], routes: [], projects: [], articles: [], artworks: [] };
    const parsed = parsePublishedProjection(legacy);
    expect(parsed).not.toHaveProperty("career");
    expect(parsePublishedProjection(EMPTY_PROJECTION)).not.toHaveProperty("career");
    expect(EMPTY_PROJECTION).not.toHaveProperty("career");
  });

  it("accepts a complete career and keeps it as given", () => {
    const full = career({
      roles: [
        role({ id: "now", start: "2026", orgUrl: "https://example.org", place: "paris", employment: "Permanent" }),
        role({ id: "before", start: "2022-06", end: "2023-09" }),
      ],
      education: [{ id: "school", institution: "Example University", programme: "Computer Science", level: "MSc", start: "2020", end: "2023", location: "Toulouse, France", place: "paris", note: "Exchange year." }],
      languages: [{ name: "French", level: "C2", label: "Native" }, { name: "English", level: "C1" }],
      skills: [{ group: "Primary", items: ["React", "TypeScript"] }],
      links: [{ label: "GitHub", url: "https://github.com/example" }],
    });
    expect(parse(full).career).toEqual(full);
  });

  it("an optional career in the empty projection validates as a bare minimum", () => {
    ok(career());
  });

  it("every object is strict: no email, phone or address can be served", () => {
    for (const leaked of [{ email: "a@b.c" }, { phone: "+33 1" }, { address: "1 rue X" }, { location: "x" }, { openToWork: true }]) {
      bad(career(leaked));
    }
    bad(career({ roles: [role({ email: "a@b.c" })] }));
    bad(career({ roles: [role({ phone: "0102030405" })] }));
    bad(career({ education: [{ id: "e", institution: "I", programme: "P", start: "2020", end: "2021", address: "x" }] }));
    bad(career({ languages: [{ name: "French", level: "C2", certificate: "x" }] }));
    bad(career({ skills: [{ group: "G", items: ["a"], note: "x" }] }));
    bad(career({ links: [{ label: "L", url: "https://example.org", email: "x" }] }));
  });

  it("the schema has no field named after an email, a phone number or an address (guard on the generated JSON Schema)", () => {
    const names: string[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) {
          if (k === "properties" && v && typeof v === "object") names.push(...Object.keys(v));
          walk(v);
        }
      }
    };
    walk(JSON.parse(buildJsonSchema()).properties.career);
    expect(names.length).toBeGreaterThan(20);
    expect(names.filter((n) => /mail|phone|^tel|mobile|street|address|zip|postcode|postal|birth|^age$|nationality|photo|salary/i.test(n))).toEqual([]);
  });

  describe("dates", () => {
    it("accept YYYY and YYYY-MM for a start, and `present` or nothing for an end", () => {
      for (const start of ["2026", "2025-02", "1999-12"]) ok(career({ roles: [role({ start })] }));
      for (const end of [undefined, "present", "2026", "2026-12"]) ok(career({ roles: [role({ start: "2026", ...(end ? { end } : {}) })] }));
    });
    it("refuse a day, an impossible month, a year out of range, `present` as a start and free text", () => {
      for (const start of ["2026-01-05", "2026-13", "2026-00", "1899", "2100", "26", "present", "Spring 2026", " 2026", ""]) bad(career({ roles: [role({ start })] }));
      for (const end of ["tomorrow", "2026-1", "ongoing", "now"]) bad(career({ roles: [role({ end })] }));
      bad(career({ updated: "2026" }));
      bad(career({ updated: "2026-10-01" }));
    });
    it("an end is never before its start (a year alone is the whole year)", () => {
      bad(career({ roles: [role({ start: "2025-06", end: "2025-05" })] }), /end must not be before start/);
      bad(career({ roles: [role({ start: "2025", end: "2024-12" })] }));
      ok(career({ roles: [role({ start: "2025-06", end: "2025-06" })] }));
      ok(career({ roles: [role({ start: "2025-06", end: "2025" })] }));
      ok(career({ roles: [role({ start: "2025", end: "2025-01" })] }));
      bad(career({ education: [{ id: "e", institution: "I", programme: "P", start: "2023", end: "2020" }] }), /end must not be before start/);
    });
  });

  describe("order and identity", () => {
    it("roles are most recent first, by start", () => {
      ok(career({ roles: [role({ id: "a", start: "2026" }), role({ id: "b", start: "2025-02" }), role({ id: "c", start: "2025-02" })] }));
      bad(career({ roles: [role({ id: "a", start: "2023" }), role({ id: "b", start: "2024-01" })] }), /most recent first/);
      bad(career({ roles: [role({ id: "a", start: "2025-02" }), role({ id: "b", start: "2025-03" })] }), /most recent first/);
    });
    it("ids are unique across roles and education", () => {
      bad(career({ roles: [role({ id: "a" }), role({ id: "a", start: "2020" })] }), /duplicate id "a"/);
      bad(career({ education: [{ id: "studio-lead", institution: "I", programme: "P", start: "2020", end: "2021" }] }), /duplicate id "studio-lead"/);
    });
    it("ids are kebab-case slugs", () => {
      bad(career({ roles: [role({ id: "Studio Lead" })] }));
    });
    it("names, groups, addresses and skills are unique", () => {
      bad(career({ languages: [{ name: "French", level: "C2" }, { name: "french", level: "C1" }] }), /unique/);
      bad(career({ skills: [{ group: "A", items: ["x"] }, { group: "a", items: ["y"] }] }), /unique/);
      bad(career({ skills: [{ group: "A", items: ["x", "X"] }] }), /unique/);
      bad(career({ roles: [role({ skills: ["React", "react"] })] }), /unique/);
      bad(career({ links: [{ label: "A", url: "https://example.org" }, { label: "B", url: "https://example.org" }] }), /unique/);
    });
  });

  describe("places", () => {
    it("a role or an education item may name a place of the projection, and it must resolve", () => {
      ok(career({ roles: [role({ place: "paris" })] }));
      bad(career({ roles: [role({ place: "atlantis" })] }), /unknown place "atlantis"/);
      bad(career({ education: [{ id: "e", institution: "I", programme: "P", start: "2020", end: "2021", place: "atlantis" }] }), /unknown place "atlantis"/);
      ok(career({ education: [{ id: "e", institution: "I", programme: "P", start: "2020", end: "2021", place: "paris" }] }));
    });
  });

  describe("text and links", () => {
    it("refuse control characters, line feeds and bidirectional overrides in every text", () => {
      const RLO = String.fromCharCode(0x202e);
      const LF = String.fromCharCode(10);
      const BEL = String.fromCharCode(7);
      for (const v of [`a${LF}b`, `a${BEL}b`, `a${RLO}b`]) {
        bad(career({ summary: v }));
        bad(career({ title: v }));
        bad(career({ roles: [role({ title: v })] }));
        bad(career({ roles: [role({ highlights: [v] })] }));
        bad(career({ skills: [{ group: "G", items: [v] }] }));
        bad(career({ languages: [{ name: "French", level: v }] }));
      }
    });
    it("texts are trimmed and must not be empty", () => {
      expect(parse(career({ summary: "  padded  " })).career!.summary).toBe("padded");
      bad(career({ summary: "   " }));
      bad(career({ roles: [role({ org: "" })] }));
      bad(career({ roles: [role()], skills: [{ group: "G", items: [] }] }));
    });
    it("urls are https only, without credentials or whitespace", () => {
      for (const url of ["http://example.org", "mailto:a@example.org", "javascript:alert(1)", "https://user:pw@example.org", "https://exa mple.org", "/relative", "tel:+33123456789"]) {
        bad(career({ links: [{ label: "L", url }] }));
        bad(career({ roles: [role({ orgUrl: url })] }));
      }
    });
    it("has no HTML interpretation: markup is data, displayed as written", () => {
      expect(parse(career({ summary: "Uses <b>bold</b> text." })).career!.summary).toBe("Uses <b>bold</b> text.");
    });
  });

  describe("limits", () => {
    it("bound the size of every collection", () => {
      const many = <T,>(n: number, make: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => make(i));
      const roles = (n: number) => many(n, (i) => role({ id: `r-${i}`, start: "2000" }));
      ok(career({ roles: roles(CAREER_LIMITS.roles) }));
      bad(career({ roles: roles(CAREER_LIMITS.roles + 1) }));
      bad(career({ roles: [] }));
      ok(career({ roles: [role({ highlights: many(CAREER_LIMITS.highlights, (i) => `h${i}`) })] }));
      bad(career({ roles: [role({ highlights: many(CAREER_LIMITS.highlights + 1, (i) => `h${i}`) })] }));
      bad(career({ roles: [role({ skills: many(CAREER_LIMITS.roleSkills + 1, (i) => `s${i}`) })] }));
      bad(career({ education: many(CAREER_LIMITS.education + 1, (i) => ({ id: `e-${i}`, institution: "I", programme: "P", start: "2020", end: "2021" })) }));
      bad(career({ languages: many(CAREER_LIMITS.languages + 1, (i) => ({ name: `L${i}`, level: "B1" })) }));
      bad(career({ skills: many(CAREER_LIMITS.skillGroups + 1, (i) => ({ group: `G${i}`, items: ["a"] })) }));
      bad(career({ skills: [{ group: "G", items: many(CAREER_LIMITS.skillItems + 1, (i) => `i${i}`) }] }));
      bad(career({ links: many(CAREER_LIMITS.links + 1, (i) => ({ label: `L${i}`, url: `https://example.org/${i}` })) }));
    });
    it("bound the length of every text", () => {
      bad(career({ summary: "x".repeat(1001) }));
      ok(career({ summary: "x".repeat(1000) }));
      bad(career({ title: "x".repeat(81) }));
      bad(career({ roles: [role({ highlights: ["x".repeat(301)] })] }));
      bad(career({ roles: [role({ employment: "x".repeat(41) })] }));
    });
    it("the largest possible career stays small (well under the entry budget)", () => {
      const line = (n: number) => "x".repeat(n);
      const big: PublishedCareer = {
        title: line(80),
        summary: line(1000),
        updated: "2026-10",
        roles: Array.from({ length: CAREER_LIMITS.roles }, (_, i) => ({
          id: `role-${i}`,
          title: line(120),
          org: line(120),
          orgUrl: `https://example.org/${line(40)}`,
          location: line(120),
          employment: line(40),
          start: "2000",
          end: "2001",
          highlights: Array.from({ length: CAREER_LIMITS.highlights }, () => line(300)),
          skills: Array.from({ length: CAREER_LIMITS.roleSkills }, (_, j) => `${j}${line(39 - String(j).length)}`),
        })),
        education: [],
        languages: [],
        skills: [],
        links: [],
      };
      expect(publishedCareerSchema.safeParse(big).success).toBe(true);
      // The theoretical maximum (every list full, every text at its limit) is bounded: about the size of one entry body.
      expect(JSON.stringify(big).length).toBeLessThan(100_000);
    });
  });

  describe("generated JSON Schema", () => {
    const schema = JSON.parse(buildJsonSchema());
    it("describes career as an optional strict object (zod-only rules: order, ends, uniqueness, place references)", () => {
      expect(schema.properties.career.type).toBe("object");
      expect(schema.properties.career.additionalProperties).toBe(false);
      expect(schema.required).not.toContain("career");
      expect(schema.properties.career.required).toEqual(expect.arrayContaining(["title", "summary", "updated", "roles", "education", "languages", "skills", "links"]));
      expect(schema.properties.career.properties.roles.minItems).toBe(1);
      expect(schema.properties.career.properties.roles.items.additionalProperties).toBe(false);
    });
  });
});
