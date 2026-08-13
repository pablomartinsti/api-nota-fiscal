import { GestaoNotaServicoController } from '../controllers/GestaoNotaServicoController';
import { env } from '../config/env';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaNotaServicoEventoFiscalRepository } from '../database/repositories/PrismaNotaServicoEventoFiscalRepository';
import { PrismaNotaServicoRepository } from '../database/repositories/PrismaNotaServicoRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { ClienteHttpSefinNacional } from '../fiscal/clientes/ClienteHttpSefinNacional';
import { GeradorXmlDpsNacional } from '../fiscal/xml/GeradorXmlDpsNacional';
import { AssinadorXmlDpsXmlDsig } from '../fiscal/xml/AssinadorXmlDpsXmlDsig';
import { AssinadorXmlPedRegEventoXmlDsig } from '../fiscal/xml/AssinadorXmlPedRegEventoXmlDsig';
import { GeradorXmlPedidoCancelamentoNfseNacional } from '../fiscal/xml/GeradorXmlPedidoCancelamentoNfseNacional';
import { GeradorPdfDanfseNacional } from '../fiscal/danfse/GeradorPdfDanfseNacional';
import { ValidadorXmlDpsXsd } from '../fiscal/xml/ValidadorXmlDpsXsd';
import { AesGcmCifradorTexto } from '../security/AesGcmCifradorTexto';
import { AtualizarRascunhoNotaServicoService } from '../services/notas-servico/AtualizarRascunhoNotaServicoService';
import { BaixarDanfseNotaServicoService } from '../services/notas-servico/BaixarDanfseNotaServicoService';
import { BuscarNotaServicoService } from '../services/notas-servico/BuscarNotaServicoService';
import { CancelarNfseNotaServicoService } from '../services/notas-servico/CancelarNfseNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/notas-servico/CadastrarRascunhoNotaServicoService';
import { ConsultarNfseEmitidaNotaServicoService } from '../services/notas-servico/ConsultarNfseEmitidaNotaServicoService';
import { CriarRascunhoSubstituicaoNotaServicoService } from '../services/notas-servico/CriarRascunhoSubstituicaoNotaServicoService';
import { EnviarDpsAssinadaNotaServicoService } from '../services/notas-servico/EnviarDpsAssinadaNotaServicoService';
import { ExcluirRascunhoNotaServicoService } from '../services/notas-servico/ExcluirRascunhoNotaServicoService';
import { GerarProximoNumeroDpsService } from '../services/notas-servico/GerarProximoNumeroDpsService';
import { GerarXmlDpsNotaServicoService } from '../services/notas-servico/GerarXmlDpsNotaServicoService';
import { GerarXmlDpsAssinadoNotaServicoService } from '../services/notas-servico/GerarXmlDpsAssinadoNotaServicoService';
import { ListarEventosFiscaisNotaServicoService } from '../services/notas-servico/ListarEventosFiscaisNotaServicoService';
import { ListarNotasServicoService } from '../services/notas-servico/ListarNotasServicoService';
import { ReconciliarEnvioDpsNotaServicoService } from '../services/notas-servico/ReconciliarEnvioDpsNotaServicoService';
import { RegistrarEventoFiscalNotaServicoService } from '../services/notas-servico/RegistrarEventoFiscalNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from '../services/fiscal/ResolverConfiguracaoFiscalEmpresaService';
import { RetornarNotaServicoParaRascunhoService } from '../services/notas-servico/RetornarNotaServicoParaRascunhoService';
import { MarcarErroNotaServicoComoResolvidoService } from '../services/notas-servico/MarcarErroNotaServicoComoResolvidoService';
import { ValidarReferenciasNotaServicoService } from '../services/notas-servico/ValidarReferenciasNotaServicoService';
import { ValidarProntidaoFiscalNotaServicoService } from '../services/notas-servico/ValidarProntidaoFiscalNotaServicoService';
import { ValidarPermissaoProducaoRealService } from '../services/fiscal/ValidarPermissaoProducaoRealService';

export function criarGestaoNotaServicoController(): GestaoNotaServicoController {
  const notaRepository = new PrismaNotaServicoRepository();
  const eventoFiscalRepository =
    new PrismaNotaServicoEventoFiscalRepository();
  const empresaRepository = new PrismaEmpresaRepository();
  const clienteRepository = new PrismaClienteRepository();
  const servicoRepository = new PrismaServicoRepository();
  const configuracaoFiscalRepository =
    new PrismaConfiguracaoFiscalEmpresaRepository();
  const cifradorTexto = new AesGcmCifradorTexto(
    env.NFSE_CERTIFICADO_CRYPTO_KEY,
  );
  const resolverConfiguracaoFiscal =
    new ResolverConfiguracaoFiscalEmpresaService(
      configuracaoFiscalRepository,
      empresaRepository,
      cifradorTexto,
    );
  const validarPermissaoProducaoReal =
    new ValidarPermissaoProducaoRealService(
      env.NFSE_PERMITIR_PRODUCAO_REAL,
    );
  const registrarEventoFiscal =
    new RegistrarEventoFiscalNotaServicoService(eventoFiscalRepository);
  const validarReferencias = new ValidarReferenciasNotaServicoService(
    clienteRepository,
    servicoRepository,
  );
  const gerarProximoNumeroDpsService = new GerarProximoNumeroDpsService(
    notaRepository,
  );
  const gerarXmlDpsService = new GerarXmlDpsNotaServicoService(
    empresaRepository,
    clienteRepository,
    servicoRepository,
    notaRepository,
    new GeradorXmlDpsNacional(),
  );
  const gerarXmlDpsAssinadoService = new GerarXmlDpsAssinadoNotaServicoService(
    gerarXmlDpsService,
    empresaRepository,
    new ValidadorXmlDpsXsd(() => env.NFSE_XSD_DPS_PATH),
    undefined,
    new AssinadorXmlDpsXmlDsig(),
    resolverConfiguracaoFiscal,
    notaRepository,
  );
  const clienteNfse = new ClienteHttpSefinNacional(() => ({
    baseUrlHomologacao: env.NFSE_SEFIN_HOMOLOGACAO_BASE_URL,
    baseUrlProducao: env.NFSE_SEFIN_PRODUCAO_BASE_URL,
    endpointEnvioDps: env.NFSE_SEFIN_ENVIO_DPS_PATH,
    timeoutMs: env.NFSE_SEFIN_TIMEOUT_MS,
  }));

  return new GestaoNotaServicoController(
    new CadastrarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
      gerarProximoNumeroDpsService,
      resolverConfiguracaoFiscal,
    ),
    new ListarNotasServicoService(notaRepository),
    new BuscarNotaServicoService(notaRepository),
    new AtualizarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
    ),
    new ExcluirRascunhoNotaServicoService(notaRepository),
    new RetornarNotaServicoParaRascunhoService(notaRepository),
    new MarcarErroNotaServicoComoResolvidoService(notaRepository),
    new ValidarProntidaoFiscalNotaServicoService(
      empresaRepository,
      clienteRepository,
      servicoRepository,
      notaRepository,
      {
        configuracaoFiscalRepository,
        permitirProducaoReal: env.NFSE_PERMITIR_PRODUCAO_REAL,
        baseUrlProducao: env.NFSE_SEFIN_PRODUCAO_BASE_URL,
        xsdDpsPath: env.NFSE_XSD_DPS_PATH,
        xsdEventoPath: env.NFSE_XSD_EVENTO_PATH,
      },
    ),
    gerarXmlDpsService,
    gerarXmlDpsAssinadoService,
    new EnviarDpsAssinadaNotaServicoService(
      notaRepository,
      gerarXmlDpsAssinadoService,
      clienteNfse,
      resolverConfiguracaoFiscal,
      validarPermissaoProducaoReal,
      registrarEventoFiscal,
    ),
    new ConsultarNfseEmitidaNotaServicoService(
      notaRepository,
      clienteNfse,
      resolverConfiguracaoFiscal,
      validarPermissaoProducaoReal,
      registrarEventoFiscal,
    ),
    new CancelarNfseNotaServicoService(
      notaRepository,
      empresaRepository,
      new GeradorXmlPedidoCancelamentoNfseNacional(),
      new ValidadorXmlDpsXsd(() => env.NFSE_XSD_EVENTO_PATH),
      undefined,
      new AssinadorXmlPedRegEventoXmlDsig(),
      clienteNfse,
      resolverConfiguracaoFiscal,
      validarPermissaoProducaoReal,
      registrarEventoFiscal,
    ),
    new CriarRascunhoSubstituicaoNotaServicoService(
      notaRepository,
      validarReferencias,
      gerarProximoNumeroDpsService,
      resolverConfiguracaoFiscal,
      validarPermissaoProducaoReal,
    ),
    new ReconciliarEnvioDpsNotaServicoService(
      notaRepository,
      clienteNfse,
      resolverConfiguracaoFiscal,
      validarPermissaoProducaoReal,
      registrarEventoFiscal,
    ),
    new ListarEventosFiscaisNotaServicoService(
      notaRepository,
      eventoFiscalRepository,
    ),
    new BaixarDanfseNotaServicoService(
      notaRepository,
      validarPermissaoProducaoReal,
      new GeradorPdfDanfseNacional(),
      registrarEventoFiscal,
    ),
  );
}
