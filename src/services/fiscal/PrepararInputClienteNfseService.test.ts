import { describe, expect, it, vi } from 'vitest';

import { AmbienteFiscal } from '../../entities/NotaServico';
import { CertificadoA1EmpresaProducaoAusenteError } from '../../errors/CertificadoA1EmpresaProducaoAusenteError';
import { CertificadoA1 } from '../../fiscal/certificados-a1/CertificadoA1';
import {
  obterCertificadoA1Fiscal,
  prepararInputClienteNfse,
} from './PrepararInputClienteNfseService';

describe('PrepararInputClienteNfseService', () => {
  it('deve bloquear producao real sem resolver configuracao fiscal', async () => {
    await expect(
      prepararInputClienteNfse(undefined, 'empresa-1', AmbienteFiscal.PRODUCAO, {
        chaveAcesso: '123',
      }),
    ).rejects.toBeInstanceOf(CertificadoA1EmpresaProducaoAusenteError);
  });

  it('deve preparar input de homologacao sem certificado quando nao ha resolver', async () => {
    await expect(
      prepararInputClienteNfse(
        undefined,
        'empresa-1',
        AmbienteFiscal.HOMOLOGACAO,
        { chaveAcesso: '123' },
      ),
    ).resolves.toEqual({
      ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      chaveAcesso: '123',
    });
  });

  it('deve usar provedor local como fallback para obter certificado em homologacao', async () => {
    const certificado = criarCertificado();
    const provedorCertificado = {
      obter: vi.fn().mockResolvedValue(certificado),
    };

    await expect(
      obterCertificadoA1Fiscal({
        provedorCertificado,
        empresaId: 'empresa-1',
        ambienteFiscal: AmbienteFiscal.HOMOLOGACAO,
      }),
    ).resolves.toBe(certificado);
    expect(provedorCertificado.obter).toHaveBeenCalledOnce();
  });
});

function criarCertificado(): CertificadoA1 {
  return {
    chavePrivadaPem: 'chave',
    certificadoPem: 'certificado',
    cnpj: '12345678000199',
    validoDe: new Date('2026-01-01'),
    validoAte: new Date('2027-01-01'),
  };
}
