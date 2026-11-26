# XepaRadar — Fim de feira sem desperdício

Aplicativo web **mobile-first** que conecta feirantes e compradores no fim do
dia de feira: a "hora da xepa". O feirante anuncia o lote que sobraria para o
lixo (hortifrúti, peixes, frutas) com preço de clearance; quem está na feira
encontra a oferta mais próxima, vê a foto e o preço, e compartilha com quem
quiser. Menos desperdício de alimento, renda extra para o feirante e comida
mais barata para a comunidade.

Projeto da disciplina **Introdução ao Desenvolvimento para Dispositivos
Móveis** — Afya Centro Universitário, Ji-Paraná·RO. Prof. Romário Vitorino
Ferreira.

## Integrantes e divisão

| Integrante | Responsabilidade |
| --- | --- |
| Daniel Vitor Maciel do Carmo | Front-end (esta parte do repositório) |
| Diego Victor Melo | Back-end (API, autenticação, Service Worker, fila offline) |

## Funcionalidades (front-end)

- **Mural de ofertas** com estado de carregamento, erro (com ofertas de
  reserva do armazenamento local) e sucesso.
- **Cadastro de lote** com foto capturada pela câmera (`capture="environment"`)
  e comprimida em canvas até ~150 KB, preço normal × preço xepa, categoria,
  setor da feira e banca.
- **Geolocalização** para ordenar o mural por proximidade (distância de
  Haversine) e exibir "~X m de você".
- **Filtro por categoria** (chips) sobre as ofertas.
- **Minhas Bancas**: marcar lote como esgotado e excluir oferta, com
  confirmação.
- **Compartilhamento** via Web Share API, com cópia do resumo para a área de
  transferência como alternativa.
- **Persistência local** em `localStorage` com chaves versionadas e tratamento
  de cota esgotada.
- **Navegação por hash** (`#/mural`, `#/anunciar`, `#/minhas`, `#/sobre`) com
  rota inválida redirecionando para o mural e foco movido para o título da
  tela (acessibilidade).
- **Validação de formulário** por campo, com mensagens de erro e preservação
  do que já foi digitado.
- **Layout responsivo** (1 coluna no celular, 2 a 640 px, 3 a 1024 px),
  alvos de toque de 44 px, foco visível e suporte a
  `prefers-reduced-motion`.

## Tecnologias

HTML5, CSS3 e JavaScript ES Modules (sem framework), APIs do dispositivo
(Media Capture, Canvas, Geolocation, Web Share, Clipboard) e
`localStorage`. Testes automatizados com Playwright.

## Como executar

É um site estático — basta servir a pasta por HTTP (não abrir o `index.html`
direto, pois os módulos ES exigem servidor):

```bash
python3 -m http.server 8000
# ou com a extensão "Live Server" do VS Code
```

Depois abra `http://localhost:8000` no navegador do celular ou do desktop.
Para testar câmera e GPS no desktop, o Chrome permite simular ambos nas
ferramentas de desenvolvedor; em celular real, use o IP da máquina na mesma
rede.

> O servidor/API real é opcional para a disciplina e fica como trabalho do
> Diego (commits #33 em diante). Sem ele, o app usa os dados de exemplo de
> `data/dados.json` e o armazenamento local.

## Estrutura de pastas

```
XepaRadar/
├── index.html              # SPA: abas, formulário, mural, sobre/LGPD
├── css/style.css           # tokens de cor, layout, responsivo, acessibilidade
├── js/
│   ├── app.js              # orquestração: carregamento, eventos, cadastro
│   ├── estado.js           # estado global, ofertas, distância (Haversine)
│   ├── interface.js        # renderização de cards, filtros, toasts
│   ├── navegacao.js        # rotas por hash e foco
│   ├── validacao.js        # validação do formulário
│   ├── dispositivo.js      # câmera/compressão, GPS, compartilhar
│   └── armazenamento.js    # localStorage com tratamento de erros
├── data/dados.json         # categorias, setores e ofertas fictícias
├── assets/imagens/         # fotos fictícias geradas para as ofertas
└── docs/evidencias/        # capturas de tela e registros de teste
```

## Roteiro de testes

Os testes automatizados (Playwright, Chromium) estão descritos em
`docs/evidencias/registros-de-teste.md`, junto com as capturas de tela. Para
testar manualmente:

1. Abra o mural e confira as 4 ofertas de exemplo e os filtros.
2. Em **Anunciar lote**, tente salvar com campos vazios → erros por campo.
3. Tire uma foto (ou escolha um arquivo) e veja o tamanho comprimido.
4. Toque em **Capturar GPS da banca** e permita a localização.
5. Cadastre um lote, recarregue a página e confira em **Minhas Bancas**.
6. Marque como esgotado e exclua uma oferta (ambos pedem confirmação).
7. Toque em **Compartilhar oferta** e veja o resumo copiado.
8. Digite uma rota inexistente (`#/qualquercoisa`) e volte ao mural.

## Limitações conhecidas

- Sincronização com a API real e fila offline dependem do back-end
  (commits #18–#23) e ainda não estão ativas.
- A compressão de foto descarta metadados EXIF e reduz a qualidade — aceito
  para economia de dados móveis.
- A ordenação por proximidade depende de permissão de GPS; sem ela, o mural
  segue na ordem padrão.
- Sem autenticação, qualquer pessoa com acesso ao dispositivo vê as ofertas
  salvas no navegador.

## Cuidados éticos e legais (LGPD)

- Fotos devem mostrar **apenas os alimentos** — nunca rostos ou dados de
  terceiros; o próprio formulário orienta isso.
- Todos os dados do app são **fictícios**, criados para o trabalho; nenhum
  dado pessoal real é coletado ou armazenado.
- A localização é usada somente no cálculo de distância e não é enviada a
  terceiros nesta versão.
- Compartilhar uma oferta envia apenas o resumo do anúncio (texto), nunca a
  foto ou dados do aparelho.

## Licença e referências

Projeto acadêmico. Referências: MDN Web Docs (Media Capture, Canvas, Geolocation,
Web Share, Storage), WAI-ARIA Authoring Practices e o enunciado da disciplina.
