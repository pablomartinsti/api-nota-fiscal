import { describe, expect, it, vi } from 'vitest';

import { AmbienteFiscal } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { CadastrarRascunhoNotaServicoService } from './CadastrarRascunhoNotaServicoService';
import { GerarProximoNumeroDpsService } from './GerarProximoNumeroDpsService';
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
});

function criarService(maiorNumero: number | null) {
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

  return {
    service: new CadastrarRascunhoNotaServicoService(
      notaRepository,
      validarReferencias,
      new GerarProximoNumeroDpsService(notaRepository),
    ),
    salvar,
    buscarMaiorNumero,
  };
}
