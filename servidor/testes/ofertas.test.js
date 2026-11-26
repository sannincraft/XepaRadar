// testes/ofertas.test.js - Testes automatizados das rotas da API com node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');

// Monta app Express isolada para os testes
const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/saude', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const rotasOfertas = require('../rotas/ofertas');
app.use('/api/ofertas', rotasOfertas);

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/saude deve responder 200 com status ok', async () => {
  const res = await fetch(`${baseUrl}/api/saude`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.status, 'ok');
});

test('POST /api/ofertas deve recusar oferta sem produto e precoXepa maior com 400', async () => {
  const res = await fetch(`${baseUrl}/api/ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dono-Id': 'dono-teste' },
    body: JSON.stringify({
      produto: '',
      precoOriginal: 10,
      precoXepa: 15, // maior que o original
      banca: ''
    })
  });

  assert.equal(res.status, 400);
  const json = await res.json();
  assert.ok(json.erros.produto);
  assert.ok(json.erros.precoXepa);
  assert.ok(json.erros.banca);
});

test('POST /api/ofertas deve criar oferta com sucesso (201)', async () => {
  const idUnico = `lot-test-${Date.now()}`;
  const res = await fetch(`${baseUrl}/api/ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dono-Id': 'dono-oficial' },
    body: JSON.stringify({
      id: idUnico,
      produto: 'Maracujá Azedo (1 kg)',
      categoria: 'Frutas',
      precoOriginal: 12,
      precoXepa: 6,
      quantidade: '1 kg',
      banca: 'Banca do Maracujá',
      setor: 'Ala Hortifrúti',
      donoId: 'dono-oficial'
    })
  });

  assert.equal(res.status, 201);
  const json = await res.json();
  assert.equal(json.status, 'criada');
  assert.equal(json.oferta.id, idUnico);
});

test('POST /api/ofertas deve ser idempotente para mesmo ID (200)', async () => {
  const idUnico = `lot-idemp-${Date.now()}`;
  const payload = {
    id: idUnico,
    produto: 'Laranja Pêra Saco',
    categoria: 'Frutas',
    precoOriginal: 15,
    precoXepa: 8,
    quantidade: '1 saco',
    banca: 'Banca 10',
    donoId: 'dono-idemp'
  };

  const res1 = await fetch(`${baseUrl}/api/ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dono-Id': 'dono-idemp' },
    body: JSON.stringify(payload)
  });
  assert.equal(res1.status, 201);

  const res2 = await fetch(`${baseUrl}/api/ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dono-Id': 'dono-idemp' },
    body: JSON.stringify(payload)
  });
  assert.equal(res2.status, 200);
});

test('PATCH /api/ofertas/:id/esgotar recusa nao-dono com 403 e permite dono com 200', async () => {
  const id = `lot-esgotar-${Date.now()}`;
  await fetch(`${baseUrl}/api/ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dono-Id': 'dono-certo' },
    body: JSON.stringify({
      id,
      produto: 'Couve Manteiga',
      categoria: 'Hortifrúti',
      precoOriginal: 8,
      precoXepa: 4,
      banca: 'Banca 01',
      donoId: 'dono-certo'
    })
  });

  // Nao dono
  const resInvasor = await fetch(`${baseUrl}/api/ofertas/${id}/esgotar`, {
    method: 'PATCH',
    headers: { 'X-Dono-Id': 'dono-errado' }
  });
  assert.equal(resInvasor.status, 403);

  // Dono correto
  const resDono = await fetch(`${baseUrl}/api/ofertas/${id}/esgotar`, {
    method: 'PATCH',
    headers: { 'X-Dono-Id': 'dono-certo' }
  });
  assert.equal(resDono.status, 200);
  const json = await resDono.json();
  assert.equal(json.status, 'esgotada');
});

test('DELETE /api/ofertas/:id recusa nao-dono com 403 e permite dono com 204', async () => {
  const id = `lot-delete-${Date.now()}`;
  await fetch(`${baseUrl}/api/ofertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Dono-Id': 'dono-del' },
    body: JSON.stringify({
      id,
      produto: 'Cheiro Verde',
      categoria: 'Hortifrúti',
      precoOriginal: 5,
      precoXepa: 2,
      banca: 'Banca 02',
      donoId: 'dono-del'
    })
  });

  // Nao dono
  const resInvasor = await fetch(`${baseUrl}/api/ofertas/${id}`, {
    method: 'DELETE',
    headers: { 'X-Dono-Id': 'invasor' }
  });
  assert.equal(resInvasor.status, 403);

  // Dono correto
  const resDono = await fetch(`${baseUrl}/api/ofertas/${id}`, {
    method: 'DELETE',
    headers: { 'X-Dono-Id': 'dono-del' }
  });
  assert.equal(resDono.status, 204);
});
