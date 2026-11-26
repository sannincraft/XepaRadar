/* interface.js — avisos na tela, indicador de conexão,
   compartilhamento e renderização das listas. */

import {
  loadOffers,
  saveOffers,
  calcDistanceMeters,
  userCoords
} from "./estado.js";

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
    meta.textContent = `${offer.stall}${distText}${syncBadge}`;
    card.appendChild(meta);

    const shareBtn = document.createElement("button");
    shareBtn.type = "button";
    shareBtn.className = "btn-secondary share-btn";
    shareBtn.textContent = "Compartilhar oferta";
    shareBtn.addEventListener("click", () => shareOffer(offer));
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

    myEl.appendChild(card);
  });
}
