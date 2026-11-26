/* armazenamento.js — leitura e gravação no localStorage com tratamento
   de erros: chave versionada, JSON inválido vira valor padrão e cota
   cheia vira aviso em vez de quebrar a aplicação.

   NOTA: versão provisória para o front-end funcionar; o Diego pode
   substituí-la pela implementação definitiva (commit #7 do plano). */

const PREFIXO = "xeparadar";
const VERSAO = "v1";

function montarChave(nome) {
  return `${PREFIXO}:${VERSAO}:${nome}`;
}

/**
 * Lê e desserializa um valor do localStorage.
 * @param {string} nome nome lógico da chave (sem prefixo/versão)
 * @param {*} valorPadrao valor retornado quando a chave não existe ou o JSON é inválido
 * @returns {*} o valor gravado ou o valor padrão
 */
export function ler(nome, valorPadrao) {
  try {
    const bruto = localStorage.getItem(montarChave(nome));
    if (bruto === null) return valorPadrao;
    return JSON.parse(bruto);
  } catch (erro) {
    console.warn(`localStorage: JSON inválido em "${nome}"; usando valor padrão.`, erro);
    return valorPadrao;
  }
}

/**
 * Serializa e grava um valor no localStorage.
 * @param {string} nome nome lógico da chave (sem prefixo/versão)
 * @param {*} valor valor a ser serializado
 * @returns {{ok: boolean, erro?: string}} sucesso ou tipo de falha ("quota" | "serializacao" | "leitura")
 */
export function gravar(nome, valor) {
  let bruto;
  try {
    bruto = JSON.stringify(valor);
  } catch (erro) {
    console.warn(`localStorage: não foi possível serializar "${nome}".`, erro);
    return { ok: false, erro: "serializacao" };
  }

  try {
    localStorage.setItem(montarChave(nome), bruto);
    return { ok: true };
  } catch (erro) {
    if (erro && erro.name === "QuotaExceededError") {
      console.warn(`localStorage: cota cheia ao gravar "${nome}".`, erro);
      return { ok: false, erro: "quota" };
    }
    console.warn(`localStorage: falha ao gravar "${nome}".`, erro);
    return { ok: false, erro: "escrita" };
  }
}

/**
 * Remove uma chave do localStorage.
 * @param {string} nome nome lógico da chave (sem prefixo/versão)
 */
export function apagar(nome) {
  try {
    localStorage.removeItem(montarChave(nome));
  } catch (erro) {
    console.warn(`localStorage: falha ao apagar "${nome}".`, erro);
  }
}
