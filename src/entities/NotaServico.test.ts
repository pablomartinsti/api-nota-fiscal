import { describe, expect, it } from 'vitest';

import {
  AmbienteFiscal,
  CodigoMotivoSubstituicaoNfse,
  NotaServico,
  StatusNota,
  TipoRetencaoIssqn,
  TributacaoIssqn,
} from './NotaServico';

const dadosBase = {
  empresaId: 'empresa-1',
  usuarioId: 'usuario-1',
  clienteId: 'cliente-1',
  servicoId: 'servico-1',
  valorServico: 100,
  aliquotaIss: 5,
  descricao: 'Consultoria',
};

const criarNota = () => new NotaServico(dadosBase);

describe('NotaServico', () => {
  it('deve criar uma nota como rascunho e calcular o ISS', () => {
    const nota = criarNota();

    expect(nota.status).toBe(StatusNota.RASCUNHO);
    expect(nota.valorIss).toBe(5);
    expect(nota.createdAt).toBeInstanceOf(Date);
    expect(nota.updatedAt).toBeInstanceOf(Date);
    expect(nota.ambienteFiscal).toBe(AmbienteFiscal.HOMOLOGACAO);
    expect(nota.tributacaoIssqn).toBe(TributacaoIssqn.TRIBUTAVEL);
    expect(nota.tipoRetencaoIssqn).toBe(TipoRetencaoIssqn.NAO_RETIDO);
  });

  it('deve armazenar e validar dados fiscais da DPS no rascunho', () => {
    const dataCompetencia = new Date('2026-06-15T00:00:00.000Z');
    const nota = new NotaServico({
      ...dadosBase,
      serieDps: '1',
      numeroDps: '10',
      dataCompetencia,
      codigoMunicipioPrestacao: '3509502',
      tributacaoIssqn: TributacaoIssqn.TRIBUTAVEL,
      tipoRetencaoIssqn: TipoRetencaoIssqn.RETIDO_PELO_TOMADOR,
      informacoesComplementares: 'Contrato 123',
    });

    expect(nota.serieDps).toBe('1');
    expect(nota.numeroDps).toBe('10');
    expect(nota.dataCompetencia).toBe(dataCompetencia);
    expect(nota.codigoMunicipioPrestacao).toBe('3509502');
    expect(nota.tipoRetencaoIssqn).toBe(
      TipoRetencaoIssqn.RETIDO_PELO_TOMADOR,
    );
  });

  it('deve armazenar dados de substituicao de NFS-e', () => {
    const nota = new NotaServico({
      ...dadosBase,
      notaSubstituidaId: 'nota-original-1',
      chaveAcessoSubstituida:
        '12345678901234567890123456789012345678901234567890',
      codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
      motivoSubstituicao: 'Correcao de dados da NFS-e em homologacao',
    });

    expect(nota.notaSubstituidaId).toBe('nota-original-1');
    expect(nota.chaveAcessoSubstituida).toBe(
      '12345678901234567890123456789012345678901234567890',
    );
    expect(nota.codigoMotivoSubstituicao).toBe('99');
    expect(nota.motivoSubstituicao).toBe(
      'Correcao de dados da NFS-e em homologacao',
    );
  });

  it('deve rejeitar dados invalidos de substituicao', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          notaSubstituidaId: 'nota-original-1',
          chaveAcessoSubstituida: '123',
          codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
          motivoSubstituicao: 'Correcao de dados da NFS-e em homologacao',
        }),
    ).toThrow('Chave de acesso substituida deve conter 50 digitos.');

    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          notaSubstituidaId: 'nota-original-1',
          chaveAcessoSubstituida:
            '12345678901234567890123456789012345678901234567890',
          codigoMotivoSubstituicao: CodigoMotivoSubstituicaoNfse.OUTROS,
          motivoSubstituicao: 'curto',
        }),
    ).toThrow(
      'Motivo da substituicao deve conter entre 15 e 255 caracteres.',
    );
  });

  it('deve rejeitar formatos fiscais invalidos da DPS', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          serieDps: 'ABC',
        }),
    ).toThrow('Serie da DPS deve conter de 1 a 5 digitos.');

    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          codigoMunicipioPrestacao: '123',
        }),
    ).toThrow(
      'Codigo IBGE do municipio da prestacao deve conter 7 digitos.',
    );
  });

  it('deve arredondar o valor do ISS para duas casas decimais', () => {
    const nota = new NotaServico({
      ...dadosBase,
      valorServico: 1.005,
      aliquotaIss: 100,
    });

    expect(nota.valorIss).toBe(1.01);
  });

  it.each([
    ['empresaId', { empresaId: ' ' }, 'Empresa é obrigatório.'],
    ['usuarioId', { usuarioId: ' ' }, 'Usuário é obrigatório.'],
    ['clienteId', { clienteId: ' ' }, 'Cliente é obrigatório.'],
    ['servicoId', { servicoId: ' ' }, 'Serviço é obrigatório.'],
  ])('deve rejeitar %s vazio', (_campo, alteracao, mensagem) => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          ...alteracao,
        }),
    ).toThrow(mensagem);
  });

  it('deve rejeitar descrição vazia', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          descricao: ' ',
        }),
    ).toThrow('Descrição é obrigatório.');
  });

  it('deve rejeitar valor do serviço igual ou menor que zero', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          valorServico: 0,
        }),
    ).toThrow('Valor do serviço deve ser maior que zero.');
  });

  it('deve rejeitar valor do serviço não finito', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          valorServico: Number.NaN,
        }),
    ).toThrow('Valor do serviço deve ser um número válido.');
  });

  it('deve rejeitar alíquota fora do intervalo permitido', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          aliquotaIss: 101,
        }),
    ).toThrow('Alíquota de ISS deve estar entre 0 e 100.');
  });

  it('deve alterar dados do rascunho e recalcular o ISS', () => {
    const nota = criarNota();

    nota.alterarRascunho({
      clienteId: 'cliente-2',
      servicoId: 'servico-2',
      valorServico: 250,
      aliquotaIss: 2.5,
      descricao: 'Consultoria atualizada',
    });

    expect(nota.clienteId).toBe('cliente-2');
    expect(nota.servicoId).toBe('servico-2');
    expect(nota.valorServico).toBe(250);
    expect(nota.aliquotaIss).toBe(2.5);
    expect(nota.valorIss).toBe(6.25);
    expect(nota.descricao).toBe('Consultoria atualizada');
  });

  it('deve emitir uma nota rascunho', () => {
    const nota = criarNota();
    const dataEmissao = new Date('2026-06-09T12:00:00.000Z');

    nota.emitir({
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
      dataEmissao,
      linkPdf: 'https://exemplo.com/nota.pdf',
      xmlUrl: 'https://exemplo.com/nota.xml',
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
    expect(nota.numeroNfse).toBe('100');
    expect(nota.codigoVerificacao).toBe('ABC123');
    expect(nota.dataEmissao).toBe(dataEmissao);
    expect(nota.linkPdf).toBe('https://exemplo.com/nota.pdf');
    expect(nota.xmlUrl).toBe('https://exemplo.com/nota.xml');
  });

  it('deve registrar sucesso fiscal da emissao', () => {
    const nota = criarNota();
    const dataAutorizacao = new Date('2026-06-09T12:30:00.000Z');

    nota.registrarSucessoFiscal({
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
      protocoloEmissao: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
      xmlAutorizado: '<NFS-e>autorizada</NFS-e>',
      dataAutorizacao,
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
    expect(nota.numeroNfse).toBe('100');
    expect(nota.codigoVerificacao).toBe('ABC123');
    expect(nota.protocoloEmissao).toBe('PROTOCOLO-123');
    expect(nota.chaveAcesso).toBe('CHAVE-456');
    expect(nota.xmlAutorizado).toBe('<NFS-e>autorizada</NFS-e>');
    expect(nota.dataAutorizacao).toBe(dataAutorizacao);
    expect(nota.mensagemErroFiscal).toBeUndefined();
  });

  it('deve controlar processamento fiscal antes do retorno da SEFIN', () => {
    const nota = criarNota();

    nota.iniciarProcessamentoFiscal();

    expect(nota.status).toBe(StatusNota.PROCESSANDO);
    expect(() =>
      nota.alterarRascunho({
        clienteId: 'cliente-2',
        servicoId: 'servico-2',
        valorServico: 200,
        aliquotaIss: 5,
        descricao: 'Nova descricao',
      }),
    ).toThrow('A operação só pode ser realizada em uma nota rascunho.');

    nota.registrarSucessoFiscal({
      numeroNfse: '1',
      protocoloEmissao: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
  });

  it('deve registrar erro fiscal durante processamento', () => {
    const nota = criarNota();

    nota.iniciarProcessamentoFiscal();
    nota.registrarErroFiscal('Falha de comunicacao com a SEFIN');

    expect(nota.status).toBe(StatusNota.ERRO);
    expect(nota.mensagemErroFiscal).toBe('Falha de comunicacao com a SEFIN');
  });

  it('deve reconciliar sucesso fiscal de uma nota com erro', () => {
    const nota = criarNota();
    const dataAutorizacao = new Date('2026-06-18T12:00:00.000Z');

    nota.registrarErroFiscal('Timeout ao enviar DPS');
    nota.reconciliarSucessoFiscal({
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
      xmlAutorizado: '<NFSe>autorizada</NFSe>',
      dataAutorizacao,
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
    expect(nota.chaveAcesso).toBe(
      '12345678901234567890123456789012345678901234567890',
    );
    expect(nota.xmlAutorizado).toBe('<NFSe>autorizada</NFSe>');
    expect(nota.dataAutorizacao).toBe(dataAutorizacao);
    expect(nota.mensagemErroFiscal).toBeUndefined();
  });

  it('nao deve reconciliar uma nota que ainda esta em rascunho', () => {
    const nota = criarNota();

    expect(() =>
      nota.reconciliarSucessoFiscal({
        chaveAcesso: '12345678901234567890123456789012345678901234567890',
      }),
    ).toThrow(
      'A operacao so pode ser realizada em uma nota com erro ou em processamento.',
    );
  });

  it('deve registrar sucesso fiscal sem codigo de verificacao quando houver chave nacional', () => {
    const nota = criarNota();

    nota.registrarSucessoFiscal({
      numeroNfse: '1',
      protocoloEmissao: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
    expect(nota.numeroNfse).toBe('1');
    expect(nota.codigoVerificacao).toBeUndefined();
    expect(nota.protocoloEmissao).toBe('PROTOCOLO-123');
    expect(nota.chaveAcesso).toBe('CHAVE-456');
  });

  it('deve exigir protocolo ou chave para registrar sucesso fiscal', () => {
    const nota = criarNota();

    expect(() =>
      nota.registrarSucessoFiscal({
        numeroNfse: '100',
        codigoVerificacao: 'ABC123',
      }),
    ).toThrow('Retorno fiscal deve informar protocolo ou chave de acesso.');
  });

  it('deve exigir número e código de verificação para emitir', () => {
    const nota = criarNota();

    expect(() =>
      nota.emitir({
        numeroNfse: ' ',
        codigoVerificacao: 'ABC123',
      }),
    ).toThrow('Número da NFS-e é obrigatório.');
  });

  it('deve impedir alteração de uma nota emitida', () => {
    const nota = criarNota();

    nota.emitir({
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
    });

    expect(() =>
      nota.alterarRascunho({
        clienteId: 'cliente-2',
        servicoId: 'servico-2',
        valorServico: 200,
        aliquotaIss: 5,
        descricao: 'Nova descrição',
      }),
    ).toThrow('A operação só pode ser realizada em uma nota rascunho.');
  });

  it('deve registrar erro e retornar para rascunho', () => {
    const nota = criarNota();

    nota.registrarErro('Falha na emissão');

    expect(nota.status).toBe(StatusNota.ERRO);
    expect(nota.mensagemErro).toBe('Falha na emissão');

    nota.retornarParaRascunho();

    expect(nota.status).toBe(StatusNota.RASCUNHO);
    expect(nota.mensagemErro).toBeUndefined();
  });

  it('deve registrar erro fiscal e limpar ao retornar para rascunho', () => {
    const nota = criarNota();

    nota.registrarErroFiscal('Rejeicao fiscal da SEFIN');

    expect(nota.status).toBe(StatusNota.ERRO);
    expect(nota.mensagemErro).toBe('Rejeicao fiscal da SEFIN');
    expect(nota.mensagemErroFiscal).toBe('Rejeicao fiscal da SEFIN');

    nota.retornarParaRascunho();

    expect(nota.status).toBe(StatusNota.RASCUNHO);
    expect(nota.mensagemErro).toBeUndefined();
    expect(nota.mensagemErroFiscal).toBeUndefined();
  });

  it('deve permitir cancelar somente uma nota emitida', () => {
    const nota = criarNota();

    expect(() => nota.cancelar()).toThrow(
      'Somente uma nota emitida pode ser cancelada.',
    );

    nota.emitir({
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
    });
    nota.cancelar();

    expect(nota.status).toBe(StatusNota.CANCELADA);
  });

  it('deve marcar nota emitida como substituida', () => {
    const nota = criarNota();

    expect(() => nota.marcarComoSubstituida()).toThrow(
      'Somente uma nota emitida pode ser marcada como substituida.',
    );

    nota.registrarSucessoFiscal({
      numeroNfse: '1',
      protocoloEmissao: 'PROTOCOLO-123',
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
    });
    nota.marcarComoSubstituida();

    expect(nota.status).toBe(StatusNota.SUBSTITUIDA);
  });

  it('deve permitir retornar para rascunho somente uma nota com erro', () => {
    const nota = criarNota();

    expect(() => nota.retornarParaRascunho()).toThrow(
      'Somente uma nota com erro pode retornar para rascunho.',
    );
  });

  it('deve reconstruir uma nota emitida com dados fiscais', () => {
    const dataEmissao = new Date('2026-06-09T12:00:00.000Z');
    const dataAutorizacao = new Date('2026-06-09T12:30:00.000Z');
    const nota = new NotaServico({
      ...dadosBase,
      status: StatusNota.EMITIDA,
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
      protocoloEmissao: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
      xmlAutorizado: '<NFS-e>autorizada</NFS-e>',
      dataEmissao,
      dataAutorizacao,
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
    expect(nota.dataEmissao).toBe(dataEmissao);
    expect(nota.protocoloEmissao).toBe('PROTOCOLO-123');
    expect(nota.chaveAcesso).toBe('CHAVE-456');
    expect(nota.xmlAutorizado).toBe('<NFS-e>autorizada</NFS-e>');
    expect(nota.dataAutorizacao).toBe(dataAutorizacao);
  });

  it('deve reconstruir uma nota emitida pela NFS-e Nacional sem codigo de verificacao', () => {
    const dataEmissao = new Date('2026-06-09T12:00:00.000Z');
    const nota = new NotaServico({
      ...dadosBase,
      status: StatusNota.EMITIDA,
      numeroNfse: '1',
      protocoloEmissao: 'PROTOCOLO-123',
      chaveAcesso: 'CHAVE-456',
      dataEmissao,
    });

    expect(nota.status).toBe(StatusNota.EMITIDA);
    expect(nota.numeroNfse).toBe('1');
    expect(nota.codigoVerificacao).toBeUndefined();
    expect(nota.protocoloEmissao).toBe('PROTOCOLO-123');
    expect(nota.chaveAcesso).toBe('CHAVE-456');
  });

  it('deve reconstruir uma nota cancelada com dados fiscais', () => {
    const nota = new NotaServico({
      ...dadosBase,
      status: StatusNota.CANCELADA,
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
      dataEmissao: new Date(),
    });

    expect(nota.status).toBe(StatusNota.CANCELADA);
  });

  it('deve reconstruir uma nota substituida com dados fiscais', () => {
    const nota = new NotaServico({
      ...dadosBase,
      status: StatusNota.SUBSTITUIDA,
      numeroNfse: '100',
      codigoVerificacao: 'ABC123',
      dataEmissao: new Date(),
    });

    expect(nota.status).toBe(StatusNota.SUBSTITUIDA);
  });

  it.each([StatusNota.EMITIDA, StatusNota.SUBSTITUIDA, StatusNota.CANCELADA])(
    'deve rejeitar nota %s sem dados fiscais',
    (status) => {
      expect(
        () =>
          new NotaServico({
            ...dadosBase,
            status,
          }),
      ).toThrow('Número da NFS-e é obrigatório.');
    },
  );

  it('deve rejeitar nota com erro sem mensagem', () => {
    expect(
      () =>
        new NotaServico({
          ...dadosBase,
          status: StatusNota.ERRO,
        }),
    ).toThrow('Mensagem de erro é obrigatório.');
  });

  it('deve manter empresa e usuário após alterações do rascunho', () => {
    const nota = criarNota();
    const empresaIdOriginal = nota.empresaId;
    const usuarioIdOriginal = nota.usuarioId;

    nota.alterarRascunho({
      clienteId: 'cliente-2',
      servicoId: 'servico-2',
      valorServico: 200,
      aliquotaIss: 5,
      descricao: 'Nova descrição',
    });

    expect(nota.empresaId).toBe(empresaIdOriginal);
    expect(nota.usuarioId).toBe(usuarioIdOriginal);
  });
});
