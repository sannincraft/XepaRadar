const STORAGE_KEY = "xeparadar_offers_v1";

const DEFAULT_OFFERS = [
  {
    id: "seed-1",
    product: "Cheiro-verde + Cebolinha (kit com 4 maços)",
    oldPrice: 12.0,
    xepaPrice: 5.0,
    stall: "Banca 04 - Ala Hortifrúti",
    coords: { lat: -10.8853, lng: -61.9517 },
    photo: "",
    synced: true,
    soldOut: false,
    createdAt: Date.now() - 15 * 60 * 1000
  },
  {
    id: "seed-2",
    product: "Mandioca descascada embalada (2 kg)",
    oldPrice: 14.0,
    xepaPrice: 7.0,
    stall: "Banca 19 - Galpão Central",
    coords: { lat: -10.8861, lng: -61.9522 },
    photo: "",
    synced: true,
    soldOut: false,
    createdAt: Date.now() - 28 * 60 * 1000
  }
];

let capturedCoords = null;
let compressedPhotoDataUrl = "";
let userCoords = null;

function loadOffers() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_OFFERS));
    return [...DEFAULT_OFFERS];
  }
  return JSON.parse(raw);
}

function saveOffers(offers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

/* 1. DETECÇÃO DE CONEXÃO (Network Status) */
function updateNetworkStatus() {
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

function syncOfflineQueue() {
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

/* 2. CAPTURA E COMPRESSÃO DE IMAGEM VIA CANVAS (Remove EXIF) */
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

/* 3. CÁLCULO DE DISTÂNCIA (Haversine em metros) */
function calcDistanceMeters(a, b) {
  if (!a || !b) return null;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLng / 2);
  const h =
    sin1 * sin1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sin2 * sin2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/* 4. COMPARTILHAMENTO / ÁREA DE TRANSFERÊNCIA */
async function shareOffer(offer) {
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

/* RENDERIZAÇÃO DAS LISTAS */
function renderAll() {
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
      ${offer.photo ? `<img class="offer-img" src="${offer.photo}" alt="${offer.product}">` : ""}
      <h3>${offer.product}${syncBadge}</h3>
      <div class="price-row">
        <span class="old-price">R$ ${offer.oldPrice.toFixed(2)}</span>
        <span class="xepa-price">R$ ${offer.xepaPrice.toFixed(2)}</span>
      </div>
      <p class="meta">${offer.stall}${distText}</p>
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

/* EVENTOS DE INTERFACE */
document.addEventListener("DOMContentLoaded", () => {
  updateNetworkStatus();
  renderAll();

  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
    });
  });

  document.getElementById("photo-input").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressedPhotoDataUrl = await compressImage(file);
    const preview = document.getElementById("photo-preview");
    preview.src = compressedPhotoDataUrl;
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
        capturedCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
        userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
      coords: capturedCoords,
      photo: compressedPhotoDataUrl,
      synced: isOnline,
      soldOut: false,
      createdAt: Date.now()
    });

    saveOffers(offers);
    e.target.reset();
    compressedPhotoDataUrl = "";
    capturedCoords = null;
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