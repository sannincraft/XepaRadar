const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para decodificar JSON nas requisições (com limite de 2mb para fotos em Base64)
app.use(express.json({ limit: '2mb' }));

// Rota de verificação de integridade da API (/api/saude)
app.get('/api/saude', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir fotos salvas no servidor em /fotos/...
const pastaFotos = path.join(__dirname, 'dados', 'fotos');
app.use('/fotos', express.static(pastaFotos));

// Rotas de ofertas da feira (/api/ofertas)
const rotasOfertas = require('./rotas/ofertas');
app.use('/api/ofertas', rotasOfertas);

// Servir os arquivos estáticos da aplicação frontend (localizados na raiz do repositório)
const pastaEstatica = path.join(__dirname, '..');
app.use(express.static(pastaEstatica));

// Fallback para rota raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(pastaEstatica, 'index.html'));
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor XepaRadar rodando em http://localhost:${PORT}`);
  console.log(`Endpoint de saúde: http://localhost:${PORT}/api/saude`);
});
