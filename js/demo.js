// MODO DEMONSTRAÇÃO: enquanto o Firebase não está ligado, o app funciona com dados de exemplo
// guardados só neste navegador. Assim dá para ver e testar tudo antes de configurar.
import { hoje, addMeses } from "./util.js";

const CHAVE = "sistema-otica-demo";
let store;
try {
  store = new Map(JSON.parse(sessionStorage.getItem(CHAVE) || "null") || []);
} catch {
  store = new Map();
}
const ouvintes = new Set();
let seq = 0;
const novoId = () => "d" + Date.now().toString(36) + ++seq;
const salvarSessao = () => {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify([...store]));
  } catch {
    /* sem armazenamento: segue só na memória */
  }
};

export const db = { demo: true };
export const auth = { demo: true };

const ts = (ms = Date.now()) => {
  const s = Math.floor(ms / 1000);
  return { seconds: s, toDate: () => new Date(s * 1000) };
};
export const serverTimestamp = () => ({ __ts: true });
export const arrayUnion = (...v) => ({ __union: v });

export function collection(_db, ...p) {
  return { tipo: "col", path: p.join("/") };
}
export function doc(a, ...p) {
  if (a && a.tipo === "col") {
    const id = p[0] || novoId();
    return { tipo: "doc", path: `${a.path}/${id}`, id };
  }
  const path = p.join("/");
  return { tipo: "doc", path, id: path.split("/").pop() };
}
export const where = (f, cmp, v) => ({ op: "where", f, cmp, v });
export const orderBy = (f, dir = "asc") => ({ op: "orderBy", f, dir });
export const limit = (n) => ({ op: "limit", n });
export const query = (col, ...cons) => ({ tipo: "query", path: col.path, cons });

function resolver(valor, antigo) {
  const out = {};
  for (const [k, v] of Object.entries(valor)) {
    if (v && v.__ts) out[k] = ts();
    else if (v && v.__union) out[k] = [...((antigo && antigo[k]) || []), ...v.__union];
    else out[k] = v;
  }
  return out;
}
function gravar(path, dados, { merge = false, exige = false } = {}) {
  const antigo = store.get(path);
  if (exige && !antigo) throw new Error("Registro não encontrado.");
  const novo = resolver(dados, antigo);
  store.set(path, merge || exige ? { ...(antigo || {}), ...novo } : novo);
}
const copia = (d) => {
  const c = JSON.parse(JSON.stringify(d));
  for (const v of Object.values(c)) if (v && typeof v === "object" && "seconds" in v) v.toDate = () => new Date(v.seconds * 1000);
  return c;
};
const snapDoc = (path) => {
  const d = store.get(path);
  return { id: path.split("/").pop(), exists: () => !!d, data: () => (d ? copia(d) : undefined) };
};
function snapQuery(q) {
  const nivel = q.path.split("/").length + 1;
  let docs = [...store.keys()].filter((k) => k.startsWith(q.path + "/") && k.split("/").length === nivel).map(snapDoc);
  for (const c of q.cons || []) {
    if (c.op === "where") docs = docs.filter((d) => d.data()[c.f] === c.v);
    if (c.op === "orderBy") {
      const val = (d) => d.data()[c.f]?.seconds ?? d.data()[c.f];
      docs.sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * (c.dir === "desc" ? -1 : 1));
    }
    if (c.op === "limit") docs = docs.slice(0, c.n);
  }
  return { docs, size: docs.length, empty: !docs.length };
}
const avaliar = (ref) => (ref.tipo === "doc" ? snapDoc(ref.path) : snapQuery(ref.tipo === "col" ? { path: ref.path, cons: [] } : ref));
let pendente = false;
function avisar() {
  salvarSessao();
  if (pendente) return;
  pendente = true;
  setTimeout(() => {
    pendente = false;
    ouvintes.forEach((o) => o.next(avaliar(o.ref)));
  }, 0);
}

export function onSnapshot(ref, next) {
  const o = { ref, next };
  ouvintes.add(o);
  setTimeout(() => next(avaliar(ref)), 0);
  return () => ouvintes.delete(o);
}
export const getDoc = async (ref) => snapDoc(ref.path);
export const getDocs = async (q) => snapQuery(q.tipo === "col" ? { path: q.path, cons: [] } : q);
export async function setDoc(ref, d, op = {}) {
  gravar(ref.path, d, { merge: !!op.merge });
  avisar();
}
export async function updateDoc(ref, d) {
  gravar(ref.path, d, { exige: true });
  avisar();
}
export async function deleteDoc(ref) {
  store.delete(ref.path);
  avisar();
}
export async function addDoc(col, d) {
  const ref = doc(col);
  gravar(ref.path, d);
  avisar();
  return ref;
}
export function writeBatch() {
  const ops = [];
  return {
    set: (r, d, o = {}) => ops.push(() => gravar(r.path, d, { merge: !!o.merge })),
    update: (r, d) => ops.push(() => gravar(r.path, d, { exige: true })),
    delete: (r) => ops.push(() => store.delete(r.path)),
    commit: async () => {
      ops.forEach((f) => f());
      avisar();
    },
  };
}
export async function runTransaction(_db, fn) {
  const ops = [];
  const tx = {
    get: async (r) => snapDoc(r.path),
    set: (r, d, o = {}) => ops.push(() => gravar(r.path, d, { merge: !!o.merge })),
    update: (r, d) => ops.push(() => gravar(r.path, d, { exige: true })),
    delete: (r) => ops.push(() => store.delete(r.path)),
  };
  const res = await fn(tx);
  ops.forEach((f) => f());
  avisar();
  return res;
}

// Login de demonstração: qualquer senha entra.
const CHAVE_LOGIN = "sistema-otica-demo-login";
const fnsAuth = new Set();
const usuarioAtual = () => {
  try {
    return sessionStorage.getItem(CHAVE_LOGIN) ? { email: sessionStorage.getItem(CHAVE_LOGIN) } : null;
  } catch {
    return null;
  }
};
export function onAuthStateChanged(_a, cb) {
  fnsAuth.add(cb);
  setTimeout(() => cb(usuarioAtual()), 0);
  return () => fnsAuth.delete(cb);
}
export async function signInWithEmailAndPassword(_a, email) {
  try {
    sessionStorage.setItem(CHAVE_LOGIN, String(email).toLowerCase());
  } catch {
    /* ignora */
  }
  fnsAuth.forEach((cb) => cb(usuarioAtual() || { email: String(email).toLowerCase() }));
}
export async function sendPasswordResetEmail() {}
export async function signOut() {
  try {
    sessionStorage.removeItem(CHAVE_LOGIN);
  } catch {
    /* ignora */
  }
  fnsAuth.forEach((cb) => cb(null));
}

/* ---------- fotos ilustradas das armações de exemplo ---------- */
function fotoArmacao(forma, cor, fundo, lente = "rgba(255,255,255,0.35)") {
  const lentes = {
    gatinho: (cx) => `<path d="M${cx - 70} 140 Q${cx - 74} 108 ${cx - 40} 104 L${cx + 50} 100 Q${cx + 72} 98 ${cx + 66} 128 Q${cx + 58} 196 ${cx - 6} 196 Q${cx - 62} 196 ${cx - 70} 140Z"/>`,
    redondo: (cx) => `<circle cx="${cx}" cy="150" r="60"/>`,
    retangular: (cx) => `<rect x="${cx - 68}" y="110" width="136" height="84" rx="22"/>`,
    aviador: (cx) => `<path d="M${cx - 66} 118 Q${cx} 98 ${cx + 66} 118 Q${cx + 70} 200 ${cx} 204 Q${cx - 70} 200 ${cx - 66} 118Z"/>`,
    quadrado: (cx) => `<rect x="${cx - 64}" y="100" width="128" height="104" rx="10"/>`,
  }[forma];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs><radialGradient id="g" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="${fundo}"/></radialGradient></defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <ellipse cx="200" cy="236" rx="150" ry="12" fill="rgba(60,40,10,0.10)"/>
    <g fill="${lente}" stroke="${cor}" stroke-width="13" stroke-linejoin="round">${lentes(118)}${lentes(282)}</g>
    <path d="M178 140 Q200 124 222 140" fill="none" stroke="${cor}" stroke-width="10" stroke-linecap="round"/>
    <path d="M44 132 L14 124 M356 132 L386 124" stroke="${cor}" stroke-width="10" stroke-linecap="round"/>
    <path d="M84 118 Q100 112 112 116" stroke="rgba(255,255,255,0.8)" stroke-width="6" fill="none" stroke-linecap="round"/>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- dados de exemplo ---------- */
function semear() {
  const H = hoje();
  const produtos = [
    ["Armação acetato gatinho", "Ray-Ban", "Tartaruga", "armacao_grau", 180, 420, 2, 1, "gatinho", "#7a4a1d", "#f3e2c4", "Leve e elegante, valoriza o olhar."],
    ["Armação metal redonda", "Ana Hickmann", "Dourado", "armacao_grau", 150, 380, 1, 1, "redondo", "#c99a2e", "#f6ecd6", "Clássica e delicada, combina com tudo."],
    ["Armação TR90 retangular", "Speedo", "Preto fosco", "armacao_grau", 90, 260, 3, 1, "retangular", "#2a2118", "#ece6da", "Flexível e resistente para o dia a dia."],
    ["Óculos de sol aviador", "Chilli Beans", "Dourado/espelhado", "oculos_sol", 70, 199, 2, 1, "aviador", "#b8862a", "#f4ead5", "Proteção UV400 com estilo."],
    ["Armação acetato quadrada", "Vogue", "Vinho", "armacao_grau", 160, 390, 1, 1, "quadrado", "#7b2537", "#f4e1e0", "Marcante, ideal para rosto oval."],
    ["Armação infantil flexível", "Disney", "Azul", "armacao_grau", 60, 189, 1, 0, "redondo", "#2f6a8a", "#e3eef3", "Não quebra com facilidade. Para crianças de 4 a 8 anos."],
    ["Óculos de sol gatinho", "Colcci", "Preto", "oculos_sol", 85, 229, 1, 1, "gatinho", "#1d1712", "#efe7d6", "Lentes degradê, super em alta."],
  ];
  const ids = [];
  produtos.forEach(([nome, marca, cor, tipo, custo, preco, casa, maleta, forma, corArm, fundo, descricao], i) => {
    const id = "p" + (i + 1);
    ids.push(id);
    const codigo = "E" + String(i + 1).padStart(5, "0");
    store.set(`produtos/${id}`, { codigo, nome, marca, cor, tipo, descricao, custo, preco, qtdEstoque: casa, qtdMaleta: maleta, noCatalogo: true, criadoEm: ts(Date.now() - i * 3600e3) });
    store.set(`catalogo/${id}`, { nome, marca, cor, tipo, descricao, preco, foto: fotoArmacao(forma, corArm, fundo), disponivel: casa + maleta > 0, criadoEm: ts(Date.now() - i * 3600e3) });
  });

  const clientes = [
    ["c1", "Maria Aparecida Souza", "(11) 98765-4321", "Rua das Flores, 120", "Vila Nova"],
    ["c2", "José Carlos Lima", "(11) 97654-3210", "Av. Brasil, 845, ap 32", "Centro"],
    ["c3", "Fernanda Oliveira", "(11) 96543-2109", "Rua Sete de Setembro, 66", "Jardim América"],
    ["c4", "Antônio Pereira", "(11) 95432-1098", "Travessa São João, 12", "Vila Nova"],
  ];
  clientes.forEach(([id, nome, telefone, endereco, bairro], i) =>
    store.set(`clientes/${id}`, {
      nome, telefone, endereco, bairro, cpf: "", nascimento: "", observacoes: i === 0 ? "Prefere visita à tarde." : "",
      receitas: i < 2 ? [{ id: "r" + i, odEsferico: i ? "-1,75" : "+1,50", odCilindrico: "-0,50", odEixo: "180", odDnp: "31", oeEsferico: i ? "-2,00" : "+1,25", oeCilindrico: "-0,75", oeEixo: "10", oeDnp: "31,5", adicao: i ? "" : "+2,25", altura: "", dataReceita: addMeses(H, -2), validade: addMeses(H, 10), medico: "Dr. Paulo Mendes · CRM 45.123" }] : [],
      criadoEm: ts(),
    }),
  );

  const parc = (total, entrada, n, primeiro, pagas) => {
    const restoC = Math.round((total - entrada) * 100);
    const baseC = Math.floor(restoC / n);
    return Array.from({ length: n }, (_, i) => {
      const venc = addMeses(primeiro, i);
      return { numero: i + 1, total: n, valor: (i === n - 1 ? restoC - baseC * (n - 1) : baseC) / 100, vencimento: venc, pagoEm: i < pagas ? venc : null };
    });
  };
  const venda = (id, cli, nome, dataV, itens, extras, forma, entrada, n, pagas) => {
    const total = itens.reduce((a, i) => a + i.preco * i.quantidade, 0) + extras.reduce((a, x) => a + x.valor, 0);
    const custo = itens.reduce((a, i) => a + i.custo * i.quantidade, 0) + extras.reduce((a, x) => a + x.custo, 0);
    store.set(`vendas/${id}`, {
      clienteId: cli, clienteNome: nome, data: dataV, itens, extras, desconto: 0, total, custoTotal: custo, forma, entrada,
      parcelas: forma === "crediario" ? parc(total, entrada, n, addMeses(dataV, 1), pagas) : [], pedidoId: null, criadoEm: ts(),
    });
  };
  const item = (i) => ({ produtoId: ids[i], codigo: "E" + String(i + 1).padStart(5, "0"), nome: produtos[i][0], quantidade: 1, preco: produtos[i][5], custo: produtos[i][4] });
  const dia = (meses, d) => addMeses(H, meses).slice(0, 8) + String(d).padStart(2, "0");
  venda("v1", "c1", "Maria Aparecida Souza", dia(-3, 5), [item(0)], [{ descricao: "Lentes multifocais antirreflexo", valor: 680, custo: 260 }], "crediario", 200, 5, 2);
  venda("v2", "c2", "José Carlos Lima", dia(-2, 10), [item(2)], [{ descricao: "Lentes visão simples antirreflexo", valor: 240, custo: 80 }], "crediario", 0, 4, 0);
  venda("v3", "c3", "Fernanda Oliveira", dia(-1, 18), [item(3)], [], "pix", 0, 1, 0);
  venda("v4", "c3", "Fernanda Oliveira", dia(0, 1), [item(1)], [{ descricao: "Lentes fotossensíveis", valor: 390, custo: 150 }], "cartao", 0, 1, 0);
  venda("v5", "c4", "Antônio Pereira", dia(0, 1), [item(5)], [{ descricao: "Lentes infantis policarbonato", valor: 210, custo: 75 }], "crediario", 100, 3, 0);

  store.set("pedidos/x1", { produtoId: "p5", produtoNome: "Armação acetato quadrada · Vogue", nome: "Juliana Ramos", telefone: "(11) 94444-3333", bairro: "Centro", mensagem: "Pode ser sábado de manhã?", status: "novo", criadoEm: ts(Date.now() - 2 * 3600e3) });
  store.set("pedidos/x2", { produtoId: "p7", produtoNome: "Óculos de sol gatinho · Colcci", nome: "Patrícia Gomes", telefone: "(11) 93333-2222", bairro: "Vila Nova", mensagem: "", status: "novo", criadoEm: ts(Date.now() - 26 * 3600e3) });

  store.set("config/loja", {
    nomeLoja: "Sua Ótica",
    slogan: "Seus óculos novos, no conforto da sua casa.",
    textoCatalogo: "Escolha a armação que mais combina com você. Eu levo até a sua casa para você experimentar sem compromisso.",
    whatsapp: "(11) 98888-7777",
    chavePix: "11988887777",
    cidade: "Campinas",
    instagram: "@suaotica",
  });
  salvarSessao();
}
if (store.size === 0) semear();

export function recomecarDemonstracao() {
  store.clear();
  semear();
  avisar();
}
