/* app.js — ponto de entrada: liga os eventos da página. */

import {
  loadOffers,
  saveOffers,
  setCapturedCoords,
  setCompressedPhoto,
  setUserCoords,
  getCapturedCoords,
  getCompressedPhoto,
  definirOfertasBase
} from "./estado.js";
import {
  renderAll,
  showToast,
  updateNetworkStatus,
  syncOfflineQueue,
  mostrarCarregandoMural,
  mostrarErroMural
} from "./interface.js";
import { iniciarNavegacao } from "./navegacao.js";

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
    /* Primeira visita: grava as ofertas de exemplo no localStorage */
    if (!localStorage.getItem("xeparadar_offers_v1")) {
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

/* Captura e compressão de imagem via Canvas (remove EXIF) */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 720;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
    const foto = await compressImage(file);
    setCompressedPhoto(foto);
    const preview = document.getElementById("photo-preview");
    preview.src = foto;
    preview.classList.remove("hidden");
    document.getElementById("photo-label-text").textContent = "Foto otimizada pronta";
  });

  document.getElementById("btn-capture-gps").addEventListener("click", () => {
    const feedback = document.getElementById("gps-feedback");
    if (!navigator.geolocation) {
      feedback.textContent = "GPS indisponível neste navegador.";
      return;
    }
    feedback.textContent = "Obtendo posição...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCapturedCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        feedback.textContent = `Coordenadas capturadas (precisão ~${Math.round(pos.coords.accuracy)}m)`;
      },
      () => {
        feedback.textContent = "Sem permissão de GPS. O setor digitado será usado.";
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  document.getElementById("btn-locate-user").addEventListener("click", () => {
    const status = document.getElementById("location-status");
    if (!navigator.geolocation) return;
    status.textContent = "Calculando distância até as bancas...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        status.textContent = "Ofertas ordenadas da banca mais próxima para a mais distante.";
        renderAll();
      },
      () => {
        status.textContent = "Não foi possível obter sua localização; exibindo por ordem recente.";
      }
    );
  });

  document.getElementById("offer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const offers = loadOffers();
    const isOnline = navigator.onLine;

    offers.unshift({
      id: `lot-${Date.now()}`,
      product: document.getElementById("product-name").value.trim(),
      oldPrice: parseFloat(document.getElementById("old-price").value),
      xepaPrice: parseFloat(document.getElementById("xepa-price").value),
      stall: document.getElementById("stall-info").value.trim(),
      coords: getCapturedCoords(),
      photo: getCompressedPhoto(),
      synced: isOnline,
      soldOut: false,
      createdAt: Date.now()
    });

    saveOffers(offers);
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
});
