import { describe, expect, it, vi } from 'vitest';

import { Empresa, RegimeTributario } from '../entities/Empresa';
import { NotaServico, StatusNota } from '../entities/NotaServico';
import { PerfilUsuario } from '../entities/Usuario';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { NotaServicoNaoEncontradaError } from '../errors/NotaServicoNaoEncontradaError';
import { TransicaoStatusNotaInvalidaError } from '../errors/TransicaoStatusNotaInvalidaError';
import { ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import { ClienteNfseNacional } from '../fiscal/ClienteNfseNacional';
import { GeradorXmlPedidoCancelamentoNfseNacional } from '../fiscal/GeradorXmlPedidoCancelamentoNfseNacional';
import { ValidadorXmlDps } from '../fiscal/ValidadorXmlDps';
import { AssinadorXmlDps } from '../fiscal/AssinadorXmlDps';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { NotaServicoRepository } from '../repositories/NotaServicoRepository';
import { CancelarNfseNotaServicoService } from './CancelarNfseNotaServicoService';

const autenticacao = {
  usuarioId: 'usuario-1',
  empresaId: 'empresa-1',
  perfil: PerfilUsuario.DONO,
};

const chaveAcesso = '12345678901234567890123456789012345678901234567890';

describe('CancelarNfseNotaServicoService', () => {
  it('deve registrar evento fiscal e cancelar a nota quando a SEFIN aceitar', async () => {
    const nota = criarNotaEmitida();
    const { service, clienteNfse, salvar, validadorXml, assinadorXml } =
      criarService({ nota });

    const resultado = await service.executar(autenticacao, 'nota-1', {
      codigoMotivo: '1',
      motivo: 'Erro na emissao em ambiente de homologacao',
    });

    expect(validadorXml.validar).toHaveBeenCalledTimes(2);
    expect(assinadorXml.assinar).toHaveBeenCalledWith(
      '<pedRegEvento>pedido</pedRegEvento>',
      expect.objectContaining({ cnpj: '12345678000199' }),
    );
    expect(clienteNfse.registrarEventoCancelamento).toHaveBeenCalledWith({
      chaveAcesso,
      xmlPedidoEventoAssinado: '<pedRegEvento>assinado</pedRegEvento>',
    });
    expect(salvar).toHaveBeenCalledOnce();
    expect(resultado.sucesso).toBe(true);
    expect(resultado.nota.status).toBe(StatusNota.CANCELADA);
    expect(resultado.xmlEvento).toBe('<evento>cancelado</evento>');
  });

  it('nao deve cancelar localmente quando a SEFIN rejeitar o evento', async () => {
    const nota = criarNotaEmitida();
    const { service, clienteNfse, salvar } = criarService({ nota });
    clienteNfse.registrarEventoCancelamento = vi.fn().mockResolvedValue({
      sucesso: false,
      statusHttp: 400,
      erros: [{ codigo: 'E101', mensagem: 'Evento rejeitado.' }],
    });

    const resultado = await service.executar(autenticacao, 'nota-1', {
      codigoMotivo: '9',
      motivo: 'Cancelamento recusado em teste fiscal',
    });

    expect(salvar).not.toHaveBeenCalled();
    expect(resultado.sucesso).toBe(false);
    expect(resultado.nota.status).toBe(StatusNota.EMITIDA);
    expect(resultado.erros).toEqual([
      { codigo: 'E101', mensagem: 'Evento rejeitado.' },
    ]);
  });

  it('nao deve cancelar nota inexistente, sem chave ou fora de emitida', async () => {
    await expect(
      criarService({ nota: null }).service.executar(autenticacao, 'nota-1', {
        codigoMotivo: '1',
        motivo: 'Erro na emissao em ambiente de homologacao',
      }),
    ).rejects.toBeInstanceOf(NotaServicoNaoEncontradaError);

    await expect(
      criarService({ nota: criarNotaRascunho() }).service.executar(
        autenticacao,
        'nota-1',
        {
          codigoMotivo: '1',
          motivo: 'Erro na emissao em ambiente de homologacao',
        },
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);

    await expect(
      criarService({ nota: criarNotaEmitidaSemChave() }).service.executar(
        autenticacao,
        'nota-1',
        {
          codigoMotivo: '1',
          motivo: 'Erro na emissao em ambiente de homologacao',
        },
      ),
    ).rejects.toBeInstanceOf(TransicaoStatusNotaInvalidaError);
  });

  it('deve validar empresa e CNPJ do certificado antes de enviar', async () => {
    await expect(
      criarService({ empresa: null }).service.executar(autenticacao, 'nota-1', {
        codigoMotivo: '1',
        motivo: 'Erro na emissao em ambiente de homologacao',
      }),
    ).rejects.toBeInstanceOf(AutenticacaoInvalidaError);

    await expect(
      criarService({ certificadoCnpj: '99999999000199' }).service.executar(
        autenticacao,
        'nota-1',
        {
          codigoMotivo: '1',
          motivo: 'Erro na emissao em ambiente de homologacao',
        },
      ),
    ).rejects.toBeInstanceOf(CertificadoA1CnpjDivergenteError);
  });
});

function criarService(props?: {
  nota?: NotaServico | null;
  empresa?: Empresa | null;
  certificadoCnpj?: string;
}) {
  const nota = props?.nota === undefined ? criarNotaEmitida() : props.nota;
  const empresa = props?.empresa === undefined ? criarEmpresa() : props.empresa;
  const salvar = vi.fn(async (notaParaSalvar: NotaServico) => notaParaSalvar);
  const notaRepository: NotaServicoRepository = {
    salvar,
    buscarPorIdEEmpresaId: vi.fn().mockResolvedValue(nota),
    listarPorEmpresaId: vi.fn(),
    buscarMaiorNumeroDpsPorEmpresaAmbienteESerie: vi.fn(),
  };
  const empresaRepository: EmpresaRepository = {
    salvar: vi.fn(),
    buscarPorId: vi.fn().mockResolvedValue(empresa),
    buscarPorCnpj: vi.fn(),
  };
  const geradorXml = {
    gerar: vi.fn().mockReturnValue('<pedRegEvento>pedido</pedRegEvento>'),
  } as unknown as GeradorXmlPedidoCancelamentoNfseNacional;
  const validadorXml: ValidadorXmlDps = {
    validar: vi.fn().mockResolvedValue(undefined),
  };
  const provedorCertificado: ProvedorCertificadoA1 = {
    obter: vi.fn().mockResolvedValue({
      chavePrivadaPem: 'chave',
      certificadoPem: 'certificado',
      cnpj: props?.certificadoCnpj ?? '12345678000199',
      validoDe: new Date('2026-01-01T00:00:00.000Z'),
      validoAte: new Date('2027-01-01T00:00:00.000Z'),
    }),
  };
  const assinadorXml: AssinadorXmlDps = {
    assinar: vi.fn().mockReturnValue('<pedRegEvento>assinado</pedRegEvento>'),
  };
  const clienteNfse: ClienteNfseNacional = {
    enviarDpsAssinada: vi.fn(),
    consultarNfsePorChave: vi.fn(),
    registrarEventoCancelamento: vi.fn().mockResolvedValue({
      sucesso: true,
      statusHttp: 201,
      tipoAmbiente: 2,
      versaoAplicativo: 'SefinNacional_1.0',
      dataHoraProcessamento: '2026-06-16T17:22:48.5541738-03:00',
      xmlEvento: '<evento>cancelado</evento>',
    }),
  };

  return {
    service: new CancelarNfseNotaServicoService(
      notaRepository,
      empresaRepository,
      geradorXml,
      validadorXml,
      provedorCertificado,
      assinadorXml,
      clienteNfse,
    ),
    clienteNfse,
    salvar,
    validadorXml,
    assinadorXml,
  };
}

function criarEmpresa(): Empresa {
  return new Empresa({
    id: 'empresa-1',
    razaoSocial: 'Empresa Teste Ltda',
    cnpj: '12345678000199',
    regimeTributario: RegimeTributario.SIMPLES_NACIONAL,
    cidade: 'Campinas',
    uf: 'SP',
  });
}

function criarNotaEmitida(): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
    status: StatusNota.EMITIDA,
    chaveAcesso,
    dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
  });
}

function criarNotaEmitidaSemChave(): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
    status: StatusNota.EMITIDA,
    numeroNfse: '100',
    codigoVerificacao: 'ABC123',
    dataEmissao: new Date('2026-06-16T10:00:00.000Z'),
  });
}

function criarNotaRascunho(): NotaServico {
  return new NotaServico({
    id: 'nota-1',
    empresaId: 'empresa-1',
    usuarioId: 'usuario-1',
    clienteId: 'cliente-1',
    servicoId: 'servico-1',
    valorServico: 100,
    aliquotaIss: 5,
    descricao: 'Consultoria',
  });
}
