import { describe, expect, it, vi } from 'vitest';

import {
  AmbienteFiscal,
  NotaServico,
  StatusNota,
} from '../entities/NotaServico';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import { PerfilUsuario } from '../entities/Usuario';
import { TipoEventoFiscalNotaServico } from '../entities/NotaServicoEventoFiscal';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { ClienteDanfseNfseNacional } from '../fiscal/ClienteDanfseNfseNacional';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { BaixarDanfseNotaServicoService } from './BaixarDanfseNotaServicoService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarPermissaoProducaoRealService } from './ValidarPermissaoProducaoRealService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};
const chaveAcesso = '12345678901234567890123456789012345678901234567890';
const pdf = Buffer.from('%PDF-1.4\nconteudo');

describe('BaixarDanfseNotaServicoService', () => {
  it('deve baixar DANFSe oficial de nota com chave de acesso', async () => {
    const nota = criarNota({ chaveAcesso });
    const { service, clienteDanfse } = criarService(nota);

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(clienteDanfse.baixarDanfsePorChave).toHaveBeenCalledWith({
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      chaveAcesso,
      certificadoConteudoBase64: undefined,
      certificadoPath: undefined,
      certificadoSenha: undefined,
    });
    expect(resultado).toEqual({
      sucesso: true,
      statusHttp: 200,
      chaveAcesso,
      pdf,
      contentType: 'application/pdf',
    });
  });

  it('deve registrar evento fiscal quando download do DANFSe falhar', async () => {
    const nota = criarNota({ chaveAcesso });
    const { service, clienteDanfse, registrarEventoFiscal } = criarService(nota);
    vi.mocked(clienteDanfse.baixarDanfsePorChave).mockResolvedValue({
      sucesso: false,
      statusHttp: 404,
      chaveAcesso,
      erros: [{ codigo: 'E404', mensagem: 'DANFSe nao encontrado.' }],
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado.sucesso).toBe(false);
    expect(registrarEventoFiscal.erro).toHaveBeenCalledWith({
      empresaId: autenticacao.empresaId,
      notaServicoId: 'nota-1',
      usuarioId: autenticacao.usuarioId,
      tipo: TipoEventoFiscalNotaServico.DOWNLOAD_DANFSE,
      statusHttp: 404,
      chaveAcesso,
      mensagem: 'E404: DANFSe nao encontrado.',
    });
  });

  it('nao deve baixar DANFSe de nota inexistente', async () => {
    const { service, clienteDanfse } = criarService(null);

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);
    expect(clienteDanfse.baixarDanfsePorChave).not.toHaveBeenCalled();
  });

  it('nao deve baixar DANFSe de nota sem chave de acesso', async () => {
    const { service, clienteDanfse } = criarService(criarNota());

    await expect(
      service.executar(autenticacao, 'nota-1'),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
    expect(clienteDanfse.baixarDanfsePorChave).not.toHaveBeenCalled();
  });
});

function criarService(nota: NotaServico | null): {
  service: BaixarDanfseNotaServicoService;
  clienteDanfse: ClienteDanfseNfseNacional;
  registrarEventoFiscal: {
    sucesso: ReturnType<typeof vi.fn>;
    erro: ReturnType<typeof vi.fn>;
  };
} {
  const notaRepository: NotaServicoRepository = {
    salvar: vi.fn(),
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
    excluirRascunhoPorIdEEmpresaId: vi.fn(),
  };
  const clienteDanfse: ClienteDanfseNfseNacional = {
    baixarDanfsePorChave: vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 200,
      chaveAcesso,
      pdf,
      contentType: 'application/pdf',
    }),
  };
  const registrarEventoFiscal = {
    sucesso: vi.fn(),
    erro: vi.fn(),
  };

  return {
    service: new BaixarDanfseNotaServicoService(
      notaRepository,
      clienteDanfse,
      new ResolverConfiguracaoFiscalEmpresaService(
        criarConfiguracaoFiscalRepository(),
        criarEmpresaRepository(),
      ),
      new ValidarPermissaoProducaoRealService(false),
      registrarEventoFiscal as never,
    ),
    clienteDanfse,
    registrarEventoFiscal,
  };
}

function criarEmpresaRepository(): EmpresaRepository {
  return {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(
      new Empresa({
        id: 'empresa-1',
        razaoSocial: 'Empresa Teste Ltda',
        cnpj: '12345678000199',
        regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
        cidade: 'Uberlandia',
        uf: 'MG',
      }),
    ),
    buscarPorCnpj: vi.fn(),
  };
}

function criarConfiguracaoFiscalRepository(): ConfiguracaoFiscalEmpresaRepository {
  return {
    salvar: vi.fn(),
    buscarPorEmpresaId: vi.fn().mockResolvedValue(null),
  };
}

function criarNota(props?: {
  chaveAcesso?: string;
  status?: StatusNota;
}): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 2,
    descricao: 'Servico contabil',
    status: props?.status ?? StatusNota.EMITIDA,
    ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
    numeroNfse: '100',
    dataEmissao: new Date('2026-06-20T10:00:00.000Z'),
    chaveAcesso: props?.chaveAcesso,
    codigoVerificacao: props?.chaveAcesso ? undefined : 'ABC123',
  });
}
