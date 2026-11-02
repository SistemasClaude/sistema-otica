// Estado do painel em memória (vem do Firestore em tempo real) + carrinho da venda.
import { addMeses, hoje } from "./util.js";

export const S = {
  pronto: false,
  produtos: [],
  fotos: {}, // id do produto -> foto (fica no catálogo público)
  clientes: [],
  vendas: [],
  pedidos: [],
  config: {},
};

const carrinhoVazio = () => ({
  clienteId: "",
  pedidoId: null,
  itens: [],
  extras: [],
  desconto: 0,
  forma: "pix",
  entrada: 0,
  numeroParcelas: 3,
  primeiroVencimento: addMeses(hoje(), 1),
});
export let carrinho = carrinhoVazio();
export const limparCarrinho = () => {
  carrinho = carrinhoVazio();
};
export function adicionarAoCarrinho(p) {
  const existe = carrinho.itens.find((i) => i.produtoId === p.id);
  if (existe) existe.quantidade += 1;
  else carrinho.itens.push({ produtoId: p.id, codigo: p.codigo, nome: p.nome, preco: p.preco || 0, quantidade: 1, disponivel: (p.qtdEstoque || 0) + (p.qtdMaleta || 0) });
}

export const produtoPorCodigo = (c) => S.produtos.find((p) => String(p.codigo).toLowerCase() === String(c).trim().toLowerCase());
export const nomeLoja = () => S.config.nomeLoja || "Sua Ótica";

let redesenhar = () => {};
export const definirRedesenho = (f) => {
  redesenhar = f;
};
export const atualizarTela = () => redesenhar();
export const ir = (rota) => {
  location.hash = "#/" + rota;
};

// Parcelas achatadas, com a venda junto.
export function todasParcelas() {
  const out = [];
  S.vendas.forEach((v) => (v.parcelas || []).forEach((p) => out.push({ ...p, venda: v })));
  return out;
}
