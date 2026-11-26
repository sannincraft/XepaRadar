/* navegacao.js — rotas por hash: sincroniza URL, menu e tela ativa.
   Rotas: #/mural, #/anunciar, #/minhas e #/sobre. */

const ROTAS = {
  "/mural": "sec-mural",
  "/anunciar": "sec-anunciar",
  "/minhas": "sec-minhas",
  "/sobre": "sec-sobre"
};

const ROTA_PADRAO = "/mural";

export function rotaAtual() {
  const hash = location.hash.replace(/^#/, "");
  return ROTAS[hash] ? hash : ROTA_PADRAO;
}

function aplicarRota() {
  const rota = rotaAtual();
  const secaoAtiva = ROTAS[rota];

  document.querySelectorAll(".panel").forEach((painel) => {
    painel.classList.toggle("active", painel.id === secaoAtiva);
  });

  document.querySelectorAll(".tab-btn").forEach((botao) => {
    botao.classList.toggle("active", botao.dataset.rota === rota);
  });
}

export function iniciarNavegacao() {
  document.querySelectorAll(".tab-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      location.hash = botao.dataset.rota;
    });
  });

  window.addEventListener("hashchange", aplicarRota);

  if (!location.hash) {
    location.replace(`#${ROTA_PADRAO}`);
  }
  aplicarRota();
}
