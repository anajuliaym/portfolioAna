// Demo build of Bridge for Ana's portfolio (copied into src/ by scripts/bridge-demo/build.sh — not part of the app's
// repo). The app talks to a Cloudflare Worker (D1/R2); the portfolio serves it as static files, so every `/api/*`
// fetch is answered here, in the browser, by the app's own in-memory handler (api-handler.ts + backend-store, seeded
// with sample profiles). Any e-mail/password signs in: an unknown login creates that account on the spot.
// SUBSTITUIR EM PRODUÇÃO: só para a demonstração; o app real usa o Worker.
import { handleApiRequest } from "./lib/api-handler";

/** called from demo-main.tsx (the app declares "sideEffects": false, so a bare side-effect import would be dropped) */
export function installDemoApi() {
  if (typeof window === "undefined" || (window as unknown as { __bridgeDemo?: boolean }).__bridgeDemo) return;
  (window as unknown as { __bridgeDemo?: boolean }).__bridgeDemo = true;
  const real = window.fetch.bind(window);
  const json = (result: { status: number }) =>
    new Response(JSON.stringify(result), { status: result.status, headers: { "Content-Type": "application/json" } });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return real(input, init);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const headers: Record<string, string> = {};
    new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined)).forEach((v, k) => { headers[k.toLowerCase()] = v; });
    let body: unknown = init?.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { /* leave as text */ } }
    const req = { method, path: url.pathname, body, headers };
    let result = await handleApiRequest(req);
    if (url.pathname === "/api/auth/login" && method === "POST" && result.status === 401) {
      // demo: whoever logs in gets an account
      const { email = "voce@bridge.demo", password = "demo" } = (body ?? {}) as { email?: string; password?: string };
      const name = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Você";
      await handleApiRequest({ method: "POST", path: "/api/auth/signup", headers, body: {
        email, password,
        profile: { name, role: "Profissional", type: "professional", bio: "", skills: [], location: "São Paulo, BR",
          distanceKm: 0, workType: "Remoto", contract: "PJ", experience: [], portfolio: [], rating: 5, available: true },
      } });
      result = await handleApiRequest(req);
    }
    return json(result);
  };
}
