import { Request, Response } from 'express';

import { cadastrarEmpresaSchema } from '../dtos/CadastrarEmpresaDto';
import { CadastrarEmpresaService } from '../services/CadastrarEmpresaService';

export class CadastrarEmpresaController {
  constructor(
    private readonly cadastrarEmpresaService: CadastrarEmpresaService,
  ) {}

  async handle(request: Request, response: Response): Promise<Response> {
    const input = cadastrarEmpresaSchema.parse(request.body);
    const empresa = await this.cadastrarEmpresaService.executar(input);

    return response.status(201).json({
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
    });
  }
}
