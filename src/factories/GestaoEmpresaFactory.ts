import { GestaoEmpresaController } from '../controllers/GestaoEmpresaController';
import { env } from '../config/env';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { AesGcmCifradorTexto } from '../security/AesGcmCifradorTexto';
import { AtualizarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/AtualizarConfiguracaoFiscalEmpresaAutenticadaService';
import { AtualizarEmpresaAutenticadaService } from '../services/AtualizarEmpresaAutenticadaService';
import { BuscarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/BuscarConfiguracaoFiscalEmpresaAutenticadaService';
import { BuscarEmpresaAutenticadaService } from '../services/BuscarEmpresaAutenticadaService';

export function criarGestaoEmpresaController(): GestaoEmpresaController {
  const empresaRepository = new PrismaEmpresaRepository();
  const configuracaoFiscalRepository =
    new PrismaConfiguracaoFiscalEmpresaRepository();
  const cifradorTexto = new AesGcmCifradorTexto(
    env.NFSE_CERTIFICADO_CRYPTO_KEY,
  );

  return new GestaoEmpresaController(
    new BuscarEmpresaAutenticadaService(empresaRepository),
    new AtualizarEmpresaAutenticadaService(empresaRepository),
    new BuscarConfiguracaoFiscalEmpresaAutenticadaService(
      configuracaoFiscalRepository,
    ),
    new AtualizarConfiguracaoFiscalEmpresaAutenticadaService(
      configuracaoFiscalRepository,
      empresaRepository,
      cifradorTexto,
    ),
  );
}
