import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { CadastrarRascunhoNotaServicoService } from './CadastrarRascunhoNotaServicoService';
import { GerarProximoNumeroDpsService } from './GerarProximoNumeroDpsService';
import { ResolverConfiguracaoFiscalEmpresaService } from './ResolverConfiguracaoFiscalEmpresaService';
import { ValidarReferenciasNotaServicoService } from './ValidarReferenciasNotaServicoService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('CadastrarRascunhoNotaServicoService', () => {
  it('deve gerar numero da DPS automaticamente quando nao informado', async () => {
    const { service, salvar, buscarMaiorNumero } = criarService(5);

    const nota = await service.executar(autenticacao, {
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      valorServico: 500,
      descricao: 'Servico contabil',
      dataCompetencia: new Date('2026-06-17T00:00:00.000Z'),
      codigoMunicipioPrestacao: '3170206',
    });

    expect(buscarMaiorNumero).toHaveBeenCalledWith(
      'empresa-1',
      AmbienteFiscal.HOMOLOGACAO,
      '1',
    );
    expect(nota.serieDps).toBe('1');
    expect(nota.numeroDps).toBe('6');
    expect(salvar).toHaveBeenCalledOnce();
  });

  it('deve respeitar numero da DPS informado manualmente', async () => {
    const { service, buscarMaiorNumero } = criarService(5);

    const nota = await service.executar(autenticacao, {
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      valorServico: 500,
      descricao: 'Servico contabil',
      serieDps: '2',
      numeroDps: '99',
    });

    expect(buscarMaiorNumero).not.toHaveBeenCalled();
    expect(nota.serieDps).toBe('2');
    expect(nota.numeroDps).toBe('99');
  });

  it('deve usar ambiente e serie padrao da configuracao fiscal da empresa', async () => {
    const configuracaoFiscal = new ConfiguracaoFiscalEmpresa({
      empresaId: 'empresa-1',
      ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
      serieDpsPadrao: '9',
    });
    const { service, buscarMaiorNumero } = criarService(
      10,
      configuracaoFiscal,
    );

    const nota = await service.executar(autenticacao, {
      clienteId: 'cliente-1',
      servicoId: 'servico-1',
      valorServico: 500,
      descricao: 'Servico contabil',
    });

    expect(buscarMaiorNumero).toHaveBeenCalledWith(
      'empresa-1',
      AmbienteFiscal.PRODUCAO,
      '9',
    );
    expect(nota.ambienteFiscal).toBe(AmbienteFiscal.PRODUCAO);
    expect(nota.serieDps).toBe('9');
    expect(nota.numeroDps).toBe('11');
  });
});

function criarService(
  maiorNumero: number | null,
  configuracaoFiscal: ConfiguracaoFiscalEmpresa | null = null,
) {
  const salvar = vi.fn(async (nota) => nota);
  const buscarMaiorNumero = vi.fn().mockResolvedValue(maiorNumero);
  const notaRepository = {
    salvar,
    buscarPorIdEEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: buscarMaiorNumero,
  } as unknown as NotaServicoRepository;
  const validarReferencias = {
    executar: vi.fn().mockResolvedValue({
      servico: {
        aliquotaIss: 2,
      },
    }),
  } as unknown as ValidarReferenciasNotaServicoService;
  const configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository = {
    buscarPorEmpresaId: vi.fn().mockResolvedValue(configuracaoFiscal),
  };

  return {
    service: new CadastrarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
      new GerarProximoNumeroDpsService(notaRepository),
      new ResolverConfiguracaoFiscalEmpresaService(
        configuracaoFiscalRepository,
      ),
    ),
    salvar,
    buscarMaiorNumero,
  };
}
