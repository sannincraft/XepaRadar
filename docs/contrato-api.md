# Contrato da API e Modelo de Dados — XepaRadar

Este documento define o contrato de integração entre o frontend e a API Express do **XepaRadar**. Ele estabelece as rotas, os formatos de requisição/resposta, os códigos de status HTTP e o modelo completo da entidade de oferta.

O frontend e o backend rodam na mesma origem (`http://localhost:3000`), dispensando configuração de CORS em ambiente integrado.

---

## 1. Identificação do Usuário (Sem Login)

A aplicação não utiliza cadastro convencional nem autenticação por senha. Em conformidade com as diretrizes de minimização de dados da LGPD:
* O frontend gera no primeiro acesso um identificador anônimo (`donoId`), armazenado no `localStorage`.
* Nas requisições que exigem autoria ou controle sobre os próprios itens, o frontend envia este identificador no cabeçalho HTTP:
  ```http
  X-Dono-Id: <donoId>
  ```
* O backend valida se o `X-Dono-Id` informado confere com o `donoId` registrado na oferta para autorizar ações destrutivas ou de controle (`PATCH /api/ofertas/:id/esgotar` e `DELETE /api/ofertas/:id`).

---

## 2. Modelo de Dados da Oferta

### Estrutura dos Campos

| Campo | Tipo | Obrigatório | Descrição / Regra |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Sim | Identificador único da oferta gerado no cliente (ex: `lot-1700000000000-abc`). Garante idempotência. |
| `produto` | `string` | Sim | Nome do produto ou descrição do lote (ex: `Cheiro-verde + Cebolinha`). |
| `categoria` | `string` | Sim | Categoria do alimento (ex: `Hortifrúti`, `Frutas`, `Peixes`, `Outros`). |
| `precoOriginal` | `number` | Sim | Preço de tabela original em R$ (ex: `12.00`). Deve ser maior que 0. |
| `precoXepa` | `number` | Sim | Preço promocional de encerramento de feira em R$ (ex: `5.00`). Deve ser menor que `precoOriginal`. |
| `quantidade` | `string` | Sim | Quantidade aproximada do lote (ex: `kit com 4 maços`, `2 kg`, `3 pencas`). |
| `banca` | `string` | Sim | Nome ou identificação da banca (ex: `Banca 04`). |
| `setor` | `string` | Sim | Setor/corredor físico na feira (ex: `Ala Hortifrúti`, `Galpão Central`, `Rua Lateral`). |
| `lat` | `number \| null` | Não | Latitude obtida pelo GPS da banca. Nulo caso o feirante negue ou não tenha sinal de GPS. |
| `lng` | `number \| null` | Não | Longitude obtida pelo GPS da banca. Nulo caso o feirante negue ou não tenha sinal de GPS. |
| `fotoUrl` | `string` | Não | URL da imagem salva no servidor (ex: `/fotos/lot-123.jpg`) ou string vazia/placeholder. |
| `donoId` | `string` | Sim | Identificador anônimo do feirante proprietário do anúncio. |
| `criadaEm` | `number` | Sim | Timestamp em milissegundos da criação da oferta (`Date.now()`). |
| `expiraEm` | `number` | Sim | Timestamp em milissegundos de expiração (definido como `criadaEm + 2 * 60 * 60 * 1000` — 2 horas). |
| `status` | `string` | Sim | Situação do anúncio: `"ativa"`, `"esgotada"` ou `"expirada"`. |

### Exemplo JSON de Oferta Completa

```json
{
  "id": "lot-1732489200000-01",
  "produto": "Banana-da-Terra (3 pencas)",
  "categoria": "Frutas",
  "precoOriginal": 18.00,
  "precoXepa": 8.00,
  "quantidade": "3 pencas",
  "banca": "Banca do Sr. João",
  "setor": "Ala Hortifrúti",
  "lat": -10.8853,
  "lng": -61.9517,
  "fotoUrl": "/fotos/lot-1732489200000-01.jpg",
  "donoId": "usr-anon-8f92b7",
  "criadaEm": 1732489200000,
  "expiraEm": 1732496400000,
  "status": "ativa"
}
```

---

## 3. Especificação das Rotas da API

### 3.1. Verificação de Saúde
* **Rota:** `GET /api/saude`
* **Objetivo:** Informar se o backend Express está ativo e pronto para responder.
* **Respostas:**
  * `200 OK`:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-11-25T02:00:00.000Z"
    }
    ```

---

### 3.2. Listar Ofertas Ativas do Mural
* **Rota:** `GET /api/ofertas`
* **Query Parameters (opcionais):**
  * `categoria`: filtra por categoria exata (ex: `Hortifrúti`).
  * `setor`: filtra por setor da feira (ex: `Galpão Central`).
* **Regra de Negócio:**
  * Retorna apenas ofertas com `status === "ativa"` e cuja data atual seja inferior a `expiraEm` (`Date.now() < expiraEm`).
  * As ofertas são ordenadas preferencialmente da mais recente para a mais antiga (quando o cliente não estiver ordenando por proximidade de GPS).
* **Respostas:**
  * `200 OK`:
    ```json
    [
      {
        "id": "lot-1732489200000-01",
        "produto": "Banana-da-Terra (3 pencas)",
        "categoria": "Frutas",
        "precoOriginal": 18.00,
        "precoXepa": 8.00,
        "quantidade": "3 pencas",
        "banca": "Banca do Sr. João",
        "setor": "Ala Hortifrúti",
        "lat": -10.8853,
        "lng": -61.9517,
        "fotoUrl": "",
        "donoId": "usr-anon-8f92b7",
        "criadaEm": 1732489200000,
        "expiraEm": 1732496400000,
        "status": "ativa"
      }
    ]
    ```

---

### 3.3. Listar Minhas Ofertas
* **Rota:** `GET /api/ofertas/minhas`
* **Cabeçalhos Requeridos:**
  * `X-Dono-Id: <donoId>`
* **Regra de Negócio:**
  * Retorna todas as ofertas associadas ao `donoId`, incluindo as que já foram marcadas como `"esgotada"` ou que expiraram, para acompanhamento pelo próprio feirante.
* **Respostas:**
  * `200 OK`: lista contendo as ofertas do dono.
  * `400 Bad Request`: cabeçalho `X-Dono-Id` não enviado ou vazio.
    ```json
    { "erro": "Cabeçalho X-Dono-Id é obrigatório para consultar minhas ofertas." }
    ```

---

### 3.4. Criar Nova Oferta (com Idempotência)
* **Rota:** `POST /api/ofertas`
* **Cabeçalhos Requeridos:**
  * `Content-Type: application/json`
  * `X-Dono-Id: <donoId>`
* **Corpo da Requisição (JSON):**
  ```json
  {
    "id": "lot-1732489200000-01",
    "produto": "Mandioca descascada (2kg)",
    "categoria": "Hortifrúti",
    "precoOriginal": 14.00,
    "precoXepa": 7.00,
    "quantidade": "2 kg",
    "banca": "Banca 19",
    "setor": "Galpão Central",
    "lat": -10.8861,
    "lng": -61.9522,
    "foto": "data:image/jpeg;base64,..."
  }
  ```
* **Regras de Negócio e Idempotência:**
  * Como o frontend pode enviar ofertas que estavam na **fila offline**, o `id` nasce no dispositivo do cliente.
  * Caso o servidor já possua uma oferta com o mesmo `id`, ele retorna **200 OK** sem duplicar o registro.
  * Se for uma nova oferta válida, grava os dados e retorna **201 Created**.
  * Se a foto em Base64 for superior a 200 KB, recusa com **413 Payload Too Large**.
* **Respostas:**
  * `201 Created`: oferta registrada com sucesso.
  * `200 OK`: oferta já existia no servidor (idempotente).
  * `400 Bad Request`: falha de validação dos campos obrigatórios.
    ```json
    {
      "erros": {
        "produto": "Nome do produto é obrigatório",
        "precoXepa": "O preço da xepa deve ser menor que o preço original"
      }
    }
    ```
  * `413 Payload Too Large`: foto enviada excede o limite máximo permitido (~200 KB).
    ```json
    { "erro": "Foto muito grande. O limite máximo permitido é de 200 KB." }
    ```

---

### 3.5. Marcar Oferta como Esgotada
* **Rota:** `PATCH /api/ofertas/:id/esgotar`
* **Cabeçalhos Requeridos:**
  * `X-Dono-Id: <donoId>`
* **Regra de Negócio:**
  * Altera o status da oferta para `"esgotada"`.
  * Apenas o criador original da oferta (conforme `X-Dono-Id`) tem permissão para alterar o status.
* **Respostas:**
  * `200 OK`:
    ```json
    {
      "id": "lot-1732489200000-01",
      "status": "esgotada",
      "mensagem": "Oferta marcada como esgotada com sucesso."
    }
    ```
  * `403 Forbidden`: o `X-Dono-Id` não confere com o dono da oferta.
    ```json
    { "erro": "Apenas o feirante proprietário pode marcar esta oferta como esgotada." }
    ```
  * `404 Not Found`: oferta inexistente.
    ```json
    { "erro": "Oferta não encontrada." }
    ```

---

### 3.6. Excluir Oferta
* **Rota:** `DELETE /api/ofertas/:id`
* **Cabeçalhos Requeridos:**
  * `X-Dono-Id: <donoId>`
* **Regra de Negócio:**
  * Remove a oferta do mural definitivamente.
  * Apenas o criador original da oferta (`X-Dono-Id`) tem permissão para excluí-la.
* **Respostas:**
  * `204 No Content`: oferta excluída com sucesso (sem corpo na resposta).
  * `403 Forbidden`: o `X-Dono-Id` não confere com o dono da oferta.
    ```json
    { "erro": "Apenas o feirante proprietário pode excluir esta oferta." }
    ```
  * `404 Not Found`: oferta inexistente.
    ```json
    { "erro": "Oferta não encontrada." }
    ```

---

## 4. Resumo dos Códigos de Retorno HTTP

| Código | Significado na Aplicação |
| :---: | :--- |
| `200` | Sucesso com corpo de resposta (saúde da API, listagens, reenvio idempotente ou status atualizado). |
| `201` | Oferta criada com sucesso pelo feirante. |
| `204` | Oferta excluída com sucesso (sem conteúdo). |
| `400` | Erro de validação de dados ou campos obrigatórios ausentes (`{ erros: { campo: mensagem } }`). |
| `403` | Tentativa de alterar/excluir oferta de outro feirante (`X-Dono-Id` divergente). |
| `404` | Oferta com o ID especificado não foi encontrada. |
| `413` | Tamanho da imagem anexada ultrapassa o limite permitido no backend (200 KB). |
| `500` | Erro interno inesperado do servidor. |
