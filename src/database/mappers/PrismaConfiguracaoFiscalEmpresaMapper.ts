import {
  AmbienteFiscal as PrismaAmbienteFiscal,
  ConfiguracaoFiscalEmpresa as PrismaConfiguracaoFiscalEmpresa,
} from '@prisma/client';

import { ConfiguracaoFiscalEmpresa } from '../../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../../entities/NotaServico';

export class PrismaConfiguracaoFiscalEmpresaMapper {
  static paraDominio(
    registro: PrismaConfiguracaoFiscalEmpresa,
  ): ConfiguracaoFiscalEmpresa {
    return new ConfiguracaoFiscalEmpresa({
      id: registro.id,
      empresaId: registro.empresaId,
      ambienteFiscalPadrao:
        registro.ambienteFiscalPadrao as AmbienteFiscal,
      serieDpsPadrao: registro.serieDpsPadrao,
      certificadoA1Path: registro.certificadoA1Path ?? undefined,
      certificadoA1Senha: registro.certificadoA1Senha ?? undefined,
      ativo: registro.ativo,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
    });
  }

  static paraPersistencia(configuracao: ConfiguracaoFiscalEmpresa) {
    return {
      empresaId: configuracao.empresaId,
      ambienteFiscalPadrao:
        configuracao.ambienteFiscalPadrao as PrismaAmbienteFiscal,
      serieDpsPadrao: configuracao.serieDpsPadrao,
      certificadoA1Path: configuracao.certificadoA1Path ?? null,
      certificadoA1Senha: configuracao.certificadoA1Senha ?? null,
      ativo: configuracao.ativo,
    };
  }
}
