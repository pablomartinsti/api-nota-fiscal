import { ConfiguracaoFiscalEmpresa } from '../../entities/ConfiguracaoFiscalEmpresa';
import { ConfiguracaoFiscalEmpresaRepository } from '../../repositories/ConfiguracaoFiscalEmpresaRepository';
import { PrismaConfiguracaoFiscalEmpresaMapper } from '../mappers/PrismaConfiguracaoFiscalEmpresaMapper';
import { prisma } from '../prisma.client';

export class PrismaConfiguracaoFiscalEmpresaRepository
  implements ConfiguracaoFiscalEmpresaRepository
{
  async buscarPorEmpresaId(
    empresaId: string,
  ): Promise<ConfiguracaoFiscalEmpresa | null> {
    const registro = await prisma.configuracaoFiscalEmpresa.findUnique({
      where: { empresaId },
    });

    return registro
      ? PrismaConfiguracaoFiscalEmpresaMapper.paraDominio(registro)
      : null;
  }
}
