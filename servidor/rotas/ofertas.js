/**
 * ofertas.js - Rotas da API de Ofertas do XepaRadar (/api/ofertas)
 * Autor: Diego (Backend)
 */

const express = require('express');
const router = express.Router();
const ofertasServico = require('../servicos/ofertasServico');

/**
 * GET /api/ofertas
 * Lista ofertas cadastradas com suporte a filtros (?categoria=&setor=).
 */
router.get('/', (req, res) => {
  try {
    const { categoria, setor } = req.query;
    const ofertas = ofertasServico.listarOfertas({ categoria, setor });
    return res.status(200).json(ofertas);
  } catch (erro) {
    console.error('[RotasOfertas] Erro ao listar ofertas:', erro);
    return res.status(500).json({ erro: 'Erro ao listar ofertas do mural.' });
  }
});

/**
 * GET /api/ofertas/minhas
 * Lista ofertas criadas pelo dispositivo atual (identificado pelo cabeçalho X-Dono-Id).
 */
router.get('/minhas', (req, res) => {
  try {
    const donoId = req.headers['x-dono-id'];
    if (!donoId) {
      return res.status(400).json({
        erro: 'Cabeçalho X-Dono-Id é obrigatório para consultar minhas ofertas.'
      });
    }

    const ofertas = ofertasServico.listarOfertasPorDono(donoId);
    return res.status(200).json(ofertas);
  } catch (erro) {
    console.error('[RotasOfertas] Erro ao buscar ofertas do dono:', erro);
    return res.status(500).json({ erro: 'Erro ao listar ofertas do feirante.' });
  }
});

/**
 * POST /api/ofertas
 * Cria uma nova oferta ou responde idempotentemente caso o ID já exista no servidor.
 */
router.post('/', (req, res) => {
  try {
    const donoId = req.headers['x-dono-id'] || req.body.donoId;
    const { jaExistia, oferta } = ofertasServico.criarOferta(req.body, donoId);

    if (jaExistia) {
      return res.status(200).json({
        status: 'ok',
        mensagem: 'Oferta já existia no servidor.',
        oferta
      });
    }

    return res.status(201).json({
      status: 'criada',
      mensagem: 'Oferta cadastrada com sucesso.',
      oferta
    });
  } catch (erro) {
    console.error('[RotasOfertas] Erro ao cadastrar oferta:', erro);
    return res.status(500).json({ erro: 'Erro ao registrar oferta no servidor.' });
  }
});

module.exports = router;
