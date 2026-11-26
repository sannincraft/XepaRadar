/**
 * ofertas.js - Rotas da API de Ofertas do XepaRadar (/api/ofertas)
 * Autor: Diego (Backend)
 */

const express = require('express');
const router = express.Router();
const ofertasServico = require('../servicos/ofertasServico');
const { validarOferta } = require('../servicos/validacao');
const fotosServico = require('../servicos/fotos');

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
 * Valida os campos obrigatórios e responde 400 com mapa de erros caso inválido.
 * Processa foto JPEG de até 200 KB, gravando no disco e retornando a URL correspondente.
 */
router.post('/', (req, res) => {
  try {
    const donoId = req.headers['x-dono-id'] || req.body.donoId;
    const id = req.body.id || `lot-${Date.now()}`;

    // Idempotência: se a oferta já existe no servidor, responde 200 de imediato
    if (req.body.id) {
      const ofertasAtuais = ofertasServico.lerOfertas();
      const jaExiste = ofertasAtuais.find((o) => o.id === req.body.id);
      if (jaExiste) {
        return res.status(200).json({
          status: 'ok',
          mensagem: 'Oferta já existia no servidor.',
          oferta: jaExiste
        });
      }
    }

    // Validação dos dados de entrada
    const validacao = validarOferta(req.body, donoId);
    if (!validacao.valido) {
      return res.status(400).json({ erros: validacao.erros });
    }

    // Processamento da Foto (se enviada)
    const fotoRecebida = req.body.foto || req.body.photo || req.body.fotoUrl;
    if (fotoRecebida) {
      const resultadoFoto = fotosServico.processarESalvarFoto(fotoRecebida, id);
      if (!resultadoFoto.sucesso) {
        return res.status(resultadoFoto.status || 400).json({
          erro: resultadoFoto.erro
        });
      }
      req.body.fotoUrl = resultadoFoto.fotoUrl;
    }

    req.body.id = id;
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
