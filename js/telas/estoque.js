// Estoque: vitrine das peças com quantidade em casa e na maleta.
import { h, brl, TIPOS, icone } from "../util.js";
import { S, atualizarTela } from "../estado.js";
import { abrirProduto, abrirBipado } from "../dialogos.js";

let busca = "";
let filtro = "todos";
const FILTROS = [
  ["todos", "Todos"],
  ["maleta", "Na maleta"],
  ["zerado", "Sem estoque"],
  ["fora", "Fora do catálogo"],
];

export function telaEstoque(main) {
  const ps = S.produtos;
  const q = busca.trim().toLowerCase();
  const lista = ps.filter((p) => {
    if (q && ![p.nome, p.marca, p.cor, p.codigo].join(" ").toLowerCase().includes(q)) return false;
    if (filtro === "maleta") return (p.qtdMaleta || 0) > 0;
    if (filtro === "zerado") return (p.qtdEstoque || 0) + (p.qtdMaleta || 0) === 0;
    if (filtro === "fora") return p.noCatalogo === false;
    return true;
  });
  const soma = (f) => ps.reduce((a, p) => a + f(p), 0);
  const casa = soma((p) => p.qtdEstoque || 0);
  const maleta = soma((p) => p.qtdMaleta || 0);

  main.innerHTML = `
    <div class="cab"><div><h1>Estoque</h1><p>Use o botão dourado Bipar para dar entrada, levar na maleta ou vender.</p></div>
      <div class="acoes"><button class="btn" id="novoProd">${icone("mais", 17)} Novo produto</button></div></div>
    <div class="resumo">
      <div><span class="rotulo">Em casa</span><strong>${casa}</strong></div>
      <div class="ouro"><span class="rotulo">Na maleta</span><strong>${maleta}</strong></div>
      <div><span class="rotulo">Valor de custo</span><strong>${brl(soma((p) => ((p.qtdEstoque || 0) + (p.qtdMaleta || 0)) * (p.custo || 0)))}</strong></div>
      <div><span class="rotulo">Valor de venda</span><strong>${brl(soma((p) => ((p.qtdEstoque || 0) + (p.qtdMaleta || 0)) * (p.preco || 0)))}</strong></div>
    </div>
    <div class="filtros">
      <label class="busca">${icone("busca", 17)}<input class="entrada" id="buscaEstoque" value="${h(busca)}" placeholder="Buscar por nome, marca, cor ou código"></label>
      <div class="chips">${FILTROS.map(([k, v]) => `<button class="chip" data-filtro="${k}" aria-pressed="${k === filtro}">${v}</button>`).join("")}</div>
    </div>
    ${
      lista.length
        ? `<div class="vitrine">${lista
            .map((p) => {
              const total = (p.qtdEstoque || 0) + (p.qtdMaleta || 0);
              const foto = S.fotos[p.id];
              return `<button class="peca" data-peca="${p.id}">
                <div class="peca-foto">${foto ? `<img src="${h(foto)}" alt="" loading="lazy">` : icone("oculos", 34)}
                  ${p.qtdMaleta ? `<span class="selo selo-ouro">${icone("maleta", 12)} ${p.qtdMaleta}</span>` : ""}
                  ${p.noCatalogo === false ? `<span class="peca-fora" title="Fora do catálogo">${icone("olho", 12)}</span>` : ""}</div>
                <div class="peca-info"><span class="peca-nome">${h(p.nome)}</span>
                  <span class="peca-meta">${h([p.marca, p.cor].filter(Boolean).join(" · ") || TIPOS[p.tipo] || "")}</span>
                  <span class="peca-fim"><span class="peca-preco">${brl(p.preco)}</span><span class="peca-qtd ${total ? "" : "zero"}">${total ? total + " un." : "sem estoque"}</span></span>
                  <span class="peca-codigo">${h(p.codigo)}</span></div></button>`;
            })
            .join("")}</div>`
        : `<div class="vazio">${icone("oculos")}<h3>${ps.length ? "Nada encontrado" : "Nenhuma armação cadastrada"}</h3>
            <p>${ps.length ? "Tente outro termo ou filtro." : "Cadastre a primeira peça. O app gera o código de barras e a etiqueta para você."}</p>
            ${ps.length ? "" : `<button class="btn" id="novoProd2">${icone("mais", 17)} Cadastrar armação</button>`}</div>`
    }`;

  main.querySelector("#novoProd").addEventListener("click", () => abrirProduto());
  main.querySelector("#novoProd2")?.addEventListener("click", () => abrirProduto());
  main.querySelector("#buscaEstoque").addEventListener("input", (e) => {
    busca = e.target.value;
    atualizarTela();
  });
  main.querySelectorAll("[data-filtro]").forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.filtro;
      atualizarTela();
    }),
  );
  main.querySelectorAll("[data-peca]").forEach((b) => b.addEventListener("click", () => abrirBipado(b.dataset.peca)));
}
