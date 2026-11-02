// Painel da ótica: login, dados em tempo real, menu, rotas e o botão Bipar.
import {
  auth,
  db,
  demonstracao,
  recomecarDemonstracao,
  emailDona,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "./firebase.js";
import { h, icone, aviso } from "./util.js";
import { S, definirRedesenho, produtoPorCodigo, nomeLoja } from "./estado.js";
import { abrirLeitor } from "./leitor.js";
import { abrirBipado, abrirProduto } from "./dialogos.js";
import { telaInicio } from "./telas/inicio.js";
import { telaEstoque } from "./telas/estoque.js";
import { telaVender } from "./telas/vender.js";
import { telaClientes } from "./telas/clientes.js";
import { telaCobrancas } from "./telas/cobrancas.js";
import { telaPedidos } from "./telas/pedidos.js";
import { telaMinhaOtica } from "./telas/minha-otica.js";

const raiz = document.getElementById("raiz");

const ROTAS = [
  { id: "inicio", nome: "Início", icone: "inicio", tela: telaInicio },
  { id: "estoque", nome: "Estoque", icone: "oculos", tela: telaEstoque },
  { id: "vender", nome: "Vender", icone: "sacola", tela: telaVender },
  { id: "clientes", nome: "Clientes", icone: "pessoas", tela: telaClientes },
  { id: "cobrancas", nome: "Cobranças", icone: "calendario", tela: telaCobrancas },
  { id: "pedidos", nome: "Pedidos", icone: "caixa", tela: telaPedidos },
  { id: "minha-otica", nome: "Minha Ótica", icone: "loja", tela: telaMinhaOtica },
];
const rotaAtual = () => {
  const id = (location.hash.replace(/^#\/?/, "").split("?")[0] || "inicio").trim();
  return ROTAS.find((r) => r.id === id) || ROTAS[0];
};

/* ---------- telas sem login ---------- */

function telaLogin(msg = "", tipo = "erro") {
  raiz.innerHTML = `<div class="login"><form class="login-cartao" id="fLogin">
    <img src="assets/logo.svg" alt="Sua Ótica">
    <h1>Painel da ótica</h1>
    <p class="dica">Entre para cuidar do estoque, das vendas e das cobranças.</p>
    ${demonstracao ? `<div class="msg-demo"><strong>Demonstração</strong> · entre com qualquer senha para conhecer o painel com dados de exemplo.</div>` : ""}
    ${msg ? `<div class="${tipo === "ok" ? "msg-ok" : "msg-erro"}">${h(msg)}</div>` : ""}
    <label class="campo">E-mail<input class="entrada" type="email" name="email" required autocomplete="email" value="${h(emailDona)}"></label>
    <label class="campo">Senha<input class="entrada" type="password" name="senha" required autocomplete="current-password"></label>
    <button type="button" class="link-botao" id="esqueci">Esqueci a senha</button>
    <button class="btn btn-g" type="submit">Entrar</button>
  </form><a href="index.html">Ver o catálogo</a></div>`;
  const form = document.getElementById("fLogin");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true;
    botao.textContent = "Entrando…";
    try {
      await signInWithEmailAndPassword(auth, String(f.email).trim(), String(f.senha));
    } catch (err) {
      const codigo = err?.code || "";
      telaLogin(
        codigo.includes("invalid-credential") || codigo.includes("wrong-password") || codigo.includes("user-not-found")
          ? "E-mail ou senha incorretos."
          : codigo.includes("too-many-requests")
            ? "Muitas tentativas. Espere alguns minutos ou use “Esqueci a senha”."
            : "Não foi possível entrar. Verifique a internet.",
      );
    }
  });
  document.getElementById("esqueci").addEventListener("click", async () => {
    const email = String(form.elements.email.value).trim();
    if (!email) return telaLogin("Digite seu e-mail primeiro.");
    try {
      await sendPasswordResetEmail(auth, email);
      telaLogin(`Enviamos um link para ${email}. Abra o e-mail (veja também o spam) e crie a nova senha.`, "ok");
    } catch {
      telaLogin("Não foi possível enviar o e-mail. Confira o endereço.");
    }
  });
}

function telaSemAcesso(email) {
  raiz.innerHTML = `<div class="login"><div class="login-cartao">
    <img src="assets/logo.svg" alt="">
    <h1>Acesso restrito</h1>
    <p class="dica">A conta ${h(email)} não tem acesso ao painel da ótica.</p>
    <button class="btn" id="sairBtn">Sair</button>
  </div></div>`;
  document.getElementById("sairBtn").addEventListener("click", () => signOut(auth));
}

/* ---------- painel ---------- */

let cancelar = [];
let menuAberto = false;

function montarApp() {
  raiz.innerHTML = `<div class="app">
    <header class="topo">
      <a class="marca" href="#/inicio"><img src="assets/logo.svg" alt=""><span><strong id="nomeLoja">${h(nomeLoja())}</strong><small>Painel da ótica</small></span></a>
      ${demonstracao ? `<button class="selo-demo" id="recomecarDemo" title="Volta os dados de exemplo ao início">Demonstração ↺</button>` : ""}
      <a class="ver-catalogo" href="index.html" target="_blank" rel="noopener">${icone("link")} Ver catálogo</a>
      <button class="botao-menu" id="abrirMenu" aria-label="Abrir menu">${icone("menu", 22)}<span class="ponto" id="pontoMenu" hidden></span></button>
    </header>
    <aside class="lateral">
      <button class="bipar-lateral" data-bipar>${icone("bipar", 22)} Bipar código</button>
      <nav class="nav" id="navLateral"></nav>
      <button class="nav-item sair" data-sair>${icone("sair", 18)} Sair</button>
    </aside>
    <main class="tela" id="tela"></main>
    <nav class="inferior" id="navInferior"></nav>
  </div>`;
  document.getElementById("recomecarDemo")?.addEventListener("click", () => {
    recomecarDemonstracao();
    aviso("Dados de exemplo restaurados", { tipo: "ok" });
  });
  document.getElementById("abrirMenu").addEventListener("click", () => {
    menuAberto = true;
    desenharMenu();
  });
}

function itemNav(r, ativa) {
  const novos = S.pedidos.filter((p) => p.status === "novo").length;
  return `<a class="nav-item" href="#/${r.id}" ${r.id === ativa ? 'aria-current="page"' : ""}>${icone(r.icone, 19)}<span>${r.nome}</span>${
    r.id === "pedidos" && novos ? `<span class="contador">${novos}</span>` : ""
  }</a>`;
}

function desenharNav() {
  const ativa = rotaAtual().id;
  document.getElementById("navLateral").innerHTML = ROTAS.map((r) => itemNav(r, ativa)).join("");
  const r = (id) => ROTAS.find((x) => x.id === id);
  document.getElementById("navInferior").innerHTML =
    itemNav(r("inicio"), ativa) +
    itemNav(r("estoque"), ativa) +
    `<button class="bipar-centro" data-bipar aria-label="Bipar código"><span class="bipar-bola">${icone("bipar")}</span><span>Bipar</span></button>` +
    itemNav(r("vender"), ativa) +
    itemNav(r("cobrancas"), ativa);
  document.getElementById("pontoMenu").hidden = !S.pedidos.some((p) => p.status === "novo");
  document.getElementById("nomeLoja").textContent = nomeLoja();
}

function desenharMenu() {
  document.querySelector(".menu-lateral")?.remove();
  if (!menuAberto) return;
  const ativa = rotaAtual().id;
  const el = document.createElement("div");
  el.className = "menu-lateral";
  el.innerHTML = `<div class="menu-painel">
    <div class="entre" style="align-items:center"><h2>${h(nomeLoja())}</h2><button class="fechar" data-fechar-menu aria-label="Fechar">${icone("fechar")}</button></div>
    <nav class="nav">${ROTAS.map((r) => itemNav(r, ativa)).join("")}</nav>
    <a class="nav-item" href="index.html" target="_blank" rel="noopener">${icone("link", 19)}<span>Ver catálogo dos clientes</span></a>
    <button class="nav-item" data-sair>${icone("sair", 19)}<span>Sair</span></button>
  </div>`;
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-fechar-menu]") || e.target.closest("a.nav-item")) {
      menuAberto = false;
      el.remove();
    }
  });
  document.body.appendChild(el);
}

// Redesenha a tela atual sem perder o campo em que a pessoa está digitando.
function redesenhar() {
  const main = document.getElementById("tela");
  if (!main) return;
  const ativo = document.activeElement;
  const foco = ativo && ativo.id && main.contains(ativo) ? { id: ativo.id, ini: ativo.selectionStart, fim: ativo.selectionEnd } : null;
  desenharNav();
  if (!S.pronto) {
    main.innerHTML = `<div class="pilha"><div class="esqueleto" style="height:200px"></div><div class="esqueleto" style="height:120px"></div></div>`;
    return;
  }
  rotaAtual().tela(main);
  if (foco) {
    const el = document.getElementById(foco.id);
    if (el) {
      el.focus();
      try {
        if (foco.ini != null) el.setSelectionRange(foco.ini, foco.fim);
      } catch {
        /* campo sem seleção */
      }
    }
  }
}

async function bipar() {
  const codigo = await abrirLeitor();
  if (!codigo) return;
  const p = produtoPorCodigo(codigo);
  if (p) abrirBipado(p.id, { aoBiparOutro: bipar });
  else {
    aviso("Código novo", { descricao: `${codigo} ainda não está cadastrado.` });
    abrirProduto(null, codigo);
  }
}

function assinarDados() {
  const prontos = new Set();
  const marcar = (k) => {
    prontos.add(k);
    if (prontos.size >= 6 && !S.pronto) {
      S.pronto = true;
      redesenhar();
    }
  };
  const falha = (k) => (err) => {
    console.error(k, err);
    aviso("Não foi possível ler os dados. Confira as regras do Firestore e a internet.", { tipo: "erro" });
    marcar(k);
  };
  const lista = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  cancelar = [
    onSnapshot(collection(db, "produtos"), (s) => { S.produtos = lista(s).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")); marcar("produtos"); redesenhar(); }, falha("produtos")),
    onSnapshot(collection(db, "catalogo"), (s) => { S.fotos = Object.fromEntries(s.docs.map((d) => [d.id, d.data().foto || ""])); marcar("catalogo"); redesenhar(); }, falha("catalogo")),
    onSnapshot(collection(db, "clientes"), (s) => { S.clientes = lista(s).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")); marcar("clientes"); redesenhar(); }, falha("clientes")),
    onSnapshot(collection(db, "vendas"), (s) => { S.vendas = lista(s).sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0)); marcar("vendas"); redesenhar(); }, falha("vendas")),
    onSnapshot(query(collection(db, "pedidos"), orderBy("criadoEm", "desc"), limit(300)), (s) => { S.pedidos = lista(s); marcar("pedidos"); redesenhar(); }, falha("pedidos")),
    onSnapshot(doc(db, "config", "loja"), (s) => { S.config = s.exists() ? s.data() : {}; marcar("config"); redesenhar(); }, falha("config")),
  ];
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-bipar]")) bipar();
  if (e.target.closest("[data-sair]")) {
    menuAberto = false;
    desenharMenu();
    signOut(auth);
  }
});
window.addEventListener("hashchange", () => {
  redesenhar();
  window.scrollTo(0, 0);
});

definirRedesenho(redesenhar);
onAuthStateChanged(auth, (user) => {
  cancelar.forEach((c) => c());
  cancelar = [];
  S.pronto = false;
  if (!user) return telaLogin();
  if (!demonstracao && (user.email || "").toLowerCase() !== emailDona) return telaSemAcesso(user.email || "");
  montarApp();
  redesenhar();
  assinarDados();
});
