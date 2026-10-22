// Demo entry for "Comparar arquivos CSV" in Ana's portfolio (copied into src/ by scripts/csv-demo/build.sh): the app
// as it is, plus a small "use sample files" pill — a visitor has no CSVs at hand. It fills the app's two file inputs
// (DataTransfer + change event: the same path as choosing a file) with fictional data (@exemplo.com).
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import afiliados from "./demo/afiliados.csv?raw";
import vendas from "./demo/vendas.csv?raw";

function fill(index: number, name: string, text: string) {
  const input = document.querySelectorAll<HTMLInputElement>('input[type="file"]')[index];
  if (!input) return;
  const dt = new DataTransfer();
  dt.items.add(new File([text], name, { type: "text/csv" }));
  input.files = dt.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function SamplePill() {
  return (
    <button
      type="button"
      onClick={() => { fill(0, "afiliados.csv", afiliados); fill(1, "vendas.csv", vendas); }}
      className="fixed bottom-5 right-5 z-50 rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
    >
      Usar arquivos de exemplo
    </button>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <SamplePill />
  </React.StrictMode>
);
