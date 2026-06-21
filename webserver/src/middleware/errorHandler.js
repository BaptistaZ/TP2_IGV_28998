// Middleware de erros.
// Trata rotas inexistentes da API e erros lançados pelos controllers.

function notFoundApi(req, res) {
  // Resposta para endpoints /api que não existem.
  res.status(404).json({ erro: 'Rota da API nao encontrada' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Regista o erro no servidor e devolve uma resposta JSON uniforme.
  console.error('Erro na rota', req.method, req.originalUrl, '->', err.message);

  res.status(500).json({
    erro: 'Erro interno do servidor',
    detalhe: err.message,
  });
}

module.exports = {
  notFoundApi,
  errorHandler,
};