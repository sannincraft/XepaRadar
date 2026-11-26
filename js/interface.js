/* interface.js — avisos na tela, indicador de conexão,
   compartilhamento e renderização das listas. */

import {
  loadOffers,
  saveOffers,
  calcDistanceMeters,
  userCoords,
  filtroAtual,
  removerOferta
} from "./estado.js";
import { compartilharOferta } from "./dispositivo.js";

function persistir(ofertas) {
  const resultado = saveOffers(ofertas);
  if (!resultado.ok) {
    if (resultado.erro === "quota") {
      showToast("Armazenamento do aparelho cheio. Apague ofertas antigas e tente de novo.");
    } else {
      showToast("Não foi possível salvar no aparelho. Tente novamente.");
    }
  }
  return resultado.ok;
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

/* Detecção de conexão (Network Status) */
export function updateNetworkStatus() {
  const badge = document.getElementById("network-badge");
  const online = navigator.onLine;
  const connType = navigator.connection?.effectiveType
    ? ` (${navigator.connection.effectiveType.toUpperCase()})`
    : "";

  if (online) {
    badge.textContent = `Online${connType}`;
    badge.className = "badge badge-online";
    syncOfflineQueue();
  } else {
    badge.textContent = "Offline (fila ativa)";
    badge.className = "badge badge-offline";
  }
}

export function syncOfflineQueue() {
  const offers = loadOffers();
  let updated = false;
  offers.forEach((item) => {
    if (!item.synced) {
      item.synced = true;
      updated = true;
    }
  });
  if (updated) {
    if (persistir(ofertas)) {
      renderAll();
      showToast("Conexão restabelecida: lotes offline sincronizados.");
    }
  }
}

/* Mensagens de validação do formulário */
export function mostrarErrosFormulario(erros) {
  limparErrosFormulario();
  Object.entries(erros).forEach(([campo, mensagem]) => {
    const input = document.getElementById(campo);
    const saida = document.getElementById(`erro-${campo}`);
    if (input) input.setAttribute("aria-invalid", "true");
    if (saida) saida.textContent = mensagem;
  });
}

export function limparErrosFormulario() {
  document.querySelectorAll(".erro-campo").forEach((el) => {
    el.textContent = "";
  });
  document.querySelectorAll("[aria-invalid]").forEach((el) => {
    el.removeAttribute("aria-invalid");
  });
}

/* Estados de carregamento do mural */
export function mostrarCarregandoMural() {
  const muralEl = document.getElementById("offers-list");
  muralEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = "Carregando ofertas da feira...";
  muralEl.appendChild(p);
}

export function mostrarErroMural(mensagem) {
  const status = document.getElementById("location-status");
  status.textContent = mensagem;
}

/* Filtros de categoria do mural (opções lidas do data/dados.json) */
let categoriasFiltro = ["Todos"];

export function definirCategoriasFiltro(categorias) {
  categoriasFiltro = ["Todos", ...categorias];
}

export function renderFiltros() {
  const container = document.getElementById("filtros-categoria");
  if (!container) return;
  container.innerHTML = "";
  categoriasFiltro.forEach((categoria) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (categoria === filtroAtual ? " active" : "");
    chip.dataset.categoria = categoria;
    chip.textContent = categoria;
    chip.setAttribute("aria-pressed", categoria === filtroAtual ? "true" : "false");
    container.appendChild(chip);
  });
}

/* Renderização das listas (mural e "minhas bancas") */
export function renderAll() {
  const offers = loadOffers();
  const ativas = offers.filter((o) => !o.soldOut);
  const activeOffers = filtroAtual === "Todos"
    ? ativas
    : ativas.filter((o) => o.categoria === filtroAtual);

  if (userCoords) {
    activeOffers.sort((a, b) => {
      const da = calcDistanceMeters(userCoords, a.coords) ?? 999999;
      const db = calcDistanceMeters(userCoords, b.coords) ?? 999999;
      return da - db;
    });
  }

  const muralEl = document.getElementById("offers-list");
  muralEl.innerHTML = "";

  activeOffers.forEach((offer) => {
    const dist = calcDistanceMeters(userCoords, offer.coords);

    const card = document.createElement("article");
    card.className = "offer-card";

    if (offer.photo) {
      const img = document.createElement("img");
      img.className = "offer-img";
      img.src = offer.photo;
      img.alt = `Foto do lote: ${offer.product}`;
      card.appendChild(img);
    }

    const titulo = document.createElement("h3");
    titulo.textContent = offer.product;
    card.appendChild(titulo);

    const priceRow = document.createElement("p");
    priceRow.className = "price-row";
    const oldPrice = document.createElement("span");
    oldPrice.className = "old-price";
    oldPrice.textContent = `R$ ${offer.oldPrice.toFixed(2)}`;
    const xepaPrice = document.createElement("span");
    xepaPrice.className = "xepa-price";
    xepaPrice.textContent = `R$ ${offer.xepaPrice.toFixed(2)}`;
    priceRow.appendChild(oldPrice);
    priceRow.appendChild(xepaPrice);
    card.appendChild(priceRow);

    const meta = document.createElement("p");
    meta.className = "meta";
    const detalhes = [offer.stall, offer.categoria, offer.quantidade];
    if (dist !== null) detalhes.push(`~${dist} m de você`);
    if (!offer.synced) detalhes.push("Aguardando sinal");
    meta.textContent = detalhes.filter(Boolean).join(" • ");
    card.appendChild(meta);

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn-secondary share-btn";
    shareBtn.textContent = "Compartilhar oferta";
    shareBtn.addEventListener("click", () =>
      compartilharOferta(offer, () =>
        showToast("Resumo da oferta copiado para a área de transferência.")
      )
    );
    card.appendChild(shareBtn);

    muralEl.appendChild(card);
  });

  const myEl = document.getElementById("my-offers-list");
  myEl.innerHTML = "";

  offers.forEach((offer) => {
    const statusLabel = offer.soldOut
      ? "Esgotado"
      : offer.synced
        ? "Publicado no mural"
        : "Na fila offline (aguardando sinal)";

    const card = document.createElement("article");
    card.className = "offer-card";

    const titulo = document.createElement("h3");
    titulo.textContent = offer.product;
    card.appendChild(titulo);

    const metaStall = document.createElement("p");
    metaStall.className = "meta";
    metaStall.textContent = `${offer.stall} — R$ ${offer.xepaPrice.toFixed(2)}`;
    card.appendChild(metaStall);

    const metaStatus = document.createElement("p");
    metaStatus.className = "meta";
    const strong = document.createElement("strong");
    strong.textContent = "Status: ";
    metaStatus.appendChild(strong);
    metaStatus.appendChild(document.createTextNode(statusLabel));
    card.appendChild(metaStatus);

    if (!offer.soldOut) {
      const soldBtn = document.createElement("button");
      soldBtn.type = "button";
      soldBtn.className = "btn-secondary sold-btn";
      soldBtn.textContent = "Marcar como esgotado";
      soldBtn.addEventListener("click", () => {
        const list = loadOffers();
        const target = list.find((i) => i.id === offer.id);
        if (target) target.soldOut = true;
        if (persistir(list)) {
          renderAll();
          showToast("Lote marcado como esgotado.");
        }
      });
      card.appendChild(soldBtn);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-danger delete-btn";
    deleteBtn.textContent = "Excluir oferta";
    deleteBtn.addEventListener("click", () => {
      if (!window.confirm(`Excluir "${offer.product}" definitivamente?`)) return;
      const { resultado } = removerOferta(offer.id);
      if (resultado.ok) {
        renderAll();
        showToast("Oferta excluída.");
      } else {
        showToast("Não foi possível excluir. Tente novamente.");
      }
    });
    card.appendChild(deleteBtn);

    myEl.appendChild(card);
  });
}
