/* navegacao.js — rotas por hash: sincroniza URL, menu e tela ativa.
   Rotas: #/mural, #/anunciar, #/minhas e #/sobre.
   Rota inexistente volta ao mural; ao trocar de tela, o foco vai
   para o título (leitores de tela anunciam a nova tela). */

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

function aplicarRota(moverFoco) {
  const hashBruto = location.hash.replace(/^#/, "");

  /* rota inexistente: corrige a URL para a rota padrão */
  if (hashBruto && !ROTAS[hashBruto]) {
    location.replace(`#${ROTA_PADRAO}`);
    return;
  }

  const rota = rotaAtual();
  const secaoAtiva = ROTAS[rota];

  document.querySelectorAll(".panel").forEach((painel) => {
    painel.classList.toggle("active", painel.id === secaoAtiva);
  });

  document.querySelectorAll(".tab-btn").forEach((botao) => {
    const ativo = botao.dataset.rota === rota;
    botao.classList.toggle("active", ativo);
    if (ativo) {
      botao.setAttribute("aria-current", "page");
    } else {
      botao.removeAttribute("aria-current");
    }
  });

  if (moverFoco) {
    const titulo = document.querySelector(`#${secaoAtiva} h2`);
    if (titulo) {
      titulo.setAttribute("tabindex", "-1");
      titulo.focus({ preventScroll: true });
    }
  }
}

export function iniciarNavegacao() {
  document.querySelectorAll(".tab-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      location.hash = botao.dataset.rota;
    });
  });

  window.addEventListener("hashchange", () => aplicarRota(true));

  if (!location.hash) {
    location.replace(`#${ROTA_PADRAO}`);
  }
  aplicarRota(false);
}
