/* app.js — ponto de entrada: liga os eventos da página. */

import {
  loadOffers,
  saveOffers,
  setCapturedCoords,
  setCompressedPhoto,
  setUserCoords,
  getCapturedCoords,
  getCompressedPhoto,
  definirOfertasBase,
  ofertasJaGravadas,
  setFiltro
} from "./estado.js";
import {
  renderAll,
  showToast,
  updateNetworkStatus,
  syncOfflineQueue,
  mostrarCarregandoMural,
  mostrarErroMural,
  mostrarErrosFormulario,
  limparErrosFormulario,
  definirCategoriasFiltro,
  renderFiltros
} from "./interface.js";
import { iniciarNavegacao } from "./navegacao.js";
import { validarOferta } from "./validacao.js";
import { capturarEComprimirFoto, obterLocalizacao } from "./dispositivo.js";

/* Converte uma oferta do data/dados.json para o formato usado no app */
function mapearOferta(oferta) {
  return {
    id: oferta.id,
    product: oferta.product,
    categoria: oferta.categoria,
    quantidade: oferta.quantidade,
    oldPrice: oferta.oldPrice,
    xepaPrice: oferta.xepaPrice,
    stall: `${oferta.banca} - ${oferta.setor}`,
    banca: oferta.banca,
    setor: oferta.setor,
    coords: { lat: oferta.lat, lng: oferta.lng },
    photo: oferta.foto,
    synced: oferta.synced,
    soldOut: oferta.soldOut,
    createdAt: Date.now() - oferta.criadaHaMinutos * 60 * 1000
  };
}

async function carregarDadosDaFeira() {
  mostrarCarregandoMural();
  try {
    const resposta = await fetch("data/dados.json");
    if (!resposta.ok) {
      throw new Error(`HTTP ${resposta.status}`);
    }
    const dados = await resposta.json();
    const ofertas = dados.ofertas.map(mapearOferta);
    definirOfertasBase(ofertas);
    definirCategoriasFiltro(dados.categorias);
    renderFiltros();
    /* Primeira visita: grava as ofertas de exemplo no localStorage */
    if (!ofertasJaGravadas()) {
      saveOffers(ofertas);
    }
    renderAll();
  } catch (erro) {
    console.error("Falha ao carregar data/dados.json:", erro);
    mostrarErroMural(
      "Não foi possível carregar as ofertas de exemplo (data/dados.json). Verifique o servidor e recarregue."
    );
    renderAll();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateNetworkStatus();
  carregarDadosDaFeira();
  iniciarNavegacao();

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  document.getElementById("photo-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const foto = await capturarEComprimirFoto(file);
      setCompressedPhoto(foto.dataUrl);
      const preview = document.getElementById("photo-preview");
      preview.src = foto.dataUrl;
      preview.classList.remove("hidden");
      document.getElementById("photo-label-text").textContent =
        `Foto pronta (~${foto.tamanhoKB} KB)`;
    } catch (erro) {
      console.error("Falha ao processar a foto:", erro);
      showToast("Não foi possível processar a foto. Tente outra imagem.");
    }
  });

  document.getElementById("btn-capture-gps").addEventListener("click", async () => {
    const feedback = document.getElementById("gps-feedback");
    feedback.textContent = "Obtendo posição...";
    try {
      const posicao = await obterLocalizacao();
      setCapturedCoords({ lat: posicao.lat, lng: posicao.lng });
      feedback.textContent = `Coordenadas capturadas (precisão ~${posicao.precisao}m)`;
    } catch (erro) {
      /* Sem GPS ainda dá para anunciar: vale o setor escolhido manualmente */
      feedback.textContent = `${erro.message} O setor escolhido será usado.`;
    }
  });

  document.getElementById("btn-locate-user").addEventListener("click", async () => {
    const status = document.getElementById("location-status");
    status.textContent = "Calculando distância até as bancas...";
    try {
      const posicao = await obterLocalizacao();
      setUserCoords({ lat: posicao.lat, lng: posicao.lng });
      status.textContent = "Ofertas ordenadas da banca mais próxima para a mais distante.";
      renderAll();
    } catch (erro) {
      status.textContent = `${erro.message} Exibindo por ordem recente.`;
    }
  });

  document.getElementById("offer-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const dados = {
      product: document.getElementById("product-name").value,
      oldPrice: document.getElementById("old-price").value,
      xepaPrice: document.getElementById("xepa-price").value,
      stall: document.getElementById("stall-info").value,
      categoria: document.getElementById("offer-categoria").value,
      setor: document.getElementById("offer-setor").value
    };

    /* Valida antes de modificar o estado; em erro, preserva o digitado */
    const validacao = validarOferta(dados);
    if (!validacao.valido) {
      mostrarErrosFormulario(validacao.erros);
      showToast("Corrija os campos destacados e tente de novo.");
      return;
    }
    limparErrosFormulario();

    const offers = loadOffers();
    const isOnline = navigator.onLine;

    offers.unshift({
      id: `lot-${Date.now()}`,
      product: dados.product.trim(),
      categoria: dados.categoria,
      quantidade: "",
      oldPrice: Number(dados.oldPrice),
      xepaPrice: Number(dados.xepaPrice),
      stall: `${dados.stall.trim()} - ${dados.setor}`,
      banca: dados.stall.trim(),
      setor: dados.setor,
      coords: getCapturedCoords(),
      photo: getCompressedPhoto(),
      synced: isOnline,
      soldOut: false,
      createdAt: Date.now()
    });

    const gravou = saveOffers(offers);
    if (!gravou.ok) {
      showToast(
        gravou.erro === "quota"
          ? "Armazenamento do aparelho cheio. Apague ofertas antigas e tente de novo."
          : "Não foi possível salvar no aparelho. Tente novamente."
      );
      return;
    }
    e.target.reset();
    setCompressedPhoto("");
    setCapturedCoords(null);
    document.getElementById("photo-preview").classList.add("hidden");
    document.getElementById("photo-label-text").textContent = "Fotografar lote na bancada";
    renderAll();

    showToast(
      isOnline
        ? "Lote publicado no mural!"
        : "Sem internet: lote salvo na fila offline."
    );
  });

  document.getElementById("btn-sync-now").addEventListener("click", () => {
    if (!navigator.onLine) {
      showToast("Dispositivo ainda está offline.");
      return;
    }
    syncOfflineQueue();
  });

  /* Filtro de categoria do mural */
  document.getElementById("filtros-categoria").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    setFiltro(chip.dataset.categoria);
    renderFiltros();
    renderAll();
  });
});
