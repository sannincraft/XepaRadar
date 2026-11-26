/* interface.js — avisos na tela, indicador de conexão,
   compartilhamento e renderização das listas. */

import {
  loadOffers,
  saveOffers,
  calcDistanceMeters,
  userCoords
} from "./estado.js";

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
    saveOffers(offers);
    renderAll();
    showToast("Conexão restabelecida: lotes offline sincronizados.");
  }
}

/* Compartilhamento / área de transferência */
export async function shareOffer(offer) {
  const text = [
    `XepaRadar - Oferta de Fim de Feira`,
    `Lote: ${offer.product}`,
    `De R$ ${offer.oldPrice.toFixed(2)} por R$ ${offer.xepaPrice.toFixed(2)}`,
    `Local: ${offer.stall}`
  ].join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ title: "Oferta XepaRadar", text });
      return;
    } catch (_) {
      /* Usuário cancelou o compartilhamento nativo */
    }
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    showToast("Resumo da oferta copiado para a área de transferência.");
  }
}

/* Renderização das listas (mural e "minhas bancas") */
export function renderAll() {
  const offers = loadOffers();
  const activeOffers = offers.filter((o) => !o.soldOut);

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
    const distText = dist !== null ? ` • ~${dist} m de você` : "";
    const syncBadge = offer.synced ? "" : " [Aguardando sinal]";

    const card = document.createElement("article");
    card.className = "offer-card";
    card.innerHTML = `
      ${offer.photo ? `<img class="offer-img" src="${offer.photo}" alt="Foto do lote: ${offer.product}">` : ""}
      <h3>${offer.product}</h3>
      <p class="price-row">
        <span class="old-price">R$ ${offer.oldPrice.toFixed(2)}</span>
        <span class="xepa-price">R$ ${offer.xepaPrice.toFixed(2)}</span>
      </p>
      <p class="meta">${offer.stall}${distText}${syncBadge}</p>
      <button type="button" class="btn-secondary share-btn">Compartilhar oferta</button>
    `;
    card.querySelector(".share-btn").addEventListener("click", () => shareOffer(offer));
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
    card.innerHTML = `
      <h3>${offer.product}</h3>
      <p class="meta">${offer.stall} — R$ ${offer.xepaPrice.toFixed(2)}</p>
      <p class="meta"><strong>Status:</strong> ${statusLabel}</p>
      ${!offer.soldOut ? `<button type="button" class="btn-secondary sold-btn">Marcar como esgotado</button>` : ""}
    `;
    const soldBtn = card.querySelector(".sold-btn");
    if (soldBtn) {
      soldBtn.addEventListener("click", () => {
        const list = loadOffers();
        const target = list.find((i) => i.id === offer.id);
        if (target) target.soldOut = true;
        saveOffers(list);
        renderAll();
        showToast("Lote marcado como esgotado.");
      });
    }
    myEl.appendChild(card);
  });
}
