/**
 * ofertasServico.js - Serviço de Persistência em Arquivo para Ofertas
 * Autor: Diego (Backend)
 * 
 * Gerencia leitura e gravação das ofertas em servidor/dados/ofertas.json.
 * Cria o diretório e o arquivo automaticamente se não existirem.
 */

const fs = require('fs');
const path = require('path');

const PASTA_DADOS = path.join(__dirname, '..', 'dados');
const ARQUIVO_OFERTAS = path.join(PASTA_DADOS, 'ofertas.json');
const ARQUIVO_SEEDS = path.join(__dirname, '..', '..', 'data', 'dados.json');

/**
 * Garante que a pasta e o arquivo de persistência existam.
 */
function garantirArquivo() {
  if (!fs.existsSync(PASTA_DADOS)) {
    fs.mkdirSync(PASTA_DADOS, { recursive: true });
  }

  if (!fs.existsSync(ARQUIVO_OFERTAS)) {
    let inicial = [];
    // Carrega ofertas iniciais de data/dados.json se disponível
    if (fs.existsSync(ARQUIVO_SEEDS)) {
      try {
        const conteudo = fs.readFileSync(ARQUIVO_SEEDS, 'utf-8');
        const json = JSON.parse(conteudo);
        inicial = json.ofertas || [];
      } catch (e) {
        console.error('[ServicoOfertas] Erro ao carregar dados iniciais de seed:', e);
      }
    }
    fs.writeFileSync(ARQUIVO_OFERTAS, JSON.stringify(inicial, null, 2), 'utf-8');
  }
}

/**
 * Lê todas as ofertas salvas no arquivo.
 * @returns {Array} Lista de ofertas
 */
function lerOfertas() {
  garantirArquivo();
  try {
    let dados = fs.readFileSync(ARQUIVO_OFERTAS, 'utf-8');
    if (dados.charCodeAt(0) === 0xFEFF) {
      dados = dados.slice(1);
    }
    return JSON.parse(dados);
  } catch (erro) {
    console.error('[ServicoOfertas] Erro ao ler ofertas:', erro);
    return [];
  }
}

/**
 * Grava a lista completa de ofertas no arquivo.
 * @param {Array} ofertas 
 */
function gravarOfertas(ofertas) {
  garantirArquivo();
  fs.writeFileSync(ARQUIVO_OFERTAS, JSON.stringify(ofertas, null, 2), 'utf-8');
}

/**
 * Lista as ofertas cadastradas com suporte a filtros por query.
 * No mural público, exibe apenas ofertas ativas e dentro do prazo de 2 horas.
 * @param {{ categoria?: string, setor?: string }} filtros
 * @returns {Array} Ofertas ativas filtradas
 */
function listarOfertas(filtros = {}) {
  let ofertas = lerOfertas();
  const agora = Date.now();

  // Expiração automática de 2 horas e exclusão de esgotadas no mural público
  ofertas = ofertas.filter((o) => {
    const isAtiva = (o.status || 'ativa').toLowerCase() === 'ativa';
    const expiraEm = o.expiraEm || (o.criadaEm ? o.criadaEm + 2 * 60 * 60 * 1000 : Infinity);
    const dentroDoPrazo = agora < expiraEm;
    return isAtiva && dentroDoPrazo;
  });

  if (filtros.categoria && filtros.categoria.toLowerCase() !== 'todos') {
    ofertas = ofertas.filter(
      (o) => (o.categoria || '').toLowerCase() === filtros.categoria.toLowerCase()
    );
  }

  if (filtros.setor) {
    ofertas = ofertas.filter(
      (o) => (o.setor || '').toLowerCase() === filtros.setor.toLowerCase()
    );
  }

  return ofertas;
}

/**
 * Lista ofertas associadas a um feirante específico (donoId).
 * @param {string} donoId
 * @returns {Array}
 */
function listarOfertasPorDono(donoId) {
  if (!donoId) return [];
  const ofertas = lerOfertas();
  return ofertas.filter((o) => o.donoId === donoId);
}

/**
 * Cria ou revalida uma oferta com idempotência (se o ID já existir, não duplica).
 * @param {Object} dadosOferta 
 * @param {string} donoId 
 * @returns {{ jaExistia: boolean, oferta: Object }}
 */
function criarOferta(dadosOferta, donoId) {
  const ofertas = lerOfertas();
  const id = dadosOferta.id || `lot-${Date.now()}`;

  // Idempotência para re-envios da fila offline
  const existente = ofertas.find((o) => o.id === id);
  if (existente) {
    return { jaExistia: true, oferta: existente };
  }

  const agora = Date.now();
  const novaOferta = {
    id,
    produto: dadosOferta.produto || dadosOferta.product || '',
    categoria: dadosOferta.categoria || 'Hortifrúti',
    precoOriginal: Number(dadosOferta.precoOriginal || dadosOferta.oldPrice || 0),
    precoXepa: Number(dadosOferta.precoXepa || dadosOferta.xepaPrice || 0),
    quantidade: dadosOferta.quantidade || '',
    banca: dadosOferta.banca || dadosOferta.stall || '',
    setor: dadosOferta.setor || '',
    lat: dadosOferta.lat ?? dadosOferta.coords?.lat ?? null,
    lng: dadosOferta.lng ?? dadosOferta.coords?.lng ?? null,
    fotoUrl: dadosOferta.fotoUrl || '',
    donoId: donoId || dadosOferta.donoId || 'anonimo',
    criadaEm: dadosOferta.criadaEm || agora,
    expiraEm: dadosOferta.expiraEm || (agora + 2 * 60 * 60 * 1000),
    status: dadosOferta.status || 'ativa'
  };

  ofertas.unshift(novaOferta);
  gravarOfertas(ofertas);

  return { jaExistia: false, oferta: novaOferta };
}

/**
 * Marca uma oferta como esgotada, validando a permissão do proprietário (X-Dono-Id).
 * @param {string} id 
 * @param {string} donoId 
 * @returns {{ sucesso: boolean, status?: number, erro?: string, oferta?: Object }}
 */
function esgotarOferta(id, donoId) {
  const ofertas = lerOfertas();
  const oferta = ofertas.find((o) => o.id === id);

  if (!oferta) {
    return { sucesso: false, status: 404, erro: 'Oferta não encontrada.' };
  }

  if (oferta.donoId !== donoId) {
    return {
      sucesso: false,
      status: 403,
      erro: 'Apenas o feirante proprietário pode marcar esta oferta como esgotada.'
    };
  }

  oferta.status = 'esgotada';
  gravarOfertas(ofertas);

  return { sucesso: true, oferta };
}

/**
 * Exclui uma oferta definitivamente, restrito ao proprietário (X-Dono-Id).
 * @param {string} id 
 * @param {string} donoId 
 * @returns {{ sucesso: boolean, status?: number, erro?: string }}
 */
function excluirOferta(id, donoId) {
  const ofertas = lerOfertas();
  const index = ofertas.findIndex((o) => o.id === id);

  if (index === -1) {
    return { sucesso: false, status: 404, erro: 'Oferta não encontrada.' };
  }

  const oferta = ofertas[index];
  if (oferta.donoId !== donoId) {
    return {
      sucesso: false,
      status: 403,
      erro: 'Apenas o feirante proprietário pode excluir esta oferta.'
    };
  }

  ofertas.splice(index, 1);
  gravarOfertas(ofertas);

  return { sucesso: true };
}

module.exports = {
  listarOfertas,
  listarOfertasPorDono,
  criarOferta,
  esgotarOferta,
  excluirOferta,
  lerOfertas,
  gravarOfertas
};
