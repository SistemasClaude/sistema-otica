// Clientes: lista com situação de pagamento e ficha com receita, compras e atalhos.
import { h, brl, data, hoje, iniciais, icone, abrirJanela, aviso, waLink, primeiroNome, FORMAS } from "../util.js";
import { S, carrinho, atualizarTela, todasParcelas, nomeLoja, ir } from "../estado.js";
import { abrirCliente, abrirReceita } from "../dialogos.js";
import { excluirCliente } from "../acoes.js";

let busca = "";

function saldos() {
  const hj = hoje();
  const m = new Map();
  todasParcelas().forEach((p) => {
    if (p.pagoEm || !p.venda.clienteId) return;
    const s = m.get(p.venda.clienteId) || { aberto: 0, atrasado: false };
    s.aberto += p.valor;
    if (p.vencimento < hj) s.atrasado = true;
    m.set(p.venda.clienteId, s);
  });
  return m;
}

export function telaClientes(main) {
  const s = saldos();
  const q = busca.trim().toLowerCase();
  const lista = S.clientes.filter((c) => !q || [c.nome, c.telefone, c.bairro].join(" ").toLowerCase().includes(q));

  main.innerHTML = `
    <div class="cab"><div><h1>Clientes</h1><p>${S.clientes.length} cadastrada${S.clientes.length === 1 ? "" : "s"}</p></div>
      <div class="acoes"><button class="btn" id="novaCli">${icone("mais", 17)} Novo cliente</button></div></div>
    <label class="busca" style="margin-bottom:16px">${icone("busca", 17)}<input class="entrada" id="buscaClientes" value="${h(busca)}" placeholder="Buscar por nome, telefone ou bairro"></label>
    ${
      lista.length
        ? `<ul class="caixa-lista">${lista
            .map((c) => {
              const sd = s.get(c.id);
              return `<li><button class="botao-linha linha" data-cliente="${c.id}">
                <span class="avatar">${h(iniciais(c.nome))}</span>
                <span class="linha-texto"><strong>${h(c.nome)}</strong><span>${h([c.bairro, c.telefone].filter(Boolean).join(" · ") || "sem contato")}</span></span>
                ${sd ? `<span class="selo ${sd.atrasado ? "selo-erro" : "selo-alerta"}">${sd.atrasado ? "Atrasada" : "Deve"} ${brl(sd.aberto)}</span>` : `<span class="selo selo-ok">Em dia</span>`}
              </button></li>`;
            })
            .join("")}</ul>`
        : `<div class="vazio">${icone("pessoas")}<p>${S.clientes.length ? "Ninguém encontrado." : "Nenhuma cliente ainda. Cadastre nome, WhatsApp e endereço; a receita fica guardada na ficha."}</p></div>`
    }`;

  main.querySelector("#novaCli").addEventListener("click", () => abrirCliente());
  main.querySelector("#buscaClientes").addEventListener("input", (e) => {
    busca = e.target.value;
    atualizarTela();
  });
  main.querySelectorAll("[data-cliente]").forEach((b) => b.addEventListener("click", () => abrirFicha(b.dataset.cliente)));
}

function receitaHtml(r, antiga) {
  const v = (x) => h(x || "—");
  return `<div class="${antiga ? "antiga" : ""}"><div class="rolar-x"><table class="rx">
    <thead><tr><th></th><th>Esf.</th><th>Cil.</th><th>Eixo</th><th>DNP</th></tr></thead>
    <tbody><tr><th>OD</th><td>${v(r.odEsferico)}</td><td>${v(r.odCilindrico)}</td><td>${v(r.odEixo)}</td><td>${v(r.odDnp)}</td></tr>
    <tr><th>OE</th><td>${v(r.oeEsferico)}</td><td>${v(r.oeCilindrico)}</td><td>${v(r.oeEixo)}</td><td>${v(r.oeDnp)}</td></tr></tbody></table></div>
    <p class="dica" style="margin-top:6px">Adição ${v(r.adicao)} · Altura ${v(r.altura)} · ${data(r.dataReceita)}${
      r.validade ? ` · ${r.validade < hoje() ? `<strong style="color:var(--erro)">vencida em ${data(r.validade)}</strong>` : `válida até ${data(r.validade)}`}` : ""
    }${r.medico ? ` · ${h(r.medico)}` : ""}</p></div>`;
}

function abrirFicha(id) {
  const c = S.clientes.find((x) => x.id === id);
  if (!c) return;
  const receitas = (c.receitas || []).slice().sort((a, b) => (b.dataReceita || "").localeCompare(a.dataReceita || ""));
  const compras = S.vendas.filter((v) => v.clienteId === c.id);
  const sd = saldos().get(c.id);
  const endereco = [c.endereco, c.bairro, S.config.cidade].filter(Boolean).join(", ");
  const dlg = abrirJanela(
    h(c.nome),
    `<div class="contato"><span>${h(c.telefone || "Sem telefone")}</span><span>${h([c.endereco, c.bairro].filter(Boolean).join(" – ") || "Sem endereço")}</span>
       ${c.nascimento ? `<span>Nascimento: ${data(c.nascimento)}</span>` : ""}${c.observacoes ? `<em>${h(c.observacoes)}</em>` : ""}</div>
     <div style="display:flex;gap:8px;flex-wrap:wrap">
       ${c.telefone ? `<a class="btn btn-contorno btn-p" href="${waLink(c.telefone, `Olá, ${primeiroNome(c.nome)}! Aqui é da ${nomeLoja()}.`)}" target="_blank" rel="noopener">${icone("zap", 15)} WhatsApp</a>` : ""}
       ${c.endereco ? `<a class="btn btn-contorno btn-p" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}" target="_blank" rel="noopener">${icone("mapa", 15)} Rota</a>` : ""}
       <button class="btn btn-contorno btn-p" id="fEditar">${icone("lapis", 15)} Editar</button>
       <button class="btn btn-p" id="fVender">${icone("sacola", 15)} Vender</button>
     </div>
     <section class="bloco"><div class="entre" style="align-items:center"><h3>Receita</h3><button class="btn btn-fantasma btn-p" id="fReceita">${icone("receita", 15)} Nova</button></div>
       ${receitas.length ? receitas.map((r, i) => receitaHtml(r, i > 0)).join("") : `<p class="dica">Nenhuma receita guardada.</p>`}</section>
     <section class="bloco"><h3>Compras</h3>
       ${
         compras.length
           ? `<ul class="lista">${compras
               .map(
                 (v) => `<li class="linha"><span class="linha-texto"><strong>${h([...(v.itens || []).map((i) => i.nome), ...(v.extras || []).map((x) => x.descricao)].join(", "))}</strong>
                  <span>${data(v.data)} · ${FORMAS[v.forma] || v.forma}</span></span><strong class="num">${brl(v.total)}</strong></li>`,
               )
               .join("")}</ul>`
           : `<p class="dica">Ainda não comprou.</p>`
       }
       ${sd ? `<p style="margin:0;font-weight:700;color:var(--alerta)">Em aberto: ${brl(sd.aberto)}</p>` : ""}</section>
     <button class="btn btn-fantasma" id="fExcluir">${icone("lixo", 15)} Excluir cliente</button>`,
    { largura: 540 },
  );
  dlg.querySelector("#fEditar").addEventListener("click", () => {
    dlg.close();
    abrirCliente(c);
  });
  dlg.querySelector("#fVender").addEventListener("click", () => {
    carrinho.clienteId = c.id;
    dlg.close();
    ir("vender");
  });
  dlg.querySelector("#fReceita").addEventListener("click", () => {
    dlg.close();
    abrirReceita(c.id);
  });
  dlg.querySelector("#fExcluir").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    if (!b.dataset.confirmar) {
      b.dataset.confirmar = "1";
      b.className = "btn btn-perigo";
      b.textContent = "Confirmar exclusão (apaga as receitas)";
      return;
    }
    try {
      await excluirCliente(c.id);
      aviso("Cliente excluída", { tipo: "ok" });
      dlg.close();
    } catch (err) {
      aviso(err?.message || "Não foi possível excluir.", { tipo: "erro" });
    }
  });
}
