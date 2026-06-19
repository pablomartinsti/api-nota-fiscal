import { describe, expect, it } from 'vitest';

import {
  NotaServicoEventoFiscal,
  StatusEventoFiscalNotaServico,
  TipoEventoFiscalNotaServico,
} from './NotaServicoEventoFiscal';

describe('NotaServicoEventoFiscal', () => {
  it('deve criar um evento fiscal valido', () => {
    const evento = new NotaServicoEventoFiscal({
      empresaId: 'empresa-1',
      notaServicoId: 'nota-1',
      usuarioId: 'usuario-1',
      tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
      status: StatusEventoFiscalNotaServico.SUCESSO,
      statusHttp: 200,
      chaveAcesso: '12345678901234567890123456789012345678901234567890',
      mensagem: 'DPS autorizada pela SEFIN Nacional.',
    });

    expect(evento.empresaId).toBe('empresa-1');
    expect(evento.notaServicoId).toBe('nota-1');
    expect(evento.usuarioId).toBe('usuario-1');
    expect(evento.tipo).toBe(TipoEventoFiscalNotaServico.ENVIO_DPS);
    expect(evento.status).toBe(StatusEventoFiscalNotaServico.SUCESSO);
    expect(evento.statusHttp).toBe(200);
    expect(evento.createdAt).toBeInstanceOf(Date);
  });

  it('deve rejeitar dados invalidos', () => {
    expect(
      () =>
        new NotaServicoEventoFiscal({
          empresaId: ' ',
          notaServicoId: 'nota-1',
          tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
          status: StatusEventoFiscalNotaServico.SUCESSO,
        }),
    ).toThrow('Empresa e obrigatorio.');

    expect(
      () =>
        new NotaServicoEventoFiscal({
          empresaId: 'empresa-1',
          notaServicoId: 'nota-1',
          tipo: TipoEventoFiscalNotaServico.ENVIO_DPS,
          status: StatusEventoFiscalNotaServico.SUCESSO,
          statusHttp: 99,
        }),
    ).toThrow('Status HTTP do evento fiscal invalido.');
  });
});
