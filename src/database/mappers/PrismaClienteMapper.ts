import { Cliente as PrismaCliente } from '@prisma/client';

import { Cliente } from '../../entities/Cliente';

export class PrismaClienteMapper {
  static paraDominio(registro: PrismaCliente): Cliente {
    return new Cliente({
      id: registro.id,
      empresaId: registro.empresaId,
      nomeRazaoSocial: registro.nomeRazaoSocial,
      cpfCnpj: registro.cpfCnpj,
      email: registro.email ?? undefined,
      telefone: registro.telefone ?? undefined,
      cep: registro.cep ?? undefined,
      endereco: registro.endereco ?? undefined,
      numero: registro.numero ?? undefined,
      bairro: registro.bairro ?? undefined,
      cidade: registro.cidade,
      uf: registro.uf,
      inscricaoMunicipal: registro.inscricaoMunicipal ?? undefined,
      ativo: registro.ativo,
      createdAt: registro.createdAt,
      updatedAt: registro.updatedAt,
    });
  }

  static paraPersistencia(cliente: Cliente) {
    return {
      empresaId: cliente.empresaId,
      nomeRazaoSocial: cliente.nomeRazaoSocial,
      cpfCnpj: cliente.cpfCnpj,
      email: cliente.email,
      telefone: cliente.telefone,
      cep: cliente.cep,
      endereco: cliente.endereco,
      numero: cliente.numero,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
      inscricaoMunicipal: cliente.inscricaoMunicipal,
      ativo: cliente.ativo,
    };
  }
}
