import { GestaoClienteController } from '../controllers/GestaoClienteController';
import { env } from '../config/env';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaClienteRepository } from '../database/repositories/PrismaClienteRepository';
import { ClienteHttpAdnNfseNacional } from '../fiscal/ClienteHttpAdnNfseNacional';
import { AesGcmCifradorTexto } from '../security/AesGcmCifradorTexto';
import { AlterarStatusClienteService } from '../services/AlterarStatusClienteService';
import { AtualizarClienteService } from '../services/AtualizarClienteService';
import { BuscarClienteService } from '../services/BuscarClienteService';
import { CadastrarClienteService } from '../services/CadastrarClienteService';
import { ListarClientesService } from '../services/ListarClientesService';
import { ListarXmlsNfseClientePeriodoService } from '../services/ListarXmlsNfseClientePeriodoService';
import { ResolverConfiguracaoFiscalEmpresaService } from '../services/ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from '../services/ValidarPermissaoProducaoRealService';

export function criarGestaoClienteController(): GestaoClienteController {
  const repository = new PrismaClienteRepository();
  const configuracaoFiscalRepository =
    new PrismaConfiguracaoFiscalEmpresaRepository();
  const resolverConfiguracaoFiscal =
    new ResolverConfiguracaoFiscalEmpresaService(
      configuracaoFiscalRepository,
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
        certificadoPath: env.NFSE_CERTIFICADO_PATH,
        certificadoSenha: env.NFSE_CERTIFICADO_SENHA,
      })),
      resolverConfiguracaoFiscal,
      new ValidarPermissaoProducaoRealService(
        env.NFSE_PERMITIR_PRODUCAO_REAL,
      ),
    ),
  );
}
