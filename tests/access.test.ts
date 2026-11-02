import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
const signedIn = { headers: { cookie: "forma_session=abc" } };
describe("Account access gate", () => {
  it("keeps the landing and auth pages public", () => {
    for (const route of ["/", "/login", "/signup"])
      expect(
        proxy(new NextRequest(`https://example.test${route}`)).status,
      ).toBe(200);
  });
  it("sends signed-out visitors to log in and refuses the API", () => {
    const app = proxy(new NextRequest("https://example.test/app/projects"));
    expect(app.status).toBe(307);
    expect(app.headers.get("location")).toBe("https://example.test/login");
    expect(
      proxy(new NextRequest("https://example.test/api/workspace")).status,
    ).toBe(401);
  });
  it("lets a session cookie through to the server-side check", () => {
    expect(
      proxy(new NextRequest("https://example.test/app", signedIn)).status,
    ).toBe(200);
    expect(
      proxy(new NextRequest("https://example.test/api/workspace", signedIn))
        .status,
    ).toBe(200);
  });
  it("redirects old root-level section links into the app", () => {
    const res = proxy(new NextRequest("https://example.test/projects/p1"));
    expect(res.headers.get("location")).toBe(
      "https://example.test/app/projects/p1",
    );
  });
});
