// Cobranças: parcelas do crediário, com "Recebi" e lembrete pronto no WhatsApp.
import { h, brl, data, hoje, diasAte, iniciais, icone, aviso, waLink, primeiroNome } from "../util.js";
import { S, todasParcelas, atualizarTela, nomeLoja } from "../estado.js";
import { marcarParcela } from "../acoes.js";

let aba = "abertas";

export function telaCobrancas(main) {
  const hj = hoje();
  const todas = todasParcelas();
  const abertas = todas.filter((p) => !p.pagoEm).sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const atrasadas = abertas.filter((p) => p.vencimento < hj);
  const semana = abertas.filter((p) => p.vencimento >= hj && diasAte(p.vencimento) <= 7);
  const pagas = todas.filter((p) => p.pagoEm).sort((a, b) => b.pagoEm.localeCompare(a.pagoEm)).slice(0, 60);
  const lista = aba === "atrasadas" ? atrasadas : aba === "pagas" ? pagas : abertas;
  const clientes = new Map(S.clientes.map((c) => [c.id, c]));
  const soma = (l) => brl(l.reduce((a, p) => a + p.valor, 0));

  main.innerHTML = `
    <div class="cab"><div><h1>Cobranças</h1><p>Parcelas do crediário. Toque em Recebi quando a cliente pagar.</p></div></div>
    <div class="kpis" style="margin-bottom:16px">
      <div class="kpi"><span class="rotulo">A receber</span><strong>${soma(abertas)}</strong><small>${abertas.length} parcelas</small></div>
      <div class="kpi ${atrasadas.length ? "ruim" : ""}"><span class="rotulo">Atrasado</span><strong>${soma(atrasadas)}</strong><small>${atrasadas.length} parcelas</small></div>
      <div class="kpi"><span class="rotulo">Vence em 7 dias</span><strong>${soma(semana)}</strong><small>${semana.length} parcelas</small></div>
      <div class="kpi ouro"><span class="rotulo">Pix nas mensagens</span><strong style="font-size:1rem">${h(S.config.chavePix || "não cadastrado")}</strong><small>altere em Minha Ótica</small></div>
    </div>
    <div class="chips" style="margin-bottom:12px">
      ${[["abertas", `Em aberto (${abertas.length})`], ["atrasadas", `Atrasadas (${atrasadas.length})`], ["pagas", "Pagas"]]
        .map(([k, v]) => `<button class="chip" data-aba="${k}" aria-pressed="${aba === k}">${v}</button>`)
        .join("")}
    </div>
    ${
      lista.length
        ? `<div class="pilha" style="gap:8px">${lista
            .map((p) => {
              const d = diasAte(p.vencimento);
              const c = clientes.get(p.venda.clienteId);
              const selo = p.pagoEm
                ? `<span class="selo selo-ok">Paga ${data(p.pagoEm)}</span>`
                : d < 0
                  ? `<span class="selo selo-erro">${-d} dia(s) de atraso</span>`
                  : d <= 7
                    ? `<span class="selo selo-alerta">${d === 0 ? "Vence hoje" : `Vence em ${d} dia(s)`}</span>`
                    : `<span class="selo">Em aberto</span>`;
              const msg =
                `Olá, ${primeiroNome(p.venda.clienteNome)}! Tudo bem? Aqui é da ${nomeLoja()}. ` +
                (d < 0
                  ? `Passando para lembrar da ${p.numero}ª parcela dos seus óculos, de ${brl(p.valor)}, que venceu em ${data(p.vencimento)}.`
                  : `Lembrete: a ${p.numero}ª parcela dos seus óculos, de ${brl(p.valor)}, vence em ${data(p.vencimento)}.`) +
                (S.config.chavePix ? ` Se preferir, pode pagar no Pix: ${S.config.chavePix}.` : "") +
                " Obrigada! ⭐";
              return `<div class="parcela ${!p.pagoEm && d < 0 ? "atrasada" : ""}">
                <div class="linha" style="padding:0;border:0"><span class="avatar">${h(iniciais(p.venda.clienteNome))}</span>
                  <span class="linha-texto"><strong>${h(p.venda.clienteNome)}</strong><span>${p.numero}ª de ${p.total} · vence ${data(p.vencimento)}</span></span>
                  <span class="linha-fim"><strong>${brl(p.valor)}</strong>${selo}</span></div>
                <div class="parcela-acoes">
                  ${
                    p.pagoEm
                      ? `<button class="btn btn-fantasma btn-p" data-pagar="${p.venda.id}" data-numero="${p.numero}" data-pago="0">${icone("desfazer", 15)} Desfazer</button>`
                      : `<button class="btn btn-ok btn-p" data-pagar="${p.venda.id}" data-numero="${p.numero}" data-pago="1">${icone("check", 15)} Recebi</button>
                         ${c?.telefone ? `<a class="btn btn-contorno btn-p" href="${waLink(c.telefone, msg)}" target="_blank" rel="noopener">${icone("zap", 15)} Cobrar no WhatsApp</a>` : ""}`
                  }
                </div></div>`;
            })
            .join("")}</div>`
        : `<div class="vazio">${icone("calendario")}<p>${aba === "pagas" ? "Nenhum pagamento registrado ainda." : "Nada por aqui. Tudo em dia!"}</p></div>`
    }`;

  main.querySelectorAll("[data-aba]").forEach((b) =>
    b.addEventListener("click", () => {
      aba = b.dataset.aba;
      atualizarTela();
    }),
  );
  main.querySelectorAll("[data-pagar]").forEach((b) =>
    b.addEventListener("click", async () => {
      const venda = S.vendas.find((v) => v.id === b.dataset.pagar);
      const pago = b.dataset.pago === "1";
      const numero = Number(b.dataset.numero);
      b.disabled = true;
      try {
        await marcarParcela(venda, numero, pago);
        const p = venda.parcelas.find((x) => x.numero === numero);
        aviso(pago ? `Recebido ${brl(p.valor)} de ${venda.clienteNome}` : "Pagamento desfeito", { tipo: "ok" });
      } catch (err) {
        b.disabled = false;
        aviso(err?.message || "Não foi possível salvar.", { tipo: "erro" });
      }
    }),
  );
}
