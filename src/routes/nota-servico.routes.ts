import { Router } from 'express';

import { criarAutenticacaoMiddleware } from '../factories/AutenticacaoFactory';
import { criarGestaoNotaServicoController } from '../factories/GestaoNotaServicoFactory';

const notaServicoRoutes = Router();
const autenticacaoMiddleware = criarAutenticacaoMiddleware();
const controller = criarGestaoNotaServicoController();

notaServicoRoutes.use('/notas-servico', (request, response, next) =>
  autenticacaoMiddleware.handle(request, response, next),
);
notaServicoRoutes.post('/notas-servico', (request, response) =>
  controller.cadastrar(request, response),
);
notaServicoRoutes.get('/notas-servico', (request, response) =>
  controller.listar(request, response),
);
notaServicoRoutes.get('/notas-servico/:notaId', (request, response) =>
  controller.buscar(request, response),
);
notaServicoRoutes.get(
  '/notas-servico/:notaId/prontidao-fiscal',
  (request, response) => controller.validarProntidaoFiscal(request, response),
);
notaServicoRoutes.get('/notas-servico/:notaId/xml-dps', (request, response) =>
  controller.gerarXmlDps(request, response),
);
notaServicoRoutes.get(
  '/notas-servico/:notaId/xml-dps-assinado',
  (request, response) => controller.gerarXmlDpsAssinado(request, response),
);
notaServicoRoutes.post(
  '/notas-servico/:notaId/enviar-dps',
  (request, response) => controller.enviarDpsAssinada(request, response),
);
notaServicoRoutes.get(
  '/notas-servico/:notaId/consulta-nfse',
  (request, response) => controller.consultarNfseEmitida(request, response),
);
notaServicoRoutes.get(
  '/notas-servico/:notaId/eventos-fiscais',
  (request, response) => controller.listarEventosFiscais(request, response),
);
notaServicoRoutes.post(
  '/notas-servico/:notaId/reconciliar-envio',
  (request, response) => controller.reconciliarEnvioDps(request, response),
);
notaServicoRoutes.post(
  '/notas-servico/:notaId/cancelar-nfse',
  (request, response) => controller.cancelarNfse(request, response),
);
notaServicoRoutes.post(
  '/notas-servico/:notaId/substituir',
  (request, response) => controller.substituirNfse(request, response),
);
notaServicoRoutes.put('/notas-servico/:notaId', (request, response) =>
  controller.atualizar(request, response),
);
notaServicoRoutes.post('/notas-servico/:notaId/emitir', (request, response) =>
  controller.emitir(request, response),
);
notaServicoRoutes.post(
  '/notas-servico/:notaId/retornar-rascunho',
  (request, response) => controller.retornarParaRascunho(request, response),
);
notaServicoRoutes.post('/notas-servico/:notaId/cancelar', (request, response) =>
  controller.cancelar(request, response),
);

export { notaServicoRoutes };
