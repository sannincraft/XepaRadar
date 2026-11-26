/**
 * fotos.js - Serviço de Processamento e Armazenamento de Fotos
 * Autor: Diego (Backend)
 * 
 * Responsável por validar, decodificar Base64 e gravar imagens JPEG
 * no disco em servidor/dados/fotos/, disponibilizando a URL pública /fotos/...
 */

const fs = require('fs');
const path = require('path');

const PASTA_FOTOS = path.join(__dirname, '..', 'dados', 'fotos');
const LIMITE_BYTES = 200 * 1024; // 200 KB

/**
 * Garante que a pasta de fotos exista.
 */
function garantirPastaFotos() {
  if (!fs.existsSync(PASTA_FOTOS)) {
    fs.mkdirSync(PASTA_FOTOS, { recursive: true });
  }
}

/**
 * Valida e processa imagem em formato Base64 enviada pelo cliente.
 * Aceita exclusivamente fotos no formato JPEG com até 200 KB.
 * 
 * @param {string} fotoBase64 - String em Base64 (Data URI ou raw)
 * @param {string} idOferta - Identificador único do lote
 * @returns {{ sucesso: boolean, status?: number, erro?: string, fotoUrl?: string }}
 */
function processarESalvarFoto(fotoBase64, idOferta) {
  if (!fotoBase64 || typeof fotoBase64 !== 'string' || fotoBase64.trim() === '') {
    return { sucesso: true, fotoUrl: '' };
  }

  // Se já for uma URL estática relativa ou absoluta, preserva
  if (fotoBase64.startsWith('/fotos/') || fotoBase64.startsWith('http://') || fotoBase64.startsWith('https://')) {
    return { sucesso: true, fotoUrl: fotoBase64 };
  }

  // Validação do Formato: apenas JPEG / JPG
  const isDataUriJpeg = /^data:image\/jpe?g;base64,/i.test(fotoBase64);
  const isDataUriOther = /^data:image\/[a-zA-Z0-9_-]+;base64,/i.test(fotoBase64);

  if (isDataUriOther && !isDataUriJpeg) {
    return {
      sucesso: false,
      status: 400,
      erro: 'Formato de imagem inválido. O sistema aceita exclusivamente fotos JPEG.'
    };
  }

  const base64Limpo = fotoBase64.replace(/^data:image\/[a-zA-Z0-9_-]+;base64,/, '');
  const buffer = Buffer.from(base64Limpo, 'base64');

  // Validação do Limite de Tamanho (~200 KB)
  if (buffer.length > LIMITE_BYTES) {
    return {
      sucesso: false,
      status: 413,
      erro: 'Foto muito grande. O limite máximo permitido é de 200 KB.'
    };
  }

  garantirPastaFotos();

  const idSanitizado = (idOferta || `foto-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  const nomeArquivo = `${idSanitizado}.jpg`;
  const caminhoArquivo = path.join(PASTA_FOTOS, nomeArquivo);

  try {
    fs.writeFileSync(caminhoArquivo, buffer);
    return {
      sucesso: true,
      fotoUrl: `/fotos/${nomeArquivo}`
    };
  } catch (erro) {
    console.error('[ServicoFotos] Erro ao gravar foto no disco:', erro);
    return {
      sucesso: false,
      status: 500,
      erro: 'Erro interno ao salvar arquivo de foto.'
    };
  }
}

module.exports = {
  PASTA_FOTOS,
  processarESalvarFoto,
  garantirPastaFotos
};
