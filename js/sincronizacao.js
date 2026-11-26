// sincronizacao.js - Fila de sincronizacao offline e reenvio de ofertas
import { carregarFilaOffline, salvarFilaOffline } from './armazenamento.js';
import { criarOferta } from './api.js';
import { aoMudarConexao, estaOnline } from './conexao.js';

let sincronizando = false;

// Retorna itens pendentes na fila offline
export function obterFila() {
  return carregarFilaOffline();
}

// Adiciona oferta na fila offline
export function enfileirarOferta(oferta) {
  const fila = carregarFilaOffline();
  const item = {
    ...oferta,
    synced: false,
    statusSincronizacao: 'aguardando_sinal',
    enfileiradoEm: Date.now()
  };

  // Evita duplicar se ja estiver na fila
  const existe = fila.some((o) => o.id === item.id);
  if (!existe) {
    fila.push(item);
    salvarFilaOffline(fila);
  }

  // Tenta sincronizar imediatamente se houver conexao
  if (estaOnline()) {
    sincronizarFila();
  }

  return item;
}

// Reenvia todas as ofertas pendentes da fila para o servidor
export async function sincronizarFila() {
  if (sincronizando || !estaOnline()) {
    return { sucesso: false, restantes: carregarFilaOffline().length };
  }

  const fila = carregarFilaOffline();
  if (fila.length === 0) {
    return { sucesso: true, sincronizados: 0, restantes: 0 };
  }

  sincronizando = true;
  const restantes = [];
  let sincronizados = 0;

  for (const item of fila) {
    const res = await criarOferta(item);

    if (res.sucesso) {
      sincronizados++;
    } else if (res.erro === 'rede' || res.erro === 'timeout') {
      // Se a conexao cair no meio, preserva este e os seguintes
      restantes.push(item);
    }
    // Erros 400 (validacao) ou ja existentes nao devem travar a fila
  }

  salvarFilaOffline(restantes);
  sincronizando = false;

  return {
    sucesso: restantes.length === 0,
    sincronizados,
    restantes: restantes.length
  };
}

// Auto-sincronizacao assim que a conexao for restabelecida
aoMudarConexao((online) => {
  if (online) {
    sincronizarFila();
  }
});
