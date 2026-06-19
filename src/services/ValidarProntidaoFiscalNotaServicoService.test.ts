import { describe, expect, it, vi } from 'vitest';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { Empresa, RegimeTributario } from '../entities/Empresa';
import {
  AmbienteFiscal,
  NotaServico,
  TipoRetencaoIssqn,
  TributacaoIssqn,
} from '../entities/NotaServico';
import { Servico } from '../entities/Servico';
import { Cliente } from '../entities/Cliente';
import { PerfilUsuario } from '../entities/Usuario';
import { ClienteRepository } from '../repositories/ClienteRepository';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { ServicoRepository } from '../repositories/ServicoRepository';
import {
  ValidarProntidaoFiscalNotaServicoOptions,
  ValidarProntidaoFiscalNotaServicoService,
} from './ValidarProntidaoFiscalNotaServicoService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

describe('ValidarProntidaoFiscalNotaServicoService', () => {
  it('deve retornar prontidao simples para nota em homologacao', async () => {
    const { service } = criarService();

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado).toEqual({
      pronto: true,
      pendencias: [],
    });
  });

  it('deve informar pendencias especificas para nota em producao real', async () => {
    const { service } = criarService({
      nota: criarNota(AmbienteFiscal.PRODUCAO),
      options: {
        permitirProducaoReal: false,
        baseUrlProducao:
          'https://sefin.producaorestrita.nfse.gov.br/SefinNacional',
      },
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado.pronto).toBe(false);
    expect(resultado.pendencias).toEqual(
      expect.arrayContaining([
        'producaoReal.permissao',
        'producaoReal.urlSefinProducao',
        'producaoReal.xsdDpsPath',
        'producaoReal.xsdEventoPath',
        'empresa.configuracaoFiscal.certificadoA1',
      ]),
    );
    expect(resultado.producaoReal).toEqual({
      habilitada: false,
      urlSefinProducaoConfigurada: false,
      xsdDpsConfigurado: false,
      xsdEventoConfigurado: false,
      certificadoA1EmpresaConfigurado: false,
    });
  });

  it('deve aprovar checklist de producao real quando configuracao estiver completa', async () => {
    const { service } = criarService({
      nota: criarNota(AmbienteFiscal.PRODUCAO),
      configuracaoFiscal: new ConfiguracaoFiscalEmpresa({
        empresaId: 'empresa-1',
        ambienteFiscalPadrao: AmbienteFiscal.PRODUCAO,
        serieDpsPadrao: '1',
        certificadoA1Path: 'storage/certificados/empresa-1.pfx',
        certificadoA1Senha: 'senha-criptografada',
      }),
      options: {
        permitirProducaoReal: true,
        baseUrlProducao: 'https://sefin.nfse.gov.br/SefinNacional',
        xsdDpsPath: 'Schemas/1.01/DPS_v1.01.xsd',
        xsdEventoPath: 'Schemas/1.01/pedRegEvento_v1.01.xsd',
      },
    });

    const resultado = await service.executar(autenticacao, 'nota-1');

    expect(resultado).toEqual({
      pronto: true,
      pendencias: [],
      producaoReal: {
        habilitada: true,
        urlSefinProducaoConfigurada: true,
        xsdDpsConfigurado: true,
        xsdEventoConfigurado: true,
        certificadoA1EmpresaConfigurado: true,
      },
    });
  });
});

function criarService(props?: {
  nota?: NotaServico;
  configuracaoFiscal?: ConfiguracaoFiscalEmpresa | null;
  options?: Omit<
    ValidarProntidaoFiscalNotaServicoOptions,
    'configuracaoFiscalRepository'
  >;
}) {
  const empresaRepository: EmpresaRepository = {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(criarEmpresa()),
    buscarPorCnpj: vi.fn(),
  };
  const clienteRepository: ClienteRepository = {
    salvar: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(criarCliente()),
    buscarPorCpfCnpjEEmpresaId: vi.fn(),
    listarPorEmpresaId: vi.fn(),
  };
  const servicoRepository: ServicoRepository = {
    salvar: vi.fn(),
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(criarServico()),
    listarPorEmpresaId: vi.fn(),
  };
  const notaRepository: NotaServicoRepository = {
    salvar: vi.fn(),
    iniciarProcessamentoEnvio: vi.fn(),
    buscarPorIdEEmpresaId: vi
      .fn()
      .mockResolvedValue(props?.nota ?? criarNota(AmbienteFiscal.HOMOLOGACAO)),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
  };
  const configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository = {
    salvar: vi.fn(),
    buscarPorEmpresaId: vi
      .fn()
      .mockResolvedValue(props?.configuracaoFiscal ?? null),
  };

  return {
    service: new ValidarProntidaoFiscalNotaServicoService(
      empresaRepository,
      clienteRepository,
      servicoRepository,
      notaRepository,
      {
        configuracaoFiscalRepository,
        ...props?.options,
      },
    ),
  };
}

function criarEmpresa(): Empresa {
  return new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Teste Ltda',
    cnpj: '12345678000199',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    codigoMunicipioIbge: '3170206',
    cidade: 'Uberlandia',
    uf: 'MG',
  });
}

function criarCliente(): Cliente {
  return new Cliente({
    id: 'cliente-1',
    empresaId: 'empresa-1',
    nomeRazaoSocial: 'Cliente Teste Ltda',
    cpfCnpj: '98765432000199',
    cidade: 'Uberlandia',
    uf: 'MG',
  });
}

function criarServico(): Servico {
  return new Servico({
    id: 'servico-1',
    empresaId: 'empresa-1',
    descricao: 'Servicos contabeis',
    codigoServico: '17.19',
    codigoTributacaoNacional: '171901',
    aliquotaIss: 2,
  });
}

function criarNota(ambienteFiscal: AmbienteFiscal): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    ambienteFiscal,
    serieDps: '1',
    numeroDps: '1',
    dataCompetencia: new Date('2026-06-17T00:00:00.000Z'),
    codigoMunicipioPrestacao: '3170206',
    tributacaoIssqn: TributacaoIssqn.TRIBUTAVEL,
    tipoRetencaoIssqn: TipoRetencaoIssqn.NAO_RETIDO,
    valorServico: 500,
    aliquotaIss: 2,
    descricao: 'Servicos contabeis prestados',
  });
}
