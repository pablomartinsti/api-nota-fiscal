import { describe, expect, it, vi } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import {
  AmbienteFiscal,
  NotaServico,
} from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1EmpresaProducaoAusenteError } from '../errors/CertificadoA1EmpresaProducaoAusenteError';
import { AssinadorXmlDps } from '../fiscal/AssinadorXmlDps';
import { CertificadoA1, ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ValidadorXmlDps } from '../fiscal/ValidadorXmlDps';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { GerarXmlDpsNotaServicoService } from './GerarXmlDpsNotaServicoService';
import { GerarXmlDpsAssinadoNotaServicoService } from './GerarXmlDpsAssinadoNotaServicoService';

const empresa = new Empresa({
  id: 'empresa-1',
  razaoSocial: 'Empresa Teste Ltda',
  cnpj: '12345678000199',
  regimeTributario: RegimeTributario.LUCRO_PRESUMIDO,
  cidade: 'Campinas',
  uf: 'SP',
});

function criarCertificado(cnpj: string): CertificadoA1 {
  return {
    chavePrivadaPem: 'chave',
    certificadoPem: 'certificado',
    cnpj,
    validoDe: new Date('2026-01-01'),
    validoAte: new Date('2027-01-01'),
  };
}

describe('GerarXmlDpsAssinadoNotaServicoService', () => {
  it('deve validar antes e depois de assinar o XML', async () => {
    const validar = vi.fn().mockResolvedValue(undefined);
    const assinar = vi.fn().mockReturnValue('<DPS>assinado</DPS>');
    const service = criarService(
      criarCertificado(empresa.cnpj),
      validar,
      assinar,
    );

    const resultado = await service.executar(
      {
        usuarioId: 'usuario-1',
        empresaId: empresa.id!,
        perfil: PerfilUsuario.DONO,
      },
      'nota-1',
    );

    expect(resultado).toBe('<DPS>assinado</DPS>');
    expect(validar).toHaveBeenNthCalledWith(1, '<DPS>basico</DPS>');
    expect(validar).toHaveBeenNthCalledWith(2, '<DPS>assinado</DPS>');
    expect(assinar).toHaveBeenCalledOnce();
  });

  it('nao deve assinar com certificado de outro CNPJ', async () => {
    const validar = vi.fn().mockResolvedValue(undefined);
    const assinar = vi.fn();
    const service = criarService(
      criarCertificado('98765432000199'),
      validar,
      assinar,
    );

    await expect(
      service.executar(
        {
          usuarioId: 'usuario-1',
          empresaId: empresa.id!,
          perfil: PerfilUsuario.DONO,
        },
        'nota-1',
      ),
    ).rejects.toBeInstanceOf(CertificadoA1CnpjDivergenteError);
    expect(assinar).not.toHaveBeenCalled();
  });

  it('deve bloquear assinatura em producao real sem certificado proprio da empresa', async () => {
    const validar = vi.fn().mockResolvedValue(undefined);
    const assinar = vi.fn();
    const service = criarService(
      criarCertificado(empresa.cnpj),
      validar,
      assinar,
      { ambienteFiscal: AmbienteFiscal.PRODUCAO },
    );

    await expect(
      service.executar(
        {
          usuarioId: 'usuario-1',
          empresaId: empresa.id!,
          perfil: PerfilUsuario.DONO,
        },
        'nota-1',
      ),
    ).rejects.toBeInstanceOf(CertificadoA1EmpresaProducaoAusenteError);
    expect(validar).not.toHaveBeenCalled();
    expect(assinar).not.toHaveBeenCalled();
  });
});

function criarService(
  certificado: CertificadoA1,
  validar: ValidadorXmlDps['validar'],
  assinar: AssinadorXmlDps['assinar'],
  props?: {
    ambienteFiscal?: AmbienteFiscal;
  },
): GerarXmlDpsAssinadoNotaServicoService {
  const gerarXml = {
    executar: vi.fn().mockResolvedValue('<DPS>basico</DPS>'),
  } as unknown as GerarXmlDpsNotaServicoService;
  const empresaRepository: EmpresaRepository = {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(empresa),
    buscarPorCnpj: vi.fn(),
  };
  const validador: ValidadorXmlDps = { validar };
  const provedor: ProvedorCertificadoA1 = {
    obter: vi.fn().mockResolvedValue(certificado),
  };
  const assinador: AssinadorXmlDps = { assinar };
  const notaRepository: NotaServicoRepository | undefined =
    props?.ambienteFiscal
      ? {
          salvar: vi.fn(),
          listarPorEmpresaId: vi.fn(),
          buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
          buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(
            new NotaServico({
              id: 'nota-1',
              empresaId: empresa.id!,
              usuarioId: 'usuario-1',
              clienteId: 'cliente-1',
              servicoId: 'servico-1',
              valorServico: 100,
              aliquotaIss: 5,
              descricao: 'Consultoria',
              ambienteFiscal: props.ambienteFiscal,
            }),
          ),
        }
      : undefined;

  return new GerarXmlDpsAssinadoNotaServicoService(
    gerarXml,
    empresaRepository,
    validador,
    provedor,
    assinador,
    undefined,
    notaRepository,
  );
}
