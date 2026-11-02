// Leitor de código de barras: câmera ao vivo (html5-qrcode) ou leitor Bluetooth / digitação.
import { abrirJanela, icone } from "./util.js";

let seq = 0;

export function abrirLeitor({ titulo = "Bipar código", descricao = "Aponte a câmera para o código de barras da etiqueta." } = {}) {
  return new Promise((resolve) => {
    const idArea = `leitor-area-${++seq}`;
    let resolvido = false;
    let leitor = null;

    const dlg = abrirJanela(
      `<span style="display:flex;align-items:center;gap:8px">${icone("bipar", 22)} ${titulo}</span>`,
      `<p class="dica">${descricao}</p>
       <div class="leitor-camera"><div id="${idArea}" class="leitor-video"></div><div class="leitor-mira" aria-hidden="true"></div>
         <div class="leitor-erro" hidden>${icone("camera", 28)}<p>Não consegui abrir a câmera. Permita o acesso à câmera no navegador ou digite o código abaixo.</p></div></div>
       <form class="leitor-manual">
         <label class="campo" for="${idArea}-txt"><span style="display:flex;gap:6px;align-items:center">${icone("teclado", 15)} Leitor Bluetooth ou digitar o código</span></label>
         <div style="display:flex;gap:8px"><input id="${idArea}-txt" class="entrada mono" placeholder="Ex.: E00012" autocomplete="off" enterkeyhint="go"><button class="btn" type="submit">OK</button></div>
       </form>`,
      {
        largura: 460,
        aoFechar: () => {
          if (leitor) {
            leitor.stop().catch(() => {}).finally(() => { try { leitor.clear(); } catch { /* já limpo */ } });
          }
          if (!resolvido) resolve(null);
        },
      },
    );

    const terminar = (codigo) => {
      if (resolvido) return;
      resolvido = true;
      if (navigator.vibrate) navigator.vibrate(80);
      resolve(codigo.trim());
      dlg.close();
    };

    dlg.querySelector(".leitor-manual").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = dlg.querySelector(`#${idArea}-txt`).value.trim();
      if (v) terminar(v);
    });

    if (!window.Html5Qrcode) {
      dlg.querySelector(".leitor-erro").hidden = false;
      return;
    }
    const F = window.Html5QrcodeSupportedFormats;
    leitor = new window.Html5Qrcode(idArea, {
      verbose: false,
      formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.QR_CODE],
    });
    leitor
      .start(
        { facingMode: "environment" },
        { fps: 12, qrbox: (w) => ({ width: Math.min(300, Math.floor(w * 0.85)), height: 130 }), aspectRatio: 1.3 },
        (texto) => terminar(texto),
        () => {},
      )
      .catch(() => {
        dlg.querySelector(".leitor-erro").hidden = false;
        dlg.querySelector(".leitor-mira").hidden = true;
      });
  });
}
