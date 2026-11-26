// conexao.js - Deteccao de conectividade online/offline e teste de saude da API
import { testarSaude } from './api.js';

const ouvintes = [];

// Retorna se o navegador reporta estar online
export function estaOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// Testa se a API esta respondendo de verdade
export async function verificarConexaoReal() {
  if (!estaOnline()) return false;
  return await testarSaude();
}

// Registra callback para mudancas de conexao
export function aoMudarConexao(callback) {
  if (typeof callback === 'function') {
    ouvintes.push(callback);
  }
}

// Notifica todos os ouvintes registrados
function notificar(online) {
  ouvintes.forEach((cb) => cb(online));
}

// Configura eventos nativos de rede do navegador
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    const real = await verificarConexaoReal();
    notificar(real);
  });

  window.addEventListener('offline', () => {
    notificar(false);
  });
}
