// Demo entry for Bridge in Ana's portfolio (copied into src/ by scripts/bridge-demo/build.sh). The app is a TanStack
// Start project (SSR on a Cloudflare Worker); its client bundle cannot boot from a static page (hydration expects the
// server's markup — "Invariant failed"). Here it runs as a plain SPA: same routes, same components, mounted with
// createRoot, and the API answered in the browser (demo-api.ts).
import { installDemoApi } from "./demo-api";
import "./styles.css";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

installDemoApi();

// the portfolio opens /protos/bridge/index.html (explicit, so no SPA fallback catches it); the router wants the base
if (location.pathname.endsWith("/index.html")) history.replaceState(null, "", location.pathname.replace(/index\.html$/, "") + location.search + location.hash);

createRoot(document.getElementById("root")!).render(<RouterProvider router={getRouter()} />);
