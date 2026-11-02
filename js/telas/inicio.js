// Início: faturamento do mês, a receber, atrasos, gráfico de 6 meses e próximas cobranças.
import { h, brl, hoje, mes, addMeses, MESES, data, icone, waLink, primeiroNome, aviso } from "../util.js";
import { S, todasParcelas, nomeLoja } from "../estado.js";

export function telaInicio(main) {
  const hj = hoje();
  const m = mes(hj);
  const vendasMes = S.vendas.filter((v) => mes(v.data) === m);
  const vendido = vendasMes.reduce((a, v) => a + (v.total || 0), 0);
  const lucro = vendasMes.reduce((a, v) => a + (v.total || 0) - (v.custoTotal || 0), 0);
  const parcelas = todasParcelas();
  const recebido =
    S.vendas.reduce((a, v) => (mes(v.data) !== m ? a : a + (v.forma === "crediario" ? v.entrada || 0 : v.total || 0)), 0) +
    parcelas.filter((p) => p.pagoEm && mes(p.pagoEm) === m).reduce((a, p) => a + p.valor, 0);
  const abertas = parcelas.filter((p) => !p.pagoEm);
  const atrasadas = abertas.filter((p) => p.vencimento < hj);
  const casa = S.produtos.reduce((a, p) => a + (p.qtdEstoque || 0), 0);
  const maleta = S.produtos.reduce((a, p) => a + (p.qtdMaleta || 0), 0);
  const novos = S.pedidos.filter((p) => p.status === "novo");

  const meses = Array.from({ length: 6 }, (_, i) => mes(addMeses(`${m}-01`, i - 5)));
  const totais = meses.map((mm) => S.vendas.filter((v) => mes(v.data) === mm).reduce((a, v) => a + (v.total || 0), 0));
  const maior = Math.max(...totais, 1);
  const proximas = abertas.slice().sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 5);
  const clientes = new Map(S.clientes.map((c) => [c.id, c]));
  const nomeMes = MESES[Number(m.slice(5)) - 1];

  main.innerHTML = `<div class="pilha">
    <section class="hero">
      <div><span class="rotulo">Vendido em ${nomeMes}</span><strong class="hero-valor">${brl(vendido)}</strong>
        <span class="hero-sub">${vendasMes.length} venda${vendasMes.length === 1 ? "" : "s"} · lucro bruto ${brl(lucro)}</span></div>
      <div class="barras" aria-label="Vendas dos últimos 6 meses">${meses
        .map((mm, i) => `<div class="barra ${i === 5 ? "atual" : ""}" title="${brl(totais[i])}"><i style="height:${Math.max(4, (totais[i] / maior) * 100)}%"></i><span>${MESES[Number(mm.slice(5)) - 1]}</span></div>`)
        .join("")}</div>
    </section>

    <section class="kpis">
      <div class="kpi"><span class="rotulo">Recebido no mês</span><strong>${brl(recebido)}</strong><small>à vista + entradas + parcelas</small></div>
      <a class="kpi" href="#/cobrancas"><span class="rotulo">A receber</span><strong>${brl(abertas.reduce((a, p) => a + p.valor, 0))}</strong><small>${abertas.length} parcelas em aberto</small></a>
      <a class="kpi ${atrasadas.length ? "ruim" : ""}" href="#/cobrancas"><span class="rotulo">Atrasado</span><strong>${brl(atrasadas.reduce((a, p) => a + p.valor, 0))}</strong><small>${atrasadas.length} parcela${atrasadas.length === 1 ? "" : "s"}</small></a>
      <a class="kpi" href="#/estoque"><span class="rotulo">Peças</span><strong>${casa + maleta}</strong><small>${casa} em casa · ${maleta} na maleta</small></a>
    </section>

    <section class="atalhos">
      <a class="btn btn-g" href="#/vender">${icone("sacola", 18)} Nova venda</a>
      <button class="btn btn-g btn-contorno" data-bipar>${icone("bipar", 18)} Bipar peça</button>
      <a class="btn btn-g btn-contorno" href="#/clientes">${icone("pessoas", 18)} Clientes</a>
      <button class="btn btn-g btn-contorno" id="enviarCatalogo">${icone("compartilhar", 18)} Enviar catálogo</button>
    </section>

    ${
      S.produtos.length === 0
        ? `<section class="boas-vindas"><h2>Bem-vinda ao seu painel ✦</h2><ol>
        <li>Em <a href="#/minha-otica">Minha Ótica</a>, coloque seu WhatsApp e sua chave Pix.</li>
        <li>Cadastre as armações em <a href="#/estoque">Estoque</a>. O app gera a etiqueta com código de barras.</li>
        <li>Cole as etiquetas e use o botão dourado <strong>Bipar</strong> para dar entrada, levar na maleta e vender.</li>
        <li>Mande o link do catálogo para as clientes escolherem pelo celular.</li></ol></section>`
        : ""
    }

    <div class="duas">
      <section class="cartao">
        <div class="cartao-topo"><h2>Próximas cobranças</h2><a href="#/cobrancas">Ver todas</a></div>
        ${
          proximas.length
            ? `<ul class="lista">${proximas
                .map((p) => {
                  const c = clientes.get(p.venda.clienteId);
                  const msg = `Olá, ${primeiroNome(p.venda.clienteNome)}! Aqui é da ${nomeLoja()}. Lembrete da ${p.numero}ª parcela dos seus óculos, de ${brl(p.valor)}, com vencimento em ${data(p.vencimento)}.${S.config.chavePix ? ` Pix: ${S.config.chavePix}` : ""} Obrigada! ⭐`;
                  return `<li class="linha"><div class="linha-texto"><strong>${h(p.venda.clienteNome)}</strong><span>${p.numero}ª de ${p.total} · ${data(p.vencimento)}</span></div>
                    <div class="linha-fim"><strong>${brl(p.valor)}</strong>${p.vencimento < hj ? '<span class="selo selo-erro">Atrasada</span>' : '<span class="selo">Em aberto</span>'}</div>
                    ${c?.telefone ? `<a class="zap" href="${waLink(c.telefone, msg)}" target="_blank" rel="noopener" aria-label="Cobrar no WhatsApp">${icone("zap", 18)}</a>` : ""}</li>`;
                })
                .join("")}</ul>`
            : `<p class="dica">Nenhuma parcela em aberto.</p>`
        }
      </section>
      <section class="cartao">
        <div class="cartao-topo"><h2>Pedidos do catálogo</h2><a href="#/pedidos">Ver todos</a></div>
        ${
          novos.length
            ? `<ul class="lista">${novos
                .slice(0, 4)
                .map((p) => `<li class="linha"><div class="linha-texto"><strong>${h(p.nome)}</strong><span>${h(p.produtoNome)}</span></div><span class="selo selo-ouro">Novo</span></li>`)
                .join("")}</ul>`
            : `<p class="dica">Nenhum pedido novo. Envie o catálogo para suas clientes.</p>`
        }
        ${atrasadas.length ? `<p class="alerta-faixa">${icone("alerta", 16)} ${atrasadas.length} parcela(s) atrasada(s). Vale mandar um lembrete hoje.</p>` : ""}
      </section>
    </div>
  </div>`;

  main.querySelector("#enviarCatalogo").addEventListener("click", async () => {
    const link = new URL("index.html", location.href).href;
    const texto = `Conheça as armações da ${nomeLoja()}! Escolha a sua e eu levo até você: ${link}`;
    try {
      if (navigator.share) await navigator.share({ title: nomeLoja(), text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        aviso("Link do catálogo copiado", { tipo: "ok" });
      }
    } catch {
      /* compartilhamento cancelado */
    }
  });
}
