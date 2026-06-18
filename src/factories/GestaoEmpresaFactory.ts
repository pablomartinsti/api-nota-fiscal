import { GestaoEmpresaController } from '../controllers/GestaoEmpresaController';
import { PrismaConfiguracaoFiscalEmpresaRepository } from '../database/repositories/PrismaConfiguracaoFiscalEmpresaRepository';
import { PrismaEmpresaRepository } from '../database/repositories/PrismaEmpresaRepository';
import { AtualizarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/AtualizarConfiguracaoFiscalEmpresaAutenticadaService';
import { AtualizarEmpresaAutenticadaService } from '../services/AtualizarEmpresaAutenticadaService';
import { BuscarConfiguracaoFiscalEmpresaAutenticadaService } from '../services/BuscarConfiguracaoFiscalEmpresaAutenticadaService';
import { BuscarEmpresaAutenticadaService } from '../services/BuscarEmpresaAutenticadaService';

export function criarGestaoEmpresaController(): GestaoEmpresaController {
  const empresaRepository = new PrismaEmpresaRepository();
  const configuracaoFiscalRepository =
    new PrismaConfiguracaoFiscalEmpresaRepository();

  return new GestaoEmpresaController(
    new BuscarEmpresaAutenticadaService(empresaRepository),
    new AtualizarEmpresaAutenticadaService(empresaRepository),
    new BuscarConfiguracaoFiscalEmpresaAutenticadaService(
      configuracaoFiscalRepository,
    ),
    new AtualizarConfiguracaoFiscalEmpresaAutenticadaService(
      configuracaoFiscalRepository,
      empresaRepository,
    ),
  );
}
