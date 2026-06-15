import { Cliente } from '../entities/Cliente';
import { Empresa } from '../entities/Empresa';
import { NotaServico } from '../entities/NotaServico';
import { Servico } from '../entities/Servico';

export interface GerarXmlDpsInput {
  empresa: Empresa;
  cliente: Cliente;
  servico: Servico;
  nota: NotaServico;
  dataHoraEmissao?: Date;
}

export interface GeradorXmlDps {
  gerar(input: GerarXmlDpsInput): string;
}
