/* dispositivo.js — recursos do dispositivo: captura e compressão de
   foto no canvas (descarta metadados EXIF), geolocalização e
   compartilhamento. */

const LIMITE_FOTO_BYTES = 150 * 1024;

function renderizarNoCanvas(imagem, larguraMax, alturaMax) {
  const escala = Math.min(1, larguraMax / imagem.width, alturaMax / imagem.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imagem.width * escala));
  canvas.height = Math.max(1, Math.round(imagem.height * escala));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasParaJpeg(canvas, qualidade) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", qualidade);
  });
}

async function blobParaDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Comprime uma foto para o formato usado no anúncio.
 * Redesenhar a imagem no canvas já descarta os metadados EXIF originais.
 * @param {File} arquivo imagem capturada ou selecionada
 * @returns {Promise<{dataUrl: string, tamanhoKB: number}>}
 */
export async function capturarEComprimirFoto(arquivo) {
  const dataUrlOriginal = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(arquivo);
  });

  const imagem = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrlOriginal;
  });

  /* Reduz dimensão e qualidade em etapas até caber no limite de dados móveis */
  const larguras = [720, 640, 520, 420];
  const qualidades = [0.75, 0.65, 0.55, 0.45];

  let blob = null;
  for (let i = 0; i < larguras.length; i++) {
    const canvas = renderizarNoCanvas(imagem, larguras[i], larguras[i]);
    blob = await canvasParaJpeg(canvas, qualidades[i]);
    if (blob.size <= LIMITE_FOTO_BYTES) break;
  }

  const dataUrl = await blobParaDataUrl(blob);
  return { dataUrl, tamanhoKB: Math.max(1, Math.round(blob.size / 1024)) };
}

/* Compartilhamento: Web Share API com área de transferência como alternativa */
export async function compartilharOferta(offer, aoCopiar) {
  const resumo = [
    "XepaRadar — Oferta de fim de feira",
    `Lote: ${offer.product}`,
    offer.quantidade ? `Quantidade: ${offer.quantidade}` : null,
    offer.categoria ? `Categoria: ${offer.categoria}` : null,
    `De R$ ${offer.oldPrice.toFixed(2)} por R$ ${offer.xepaPrice.toFixed(2)}`,
    `Local: ${offer.stall}`
  ].filter(Boolean).join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ title: "Oferta XepaRadar", text: resumo });
      return;
    } catch (_) {
      /* usuário cancelou o menu nativo; não copia de surpresa */
      return;
    }
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(resumo);
    if (aoCopiar) aoCopiar();
  }
}

/* Geolocalização com tratamento de ausência de suporte e de permissão */
export function obterLocalizacao() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS indisponível neste navegador."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: Math.round(pos.coords.accuracy)
        }),
      (erro) => {
        const motivo =
          erro.code === erro.PERMISSION_DENIED
            ? "Permissão de localização negada."
            : "Não foi possível obter a posição (sinal fraco ou timeout).";
        reject(new Error(motivo));
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}
