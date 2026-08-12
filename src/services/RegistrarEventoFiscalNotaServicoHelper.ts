import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { TokenPayload } from '../security/GerenciadorToken';
import { RegistrarEventoFiscalNotaServicoService } from './RegistrarEventoFiscalNotaServicoService';

interface RegistrarEventoFiscalNotaServicoHelperInput {
  registrarEventoFiscal?: RegistrarEventoFiscalNotaServicoService;
  autenticacao: TokenPayload;
  notaServicoId?: string;
  tipo: TipoEventoFiscalNotaServico;
  mensagem: string;
  statusHttp?: number;
  chaveAcesso?: string;
}

export async function registrarSucessoFiscalNotaServico(
  input: RegistrarEventoFiscalNotaServicoHelperInput,
): Promise<void> {
  await registrarEventoFiscalNotaServico(input, 'sucesso');
}

export async function registrarErroFiscalNotaServico(
  input: RegistrarEventoFiscalNotaServicoHelperInput,
): Promise<void> {
  await registrarEventoFiscalNotaServico(input, 'erro');
}

async function registrarEventoFiscalNotaServico(
  input: RegistrarEventoFiscalNotaServicoHelperInput,
  status: 'sucesso' | 'erro',
): Promise<void> {
  if (!input.registrarEventoFiscal || !input.notaServicoId) {
    return;
  }

  await input.registrarEventoFiscal[status]({
    empresaId: input.autenticacao.empresaId,
    notaServicoId: input.notaServicoId,
    usuarioId: input.autenticacao.usuarioId,
    tipo: input.tipo,
    statusHttp: input.statusHttp,
    chaveAcesso: input.chaveAcesso,
    mensagem: input.mensagem,
  });
}