import { GestaoClienteController } from '../controllers/GestaoClienteController';
import { env } from '../config/env';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { ClienteHttpAdnNfseNacional } from '../fiscal/clientes/ClienteHttpAdnNfseNacional';
import { AesGcmCifradorTexto } from '../security/AesGcmCifradorTexto';
import { AlterarStatusClienteService } from '../services/clientes/AlterarStatusClienteService';
import { AtualizarClienteService } from '../services/clientes/AtualizarClienteService';
import { BuscarClienteService } from '../services/clientes/BuscarClienteService';
import { CadastrarClienteService } from '../services/clientes/CadastrarClienteService';
import { ListarClientesService } from '../services/clientes/ListarClientesService';
import { ListarXmlsNfseClientePeriodoService } from '../services/clientes/ListarXmlsNfseClientePeriodoService';
import { ResolverConfiguracaoFiscalEmpresaService } from '../services/fiscal/ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from '../services/fiscal/ValidarPermissaoProducaoRealService';

export function criarGestaoClienteController(): GestaoClienteController {
  const repository = new PrismaClienteRepository();
  const configuracaoFiscalRepository =
    new PrismaConfiguracaoFiscalEmpresaRepository();
  const empresaRepository = new PrismaEmpresaRepository();
  const resolverConfiguracaoFiscal =
    new ResolverConfiguracaoFiscalEmpresaService(
      configuracaoFiscalRepository,
      empresaRepository,
      new AesGcmCifradorTexto(env.NFSE_CERTIFICADO_CRYPTO_KEY),
    );

  return new GestaoClienteController(
    new CadastrarClienteService(repository),
    new ListarClientesService(repository),
    new BuscarClienteService(repository),
    new AtualizarClienteService(repository),
    new AlterarStatusClienteService(repository),
    new ListarXmlsNfseClientePeriodoService(
      repository,
      new ClienteHttpAdnNfseNacional(() => ({
        baseUrlHomologacao: env.NFSE_ADN_HOMOLOGACAO_BASE_URL,
        baseUrlProducao: env.NFSE_ADN_PRODUCAO_BASE_URL,
        timeoutMs: env.NFSE_ADN_TIMEOUT_MS,
      })),
      resolverConfiguracaoFiscal,
      new ValidarPermissaoProducaoRealService(
        env.NFSE_PERMITIR_PRODUCAO_REAL,
      ),
    ),
  );
}
