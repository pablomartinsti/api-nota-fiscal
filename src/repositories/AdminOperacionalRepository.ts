import { AmbienteFiscal, StatusNota } from '../entities/NotaServico';
import {
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from '../entities/NotaServicoEventoFiscal';

export interface FiltrosAdminNotas {
  empresaId?: string;
  status?: StatusNota;
  ambienteFiscal?: AmbienteFiscal;
  busca?: string;
  criadoDe?: Date;
  criadoAte?: Date;
  limite: number;
}

export interface FiltrosAdminEventosFiscais {
  empresaId?: string;
  notaServicoId?: string;
  tipo?: TipoEventoFiscalNotaServico;
  status?: StatusEventoFiscalNotaServico;
  busca?: string;
  criadoDe?: Date;
  criadoAte?: Date;
  limite: number;
}

export interface AdminEmpresaResumo {
  id: string;
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  uf: string;
  ativo: boolean;
}

export interface AdminResumoNotasEmpresa {
  total: number;
  emitidas: number;
  rascunhos: number;
  processando: number;
  erros: number;
  canceladas: number;
  substituidas: number;
}

export interface AdminConfiguracaoFiscalEmpresaResumo {
  ambienteFiscalPadrao: AmbienteFiscal;
  serieDpsPadrao: string;
  emissaoHabilitada: boolean;
  certificadoA1Configurado: boolean;
  certificadoA1ValidoAte?: Date;
  ativo: boolean;
}

export interface AdminEmpresaOperacionalResumo extends AdminEmpresaResumo {
  configuracaoFiscal: AdminConfiguracaoFiscalEmpresaResumo;
  notas: AdminResumoNotasEmpresa;
  ultimoErro?: {
    notaServicoId: string;
    numeroNfse?: string;
    numeroDps?: string;
    mensagem?: string;
    updatedAt: Date;
  };
}

export interface AdminClienteResumo {
  id: string;
  nomeRazaoSocial: string;
  cpfCnpj: string;
}

export interface AdminServicoResumo {
  id: string;
  descricao: string;
}

export interface AdminUsuarioResumo {
  id: string;
  nome: string;
  email: string;
}

export interface AdminEventoFiscalResumo {
  id: string;
  empresa: AdminEmpresaResumo;
  notaServicoId: string;
  usuario?: AdminUsuarioResumo;
  tipo: TipoEventoFiscalNotaServico;
  status: StatusEventoFiscalNotaServico;
  statusHttp?: number;
  chaveAcesso?: string;
  mensagem?: string;
  createdAt: Date;
  nota?: {
    id: string;
    numeroNfse?: string;
    serieDps?: string;
    numeroDps?: string;
    status: StatusNota;
    valorServico: number;
    dataEmissao?: Date;
    cliente: AdminClienteResumo;
    servico: AdminServicoResumo;
  };
}

export interface AdminNotaResumo {
  id: string;
  empresa: AdminEmpresaResumo;
  cliente: AdminClienteResumo;
  servico: AdminServicoResumo;
  numeroNfse?: string;
  serieDps?: string;
  numeroDps?: string;
  ambienteFiscal: AmbienteFiscal;
  status: StatusNota;
  valorServico: number;
  valorIss: number;
  dataCompetencia?: Date;
  dataEmissao?: Date;
  chaveAcesso?: string;
  mensagemErro?: string;
  mensagemErroFiscal?: string;
  createdAt: Date;
  updatedAt: Date;
  ultimoEvento?: Omit<AdminEventoFiscalResumo, 'empresa' | 'nota'>;
}

export interface AdminOperacionalRepository {
  listarEmpresas(): Promise<AdminEmpresaOperacionalResumo[]>;
  atualizarEmissaoEmpresa(
    empresaId: string,
    emissaoHabilitada: boolean,
  ): Promise<AdminEmpresaOperacionalResumo | null>;
  listarNotas(filtros: FiltrosAdminNotas): Promise<AdminNotaResumo[]>;
  listarEventosFiscais(
    filtros: FiltrosAdminEventosFiscais,
  ): Promise<AdminEventoFiscalResumo[]>;
}
