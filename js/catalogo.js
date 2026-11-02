// Catálogo público: lê a vitrine e a loja, e grava o pedido do botão "Quero este".
import { db, demonstracao, collection, doc, getDoc, getDocs, query, where, addDoc, serverTimestamp } from "./firebase.js";
import { h, brl, TIPOS, icone, abrirJanela, waLink } from "./util.js";

const $ = (s) => document.querySelector(s);
let produtos = [];
let loja = {};
let filtro = "todos";

function desenhar() {
  const tipos = [...new Set(produtos.map((p) => p.tipo))];
  const lista = filtro === "todos" ? produtos : produtos.filter((p) => p.tipo === filtro);
  $("#contagem").textContent = lista.length;
  $("#filtros").innerHTML =
    tipos.length > 1
      ? [["todos", "Todas"], ...tipos.map((t) => [t, TIPOS[t] || t])]
          .map(([k, v]) => `<button class="chip" data-tipo="${h(k)}" aria-pressed="${k === filtro}">${h(v)}</button>`)
          .join("")
      : "";

  $("#vitrine").innerHTML = lista.length
    ? lista
        .map(
          (p) => `<article class="produto">
        <div class="produto-foto">${p.foto ? `<img src="${h(p.foto)}" alt="${h(p.nome)}" loading="lazy">` : icone("oculos", 48)}</div>
        <div class="produto-info">
          <span class="produto-tipo">${h(TIPOS[p.tipo] || "")}</span>
          <h3 class="produto-nome">${h(p.nome)}</h3>
          <span class="produto-meta">${h([p.marca, p.cor].filter(Boolean).join(" · "))}</span>
          ${p.descricao ? `<p class="produto-desc">${h(p.descricao)}</p>` : ""}
          <div class="produto-fim"><strong class="produto-preco">${brl(p.preco)}</strong>
            <button class="btn" data-quero="${h(p.id)}">${icone("coracao", 16)} Quero este</button></div>
        </div></article>`,
        )
        .join("")
    : `<div class="vazio" style="grid-column:1/-1">${icone("oculos")}<p>As novidades estão chegando. Fale com a gente pelo WhatsApp!</p></div>`;
}

function aplicarLoja() {
  if (loja.slogan) $("#slogan").textContent = loja.slogan;
  if (loja.textoCatalogo) $("#texto").textContent = loja.textoCatalogo;
  if (loja.nomeLoja) {
    $("#rodapeNome").textContent = loja.nomeLoja;
    document.title = `${loja.nomeLoja} · Catálogo`;
  }
  $("#selo").innerHTML = `${icone("casa", 14)} Atendimento em domicílio${loja.cidade ? " · " + h(loja.cidade) : ""}`;
  if (loja.whatsapp) {
    const a = $("#agendar");
    a.href = waLink(loja.whatsapp, "Olá! Vi o catálogo e gostaria de agendar uma visita.");
    a.innerHTML = `${icone("zap", 18)} Agendar uma visita`;
    a.hidden = false;
  }
  $("#rodapeInfo").innerHTML = [
    loja.cidade ? `<span>${icone("mapa", 13)} ${h(loja.cidade)}</span>` : "",
    loja.instagram ? `<a href="https://instagram.com/${h(loja.instagram.replace(/^@/, ""))}" target="_blank" rel="noopener">${icone("instagram", 13)} ${h(loja.instagram)}</a>` : "",
  ].join("");
}

function pedir(p) {
  const dlg = abrirJanela(
    "Quero esta armação",
    `<div class="pedido-produto"><div class="pedido-foto">${p.foto ? `<img src="${h(p.foto)}" alt="">` : icone("oculos", 28)}</div>
       <div><strong style="font-family:var(--f-titulo);font-size:1.1rem">${h(p.nome)}</strong><p class="dica">${brl(p.preco)} · levamos até você para experimentar</p></div></div>
     <form class="pedido-form">
       <label class="campo">Seu nome<input class="entrada" name="nome" required minlength="2" maxlength="80" autocomplete="name"></label>
       <label class="campo">Seu WhatsApp<input class="entrada" name="telefone" required inputmode="tel" autocomplete="tel" placeholder="(11) 98888-7777" maxlength="30"></label>
       <label class="campo">Bairro<input class="entrada" name="bairro" maxlength="80"></label>
       <label class="campo">Recado (opcional)<textarea class="entrada" name="mensagem" rows="2" maxlength="400" placeholder="Ex.: prefiro visita no sábado de manhã"></textarea></label>
       <p class="erro-texto" hidden></p>
       <button class="btn btn-g" type="submit">Enviar pedido</button>
       <p class="dica" style="text-align:center">Usamos seu nome e telefone só para combinar a visita.</p>
     </form>`,
    { largura: 440 },
  );
  const form = dlg.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const erro = form.querySelector(".erro-texto");
    if (String(f.telefone).replace(/\D/g, "").length < 10) {
      erro.textContent = "Informe o WhatsApp com DDD.";
      erro.hidden = false;
      return;
    }
    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Enviando…";
    try {
      const produtoNome = [p.nome, p.marca].filter(Boolean).join(" · ").slice(0, 200);
      await addDoc(collection(db, "pedidos"), {
        produtoId: p.id,
        produtoNome,
        nome: String(f.nome).trim(),
        telefone: String(f.telefone).trim(),
        bairro: String(f.bairro || "").trim(),
        mensagem: String(f.mensagem || "").trim(),
        status: "novo",
        criadoEm: serverTimestamp(),
      });
      const msg = `Olá! Sou ${String(f.nome).trim()} e acabei de pedir pelo catálogo a armação ${produtoNome}. Gostaria de experimentar!`;
      dlg.querySelector(".janela-corpo").innerHTML = `<div class="sucesso">${icone("check", 44)}
        <h2>Pedido enviado!</h2><p class="dica">Recebemos seu interesse em <strong>${h(produtoNome)}</strong>. Vamos chamar você no WhatsApp para combinar a visita.</p>
        ${loja.whatsapp ? `<a class="btn btn-g" href="${waLink(loja.whatsapp, msg)}" target="_blank" rel="noopener">${icone("zap", 18)} Falar agora no WhatsApp</a>` : ""}
        <button class="btn btn-fantasma" data-fechar>Fechar</button></div>`;
    } catch {
      erro.textContent = "Não foi possível enviar agora. Tente de novo em instantes.";
      erro.hidden = false;
      botao.disabled = false;
      botao.textContent = "Enviar pedido";
    }
  });
}

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-tipo]");
  if (t) {
    filtro = t.dataset.tipo;
    desenhar();
  }
  const q = e.target.closest("[data-quero]");
  if (q) {
    const p = produtos.find((x) => x.id === q.dataset.quero);
    if (p) pedir(p);
  }
});

async function iniciar() {
  if (demonstracao) {
    const faixa = document.createElement("div");
    faixa.className = "faixa-demo";
    faixa.innerHTML = `<strong>Demonstração</strong> · produtos de exemplo. Some quando o Firebase for ligado. <a href="painel.html">Abrir o painel</a>`;
    document.body.prepend(faixa);
  }
  try {
    const [cfg, snap] = await Promise.all([
      getDoc(doc(db, "config", "loja")),
      getDocs(query(collection(db, "catalogo"), where("disponivel", "==", true))),
    ]);
    loja = cfg.exists() ? cfg.data() : {};
    produtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
    aplicarLoja();
    desenhar();
  } catch {
    $("#vitrine").innerHTML = `<div class="vazio" style="grid-column:1/-1"><p>Não foi possível carregar o catálogo agora. Tente de novo em instantes.</p></div>`;
  }
}
iniciar();
