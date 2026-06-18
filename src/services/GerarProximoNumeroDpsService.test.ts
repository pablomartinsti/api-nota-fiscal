import { describe, expect, it, vi } from 'vitest';

import { AmbienteFiscal } from '../entities/NotaServico';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { GerarProximoNumeroDpsService } from './GerarProximoNumeroDpsService';

describe('GerarProximoNumeroDpsService', () => {
  it('deve manter numero informado manualmente', async () => {
    const { service, buscarMaiorNumero } = criarService(10);

    const numero = await service.executar(
      'empresa-1',
      AmbienteFiscal.HOMOLOGACAO,
      '1',
      '99',
    );

    expect(numero).toBe('99');
    expect(buscarMaiorNumero).not.toHaveBeenCalled();
  });

  it('deve gerar primeiro numero quando nao houver DPS anterior', async () => {
    const { service } = criarService(null);

    const numero = await service.executar(
      'empresa-1',
      AmbienteFiscal.HOMOLOGACAO,
      '1',
    );

    expect(numero).toBe('1');
  });

  it('deve gerar proximo numero por empresa, ambiente e serie', async () => {
    const { service, buscarMaiorNumero } = criarService(5);

    const numero = await service.executar(
      'empresa-1',
      AmbienteFiscal.HOMOLOGACAO,
      '2',
    );

    expect(buscarMaiorNumero).toHaveBeenCalledWith(
      'empresa-1',
      AmbienteFiscal.HOMOLOGACAO,
      '2',
    );
    expect(numero).toBe('6');
  });
});

function criarService(maiorNumero: number | null) {
  const buscarMaiorNumero = vi.fn().mockResolvedValue(maiorNumero);
  const notaRepository = {
    salvar: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: buscarMaiorNumero,
  } as unknown as NotaServicoRepository;

  return {
    service: new GerarProximoNumeroDpsService(notaRepository),
    buscarMaiorNumero,
  };
}
