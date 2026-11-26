/* validacao.js — regras de validação do formulário de anúncio.
   Retorna um mapa de erros por campo; formulário válido tem o mapa vazio. */

/**
 * Valida os dados de um anúncio antes de alterar o estado.
 * @param {{product: string, oldPrice: number, xepaPrice: number, stall: string}} dados
 * @returns {{valido: boolean, erros: Object<string, string>}}
 */
export function validarOferta(dados) {
  const erros = {};

  const produto = (dados.product ?? "").trim();
  if (!produto) {
    erros["product-name"] = "Informe o produto ou o lote.";
  }

  const precoNormal = Number(dados.oldPrice);
  if (!Number.isFinite(precoNormal) || precoNormal <= 0) {
    erros["old-price"] = "Preço normal deve ser maior que zero.";
  }

  const precoXepa = Number(dados.xepaPrice);
  if (!Number.isFinite(precoXepa) || precoXepa <= 0) {
    erros["xepa-price"] = "Preço de xepa deve ser maior que zero.";
  } else if (Number.isFinite(precoNormal) && precoXepa >= precoNormal) {
    erros["xepa-price"] = "Preço de xepa deve ser menor que o preço normal.";
  }

  const banca = (dados.stall ?? "").trim();
  if (!banca) {
    erros["stall-info"] = "Informe a identificação da banca.";
  }

  if (!dados.categoria) {
    erros["offer-categoria"] = "Selecione a categoria do lote.";
  }

  if (!dados.setor) {
    erros["offer-setor"] = "Selecione o setor da feira.";
  }

  return { valido: Object.keys(erros).length === 0, erros };
}
