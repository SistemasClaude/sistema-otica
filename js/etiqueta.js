// Etiqueta com código de barras para colar na haste. Baixa como PNG para imprimir na impressora térmica.
import { brl } from "./util.js";

export function desenharEtiqueta(svg, codigo) {
  if (!window.JsBarcode || !codigo) return false;
  try {
    window.JsBarcode(svg, codigo, { format: "CODE128", width: 2, height: 56, fontSize: 14, margin: 6, background: "#ffffff", lineColor: "#000000" });
    return true;
  } catch {
    return false;
  }
}

export function baixarEtiqueta(codigo, nome, preco) {
  if (!window.JsBarcode || !codigo) return;
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 250;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  const barras = document.createElement("canvas");
  window.JsBarcode(barras, codigo, { format: "CODE128", width: 3, height: 110, fontSize: 22, margin: 0, background: "#ffffff" });
  const w = Math.min(440, barras.width);
  ctx.drawImage(barras, (480 - w) / 2, 14, w, barras.height * (w / barras.width));
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText((nome || "").slice(0, 34), 240, 204);
  if (preco) {
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(brl(preco), 240, 236);
  }
  const a = document.createElement("a");
  a.download = `etiqueta-${codigo}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
