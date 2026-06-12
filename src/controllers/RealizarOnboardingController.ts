import { Request, Response } from 'express';

import { realizarOnboardingSchema } from '../dtos/RealizarOnboardingDto';
import { EmpresaPresenter } from '../presenters/EmpresaPresenter';
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
      empresa: EmpresaPresenter.paraHttp(empresa),
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
