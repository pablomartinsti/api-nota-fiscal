import { GestaoNotaServicoController } from '../controllers/GestaoNotaServicoController';
import { env } from '../config/env';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { PrismaNotaServicoRepository } from '../database/repositories/PrismaNotaServicoRepository';
import { PrismaServicoRepository } from '../database/repositories/PrismaServicoRepository';
import { EmissorNotaServicoSimulado } from '../fiscal/EmissorNotaServicoSimulado';
import { GeradorXmlDpsNacional } from '../fiscal/GeradorXmlDpsNacional';
import { AssinadorXmlDpsXmlDsig } from '../fiscal/AssinadorXmlDpsXmlDsig';
import { ProvedorCertificadoA1Arquivo } from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ValidadorXmlDpsXsd } from '../fiscal/ValidadorXmlDpsXsd';
import { AtualizarRascunhoNotaServicoService } from '../services/AtualizarRascunhoNotaServicoService';
import { BuscarNotaServicoService } from '../services/BuscarNotaServicoService';
import { CancelarNotaServicoService } from '../services/CancelarNotaServicoService';
import { CadastrarRascunhoNotaServicoService } from '../services/CadastrarRascunhoNotaServicoService';
import { EmitirNotaServicoService } from '../services/EmitirNotaServicoService';
import { GerarXmlDpsNotaServicoService } from '../services/GerarXmlDpsNotaServicoService';
import { GerarXmlDpsAssinadoNotaServicoService } from '../services/GerarXmlDpsAssinadoNotaServicoService';
import { ListarNotasServicoService } from '../services/ListarNotasServicoService';
import { RetornarNotaServicoParaRascunhoService } from '../services/RetornarNotaServicoParaRascunhoService';
import { ValidarReferenciasNotaServicoService } from '../services/ValidarReferenciasNotaServicoService';
import { ValidarProntidaoFiscalNotaServicoService } from '../services/ValidarProntidaoFiscalNotaServicoService';

export function criarGestaoNotaServicoController(): GestaoNotaServicoController {
  const notaRepository = new PrismaNotaServicoRepository();
  const empresaRepository = new PrismaEmpresaRepository();
  const clienteRepository = new PrismaClienteRepository();
  const servicoRepository = new PrismaServicoRepository();
  const validarReferencias = new ValidarReferenciasNotaServicoService(
    clienteRepository,
    servicoRepository,
  );
  const gerarXmlDpsService = new GerarXmlDpsNotaServicoService(
    empresaRepository,
    clienteRepository,
    servicoRepository,
    notaRepository,
    new GeradorXmlDpsNacional(),
  );

  return new GestaoNotaServicoController(
    new CadastrarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
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
    new GerarXmlDpsAssinadoNotaServicoService(
      gerarXmlDpsService,
      empresaRepository,
      new ValidadorXmlDpsXsd(() => env.NFSE_XSD_DPS_PATH),
      new ProvedorCertificadoA1Arquivo(() => ({
        caminho: env.NFSE_CERTIFICADO_PATH,
        senha: env.NFSE_CERTIFICADO_SENHA,
      })),
      new AssinadorXmlDpsXmlDsig(),
    ),
  );
}
