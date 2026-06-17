import { create } from 'xmlbuilder2';

import { Empresa } from '../entities/Empresa';
import { AmbienteFiscal, NotaServico } from '../entities/NotaServico';

const NAMESPACE_NFSE = 'http://www.sped.fazenda.gov.br/nfse';
const VERSAO_LAYOUT = '1.01';
const VERSAO_APLICACAO = 'api-nota-fiscal-1.0';
const TIPO_EVENTO_CANCELAMENTO = '101101';
const NUMERO_PEDIDO_REGISTRO_EVENTO = '001';

type ElementoXml = ReturnType<typeof create>;

export type CodigoMotivoCancelamentoNfse = '1' | '2' | '9';

export interface GerarXmlPedidoCancelamentoNfseInput {
  empresa: Empresa;
  nota: NotaServico;
  codigoMotivo: CodigoMotivoCancelamentoNfse;
  motivo: string;
  dataHoraEvento?: Date;
}

export class GeradorXmlPedidoCancelamentoNfseNacional {
  gerar(input: GerarXmlPedidoCancelamentoNfseInput): string {
    const chaveAcesso = input.nota.chaveAcesso?.trim();
    const motivo = input.motivo.trim();

    if (!chaveAcesso) {
      throw new Error('Chave de acesso da NFS-e e obrigatoria.');
    }

    if (!/^\d{50}$/.test(chaveAcesso)) {
      throw new Error('Chave de acesso da NFS-e deve conter 50 digitos.');
    }

    if (!['1', '2', '9'].includes(input.codigoMotivo)) {
      throw new Error('Codigo do motivo de cancelamento invalido.');
    }

    if (motivo.length < 15 || motivo.length > 255) {
      throw new Error('Motivo do cancelamento deve conter entre 15 e 255 caracteres.');
    }

    const documento = create({ version: '1.0', encoding: 'UTF-8' });
    const pedido = documento.ele('pedRegEvento', {
      xmlns: NAMESPACE_NFSE,
      versao: VERSAO_LAYOUT,
    });
    const infPedido = pedido.ele('infPedReg', {
      Id: this.criarIdPedidoRegistroEvento(chaveAcesso),
    });

    this.adicionarTexto(
      infPedido,
      'tpAmb',
      this.mapearAmbiente(input.nota.ambienteFiscal),
    );
    this.adicionarTexto(infPedido, 'verAplic', VERSAO_APLICACAO);
    this.adicionarTexto(
      infPedido,
      'dhEvento',
      this.formatarDataHoraUtc(input.dataHoraEvento ?? new Date()),
    );
    this.adicionarTexto(infPedido, 'CNPJAutor', input.empresa.cnpj);
    this.adicionarTexto(infPedido, 'chNFSe', chaveAcesso);

    const eventoCancelamento = infPedido.ele('e101101');
    this.adicionarTexto(
      eventoCancelamento,
      'xDesc',
      'Cancelamento de NFS-e',
    );
    this.adicionarTexto(eventoCancelamento, 'cMotivo', input.codigoMotivo);
    this.adicionarTexto(eventoCancelamento, 'xMotivo', motivo);

    return documento.end({ prettyPrint: true });
  }

  private criarIdPedidoRegistroEvento(chaveAcesso: string): string {
    return `PRE${chaveAcesso}${TIPO_EVENTO_CANCELAMENTO}${NUMERO_PEDIDO_REGISTRO_EVENTO}`;
  }

  private mapearAmbiente(ambiente: AmbienteFiscal): string {
    return ambiente === AmbienteFiscal.PRODUCAO ? '1' : '2';
  }

  private formatarDataHoraUtc(data: Date): string {
    const ano = data.getFullYear();
    const mes = this.formatarNumeroData(data.getMonth() + 1);
    const dia = this.formatarNumeroData(data.getDate());
    const hora = this.formatarNumeroData(data.getHours());
    const minuto = this.formatarNumeroData(data.getMinutes());
    const segundo = this.formatarNumeroData(data.getSeconds());
    const offset = this.formatarOffset(data);

    return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}${offset}`;
  }

  private formatarNumeroData(valor: number): string {
    return String(valor).padStart(2, '0');
  }

  private formatarOffset(data: Date): string {
    const offsetEmMinutos = -data.getTimezoneOffset();
    const sinal = offsetEmMinutos >= 0 ? '+' : '-';
    const absoluto = Math.abs(offsetEmMinutos);
    const horas = this.formatarNumeroData(Math.floor(absoluto / 60));
    const minutos = this.formatarNumeroData(absoluto % 60);

    return `${sinal}${horas}:${minutos}`;
  }

  private adicionarTexto(
    elemento: ElementoXml,
    nome: string,
    valor: string,
  ): void {
    elemento.ele(nome).txt(valor);
  }
}
