# Registros de teste — XepaRadar (front-end)

Autor: Daniel Vitor Maciel do Carmo
Curso: Introdução ao Desenvolvimento para Dispositivos Móveis — Afya Centro Universitário Ji-Paraná·RO
Data: 26/11/2026

Este documento registra os testes executados no front-end antes da entrega.
Os testes foram automatizados com **Playwright** (Chromium) sobre um servidor
HTTP local (`python3 -m http.server`), cobrindo os cenários dos commits
#5, #6, #8, #9, #11, #13, #14, #16, #20, #24, #25 e #26 do plano de commits.
Todas as funcionalidades dependem de API de back-end foram testadas com os
módulos provisórios de front-end (`armazenamento.js` / `estado.js`).

## Ambiente de teste

- Navegador: Chromium (headless) via Playwright, viewport móvel 390×844 (deviceScaleFactor 2).
- Geolocalização simulada: Ji-Paraná·RO (~-10.885, -61.951), com cenários de permissão concedida e negada.
- `navigator.share` simulado indisponível para validar o *fallback* para a área de transferência.
- Cota de armazenamento simulada esgotada (injeção de `QuotaExceededError`) para validar a mensagem de erro do commit #8.

## Cenários executados

| Cenário | Commit | O que foi verificado | Resultado |
| --- | --- | --- | --- |
| c5 | #5 | Carregamento de `data/dados.json`: estado de carregando, 4 ofertas no mural, categorias dos filtros | OK |
| c5erro | #5 | Falha no `fetch` (servidor parado): mensagem de erro amigável e 2 ofertas de reserva vindas do armazenamento local | OK |
| c6 | #6 | Cards montados com `textContent` (sem `innerHTML`): nenhum script injetado executa | OK |
| c8 | #8 | Persistência em `localStorage`: oferta cadastrada permanece após recarregar; ao esgotar a cota, aparece aviso sem quebrar a tela | OK |
| c9 | #9 | Hash de rota sincronizado com a aba ativa (`#/minhas` → aba "Minhas" com `aria-current`) | OK |
| c11 | #11 | Validação do formulário: campos vazios/preço xepa ≥ preço normal → erros por campo, dados digitados preservados | OK |
| c13 | #13 | Categoria e setor obrigatórios no cadastro e exibidos nos cards | OK |
| c14 | #14 | Captura de foto pelo `input[accept="image/*"][capture="environment"]` e compressão em canvas ≤ 150 KB (arquivo de teste de 3 MB → ~132 KB) | OK |
| c16 | #16 | Geolocalização concedida → ordenação por proximidade (Haversine) e texto "~X m de você"; negada → mensagem amigável e ordem padrão | OK |
| c20 | #20 | Marcar lote como esgotado (com confirmação) e excluir oferta própria | OK |
| c24 | #24 | Compartilhar oferta: `navigator.share` quando disponível; *fallback* para Clipboard API com aviso "Link copiado" | OK |
| c25 | #25 | Rota inexistente (`#/rota-que-nao-existe`) redireciona para `#/mural` | OK |
| c26 | #26 | Layout responsivo: 1 coluna no móvel, 2 colunas a 640 px, 3 colunas a 1024 px; `prefers-reduced-motion` respeitado | OK |

## Correções feitas durante os testes

1. **Race condition no commit #5:** o status de rede chamava a sincronização antes do `fetch` terminar, gravando as 2 ofertas padrão por cima das 4 do JSON. Corrigido: a leitura não grava mais sozinha; o *seed* só acontece de forma explícita no carregamento dos dados da feira.
2. **Queda da validação ao adicionar campos (#13):** os cenários antigos de cadastro foram atualizados para preencher categoria e setor.
3. Fotos de evidência: as capturas foram convertidas para JPG para reduzir o tamanho do repositório (12 MB → ~2,8 MB).

## O que não está coberto aqui de propósito

- **Service Worker / Cache Storage / fila offline (commits #21–#22 e evidência #31):** responsabilidade do back-end (Diego) — a pasta `docs/evidencias` do back-end deve conter esses registros.
- **Commits #19 e #23 (sincronização com API real):** ficam bloqueados até o back-end fornecer `api.js` (#18) e a camada de sincronização (#22).

## Artefatos

| Arquivo | Conteúdo |
| --- | --- |
| `01-tela-inicial-mural.jpg` | Mural com 4 ofertas, filtros e status "Online (4G)" |
| `02-formulario-anuncio.jpg` | Formulário "Anunciar lote" completo (foto, preços, categoria, setor, banca, GPS) |
| `03-validacao-erros.jpg` | Mensagens de validação por campo + toast de erro |
| `04-cadastro-sucesso.jpg` | Toast de sucesso após cadastrar lote |
| `05-listagem-minhas.jpg` | Aba "Minhas Bancas" com ações de esgotar/excluir |
| `06-recurso-camera-compressao.jpg` | Foto capturada/comprimida (~132 KB de 3 MB) |
| `07-recurso-geolocalizacao.jpg` | Captura de GPS da banca concluída |
| `08-filtro-categoria-peixes.jpg` | Filtro "Peixes" ativo exibindo só a tilápia |
| `09-compartilhar-clipboard.jpg` | *Fallback* de compartilhamento por área de transferência |
| `10-persistencia-apos-recarregar.jpg` | Oferta cadastrada persiste após recarregar a página |
| `11-responsivo-desktop.jpg` | Mural em 1366 px com 3 colunas |
| `localStorage-ofertas.json` | Extrato do `localStorage` (chave `xeparadar:v1:ofertas`) após os testes |
