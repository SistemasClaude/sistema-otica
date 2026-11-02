// Tudo o que grava no Firestore passa por aqui.
import {
  db,
  collection,
  doc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  updateDoc,
  setDoc,
  deleteDoc,
} from "./firebase.js";
import { hoje, addMeses } from "./util.js";

const disponivel = (p) => !!p.noCatalogo && (p.qtdEstoque || 0) + (p.qtdMaleta || 0) > 0;

export function proximoCodigo(produtos) {
  let maior = 0;
  produtos.forEach((p) => {
    const m = /^E(\d+)$/.exec(p.codigo || "");
    if (m) maior = Math.max(maior, Number(m[1]));
  });
  return "E" + String(maior + 1).padStart(5, "0");
}

// Cria ou edita um produto e atualiza a vitrine pública junto.
export async function salvarProduto({ atual, dados, foto, qtdInicial }) {
  const ref = atual ? doc(db, "produtos", atual.id) : doc(collection(db, "produtos"));
  const batch = writeBatch(db);
  if (atual) {
    batch.update(ref, dados);
  } else {
    batch.set(ref, { ...dados, qtdEstoque: qtdInicial, qtdMaleta: 0, criadoEm: serverTimestamp() });
  }
  const qtds = atual ? { qtdEstoque: atual.qtdEstoque, qtdMaleta: atual.qtdMaleta } : { qtdEstoque: qtdInicial, qtdMaleta: 0 };
  batch.set(
    doc(db, "catalogo", ref.id),
    {
      nome: dados.nome,
      marca: dados.marca,
      cor: dados.cor,
      tipo: dados.tipo,
      descricao: dados.descricao,
      preco: dados.preco,
      foto: foto || "",
      disponivel: disponivel({ ...dados, ...qtds }),
      ...(atual ? {} : { criadoEm: serverTimestamp() }),
    },
    { merge: true },
  );
  await batch.commit();
  return ref.id;
}

export async function excluirProduto(id) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "produtos", id));
  batch.delete(doc(db, "catalogo", id));
  await batch.commit();
}

// entrada (+1 em casa) · saida (-1 em casa) · para_maleta · da_maleta
export async function moverEstoque(id, acao, q = 1) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, "produtos", id);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Produto não encontrado.");
    const p = snap.data();
    let casa = p.qtdEstoque || 0;
    let maleta = p.qtdMaleta || 0;
    if (acao === "entrada") casa += q;
    if (acao === "saida") {
      if (casa < q) throw new Error(`${p.nome}: só há ${casa} em casa.`);
      casa -= q;
    }
    if (acao === "para_maleta") {
      if (casa < q) throw new Error(`${p.nome}: não há peça em casa para levar.`);
      casa -= q;
      maleta += q;
    }
    if (acao === "da_maleta") {
      if (maleta < q) throw new Error(`${p.nome} não está na maleta.`);
      maleta -= q;
      casa += q;
    }
    tx.update(ref, { qtdEstoque: casa, qtdMaleta: maleta });
    tx.set(doc(db, "catalogo", id), { disponivel: disponivel({ ...p, qtdEstoque: casa, qtdMaleta: maleta }) }, { merge: true });
    return { nome: p.nome, qtdEstoque: casa, qtdMaleta: maleta };
  });
}

export async function salvarCliente(id, dados) {
  if (id) {
    await updateDoc(doc(db, "clientes", id), dados);
    return id;
  }
  const ref = doc(collection(db, "clientes"));
  await setDoc(ref, { ...dados, receitas: [], criadoEm: serverTimestamp() });
  return ref.id;
}

export const adicionarReceita = (clienteId, receita) =>
  updateDoc(doc(db, "clientes", clienteId), { receitas: arrayUnion({ ...receita, id: crypto.randomUUID() }) });

export const excluirCliente = (id) => deleteDoc(doc(db, "clientes", id));

function gerarParcelas(totalC, entradaC, n, primeiro) {
  const restoC = totalC - entradaC;
  if (restoC <= 0) return [];
  const baseC = Math.floor(restoC / n);
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    total: n,
    valor: (i === n - 1 ? restoC - baseC * (n - 1) : baseC) / 100,
    vencimento: addMeses(primeiro, i),
    pagoEm: null,
  }));
}
export const previaParcelas = (total, entrada, n, primeiro) =>
  gerarParcelas(Math.round(total * 100), Math.round(entrada * 100), n, primeiro);

// Fecha a venda numa transação: confere estoque, baixa da maleta primeiro e grava as parcelas.
export async function criarVenda(v) {
  return runTransaction(db, async (tx) => {
    const refs = v.itens.map((i) => doc(db, "produtos", i.produtoId));
    const snaps = [];
    for (const r of refs) snaps.push(await tx.get(r));

    const itens = [];
    let custoTotal = 0;
    const baixas = [];
    v.itens.forEach((item, k) => {
      const s = snaps[k];
      if (!s.exists()) throw new Error("Um dos produtos não existe mais.");
      const p = s.data();
      const disp = (p.qtdEstoque || 0) + (p.qtdMaleta || 0);
      if (disp < item.quantidade) throw new Error(`${p.nome}: estoque insuficiente (${disp} disponível).`);
      const daMaleta = Math.min(item.quantidade, p.qtdMaleta || 0);
      const novo = { qtdMaleta: (p.qtdMaleta || 0) - daMaleta, qtdEstoque: (p.qtdEstoque || 0) - (item.quantidade - daMaleta) };
      baixas.push({ ref: refs[k], id: s.id, novo, p });
      custoTotal += (p.custo || 0) * item.quantidade;
      itens.push({ produtoId: s.id, codigo: p.codigo, nome: p.nome, quantidade: item.quantidade, preco: item.preco, custo: p.custo || 0 });
    });
    custoTotal += v.extras.reduce((a, x) => a + (x.custo || 0), 0);

    const brutoC = itens.reduce((a, i) => a + Math.round(i.preco * 100) * i.quantidade, 0) + v.extras.reduce((a, x) => a + Math.round(x.valor * 100), 0);
    const totalC = Math.max(0, brutoC - Math.round(v.desconto * 100));
    const entradaC = v.forma === "crediario" ? Math.min(Math.round(v.entrada * 100), totalC) : 0;

    baixas.forEach(({ ref, id, novo, p }) => {
      tx.update(ref, novo);
      tx.set(doc(db, "catalogo", id), { disponivel: disponivel({ ...p, ...novo }) }, { merge: true });
    });

    const vendaRef = doc(collection(db, "vendas"));
    tx.set(vendaRef, {
      clienteId: v.clienteId,
      clienteNome: v.clienteNome,
      data: hoje(),
      itens,
      extras: v.extras,
      desconto: v.desconto,
      total: totalC / 100,
      custoTotal,
      forma: v.forma,
      entrada: entradaC / 100,
      parcelas: v.forma === "crediario" ? gerarParcelas(totalC, entradaC, v.numeroParcelas, v.primeiroVencimento) : [],
      pedidoId: v.pedidoId || null,
      criadoEm: serverTimestamp(),
    });
    if (v.pedidoId) tx.update(doc(db, "pedidos", v.pedidoId), { status: "vendido" });
    return { id: vendaRef.id, total: totalC / 100 };
  });
}

// Cancela a venda: as peças voltam para casa e as parcelas somem.
export async function cancelarVenda(venda) {
  return runTransaction(db, async (tx) => {
    const lidos = [];
    for (const item of venda.itens) {
      const ref = doc(db, "produtos", item.produtoId);
      lidos.push({ ref, item, snap: await tx.get(ref) });
    }
    lidos.forEach(({ ref, item, snap }) => {
      if (!snap.exists()) return;
      const p = snap.data();
      const novo = { qtdEstoque: (p.qtdEstoque || 0) + item.quantidade };
      tx.update(ref, novo);
      tx.set(doc(db, "catalogo", ref.id), { disponivel: disponivel({ ...p, ...novo }) }, { merge: true });
    });
    tx.delete(doc(db, "vendas", venda.id));
  });
}

export async function marcarParcela(venda, numero, pago) {
  const parcelas = venda.parcelas.map((p) => (p.numero === numero ? { ...p, pagoEm: pago ? hoje() : null } : p));
  await updateDoc(doc(db, "vendas", venda.id), { parcelas });
}

export const statusPedido = (id, status) => updateDoc(doc(db, "pedidos", id), { status });

export const salvarConfig = (dados) => setDoc(doc(db, "config", "loja"), dados, { merge: true });
