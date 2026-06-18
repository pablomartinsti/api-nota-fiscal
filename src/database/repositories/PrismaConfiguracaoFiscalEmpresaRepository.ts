import { ConfiguracaoFiscalEmpresa } from '../../entities/ConfiguracaoFiscalEmpresa';
import { ConfiguracaoFiscalEmpresaRepository } from '../../repositories/ConfiguracaoFiscalEmpresaRepository';
import { PrismaConfiguracaoFiscalEmpresaMapper } from '../mappers/PrismaConfiguracaoFiscalEmpresaMapper';
import { prisma } from '../prisma.client';

export class PrismaConfiguracaoFiscalEmpresaRepository
  implements ConfiguracaoFiscalEmpresaRepository
{
  async salvar(
    configuracao: ConfiguracaoFiscalEmpresa,
  ): Promise<ConfiguracaoFiscalEmpresa> {
    const dados =
      PrismaConfiguracaoFiscalEmpresaMapper.paraPersistencia(configuracao);
    const registro = await prisma.configuracaoFiscalEmpresa.upsert({
      where: { empresaId: configuracao.empresaId },
      update: dados,
      create: dados,
    });

    return PrismaConfiguracaoFiscalEmpresaMapper.paraDominio(registro);
  }

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
