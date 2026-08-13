import { GestaoEmpresaController } from '../controllers/GestaoEmpresaController';
import { env } from '../config/env';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { AesGcmCifradorTexto } from '../security/AesGcmCifradorTexto';
import { AtualizarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/empresas/AtualizarConfiguracaoFiscalEmpresaAutenticadaService';
import { AtualizarEmpresaAutenticadaService } from '../services/empresas/AtualizarEmpresaAutenticadaService';
import { BuscarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/empresas/BuscarConfiguracaoFiscalEmpresaAutenticadaService';
import { BuscarEmpresaAutenticadaService } from '../services/empresas/BuscarEmpresaAutenticadaService';
import { ConfigurarCertificadoA1EmpresaAutenticadaService } from '../services/empresas/ConfigurarCertificadoA1EmpresaAutenticadaService';

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
    ),
    new ConfigurarCertificadoA1EmpresaAutenticadaService(
      configuracaoFiscalRepository,
      empresaRepository,
      cifradorTexto,
    ),
  );
}
