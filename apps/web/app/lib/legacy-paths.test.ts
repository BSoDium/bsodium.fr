import { describe, expect, it } from "vitest";
import { loader } from "~/routes/legacy-poems";
import { KIND_PATHS } from "./entries";
import { LEGACY_REDIRECT_STATUS, legacyPoemsTarget } from "./legacy-paths";

const answer = async (path: string, method = "GET") => {
  try {
    return (await loader({ request: new Request(`https://v2.bsodium.fr${path}`, { method }) })) as Response;
  } catch (thrown) {
    return thrown as Response;
  }
};

describe("legacyPoemsTarget", () => {
  it("moves the list and every entry under /poetry, the query string kept as it was", () => {
    expect(legacyPoemsTarget("/poems", "")).toBe("/poetry");
    expect(legacyPoemsTarget("/poems/", "")).toBe("/poetry");
    expect(legacyPoemsTarget("/poems", "?tag=night")).toBe("/poetry?tag=night");
    expect(legacyPoemsTarget("/poems", "?tag=night&tag=rain&x=%20y")).toBe("/poetry?tag=night&tag=rain&x=%20y");
    expect(legacyPoemsTarget("/poems/demo-poem", "")).toBe("/poetry/demo-poem");
    expect(legacyPoemsTarget("/poems/demo-poem/", "")).toBe("/poetry/demo-poem");
    expect(legacyPoemsTarget("/poems/demo-poem", "?view=full&tag=y")).toBe("/poetry/demo-poem?view=full&tag=y");
    // the segment goes through as the request carried it (percent-encoding is not touched, nothing is decoded and re-encoded)
    expect(legacyPoemsTarget("/poems/caf%C3%A9", "")).toBe("/poetry/caf%C3%A9");
  });
  it("is the new address of the kind: the target of the list is KIND_PATHS.poem", () => {
    expect(legacyPoemsTarget("/poems", "")).toBe(KIND_PATHS.poem);
  });
  it("leaves every other address alone, and anything deeper than an entry (a 404 before, a 404 now)", () => {
    for (const path of ["/", "/poetry", "/poetry/x", "/articles", "/poem", "/poemsx", "/x/poems", "/poems/a/b", "/poems/a/b/c"]) expect(legacyPoemsTarget(path, ""), path).toBeNull();
  });
  it("never leaves the site: the target always starts with a single slash and /poetry", () => {
    for (const path of ["/poems//evil.example", "/poems/%2F%2Fevil.example", "/poems///", "/poems/..%2f..%2fx"]) {
      const target = legacyPoemsTarget(path, "");
      expect(target, path).toMatch(/^\/poetry(\/[^/]+)?$/);
    }
  });
});

describe("the legacy route's loader", () => {
  it("answers /poems with a permanent redirect to /poetry", async () => {
    const res = await answer("/poems");
    expect(res.status).toBe(LEGACY_REDIRECT_STATUS);
    expect(LEGACY_REDIRECT_STATUS).toBe(301);
    expect(res.headers.get("Location")).toBe("/poetry");
  });
  it("keeps the query on the list and on an entry", async () => {
    expect((await answer("/poems?tag=night")).headers.get("Location")).toBe("/poetry?tag=night");
    const entry = await answer("/poems/demo-poem?view=full");
    expect(entry.status).toBe(301);
    expect(entry.headers.get("Location")).toBe("/poetry/demo-poem?view=full");
  });
  it("carries the security headers and a cache policy, and no body", async () => {
    const res = await answer("/poems/demo-poem");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Cache-Control")).toMatch(/s-maxage=\d+/);
    expect(await res.text()).toBe("");
  });
});
