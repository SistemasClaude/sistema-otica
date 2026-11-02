// Pedidos: clientes que tocaram em "Quero este" no catálogo.
import { h, icone, waLink, primeiroNome, dataDe, aviso } from "../util.js";
import { S, carrinho, limparCarrinho, adicionarAoCarrinho, atualizarTela, nomeLoja, ir } from "../estado.js";
import { statusPedido } from "../acoes.js";
import { abrirCliente } from "../dialogos.js";

const ROTULO = { novo: ["Novo", "selo-ouro"], em_contato: ["Em contato", "selo-alerta"], vendido: ["Vendido", "selo-ok"], cancelado: ["Descartado", ""] };
let filtro = "ativos";

function irVender(pedido, clienteId) {
  limparCarrinho();
  carrinho.clienteId = clienteId;
  carrinho.pedidoId = pedido.id;
  const p = S.produtos.find((x) => x.id === pedido.produtoId);
  if (p && (p.qtdEstoque || 0) + (p.qtdMaleta || 0) > 0) adicionarAoCarrinho(p);
  ir("vender");
}

async function mudar(id, status) {
  try {
    await statusPedido(id, status);
  } catch (err) {
    aviso(err?.message || "Não foi possível salvar.", { tipo: "erro" });
  }
}

export function telaPedidos(main) {
  const lista = S.pedidos.filter((p) => filtro === "todos" || p.status === "novo" || p.status === "em_contato");
  main.innerHTML = `
    <div class="cab"><div><h1>Pedidos do catálogo</h1><p>Clientes que tocaram em “Quero este” no seu catálogo.</p></div></div>
    <div class="chips" style="margin-bottom:12px">
      <button class="chip" data-f="ativos" aria-pressed="${filtro === "ativos"}">Para atender</button>
      <button class="chip" data-f="todos" aria-pressed="${filtro === "todos"}">Todos</button>
    </div>
    ${
      lista.length
        ? `<div class="pedidos">${lista
            .map((p) => {
              const [rotulo, classe] = ROTULO[p.status] || ROTULO.novo;
              const foto = S.fotos[p.produtoId];
              const msg = `Olá, ${primeiroNome(p.nome)}! Aqui é da ${nomeLoja()}. Recebi seu interesse na armação ${p.produtoNome}. Quando posso levar para você experimentar?`;
              const ativo = p.status === "novo" || p.status === "em_contato";
              return `<div class="cartao pilha" style="gap:12px">
                <div class="linha" style="padding:0;border:0"><span class="mini-foto">${foto ? `<img src="${h(foto)}" alt="">` : icone("oculos", 22)}</span>
                  <span class="linha-texto"><strong style="font-family:var(--f-titulo)">${h(p.produtoNome)}</strong><span>${h(dataDe(p.criadoEm))}</span></span>
                  <span class="selo ${classe}">${rotulo}</span></div>
                <div class="pedido-cliente"><strong>${h(p.nome)}</strong><span>${h(p.telefone)}${p.bairro ? " · " + h(p.bairro) : ""}</span>${p.mensagem ? `<em>“${h(p.mensagem)}”</em>` : ""}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <a class="btn btn-contorno btn-p" href="${waLink(p.telefone, msg)}" target="_blank" rel="noopener" data-contato="${p.status === "novo" ? p.id : ""}">${icone("zap", 15)} Chamar no WhatsApp</a>
                  ${ativo ? `<button class="btn btn-p" data-vender="${p.id}">${icone("sacola", 15)} Vender</button>` : ""}
                  ${p.status === "novo" ? `<button class="btn btn-fantasma btn-p" data-status="em_contato" data-id="${p.id}">Já falei</button>` : ""}
                  ${ativo ? `<button class="btn btn-fantasma btn-p" data-status="cancelado" data-id="${p.id}">${icone("fechar", 14)} Descartar</button>` : ""}
                </div></div>`;
            })
            .join("")}</div>`
        : `<div class="vazio">${icone("caixa")}<p>Nenhum pedido para atender. Mande o link do catálogo para suas clientes (em Minha Ótica).</p></div>`
    }`;

  main.querySelectorAll("[data-f]").forEach((b) =>
    b.addEventListener("click", () => {
      filtro = b.dataset.f;
      atualizarTela();
    }),
  );
  main.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => mudar(b.dataset.id, b.dataset.status)));
  main.querySelectorAll("[data-contato]").forEach((a) => a.addEventListener("click", () => a.dataset.contato && mudar(a.dataset.contato, "em_contato")));
  main.querySelectorAll("[data-vender]").forEach((b) =>
    b.addEventListener("click", () => {
      const pedido = S.pedidos.find((p) => p.id === b.dataset.vender);
      const digitos = pedido.telefone.replace(/\D/g, "");
      const existente = digitos.length >= 8 && S.clientes.find((c) => (c.telefone || "").replace(/\D/g, "").endsWith(digitos.slice(-8)));
      if (existente) irVender(pedido, existente.id);
      else abrirCliente(null, { inicial: { nome: pedido.nome, telefone: pedido.telefone, bairro: pedido.bairro }, aoSalvar: (id) => irVender(pedido, id) });
    }),
  );
}
