import { GestaoNotaServicoController } from '../controllers/GestaoNotaServicoController';
import { env } from '../config/env';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaNotaServicoRepository } from '../database/repositories/PrismaNotaServicoRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { ClienteHttpSefinNacional } from '../fiscal/ClienteHttpSefinNacional';
import { EmissorNotaServicoSimulado } from '../fiscal/EmissorNotaServicoSimulado';
import { GeradorXmlDpsNacional } from '../fiscal/GeradorXmlDpsNacional';
import { AssinadorXmlDpsXmlDsig } from '../fiscal/AssinadorXmlDpsXmlDsig';
import { AssinadorXmlPedRegEventoXmlDsig } from '../fiscal/AssinadorXmlPedRegEventoXmlDsig';
import { GeradorXmlPedidoCancelamentoNfseNacional } from '../fiscal/GeradorXmlPedidoCancelamentoNfseNacional';
import { ProvedorCertificadoA1Arquivo } from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ValidadorXmlDpsXsd } from '../fiscal/ValidadorXmlDpsXsd';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CancelarNotaServicoService } from '../services/CancelarNotaServicoService';
import { CancelarNfseNotaServicoService } from '../services/CancelarNfseNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { ConsultarNfseEmitidaNotaServicoService } from '../services/ConsultarNfseEmitidaNotaServicoService';
import { CriarRascunhoSubstituicaoNotaServicoService } from '../services/CriarRascunhoSubstituicaoNotaServicoService';
import { EmitirNotaServicoService } from '../services/EmitirNotaServicoService';
import { EnviarDpsAssinadaNotaServicoService } from '../services/EnviarDpsAssinadaNotaServicoService';
import { GerarProximoNumeroDpsService } from '../services/GerarProximoNumeroDpsService';
import { GerarXmlDpsNotaServicoService } from '../services/GerarXmlDpsNotaServicoService';
import { GerarXmlDpsAssinadoNotaServicoService } from '../services/GerarXmlDpsAssinadoNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from '../services/ResolverConfiguracaoFiscalEmpresaService';
import { RetornarNotaServicoParaRascunhoService } from '../services/RetornarNotaServicoParaRascunhoService';
import { ValidarReferenciasNotaServicoService } from '../services/ValidarReferenciasNotaServicoService';
import { ValidarProntidaoFiscalNotaServicoService } from '../services/ValidarProntidaoFiscalNotaServicoService';

export function criarGestaoNotaServicoController(): GestaoNotaServicoController {
  const notaRepository = new PrismaNotaServicoRepository();
  const empresaRepository = new PrismaEmpresaRepository();
  const clienteRepository = new PrismaClienteRepository();
  const servicoRepository = new PrismaServicoRepository();
  const configuracaoFiscalRepository =
    new PrismaConfiguracaoFiscalEmpresaRepository();
  const resolverConfiguracaoFiscal =
    new ResolverConfiguracaoFiscalEmpresaService(
      configuracaoFiscalRepository,
    );
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
    new ProvedorCertificadoA1Arquivo(() => ({
      caminho: env.NFSE_CERTIFICADO_PATH,
      senha: env.NFSE_CERTIFICADO_SENHA,
    })),
    new AssinadorXmlDpsXmlDsig(),
    resolverConfiguracaoFiscal,
  );
  const clienteNfse = new ClienteHttpSefinNacional(() => ({
    baseUrl: env.NFSE_SEFIN_BASE_URL,
    endpointEnvioDps: env.NFSE_SEFIN_ENVIO_DPS_PATH,
    timeoutMs: env.NFSE_SEFIN_TIMEOUT_MS,
    certificadoPath: env.NFSE_CERTIFICADO_PATH,
    certificadoSenha: env.NFSE_CERTIFICADO_SENHA,
  }));
  const provedorCertificado = new ProvedorCertificadoA1Arquivo(() => ({
    caminho: env.NFSE_CERTIFICADO_PATH,
    senha: env.NFSE_CERTIFICADO_SENHA,
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
    new EmitirNotaServicoService(
      notaRepository,
      new EmissorNotaServicoSimulado(),
    ),
    new RetornarNotaServicoParaRascunhoService(notaRepository),
    new CancelarNotaServicoService(notaRepository),
    new ValidarProntidaoFiscalNotaServicoService(
      empresaRepository,
      clienteRepository,
      servicoRepository,
      notaRepository,
    ),
    gerarXmlDpsService,
    gerarXmlDpsAssinadoService,
    new EnviarDpsAssinadaNotaServicoService(
      notaRepository,
      gerarXmlDpsAssinadoService,
      clienteNfse,
      resolverConfiguracaoFiscal,
    ),
    new ConsultarNfseEmitidaNotaServicoService(
      notaRepository,
      clienteNfse,
      resolverConfiguracaoFiscal,
    ),
    new CancelarNfseNotaServicoService(
      notaRepository,
      empresaRepository,
      new GeradorXmlPedidoCancelamentoNfseNacional(),
      new ValidadorXmlDpsXsd(() => env.NFSE_XSD_EVENTO_PATH),
      provedorCertificado,
      new AssinadorXmlPedRegEventoXmlDsig(),
      clienteNfse,
      resolverConfiguracaoFiscal,
    ),
    new CriarRascunhoSubstituicaoNotaServicoService(
      notaRepository,
      validarReferencias,
      gerarProximoNumeroDpsService,
      resolverConfiguracaoFiscal,
    ),
  );
}
