// api.js - Integracao com a API Express e tratamento seguro de rede
import { obterOuCriarDonoId } from './armazenamento.js';

const API_BASE = '/api';
const TIMEOUT_PADRAO = 6000;

// Requisicao com timeout e tratamento de falhas sem travar a tela
async function requisicao(endpoint, opcoes = {}, timeoutMs = TIMEOUT_PADRAO) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const donoId = obterOuCriarDonoId();
  const headers = {
    'Content-Type': 'application/json',
    'X-Dono-Id': donoId,
    ...(opcoes.headers || {})
  };

  try {
    const resposta = await fetch(`${API_BASE}${endpoint}`, {
      ...opcoes,
      headers,
      signal: controller.signal
    });
    clearTimeout(timer);

    if (resposta.status === 204) {
      return { sucesso: true, status: 204 };
    }

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      return {
        sucesso: false,
        status: resposta.status,
        erro: dados?.erro || 'erro_api',
        erros: dados?.erros || null,
        mensagem: dados?.mensagem || 'Falha na resposta do servidor.'
      };
    }

    return { sucesso: true, status: resposta.status, dados };
  } catch (erro) {
    clearTimeout(timer);
    const isTimeout = erro.name === 'AbortError';
    return {
      sucesso: false,
      status: 0,
      erro: isTimeout ? 'timeout' : 'rede',
      mensagem: isTimeout
        ? 'Tempo de resposta excedido. Verifique sua conexao.'
        : 'Sem comunicacao com o servidor. Operando em modo offline.'
    };
  }
}

// Testa se a API esta respondendo
export async function testarSaude() {
  const res = await requisicao('/saude', { method: 'GET' }, 3000);
  return res.sucesso && res.dados?.status === 'ok';
}

// Lista ofertas ativas do mural com filtros opcionais
export async function listarOfertas(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.categoria && filtros.categoria !== 'Todos') {
    params.set('categoria', filtros.categoria);
  }
  if (filtros.setor) {
    params.set('setor', filtros.setor);
  }

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await requisicao(`/ofertas${query}`, { method: 'GET' });

  if (!res.sucesso) {
    return { sucesso: false, erro: res.erro, mensagem: res.mensagem, ofertas: [] };
  }

  return { sucesso: true, ofertas: Array.isArray(res.dados) ? res.dados : [] };
}

// Lista ofertas do feirante logado (inclusive esgotadas)
export async function listarMinhasOfertas() {
  const res = await requisicao('/ofertas/minhas', { method: 'GET' });

  if (!res.sucesso) {
    return { sucesso: false, erro: res.erro, mensagem: res.mensagem, ofertas: [] };
  }

  return { sucesso: true, ofertas: Array.isArray(res.dados) ? res.dados : [] };
}

// Envia nova oferta para a API (com suporte a idempotencia)
export async function criarOferta(oferta) {
  const res = await requisicao('/ofertas', {
    method: 'POST',
    body: JSON.stringify(oferta)
  }, 10000);

  if (!res.sucesso) {
    return {
      sucesso: false,
      status: res.status,
      erro: res.erro,
      erros: res.erros,
      mensagem: res.mensagem
    };
  }

  return {
    sucesso: true,
    jaExistia: res.status === 200,
    oferta: res.dados?.oferta || oferta
  };
}

// Marca oferta como esgotada
export async function esgotarOferta(id) {
  return requisicao(`/ofertas/${id}/esgotar`, { method: 'PATCH' });
}

// Exclui oferta definitivamente
export async function excluirOferta(id) {
  return requisicao(`/ofertas/${id}`, { method: 'DELETE' });
}
