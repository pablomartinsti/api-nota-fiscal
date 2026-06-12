import { Request, Response } from 'express';

import { realizarOnboardingSchema } from '../dtos/RealizarOnboardingDto';
import { RealizarOnboardingService } from '../services/RealizarOnboardingService';

export class RealizarOnboardingController {
  constructor(
    private readonly realizarOnboardingService: RealizarOnboardingService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const input = realizarOnboardingSchema.parse(request.body);
    const { empresa, proprietario } =
      await this.realizarOnboardingService.executar(input);

    return response.status(201).json({
      empresa: {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: empresa.nomeFantasia,
        cnpj: empresa.cnpj,
        inscricaoMunicipal: empresa.inscricaoMunicipal,
        regimeTributario: empresa.regimeTributario,
        cidade: empresa.cidade,
        uf: empresa.uf,
        ativo: empresa.ativo,
        createdAt: empresa.createdAt,
        updatedAt: empresa.updatedAt,
      },
      proprietario: {
        id: proprietario.id,
        empresaId: proprietario.empresaId,
        nome: proprietario.nome,
        email: proprietario.email,
        perfil: proprietario.perfil,
        ativo: proprietario.ativo,
        createdAt: proprietario.createdAt,
        updatedAt: proprietario.updatedAt,
      },
    });
  }
}
