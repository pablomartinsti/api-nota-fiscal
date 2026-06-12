import { CnpjJaCadastradoError } from '../../errors/CnpjJaCadastradoError';
import { EmailJaCadastradoError } from '../../errors/EmailJaCadastradoError';
import {
  OnboardingRepository,
  ResultadoOnboarding,
} from '../../repositories/OnboardingRepository';
import { PrismaEmpresaMapper } from '../mappers/PrismaEmpresaMapper';
import { PrismaUsuarioMapper } from '../mappers/PrismaUsuarioMapper';
import { prisma } from '../prisma.client';

interface PrismaUniqueError {
  code: string;
  meta?: {
    modelName?: string;
  };
}

export class PrismaOnboardingRepository implements OnboardingRepository {
  async salvar(
    empresa: ResultadoOnboarding['empresa'],
    proprietario: ResultadoOnboarding['proprietario'],
  ): Promise<ResultadoOnboarding> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const registroEmpresa = await transaction.empresa.create({
          data: {
            id: empresa.id,
            ...PrismaEmpresaMapper.paraPersistencia(empresa),
          },
        });
        const registroProprietario = await transaction.usuario.create({
          data: {
            id: proprietario.id,
            ...PrismaUsuarioMapper.paraPersistencia(proprietario),
          },
        });

        return {
          empresa: PrismaEmpresaMapper.paraDominio(registroEmpresa),
          proprietario: PrismaUsuarioMapper.paraDominio(registroProprietario),
        };
      });
    } catch (error) {
      this.traduzirConflitoUnico(error);
      throw error;
    }
  }

  private traduzirConflitoUnico(error: unknown): void {
    if (!this.ehErroUnicoPrisma(error)) {
      return;
    }

    if (error.meta?.modelName === 'Empresa') {
      throw new CnpjJaCadastradoError();
    }

    if (error.meta?.modelName === 'Usuario') {
      throw new EmailJaCadastradoError();
    }
  }

  private ehErroUnicoPrisma(error: unknown): error is PrismaUniqueError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
