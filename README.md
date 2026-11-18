# XepaRadar

Mural relâmpago *mobile-first* para divulgação de lotes perecíveis na **hora da xepa** em feiras livres, projetado para funcionar mesmo sob sinal móvel instável.

## Problema e Contexto
Nos últimos 60 a 90 minutos das feiras livres, pequenos produtores e feirantes precisam escoar alimentos altamente perecíveis (folhosas, frutas maduras, peixes, raízes) antes da desmontagem das bancas, evitando perdas pós-colheita e custo de transporte de retorno. Ao mesmo tempo, moradores e trabalhadores do entorno deixam de aproveitar preços reduzidos por não saberem quais bancas ainda têm estoque.

## Objetivo Geral
Oferecer uma aplicação web leve que permita ao feirante fotografar e anunciar sobras promocionais em poucos segundos — com suporte a fila offline, geolocalização aproximada da banca e compartilhamento rápido para grupos locais.

## Funcionalidades Previstas (MVP)
- **Mural de Proximidade:** exibição de lotes ativos com foto real, preço promocional, distância estimada e tempo restante.
- **Captura e Compressão no Cliente:** foto tirada na hora via câmera do aparelho e redimensionada via HTML5 Canvas para reduzir consumo de dados e remover metadados EXIF.
- **Fila Offline:** detecção automática de perda de conexão (`online`/`offline`), armazenando anúncios localmente para envio assim que o sinal retornar.
- **Geolocalização com Fallback Manual:** captura de coordenadas da banca com opção de seleção manual por setor/corredor da feira.
- **Compartilhamento Rápido:** geração de cartão textual formatado para envio via `Web Share API` ou cópia para a área de transferência.
- **Gestão Rápida de Lote:** encerramento manual ("Esgotado") e expiração automática dos anúncios.

## Recursos do Navegador Utilizados
- `Media Capture` (`<input capture="environment">`) + `HTMLCanvasElement`
- `Geolocation API` (`navigator.geolocation`)
- `Network Status` (`navigator.onLine`, eventos `online`/`offline` e `navigator.connection`)
- `Web Share API` (`navigator.share`) e `Clipboard API` (`navigator.clipboard`)

## Integrantes e Divisão Preliminar de Responsabilidades
| Integrante | Responsabilidade Inicial |
| :--- | :--- |
| **Daniel Vitor Maciel do Carmo** | Arquitetura do projeto, documentação técnica (`README.md`) e integração das APIs de rede/armazenamento offline |
| **[Nome Completo — Integrante 2]** | Estruturação semântica HTML5 (`index.html`), acessibilidade e formulários de captura |
| **[Nome Completo — Integrante 3]** | Identidade visual, layout responsivo *mobile-first* e tokens CSS (`css/style.css`) |
| **[Nome Completo — Integrante 4]** | Lógica de geolocalização, compressão de imagem via Canvas e compartilhamento (`js/app.js`) |

## Privacidade e Uso Responsável
Nenhum dado pessoal sensível é armazenado. As fotos são reprocessadas no navegador antes do armazenamento (removendo metadados EXIF) e os anúncios expiram automaticamente após o encerramento da feira.