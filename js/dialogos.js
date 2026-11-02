// Janelas do painel: produto (cadastro/edição/etiqueta), peça bipada, cliente e receita.
import { h, brl, TIPOS, icone, abrirJanela, aviso, numero, numeroCampo, reduzirFoto, hoje, addMeses } from "./util.js";
import { S, adicionarAoCarrinho, ir } from "./estado.js";
import { salvarProduto, excluirProduto, moverEstoque, proximoCodigo, salvarCliente, adicionarReceita } from "./acoes.js";
import { desenharEtiqueta, baixarEtiqueta } from "./etiqueta.js";

const erroMsg = (e) => (e && e.message ? e.message : "Não foi possível salvar. Verifique a internet.");

export function abrirProduto(atual = null, codigoInicial = "") {
  let foto = atual ? S.fotos[atual.id] || "" : "";
  const opcoesTipo = Object.entries(TIPOS)
    .map(([k, v]) => `<option value="${k}" ${k === (atual?.tipo || "armacao_grau") ? "selected" : ""}>${v}</option>`)
    .join("");
  const dlg = abrirJanela(
    atual ? "Editar produto" : "Novo produto",
    `<form class="grade-form" id="fProd">
      <div class="foto-linha cheio">
        <button type="button" class="foto-botao" id="pFotoBtn">${foto ? `<img src="${h(foto)}" alt="">` : icone("foto", 26)}</button>
        <div><strong>Foto da armação</strong><p class="dica">Aparece no catálogo. Fotografe em fundo claro.</p>
          <button type="button" class="link-botao" id="pFotoTirar" ${foto ? "" : "hidden"} style="align-self:flex-start;color:var(--erro)">Remover foto</button></div>
        <input type="file" accept="image/*" id="pFoto" hidden>
      </div>
      <label class="campo cheio">Nome / modelo<input class="entrada" name="nome" required value="${h(atual?.nome)}" placeholder="Ex.: Armação acetato gatinho"></label>
      <label class="campo">Marca<input class="entrada" name="marca" value="${h(atual?.marca)}"></label>
      <label class="campo">Cor<input class="entrada" name="cor" value="${h(atual?.cor)}"></label>
      <label class="campo">Tipo<select class="entrada" name="tipo">${opcoesTipo}</select></label>
      <label class="campo">Código de barras<input class="entrada mono" name="codigo" value="${h(atual?.codigo || codigoInicial)}" placeholder="Vazio = gerar"></label>
      <label class="campo">Custo (R$)<input class="entrada" name="custo" inputmode="decimal" value="${atual ? numeroCampo(atual.custo) : ""}" placeholder="0,00"></label>
      <label class="campo">Preço de venda (R$)<input class="entrada" name="preco" inputmode="decimal" value="${atual ? numeroCampo(atual.preco) : ""}" placeholder="0,00"></label>
      ${atual ? "" : `<label class="campo">Quantidade em casa<input class="entrada" name="qtd" inputmode="numeric" value="1"></label>`}
      <label class="campo cheio">Descrição para o catálogo<textarea class="entrada" name="descricao" rows="2" placeholder="Ex.: Leve e confortável, ótima para rosto redondo.">${h(atual?.descricao)}</textarea></label>
      <label class="interruptor cheio"><input type="checkbox" name="noCatalogo" ${atual?.noCatalogo === false ? "" : "checked"}> Mostrar no catálogo dos clientes</label>
    </form>
    <div><span class="rotulo">Etiqueta</span>
      <div class="etiqueta" style="margin-top:6px"><svg id="pBarras"></svg><strong id="pEtqNome" style="font-size:.8rem"></strong><strong id="pEtqPreco" style="font-family:var(--f-titulo)"></strong></div>
      <button type="button" class="btn btn-contorno btn-p btn-larga" id="pBaixar" style="margin-top:8px">${icone("baixar", 16)} Baixar etiqueta (PNG)</button>
      <p class="dica" style="margin-top:6px">Sem código? Salve o produto primeiro: o app gera um (E00001, E00002…).</p></div>
    <div class="janela-rodape">
      ${atual ? `<button type="button" class="btn btn-fantasma" id="pExcluir">${icone("lixo", 16)} Excluir</button>` : ""}
      <button type="submit" form="fProd" class="btn">${atual ? "Salvar alterações" : "Cadastrar produto"}</button>
    </div>`,
    { largura: 560 },
  );
  const form = dlg.querySelector("#fProd");
  const campo = (n) => form.elements[n];

  const etiqueta = () => {
    const cod = campo("codigo").value.trim();
    const ok = desenharEtiqueta(dlg.querySelector("#pBarras"), cod);
    dlg.querySelector("#pBarras").style.display = ok ? "" : "none";
    dlg.querySelector("#pEtqNome").textContent = campo("nome").value || "Nome do produto";
    dlg.querySelector("#pEtqPreco").textContent = numero(campo("preco").value) ? brl(numero(campo("preco").value)) : "";
    dlg.querySelector("#pBaixar").disabled = !ok;
  };
  etiqueta();
  ["codigo", "nome", "preco"].forEach((n) => campo(n).addEventListener("input", etiqueta));
  dlg.querySelector("#pBaixar").addEventListener("click", () => baixarEtiqueta(campo("codigo").value.trim(), campo("nome").value, numero(campo("preco").value)));

  const inputFoto = dlg.querySelector("#pFoto");
  dlg.querySelector("#pFotoBtn").addEventListener("click", () => inputFoto.click());
  inputFoto.addEventListener("change", async () => {
    const f = inputFoto.files[0];
    inputFoto.value = "";
    if (!f) return;
    try {
      foto = await reduzirFoto(f);
      dlg.querySelector("#pFotoBtn").innerHTML = `<img src="${foto}" alt="">`;
      dlg.querySelector("#pFotoTirar").hidden = false;
    } catch {
      aviso("Não consegui ler essa foto.", { tipo: "erro" });
    }
  });
  dlg.querySelector("#pFotoTirar").addEventListener("click", (e) => {
    foto = "";
    dlg.querySelector("#pFotoBtn").innerHTML = icone("foto", 26);
    e.target.hidden = true;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const codigo = campo("codigo").value.trim() || proximoCodigo(S.produtos);
    const repetido = S.produtos.find((p) => p.codigo.toLowerCase() === codigo.toLowerCase() && p.id !== atual?.id);
    if (repetido) return aviso(`O código ${codigo} já é de "${repetido.nome}".`, { tipo: "erro" });
    const dados = {
      codigo,
      nome: campo("nome").value.trim(),
      marca: campo("marca").value.trim(),
      cor: campo("cor").value.trim(),
      tipo: campo("tipo").value,
      descricao: campo("descricao").value.trim(),
      custo: numero(campo("custo").value),
      preco: numero(campo("preco").value),
      noCatalogo: campo("noCatalogo").checked,
    };
    const botao = dlg.querySelector("button[type=submit]");
    botao.disabled = true;
    try {
      await salvarProduto({ atual, dados, foto, qtdInicial: atual ? 0 : Math.max(0, parseInt(campo("qtd").value) || 0) });
      aviso(atual ? "Produto salvo" : `Produto cadastrado · código ${codigo}`, { tipo: "ok" });
      dlg.close();
    } catch (err) {
      aviso(erroMsg(err), { tipo: "erro" });
      botao.disabled = false;
    }
  });

  dlg.querySelector("#pExcluir")?.addEventListener("click", async (e) => {
    const b = e.currentTarget;
    if (!b.dataset.confirmar) {
      b.dataset.confirmar = "1";
      b.className = "btn btn-perigo";
      b.textContent = "Confirmar exclusão";
      return;
    }
    try {
      await excluirProduto(atual.id);
      aviso("Produto excluído", { tipo: "ok" });
      dlg.close();
    } catch (err) {
      aviso(erroMsg(err), { tipo: "erro" });
    }
  });
}

// O que aparece depois de bipar uma peça cadastrada.
export function abrirBipado(id, { aoBiparOutro } = {}) {
  const p = S.produtos.find((x) => x.id === id);
  if (!p) return;
  const foto = S.fotos[p.id];
  const dlg = abrirJanela(
    h(p.nome),
    `<div class="bipado-topo">
       <div class="bipado-foto">${foto ? `<img src="${h(foto)}" alt="">` : icone("oculos", 30)}</div>
       <div><p class="dica">${h([p.marca, p.cor].filter(Boolean).join(" · "))} <span class="mono">${h(p.codigo)}</span></p>
         <span class="bipado-preco">${brl(p.preco)}</span></div>
     </div>
     <div class="qtds">
       <div class="qtd-caixa">${icone("casa", 16)}<span>Em casa</span><strong id="bCasa">${p.qtdEstoque || 0}</strong></div>
       <div class="qtd-caixa maleta">${icone("maleta", 16)}<span>Na maleta</span><strong id="bMaleta">${p.qtdMaleta || 0}</strong></div>
     </div>
     <div class="acoes-grade">
       <button class="btn btn-contorno" data-mov="entrada">${icone("mais", 16)} Entrada</button>
       <button class="btn btn-contorno" data-mov="saida">${icone("menos", 16)} Baixa</button>
       <button class="btn btn-contorno" data-mov="para_maleta">${icone("maleta", 16)} Levar na maleta</button>
       <button class="btn btn-contorno" data-mov="da_maleta">${icone("casa", 16)} Voltou da maleta</button>
     </div>
     <button class="btn btn-g btn-larga btn-brilho" id="bVender">${icone("sacola", 18)} Vender esta peça</button>
     <div class="entre">
       <button class="btn btn-fantasma btn-p" id="bEditar">${icone("lapis", 15)} Editar / etiqueta</button>
       <button class="btn btn-fantasma btn-p" id="bOutro">${icone("bipar", 15)} Bipar outro</button>
     </div>`,
    { largura: 440 },
  );
  const MSG = { entrada: "+1 em casa", saida: "-1 em casa", para_maleta: "Foi para a maleta", da_maleta: "Voltou para casa" };
  const atualizarBotoes = (casa, maleta) => {
    dlg.querySelector("#bCasa").textContent = casa;
    dlg.querySelector("#bMaleta").textContent = maleta;
    dlg.querySelector('[data-mov="saida"]').disabled = casa < 1;
    dlg.querySelector('[data-mov="para_maleta"]').disabled = casa < 1;
    dlg.querySelector('[data-mov="da_maleta"]').disabled = maleta < 1;
    dlg.querySelector("#bVender").disabled = casa + maleta < 1;
  };
  atualizarBotoes(p.qtdEstoque || 0, p.qtdMaleta || 0);
  dlg.querySelectorAll("[data-mov]").forEach((b) =>
    b.addEventListener("click", async () => {
      dlg.querySelectorAll("[data-mov]").forEach((x) => (x.disabled = true));
      try {
        const r = await moverEstoque(p.id, b.dataset.mov);
        aviso(MSG[b.dataset.mov], { tipo: "ok", descricao: `${r.qtdEstoque} em casa · ${r.qtdMaleta} na maleta` });
        atualizarBotoes(r.qtdEstoque, r.qtdMaleta);
        dlg.querySelector('[data-mov="entrada"]').disabled = false;
      } catch (err) {
        aviso(erroMsg(err), { tipo: "erro" });
        atualizarBotoes(p.qtdEstoque || 0, p.qtdMaleta || 0);
        dlg.querySelector('[data-mov="entrada"]').disabled = false;
      }
    }),
  );
  dlg.querySelector("#bVender").addEventListener("click", () => {
    adicionarAoCarrinho(S.produtos.find((x) => x.id === p.id) || p);
    dlg.close();
    ir("vender");
  });
  dlg.querySelector("#bEditar").addEventListener("click", () => {
    dlg.close();
    abrirProduto(S.produtos.find((x) => x.id === p.id) || p);
  });
  dlg.querySelector("#bOutro").addEventListener("click", () => {
    dlg.close();
    aoBiparOutro?.();
  });
}

export function abrirCliente(atual = null, { inicial = {}, aoSalvar } = {}) {
  const b = atual || inicial;
  const dlg = abrirJanela(
    atual ? "Editar cliente" : "Novo cliente",
    `<form class="grade-form" id="fCli">
      <label class="campo cheio">Nome completo<input class="entrada" name="nome" required value="${h(b.nome)}"></label>
      <label class="campo">WhatsApp<input class="entrada" name="telefone" inputmode="tel" value="${h(b.telefone)}" placeholder="(11) 98888-7777"></label>
      <label class="campo">Nascimento<input class="entrada" type="date" name="nascimento" value="${h(b.nascimento)}"></label>
      <label class="campo cheio">Endereço<input class="entrada" name="endereco" value="${h(b.endereco)}" placeholder="Rua, número, complemento"></label>
      <label class="campo">Bairro<input class="entrada" name="bairro" value="${h(b.bairro)}"></label>
      <label class="campo">CPF (opcional)<input class="entrada" name="cpf" inputmode="numeric" value="${h(b.cpf)}"></label>
      <label class="campo cheio">Observações<textarea class="entrada" name="observacoes" rows="2" placeholder="Ex.: prefere visita à tarde">${h(b.observacoes)}</textarea></label>
    </form>
    <div class="janela-rodape"><button class="btn" type="submit" form="fCli">Salvar cliente</button></div>`,
  );
  const form = dlg.querySelector("#fCli");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const dados = {
      nome: String(f.nome).trim(),
      telefone: String(f.telefone || "").trim(),
      nascimento: f.nascimento || "",
      endereco: String(f.endereco || "").trim(),
      bairro: String(f.bairro || "").trim(),
      cpf: String(f.cpf || "").trim(),
      observacoes: String(f.observacoes || "").trim(),
    };
    try {
      const id = await salvarCliente(atual?.id, dados);
      aviso("Cliente salva", { tipo: "ok" });
      dlg.close();
      aoSalvar?.(id);
    } catch (err) {
      aviso(erroMsg(err), { tipo: "erro" });
    }
  });
}

export function abrirReceita(clienteId) {
  const cel = (k, r) => `<td><input name="${k}" inputmode="decimal" aria-label="${r}"></td>`;
  const dlg = abrirJanela(
    "Nova receita",
    `<form id="fRx" class="pilha" style="gap:14px">
      <div class="rolar-x"><table class="rx">
        <thead><tr><th></th><th>Esf.</th><th>Cil.</th><th>Eixo</th><th>DNP</th></tr></thead>
        <tbody>
          <tr><th>OD</th>${cel("odEsferico", "OD esférico")}${cel("odCilindrico", "OD cilíndrico")}${cel("odEixo", "OD eixo")}${cel("odDnp", "OD DNP")}</tr>
          <tr><th>OE</th>${cel("oeEsferico", "OE esférico")}${cel("oeCilindrico", "OE cilíndrico")}${cel("oeEixo", "OE eixo")}${cel("oeDnp", "OE DNP")}</tr>
        </tbody></table></div>
      <div class="grade-form">
        <label class="campo">Adição<input class="entrada" name="adicao" inputmode="decimal" placeholder="+2,00"></label>
        <label class="campo">Altura (mm)<input class="entrada" name="altura" inputmode="decimal"></label>
        <label class="campo">Data da receita<input class="entrada" type="date" name="dataReceita" value="${hoje()}"></label>
        <label class="campo">Válida até<input class="entrada" type="date" name="validade" value="${addMeses(hoje(), 12)}"></label>
        <label class="campo cheio">Médico / CRM<input class="entrada" name="medico"></label>
      </div>
    </form>
    <div class="janela-rodape"><button class="btn" type="submit" form="fRx">Guardar receita</button></div>`,
  );
  const form = dlg.querySelector("#fRx");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
    try {
      await adicionarReceita(clienteId, r);
      aviso("Receita guardada", { tipo: "ok" });
      dlg.close();
    } catch (err) {
      aviso(erroMsg(err), { tipo: "erro" });
    }
  });
}
