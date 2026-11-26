/* estado.js — dados de exemplo, estado do formulário e da localização,
   persistência no localStorage e cálculo de distância. */

import { ler, gravar } from "./armazenamento.js";

const CHAVE_OFERTAS = "ofertas";

export const DEFAULT_OFFERS = [
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

/* Estado volátil do formulário e da sessão */
/* Ofertas de exemplo carregadas de data/dados.json (via fetch no app.js).
   Até o carregamento, usa a lista embutida como reserva. */
let ofertasBase = [...DEFAULT_OFFERS];

export function definirOfertasBase(lista) {
  ofertasBase = lista;
}

/* Filtro ativo do mural (categoria) */
export let filtroAtual = "Todos";

export function setFiltro(categoria) {
  filtroAtual = categoria;
}

export let capturedCoords = null;
export let compressedPhotoDataUrl = "";
export let userCoords = null;

export function setCapturedCoords(coords) {
  capturedCoords = coords;
}

export function setCompressedPhoto(dataUrl) {
  compressedPhotoDataUrl = dataUrl;
}

export function setUserCoords(coords) {
  userCoords = coords;
}

export function getCapturedCoords() {
  return capturedCoords;
}

export function getCompressedPhoto() {
  return compressedPhotoDataUrl;
}

export function loadOffers() {
  return ler(CHAVE_OFERTAS, [...ofertasBase]);
}

export function saveOffers(offers) {
  return gravar(CHAVE_OFERTAS, offers);
}

export function ofertasJaGravadas() {
  return ler(CHAVE_OFERTAS, null) !== null;
}

/* Remove uma oferta do estado (ação destrutiva: exige confirmação na interface) */
export function removerOferta(id) {
  const ofertas = loadOffers().filter((o) => o.id !== id);
  return { ofertas, resultado: saveOffers(ofertas) };
}

/* Cálculo de distância entre dois pontos (Haversine, em metros) */
export function calcDistanceMeters(a, b) {
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
