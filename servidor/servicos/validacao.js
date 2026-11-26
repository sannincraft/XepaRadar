/**
 * validacao.js - Serviço de Validação de Ofertas no Backend
 * Autor: Diego (Backend)
 * 
 * Valida os dados de entrada das ofertas submetidas à API,
 * retornando os erros estruturados por campo para resposta HTTP 400.
 */

/**
 * Valida os campos obrigatórios e regras de negócio de uma oferta.
 * 
 * @param {Object} dados - Dados da oferta recebidos no corpo da requisição
 * @param {string} [donoId] - Identificador do feirante (do cabeçalho ou body)
 * @returns {{ valido: boolean, erros: Record<string, string> }}
 */
function validarOferta(dados = {}, donoId = null) {
  const erros = {};

  // Validação do Nome do Produto
  const produto = (dados.produto || dados.product || '').trim();
  if (!produto) {
    erros.produto = 'Nome do produto é obrigatório.';
  } else if (produto.length < 3) {
    erros.produto = 'Nome do produto deve ter no mínimo 3 caracteres.';
  }

  // Validação do Preço Original
  const precoOriginal = Number(dados.precoOriginal ?? dados.oldPrice);
  if (isNaN(precoOriginal) || precoOriginal <= 0) {
    erros.precoOriginal = 'Preço original deve ser um número maior que zero.';
  }

  // Validação do Preço Xepa
  const precoXepa = Number(dados.precoXepa ?? dados.xepaPrice);
  if (isNaN(precoXepa) || precoXepa <= 0) {
    erros.precoXepa = 'Preço da xepa deve ser um número maior que zero.';
  } else if (!isNaN(precoOriginal) && precoOriginal > 0 && precoXepa >= precoOriginal) {
    erros.precoXepa = 'O preço da xepa deve ser menor que o preço original.';
  }

  // Validação da Identificação da Banca
  const banca = (dados.banca || dados.stall || '').trim();
  if (!banca) {
    erros.banca = 'Identificação da banca é obrigatória.';
  }

  // Validação do Proprietário / Feirante
  const autorDono = (donoId || dados.donoId || '').trim();
  if (!autorDono) {
    erros.donoId = 'Identificação do proprietário (donoId) é obrigatória.';
  }

  return {
    valido: Object.keys(erros).length === 0,
    erros
  };
}

module.exports = {
  validarOferta
};
