/**
 * armazenamento.js - Gerenciamento de Armazenamento Local (localStorage)
 * Autor: Diego (Backend)
 * 
 * Responsável por leitura, escrita, versionamento de chaves e tratamento
 * seguro de erros (JSON corrompido e estouro de cota QuotaExceededError).
 */

const VERSAO_STORAGE = 'v1';
export const CHAVE_OFERTAS = `xeparadar_ofertas_${VERSAO_STORAGE}`;
export const CHAVE_FILA = `xeparadar_fila_${VERSAO_STORAGE}`;
export const CHAVE_DONO = `xeparadar_dono_id`;

/**
 * Lê e decodifica dados do localStorage com tratamento de erro.
 * Se o dado estiver corrompido ou ausente, retorna o valor padrão sem quebrar a aplicação.
 * 
 * @param {string} chave - Chave do localStorage
 * @param {*} valorPadrao - Valor de retorno em caso de ausência ou falha (padrão: [])
 * @returns {*} Dados obtidos ou valor padrão
 */
export function lerStorage(chave, valorPadrao = []) {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) {
      return valorPadrao;
    }
    return JSON.parse(raw);
  } catch (erro) {
    console.error(`[Armazenamento] Falha ao ler ou converter chave "${chave}":`, erro);
    // Em caso de JSON inválido ou corrompido, retorna o padrão seguro
    return valorPadrao;
  }
}

/**
 * Grava dados no localStorage serializando em JSON e tratando estouro de cota.
 * 
 * @param {string} chave - Chave do localStorage
 * @param {*} dados - Objeto ou array para serializar
 * @returns {{ sucesso: boolean, erro?: string, mensagem?: string }}
 */
export function gravarStorage(chave, dados) {
  try {
    const serializado = JSON.stringify(dados);
    localStorage.setItem(chave, serializado);
    return { sucesso: true };
  } catch (erro) {
    console.error(`[Armazenamento] Falha ao salvar chave "${chave}":`, erro);

    // Detecção específica de cota cheia do navegador
    const isQuotaExceeded =
      erro instanceof DOMException &&
      (erro.name === 'QuotaExceededError' ||
        erro.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        erro.code === 22 ||
        erro.code === 1014);

    if (isQuotaExceeded) {
      const mensagemAviso = 'Cota de armazenamento local atingida! Libere espaço removendo itens antigos ou fotos pesadas.';
      console.warn(`[Armazenamento] ${mensagemAviso}`);

      // Emite evento global para que a interface possa capturar e exibir aviso na tela
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('xepa:cota-excedida', {
            detail: { chave, mensagem: mensagemAviso }
          })
        );
      }

      return {
        sucesso: false,
        erro: 'cota_excedida',
        mensagem: mensagemAviso
      };
    }

    return {
      sucesso: false,
      erro: 'desconhecido',
      mensagem: erro.message || 'Erro ao gravar no armazenamento local.'
    };
  }
}

/**
 * Remove uma chave do localStorage.
 * 
 * @param {string} chave 
 */
export function removerStorage(chave) {
  try {
    localStorage.removeItem(chave);
  } catch (erro) {
    console.error(`[Armazenamento] Falha ao remover chave "${chave}":`, erro);
  }
}

/**
 * Carrega a lista de ofertas do feirante salvas localmente.
 * @returns {Array} Lista de ofertas salvas ou array vazio.
 */
export function carregarOfertasLocais() {
  return lerStorage(CHAVE_OFERTAS, []);
}

/**
 * Persiste a lista de ofertas localmente.
 * @param {Array} ofertas 
 * @returns {{ sucesso: boolean, erro?: string, mensagem?: string }}
 */
export function salvarOfertasLocais(ofertas) {
  return gravarStorage(CHAVE_OFERTAS, ofertas);
}

/**
 * Carrega a fila de sincronização offline.
 * @returns {Array} Lista de itens na fila offline.
 */
export function carregarFilaOffline() {
  return lerStorage(CHAVE_FILA, []);
}

/**
 * Salva a fila de sincronização offline.
 * @param {Array} fila 
 * @returns {{ sucesso: boolean, erro?: string, mensagem?: string }}
 */
export function salvarFilaOffline(fila) {
  return gravarStorage(CHAVE_FILA, fila);
}

/**
 * Recupera ou cria um identificador anônimo para o feirante (sem login, conformidade LGPD).
 * @returns {string} donoId
 */
export function obterOuCriarDonoId() {
  try {
    let donoId = localStorage.getItem(CHAVE_DONO);
    if (!donoId) {
      donoId = `usr-anon-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(CHAVE_DONO, donoId);
    }
    return donoId;
  } catch (erro) {
    console.error('[Armazenamento] Erro ao obter/criar donoId:', erro);
    return 'usr-anon-temp';
  }
}
