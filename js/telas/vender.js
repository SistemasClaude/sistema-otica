// Vender: cliente, armações bipadas, lentes/serviços, pagamento (com crediário) e recibo no WhatsApp.
import { h, brl, data, hoje, numero, numeroCampo, icone, abrirJanela, aviso, waLink, copiar, FORMAS } from "../util.js";
import { S, carrinho, limparCarrinho, adicionarAoCarrinho, produtoPorCodigo, atualizarTela, nomeLoja } from "../estado.js";
import { criarVenda, previaParcelas } from "../acoes.js";
import { abrirLeitor } from "../leitor.js";
import { abrirCliente } from "../dialogos.js";

let fechando = false;

const subtotal = () => carrinho.itens.reduce((a, i) => a + i.preco * i.quantidade, 0) + carrinho.extras.reduce((a, x) => a + x.valor, 0);
const total = () => Math.max(0, subtotal() - (carrinho.desconto || 0));
const entrada = () => (carrinho.forma === "crediario" ? Math.min(carrinho.entrada || 0, total()) : 0);

export function telaVender(main) {
  const cliente = S.clientes.find((c) => c.id === carrinho.clienteId);
  const temItens = carrinho.itens.length + carrinho.extras.length > 0;
  const parcelas = carrinho.forma === "crediario" ? previaParcelas(total(), entrada(), carrinho.numeroParcelas, carrinho.primeiroVencimento) : [];
  const botaoTexto = !cliente ? "Escolha a cliente" : !temItens ? "Adicione um item" : `Fechar venda · ${brl(total())}`;

  main.innerHTML = `
  <div class="cab"><div><h1>Nova venda</h1><p>Bipe a armação, some a lente e escolha como a cliente vai pagar.</p></div>
    ${temItens || carrinho.clienteId ? `<div class="acoes"><button class="btn btn-fantasma" id="limpar">Limpar venda</button></div>` : ""}</div>
  <div class="colunas">
    <div class="pilha">
      <section class="cartao">
        <h2 class="secao">1 · Cliente</h2>
        <div style="display:flex;gap:8px">
          <select class="entrada" id="vCliente" style="flex:1"><option value="">Escolha a cliente…</option>
            ${S.clientes.map((c) => `<option value="${c.id}" ${c.id === carrinho.clienteId ? "selected" : ""}>${h(c.nome)}</option>`).join("")}</select>
          <button class="btn btn-contorno" id="novaCliente">${icone("mais", 16)} Nova</button>
        </div>
      </section>

      <section class="cartao">
        <h2 class="secao">2 · Armações e lentes</h2>
        <div class="duplo">
          <button class="btn btn-g btn-brilho" id="biparItem">${icone("bipar", 20)} Bipar armação</button>
          <button class="btn btn-g btn-contorno" id="escolherItem">${icone("lista", 18)} Escolher da lista</button>
        </div>
        <div style="margin-top:8px">
        ${
          temItens
            ? carrinho.itens
                .map(
                  (i, k) => `<div class="item-venda">
                <div class="linha-texto"><strong>${h(i.nome)}</strong><span class="mono">${h(i.codigo)}</span></div>
                <div class="qtd-ctrl"><button data-qtd="${k}" data-d="-1" aria-label="Diminuir">${icone("menos")}</button><span>${i.quantidade}</span>
                  <button data-qtd="${k}" data-d="1" aria-label="Aumentar" ${i.quantidade >= i.disponivel ? "disabled" : ""}>${icone("mais")}</button></div>
                <input class="entrada preco-item" id="preco-${k}" data-preco="${k}" inputmode="decimal" value="${numeroCampo(i.preco)}" aria-label="Preço">
              </div>`,
                )
                .join("") +
              carrinho.extras
                .map(
                  (x, k) => `<div class="item-venda">
                <div class="linha-texto"><strong>${h(x.descricao)}</strong><span>Lente / serviço</span></div>
                <strong class="num">${brl(x.valor)}</strong>
                <button class="btn btn-fantasma btn-p" data-tirar-extra="${k}" aria-label="Remover">${icone("lixo", 16)}</button></div>`,
                )
                .join("")
            : `<p class="dica">Nenhum item ainda. Bipe a etiqueta da armação escolhida.</p>`
        }
        </div>
        <form class="caixa-extra" id="fExtra">
          <span class="rotulo">Adicionar lente ou serviço</span>
          <input class="entrada" name="descricao" id="extraDesc" placeholder="Ex.: Lentes multifocais antirreflexo">
          <div style="display:flex;gap:8px">
            <input class="entrada" name="valor" id="extraValor" inputmode="decimal" placeholder="Valor R$">
            <input class="entrada" name="custo" id="extraCusto" inputmode="decimal" placeholder="Seu custo R$">
            <button class="btn btn-escuro" type="submit" aria-label="Adicionar">${icone("mais", 18)}</button>
          </div>
        </form>
      </section>
    </div>

    <section class="cartao fixo pilha" style="gap:12px">
      <h2 class="secao" style="margin:0">3 · Pagamento</h2>
      <div class="formas">${Object.entries(FORMAS).map(([k, v]) => `<button class="forma" data-forma="${k}" aria-pressed="${carrinho.forma === k}">${v}</button>`).join("")}</div>
      <div class="grade-form">
        <label class="campo">Desconto (R$)<input class="entrada" id="vDesconto" inputmode="decimal" value="${numeroCampo(carrinho.desconto)}" placeholder="0,00"></label>
        ${
          carrinho.forma === "crediario"
            ? `<label class="campo">Entrada (R$)<input class="entrada" id="vEntrada" inputmode="decimal" value="${numeroCampo(carrinho.entrada)}" placeholder="0,00"></label>
               <label class="campo">Parcelas<select class="entrada" id="vParcelas">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12]
                 .map((n) => `<option ${n === carrinho.numeroParcelas ? "selected" : ""} value="${n}">${n}x</option>`)
                 .join("")}</select></label>
               <label class="campo">1º vencimento<input class="entrada" type="date" id="vPrimeiro" value="${carrinho.primeiroVencimento}"></label>`
            : ""
        }
      </div>
      ${parcelas.length ? `<ul class="plano">${parcelas.map((p) => `<li><span>${p.numero}ª · ${data(p.vencimento)}</span><strong>${brl(p.valor)}</strong></li>`).join("")}</ul>` : ""}
      <div class="totais">
        <div><span>Subtotal</span><span>${brl(subtotal())}</span></div>
        ${carrinho.desconto ? `<div><span>Desconto</span><span>-${brl(carrinho.desconto)}</span></div>` : ""}
        ${entrada() ? `<div><span>Entrada</span><span>${brl(entrada())}</span></div>` : ""}
        <div class="total"><span>Total</span><strong>${brl(total())}</strong></div>
      </div>
      <button class="btn btn-g btn-larga btn-brilho" id="fecharVenda" ${!cliente || !temItens || fechando ? "disabled" : ""}>${fechando ? "Salvando…" : botaoTexto}</button>
    </section>
  </div>`;

  const $ = (s) => main.querySelector(s);
  $("#limpar")?.addEventListener("click", () => {
    limparCarrinho();
    atualizarTela();
  });
  $("#vCliente").addEventListener("change", (e) => {
    carrinho.clienteId = e.target.value;
    atualizarTela();
  });
  $("#novaCliente").addEventListener("click", () =>
    abrirCliente(null, {
      aoSalvar: (id) => {
        carrinho.clienteId = id;
        atualizarTela();
      },
    }),
  );
  $("#biparItem").addEventListener("click", async () => {
    const codigo = await abrirLeitor({ titulo: "Bipar armação" });
    if (!codigo) return;
    const p = produtoPorCodigo(codigo);
    if (!p) return aviso(`Código ${codigo} não cadastrado`, { tipo: "erro" });
    if ((p.qtdEstoque || 0) + (p.qtdMaleta || 0) < 1) return aviso(`${p.nome} está sem estoque`, { tipo: "erro" });
    adicionarAoCarrinho(p);
    aviso(`${p.nome} adicionada`, { tipo: "ok" });
    atualizarTela();
  });
  $("#escolherItem").addEventListener("click", escolherDaLista);
  main.querySelectorAll("[data-qtd]").forEach((b) =>
    b.addEventListener("click", () => {
      const i = carrinho.itens[Number(b.dataset.qtd)];
      i.quantidade += Number(b.dataset.d);
      if (i.quantidade <= 0) carrinho.itens.splice(Number(b.dataset.qtd), 1);
      atualizarTela();
    }),
  );
  main.querySelectorAll("[data-preco]").forEach((inp) =>
    inp.addEventListener("change", () => {
      carrinho.itens[Number(inp.dataset.preco)].preco = numero(inp.value);
      atualizarTela();
    }),
  );
  main.querySelectorAll("[data-tirar-extra]").forEach((b) =>
    b.addEventListener("click", () => {
      carrinho.extras.splice(Number(b.dataset.tirarExtra), 1);
      atualizarTela();
    }),
  );
  $("#fExtra").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (!String(f.descricao).trim() || !numero(f.valor)) return aviso("Informe a descrição e o valor.", { tipo: "erro" });
    carrinho.extras.push({ descricao: String(f.descricao).trim(), valor: numero(f.valor), custo: numero(f.custo) });
    atualizarTela();
  });
  main.querySelectorAll("[data-forma]").forEach((b) =>
    b.addEventListener("click", () => {
      carrinho.forma = b.dataset.forma;
      atualizarTela();
    }),
  );
  $("#vDesconto").addEventListener("change", (e) => {
    carrinho.desconto = numero(e.target.value);
    atualizarTela();
  });
  $("#vEntrada")?.addEventListener("change", (e) => {
    carrinho.entrada = numero(e.target.value);
    atualizarTela();
  });
  $("#vParcelas")?.addEventListener("change", (e) => {
    carrinho.numeroParcelas = Number(e.target.value);
    atualizarTela();
  });
  $("#vPrimeiro")?.addEventListener("change", (e) => {
    if (e.target.value) carrinho.primeiroVencimento = e.target.value;
    atualizarTela();
  });
  $("#fecharVenda").addEventListener("click", () => fechar(cliente));
}

function escolherDaLista() {
  const disponiveis = S.produtos
    .filter((p) => (p.qtdEstoque || 0) + (p.qtdMaleta || 0) > 0)
    .sort((a, b) => (b.qtdMaleta || 0) - (a.qtdMaleta || 0) || a.nome.localeCompare(b.nome));
  const linhas = (q) =>
    disponiveis
      .filter((p) => !q || [p.nome, p.marca, p.cor, p.codigo].join(" ").toLowerCase().includes(q))
      .map(
        (p) => `<li><button class="botao-linha linha" data-escolher="${p.id}" style="padding:12px 8px">
          <span class="linha-texto"><strong>${h(p.nome)}</strong><span>${h([p.marca, p.cor].filter(Boolean).join(" · "))}${p.qtdMaleta ? " · na maleta" : ""}</span></span>
          <strong class="num">${brl(p.preco)}</strong></button></li>`,
      )
      .join("") || `<li class="dica" style="padding:12px">Nenhuma peça com estoque.</li>`;
  const dlg = abrirJanela(
    "Escolher armação",
    `<input class="entrada" id="buscaLista" placeholder="Buscar">
     <ul class="lista" id="listaEscolha" style="max-height:55dvh;overflow-y:auto">${linhas("")}</ul>`,
    { largura: 480 },
  );
  dlg.querySelector("#buscaLista").addEventListener("input", (e) => {
    dlg.querySelector("#listaEscolha").innerHTML = linhas(e.target.value.trim().toLowerCase());
  });
  dlg.addEventListener("click", (e) => {
    const b = e.target.closest("[data-escolher]");
    if (!b) return;
    adicionarAoCarrinho(S.produtos.find((p) => p.id === b.dataset.escolher));
    dlg.close();
    atualizarTela();
  });
}

async function fechar(cliente) {
  if (!cliente || fechando) return;
  fechando = true;
  atualizarTela();
  const venda = {
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    itens: carrinho.itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, preco: i.preco })),
    extras: carrinho.extras,
    desconto: carrinho.desconto || 0,
    forma: carrinho.forma,
    entrada: carrinho.entrada || 0,
    numeroParcelas: carrinho.numeroParcelas,
    primeiroVencimento: carrinho.primeiroVencimento,
    pedidoId: carrinho.pedidoId,
  };
  const parcelas = carrinho.forma === "crediario" ? previaParcelas(total(), entrada(), carrinho.numeroParcelas, carrinho.primeiroVencimento) : [];
  const linhas = [`*${nomeLoja()}* ⭐ comprovante`, `Data: ${data(hoje())}`, `Cliente: ${cliente.nome}`, ""];
  carrinho.itens.forEach((i) => linhas.push(`• ${i.quantidade}x ${i.nome}: ${brl(i.preco * i.quantidade)}`));
  carrinho.extras.forEach((x) => linhas.push(`• ${x.descricao}: ${brl(x.valor)}`));
  if (carrinho.desconto) linhas.push(`Desconto: -${brl(carrinho.desconto)}`);
  const entradaValor = entrada();
  try {
    const r = await criarVenda(venda);
    linhas.push(`*Total: ${brl(r.total)}*`, `Pagamento: ${FORMAS[venda.forma]}`);
    if (venda.forma === "crediario") {
      if (entradaValor) linhas.push(`Entrada: ${brl(entradaValor)}`);
      parcelas.forEach((p) => linhas.push(`${p.numero}ª parcela: ${data(p.vencimento)} · ${brl(p.valor)}`));
      if (S.config.chavePix) linhas.push("", `Chave Pix: ${S.config.chavePix}`);
    }
    linhas.push("", "Obrigada pela confiança!");
    const texto = linhas.join("\n");
    limparCarrinho();
    fechando = false;
    atualizarTela();
    const dlg = abrirJanela(
      `<span style="color:var(--ok);display:flex;gap:8px;align-items:center">${icone("check", 24)} Venda fechada</span>`,
      `<pre class="recibo">${h(texto)}</pre>
       <div style="display:flex;gap:8px;flex-wrap:wrap">
         ${cliente.telefone ? `<a class="btn btn-ok" style="flex:1" href="${waLink(cliente.telefone, texto)}" target="_blank" rel="noopener">${icone("zap", 17)} Enviar no WhatsApp</a>` : ""}
         <button class="btn btn-contorno" id="copiarRecibo">${icone("copiar", 16)} Copiar</button></div>`,
      { largura: 440 },
    );
    dlg.querySelector("#copiarRecibo").addEventListener("click", () => copiar(texto));
  } catch (err) {
    fechando = false;
    atualizarTela();
    aviso(err?.message || "Não foi possível salvar a venda.", { tipo: "erro" });
  }
}
