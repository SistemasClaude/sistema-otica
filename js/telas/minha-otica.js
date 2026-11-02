// Minha Ótica: dados da loja, link do catálogo, resumo do mês e vendas recentes (com cancelamento).
import { h, brl, data, hoje, mes, icone, aviso, copiar, FORMAS } from "../util.js";
import { S, nomeLoja } from "../estado.js";
import { salvarConfig, cancelarVenda } from "../acoes.js";

const PADRAO = {
  nomeLoja: "Sua Ótica",
  slogan: "Seus óculos novos, no conforto da sua casa.",
  textoCatalogo: "Escolha a armação que mais combina com você. Eu levo até a sua casa para você experimentar sem compromisso.",
};

// Guarda o que está sendo digitado, para não perder se a tela redesenhar (ex.: chegou um pedido).
let rascunho = null;

export function telaMinhaOtica(main) {
  const c = { ...PADRAO, ...S.config, ...(rascunho || {}) };
  const link = new URL("index.html", location.href).href;
  const convite = `${nomeLoja()} ✦ ${c.slogan}\nVeja as armações e escolha a sua: ${link}`;
  const m = mes(hoje());
  const vm = S.vendas.filter((v) => mes(v.data) === m);
  const fat = vm.reduce((a, v) => a + (v.total || 0), 0);

  main.innerHTML = `
    <div class="cab"><div><h1>Minha Ótica</h1><p>Dados da loja, link do catálogo e histórico de vendas.</p></div></div>
    <div class="pilha">
      <section class="faixa-link">
        <img src="assets/logo.svg" alt="">
        <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:2px">
          <span class="rotulo">Link do seu catálogo</span>
          <a class="link" href="${h(link)}" target="_blank" rel="noopener">${h(link.replace(/^https?:\/\//, ""))}</a>
          <span class="dica">Mande no WhatsApp, coloque na bio do Instagram ou no status.</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-contorno btn-p" id="copiarLink">${icone("copiar", 15)} Copiar link</button>
          <a class="btn btn-p" href="https://wa.me/?text=${encodeURIComponent(convite)}" target="_blank" rel="noopener">${icone("zap", 15)} Enviar no WhatsApp</a>
        </div>
      </section>

      <div class="duas">
        <form class="cartao pilha" style="gap:12px" id="fConfig">
          <h2>Dados da ótica</h2>
          <label class="campo">Nome da ótica<input class="entrada" id="cfNome" name="nomeLoja" required value="${h(c.nomeLoja)}"></label>
          <label class="campo">Frase de destaque do catálogo<input class="entrada" id="cfSlogan" name="slogan" value="${h(c.slogan)}"></label>
          <label class="campo">WhatsApp da ótica (recebe os pedidos)<input class="entrada" id="cfZap" name="whatsapp" inputmode="tel" value="${h(c.whatsapp)}" placeholder="(11) 98888-7777"></label>
          <label class="campo">Chave Pix (vai nas cobranças e recibos)<input class="entrada" id="cfPix" name="chavePix" value="${h(c.chavePix)}" placeholder="CPF, celular, e-mail ou aleatória"></label>
          <div class="grade-form">
            <label class="campo">Cidade<input class="entrada" id="cfCidade" name="cidade" value="${h(c.cidade)}"></label>
            <label class="campo">Instagram<input class="entrada" id="cfInsta" name="instagram" value="${h(c.instagram)}" placeholder="@suaotica"></label>
          </div>
          <label class="campo">Texto de boas-vindas do catálogo<textarea class="entrada" id="cfTexto" name="textoCatalogo" rows="3">${h(c.textoCatalogo)}</textarea></label>
          <button class="btn" type="submit">Salvar dados</button>
        </form>

        <div class="pilha">
          <section class="cartao pilha" style="gap:12px">
            <h2>Resumo do mês</h2>
            <div class="numeros">
              <div><span class="rotulo">Faturamento</span><strong>${brl(fat)}</strong></div>
              <div><span class="rotulo">Lucro bruto</span><strong>${brl(vm.reduce((a, v) => a + (v.total || 0) - (v.custoTotal || 0), 0))}</strong></div>
              <div><span class="rotulo">Ticket médio</span><strong>${brl(vm.length ? fat / vm.length : 0)}</strong></div>
              <div><span class="rotulo">Clientes</span><strong>${S.clientes.length}</strong></div>
            </div>
          </section>
          <section class="cartao">
            <h2 style="margin-bottom:8px">Vendas recentes</h2>
            ${
              S.vendas.length
                ? `<ul class="lista">${S.vendas
                    .slice(0, 15)
                    .map(
                      (v) => `<li class="linha"><span class="linha-texto"><strong>${h(v.clienteNome)}</strong><span>${data(v.data)} · ${FORMAS[v.forma] || v.forma}</span></span>
                      <strong class="num">${brl(v.total)}</strong>
                      <button class="btn btn-fantasma btn-p" data-cancelar="${v.id}" title="Cancelar venda" aria-label="Cancelar venda">${icone("desfazer", 15)}</button></li>`,
                    )
                    .join("")}</ul>`
                : `<p class="dica">Nenhuma venda ainda.</p>`
            }
          </section>
          <section class="cartao pilha" style="gap:8px"><h2>Conta</h2><p class="dica">Painel protegido por senha. Só a conta da ótica vê clientes, receitas e vendas.</p>
            <button class="btn btn-contorno" data-sair>${icone("sair", 15)} Sair do painel</button></section>
        </div>
      </div>
    </div>`;

  main.querySelector("#copiarLink").addEventListener("click", () => copiar(link));
  main.querySelector("#fConfig").addEventListener("input", (e) => {
    if (e.target.name) rascunho = { ...(rascunho || {}), [e.target.name]: e.target.value };
  });
  main.querySelector("#fConfig").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries([...new FormData(e.target)].map(([k, v]) => [k, String(v).trim()]));
    try {
      await salvarConfig(f);
      rascunho = null;
      aviso("Dados da ótica salvos", { tipo: "ok" });
    } catch (err) {
      aviso(err?.message || "Não foi possível salvar.", { tipo: "erro" });
    }
  });
  main.querySelectorAll("[data-cancelar]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!b.dataset.confirmar) {
        b.dataset.confirmar = "1";
        b.className = "btn btn-perigo btn-p";
        b.textContent = "Cancelar?";
        return;
      }
      try {
        await cancelarVenda(S.vendas.find((v) => v.id === b.dataset.cancelar));
        aviso("Venda cancelada; as peças voltaram para casa", { tipo: "ok" });
      } catch (err) {
        aviso(err?.message || "Não foi possível cancelar.", { tipo: "erro" });
      }
    }),
  );
}
