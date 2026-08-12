import { DOMParser, Element as XmlElement } from '@xmldom/xmldom';
import { create as criarQrCode } from 'qrcode';

import { AmbienteFiscal, NotaServico, StatusNota } from '../entities/NotaServico';

export interface ResultadoPdfDanfseNacional {
  chaveAcesso: string;
  pdf: Buffer;
}

interface CampoDanfse {
  titulo: string;
  valor: string;
}

interface DadosDanfse {
  chaveAcesso: string;
  qrCode: string;
  numeroNfse: string;
  numeroDps: string;
  serieDps: string;
  competencia: string;
  dataEmissaoNfse: string;
  dataEmissaoDps: string;
  prestador: PessoaDanfse;
  tomador: PessoaDanfse;
  servico: {
    codigoTributacaoNacional: string;
    codigoTributacaoMunicipal: string;
    descricao: string;
    localPrestacao: string;
    paisPrestacao: string;
  };
  valores: {
    valorServico: string;
    valorIss: string;
    aliquotaIss: string;
    tributacaoIssqn: string;
    tipoRetencaoIssqn: string;
    valorTotal: string;
  };
  informacoesComplementares: string;
  ambienteFiscal: AmbienteFiscal;
  status: StatusNota;
}

interface PessoaDanfse {
  cpfCnpj: string;
  inscricaoMunicipal: string;
  nome: string;
  email: string;
  telefone: string;
  codigoMunicipio: string;
  endereco: string;
  municipio: string;
  cep: string;
}

const LARGURA_A4 = 595.28;
const ALTURA_A4 = 841.89;
const MARGEM = 12;
const LINHA = '\n';

export class GeradorPdfDanfseNacional {
  gerar(nota: NotaServico): ResultadoPdfDanfseNacional | undefined {
    if (!nota.xmlAutorizado?.trim()) {
      return undefined;
    }

    const dados = this.extrairDados(nota);
    const documento = new PdfSimples(LARGURA_A4, ALTURA_A4);

    this.desenharPagina(documento, dados);

    return {
      chaveAcesso: dados.chaveAcesso,
      pdf: documento.finalizar(),
    };
  }

  private extrairDados(nota: NotaServico): DadosDanfse {
    const documento = new DOMParser().parseFromString(
      nota.xmlAutorizado ?? '',
      'application/xml',
    );
    const elementos = Array.from(documento.getElementsByTagName('*'));
    const infNfse = this.buscarElemento(elementos, 'infNFSe');
    const chaveAcesso =
      nota.chaveAcesso ??
      this.extrairChaveAcesso(infNfse, elementos) ??
      'sem-chave-acesso';

    return {
      chaveAcesso,
      qrCode: this.buscarTexto(elementos, ['QRCode', 'qrCode', 'xQRCode']) ?? chaveAcesso,
      numeroNfse:
        nota.numeroNfse ??
        this.buscarTexto(elementos, ['nNFSe', 'numeroNfse']) ??
        '-',
      numeroDps:
        nota.numeroDps ?? this.buscarTexto(elementos, ['nDPS', 'numeroDps']) ?? '-',
      serieDps:
        nota.serieDps ??
        this.buscarTexto(elementos, ['serie', 'serieDPS', 'serieDps']) ??
        '-',
      competencia: this.formatarCompetencia(
        this.buscarTexto(elementos, ['dCompet', 'competencia']) ??
          nota.dataCompetencia?.toISOString(),
      ),
      dataEmissaoNfse: this.formatarDataHora(
        nota.dataEmissao?.toISOString() ??
          nota.dataAutorizacao?.toISOString() ??
          this.buscarTexto(elementos, ['dhProc', 'dhEmi']),
      ),
      dataEmissaoDps: this.formatarDataHora(
        this.buscarTexto(elementos, ['dhEmiDPS', 'dhEmi']) ??
          nota.dataCompetencia?.toISOString(),
      ),
      prestador: this.extrairPessoa(elementos, ['emit', 'prest']),
      tomador: this.extrairPessoa(elementos, ['toma', 'tomador']),
      servico: {
        codigoTributacaoNacional:
          this.buscarTexto(elementos, ['cTribNac', 'codigoTributacaoNacional']) ??
          '-',
        codigoTributacaoMunicipal:
          this.buscarTexto(elementos, ['cTribMun', 'codigoTributacaoMunicipal']) ??
          '-',
        descricao:
          this.buscarTexto(elementos, ['xDescServ', 'discriminacao', 'descricao']) ??
          nota.descricao,
        localPrestacao:
          this.buscarLocalPrestacao(elementos) ??
          this.formatarMunicipioUf(
            nota.codigoMunicipioPrestacao,
            undefined,
            undefined,
          ),
        paisPrestacao:
          this.buscarTexto(elementos, ['cPaisPrestacao', 'paisPrestacao']) ?? '-',
      },
      valores: {
        valorServico: this.formatarMoeda(
          this.buscarNumero(elementos, ['vServ', 'vBC']) ?? nota.valorServico,
        ),
        valorIss: this.formatarMoeda(
          this.buscarNumero(elementos, ['vISSQN', 'vISS', 'valorIss']) ??
            nota.valorIss,
        ),
        aliquotaIss: this.formatarAliquota(
          this.buscarNumero(elementos, ['pAliq', 'aliquota']) ??
            nota.aliquotaIss,
        ),
        tributacaoIssqn:
          this.buscarTexto(elementos, ['tribISSQN', 'tributacaoIssqn']) ??
          nota.tributacaoIssqn,
        tipoRetencaoIssqn:
          this.buscarTexto(elementos, ['tpRetISSQN', 'tipoRetencaoIssqn']) ??
          nota.tipoRetencaoIssqn,
        valorTotal: this.formatarMoeda(
          this.buscarNumero(elementos, ['vLiq', 'vTotal', 'vServ']) ??
            nota.valorServico,
        ),
      },
      informacoesComplementares:
        nota.informacoesComplementares ??
        this.buscarTexto(elementos, ['infComp', 'informacoesComplementares']) ??
        '-',
      ambienteFiscal: nota.ambienteFiscal,
      status: nota.status,
    };
  }

  private desenharPagina(pdf: PdfSimples, dados: DadosDanfse): void {
    const esquerda = MARGEM;
    const largura = LARGURA_A4 - MARGEM * 2;
    const direita = esquerda + largura;

    pdf.rect(esquerda, 6, largura, ALTURA_A4 - 12);
    this.desenharCabecalho(pdf, dados, esquerda, direita);
    this.desenharIdentificacao(pdf, dados, esquerda, 58, largura);

    let y = 128;
    y = this.secaoPessoaCompacta(
      pdf,
      esquerda,
      y,
      largura,
      'EMITENTE DA NFS-e / PRESTADOR / FORNECEDOR',
      dados.prestador,
    );
    y = this.secaoPessoaCompacta(
      pdf,
      esquerda,
      y,
      largura,
      'TOMADOR / ADQUIRENTE',
      dados.tomador,
    );

    this.tituloTabela(
      pdf,
      esquerda,
      y,
      largura,
      'DESTINATARIO DA OPERACAO NAO IDENTIFICADO NA NFS-e',
    );
    y += 11;
    this.tituloTabela(
      pdf,
      esquerda,
      y,
      largura,
      'INTERMEDIARIO DA OPERACAO NAO IDENTIFICADO NA NFS-e',
    );
    y += 11;

    y = this.secaoServicoCompacta(pdf, esquerda, y, largura, dados);
    y = this.secaoTributacaoMunicipal(pdf, esquerda, y, largura, dados);
    y = this.secaoTributacaoFederal(pdf, esquerda, y, largura);
    y = this.secaoTributacaoIbsCbs(pdf, esquerda, y, largura);
    y = this.secaoValorTotal(pdf, esquerda, y, largura, dados);
    y = this.secaoInformacoesComplementares(pdf, esquerda, y, largura, dados);

    this.desenharRodape(pdf, dados, esquerda, direita);
    this.desenharMarcaStatus(pdf, dados);
  }

  private desenharCabecalho(
    pdf: PdfSimples,
    dados: DadosDanfse,
    esquerda: number,
    direita: number,
  ): void {
    pdf.fillRect(esquerda, 8, direita - esquerda, 44, 'F2F2F2');
    pdf.rect(esquerda, 8, direita - esquerda, 44);
    pdf.text('NFS', esquerda + 8, 17, {
      size: 22,
      bold: true,
      colorHex: '1A9C5B',
    });
    pdf.text('e', esquerda + 50, 25, { size: 11, bold: true, colorHex: '2D74B9' });
    pdf.text('Nota Fiscal de', esquerda + 68, 20, { size: 5.5 });
    pdf.text('Servico eletronica', esquerda + 68, 28, { size: 5.5 });

    pdf.text('DANFSe v2.0', 260, 18, { size: 8, bold: true });
    pdf.text('Documento Auxiliar da NFS-e', 242, 29, {
      size: 8,
      bold: true,
    });

    pdf.text(`Municipio: ${dados.prestador.municipio}`, direita - 132, 15, {
      size: 5.5,
      bold: true,
      maxWidth: 125,
    });
    pdf.text(`Ambiente Gerador: ${this.formatarAmbiente(dados.ambienteFiscal)}`, direita - 132, 24, {
      size: 5.5,
      maxWidth: 125,
    });
    pdf.text(`Tipo de Ambiente: ${dados.ambienteFiscal === AmbienteFiscal.PRODUCAO ? '1' : '2'}`, direita - 132, 32, {
      size: 5.5,
      maxWidth: 125,
    });

    if (dados.ambienteFiscal === AmbienteFiscal.HOMOLOGACAO) {
      pdf.text('NFS-e SEM VALIDADE JURIDICA', 221, 42, {
        size: 6.5,
        bold: true,
      });
    }
  }

  private desenharIdentificacao(
    pdf: PdfSimples,
    dados: DadosDanfse,
    esquerda: number,
    y: number,
    largura: number,
  ): void {
    const qrX = esquerda + largura - 96;
    const qrY = y + 2;
    const areaCampos = largura - 110;
    const col = areaCampos / 3;

    this.campoCompacto(pdf, esquerda + 4, y + 4, col * 1.42, 'CHAVE DE ACESSO DA NFS-e', dados.chaveAcesso, true);
    this.campoCompacto(pdf, esquerda + 4, y + 28, col, 'NUMERO DA NFS-e', dados.numeroNfse, true);
    this.campoCompacto(pdf, esquerda + 4, y + 52, col, 'NUMERO DA DPS', dados.numeroDps, true);

    this.campoCompacto(pdf, esquerda + col + 12, y + 28, col - 4, 'COMPETENCIA DA NFS-e', dados.competencia, true);
    this.campoCompacto(pdf, esquerda + col + 12, y + 52, col - 4, 'SERIE DA DPS', dados.serieDps, true);

    this.campoCompacto(pdf, esquerda + col * 2 + 10, y + 28, col - 8, 'DATA E HORA DA EMISSAO DA NFS-e', dados.dataEmissaoNfse, true);
    this.campoCompacto(pdf, esquerda + col * 2 + 10, y + 52, col - 8, 'DATA E HORA DA EMISSAO DA DPS', dados.dataEmissaoDps, true);

    this.desenharQrCode(pdf, qrX, qrY, 66, dados.qrCode);
    pdf.text(
      'A autenticidade desta NFS-e pode ser verificada pela leitura deste codigo QR ou pela consulta da chave de acesso no portal nacional da NFS-e',
      qrX - 3,
      qrY + 70,
      { size: 4.8, maxWidth: 92 },
    );
    pdf.line(esquerda, y + 96, esquerda + largura, y + 96);
  }

  private secaoPessoaCompacta(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    titulo: string,
    pessoa: PessoaDanfse,
  ): number {
    this.tituloTabela(pdf, x, y, largura, titulo);
    const conteudoY = y + 11;
    const col = largura / 4;

    this.campoCompacto(pdf, x + 4, conteudoY, col, 'CNPJ / CPF / NIF', pessoa.cpfCnpj, true);
    this.campoCompacto(pdf, x + col + 4, conteudoY, col - 8, 'Inscricao Municipal', pessoa.inscricaoMunicipal, true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY, col - 8, 'Telefone', pessoa.telefone, true);
    this.campoCompacto(pdf, x + col * 3 + 4, conteudoY, col - 8, 'Codigo IBGE / CEP', this.extrairCodigoIbgeCep(pessoa), true);

    this.campoCompacto(pdf, x + 4, conteudoY + 19, col * 1.85, 'Nome / Nome Empresarial', pessoa.nome, true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY + 19, col - 8, 'Municipio / Sigla UF', pessoa.municipio, true);
    this.campoCompacto(pdf, x + col * 3 + 4, conteudoY + 19, col - 8, 'E-mail', pessoa.email, true);

    this.campoCompacto(pdf, x + 4, conteudoY + 39, col * 2 - 8, 'Endereco', pessoa.endereco, true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY + 39, col - 8, 'CEP', pessoa.cep, true);

    pdf.line(x, y + 65, x + largura, y + 65);
    return y + 65;
  }

  private secaoServicoCompacta(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    dados: DadosDanfse,
  ): number {
    this.tituloTabela(pdf, x, y, largura, 'SERVICO PRESTADO');
    const col = largura / 4;
    const conteudoY = y + 11;

    this.campoCompacto(pdf, x + 4, conteudoY, col - 6, 'Codigo de Tributacao Nacional', dados.servico.codigoTributacaoNacional, true);
    this.campoCompacto(pdf, x + col + 4, conteudoY, col - 6, 'Codigo de Tributacao Municipal', dados.servico.codigoTributacaoMunicipal, true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY, col - 6, 'Codigo da NBS', '-', true);
    this.campoCompacto(pdf, x + col * 3 + 4, conteudoY, col - 6, 'Local da Prestacao / Sigla UF / Pais', dados.servico.localPrestacao, true);

    this.campoCompacto(pdf, x + 4, conteudoY + 22, largura - 8, 'Descricao do Servico', dados.servico.descricao, false, 5);
    pdf.line(x, y + 62, x + largura, y + 62);
    return y + 62;
  }

  private secaoTributacaoMunicipal(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    dados: DadosDanfse,
  ): number {
    this.tituloTabela(pdf, x, y, largura, 'TRIBUTACAO MUNICIPAL (ISSQN)');
    const col = largura / 4;
    const conteudoY = y + 11;

    this.campoCompacto(pdf, x + 4, conteudoY, col - 6, 'Tipo de Tributacao do ISSQN', dados.valores.tributacaoIssqn, true);
    this.campoCompacto(pdf, x + col + 4, conteudoY, col - 6, 'Municipio / Sigla UF / Pais de Incidencia do ISSQN', dados.servico.localPrestacao, true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY, col - 6, 'BC ISSQN', dados.valores.valorServico, true);
    this.campoCompacto(pdf, x + col * 3 + 4, conteudoY, col - 6, 'ISSQN Apurado', dados.valores.valorIss, true);

    this.campoCompacto(pdf, x + 4, conteudoY + 20, col - 6, 'Aliquota Aplicada', dados.valores.aliquotaIss, true);
    this.campoCompacto(pdf, x + col + 4, conteudoY + 20, col - 6, 'Tipo de Retencao do ISSQN', dados.valores.tipoRetencaoIssqn, true);
    pdf.line(x, y + 43, x + largura, y + 43);
    return y + 43;
  }

  private secaoTributacaoFederal(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
  ): number {
    this.tituloTabela(pdf, x, y, largura, 'TRIBUTACAO FEDERAL (EXCETO CBS)');
    const col = largura / 4;
    const conteudoY = y + 11;

    this.campoCompacto(pdf, x + 4, conteudoY, col - 6, 'IRRF', '-', true);
    this.campoCompacto(pdf, x + col + 4, conteudoY, col - 6, 'Contribuicao Previdenciaria - Retida', '-', true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY, col - 6, 'Contribuicoes Sociais - Retidas', '-', true);
    this.campoCompacto(pdf, x + 4, conteudoY + 19, col - 6, 'PIS - Debito Apuracao Propria', '-', true);
    this.campoCompacto(pdf, x + col + 4, conteudoY + 19, col - 6, 'COFINS - Debito Apuracao Propria', '-', true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY + 19, col - 6, 'Descricao Contrib. Sociais - Retidas', '-', true);
    pdf.line(x, y + 42, x + largura, y + 42);
    return y + 42;
  }

  private secaoTributacaoIbsCbs(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
  ): number {
    this.tituloTabela(pdf, x, y, largura, 'TRIBUTACAO IBS/CBS');
    const col = largura / 4;
    const conteudoY = y + 11;

    const campos = [
      'CST / cClassTrib',
      'Indicador de Operacao / Codigo IBGE Incidencia / Municipio Incidencia / Sigla UF',
      'Exclusoes e Reducoes da Base de Calculo',
      'Base de Calculo Apos Exclusoes e Reducoes',
      'Red. Aliquota IBS / Red. Aliquota CBS',
      'Aliquota - IBS UF / IBS Mun',
      'Aliq. Efetiva Municipal - IBS',
      'Valor Apurado Municipal - IBS',
      'Aliq. Efetiva Estadual - IBS',
      'Valor Apurado Estadual - IBS',
      'Valor Total Apurado - IBS',
      'Aliquota - CBS',
      'Aliquota Efetiva - CBS',
      'Valor Total Apurado - CBS',
    ];

    campos.forEach((campo, indice) => {
      const linha = Math.floor(indice / 4);
      const coluna = indice % 4;
      this.campoCompacto(pdf, x + coluna * col + 4, conteudoY + linha * 18, col - 6, campo, '-', true);
    });

    pdf.line(x, y + 79, x + largura, y + 79);
    return y + 79;
  }

  private secaoValorTotal(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    dados: DadosDanfse,
  ): number {
    this.tituloTabela(pdf, x, y, largura, 'VALOR TOTAL DA NFS-e');
    const col = largura / 4;
    const conteudoY = y + 11;

    this.campoCompacto(pdf, x + 4, conteudoY, col - 6, 'VALOR DA OPERACAO / SERVICO', dados.valores.valorServico, true);
    this.campoCompacto(pdf, x + col + 4, conteudoY, col - 6, 'Desconto Incondicionado', '-', true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY, col - 6, 'Desconto Condicionado', '-', true);
    this.campoCompacto(pdf, x + col * 3 + 4, conteudoY, col - 6, 'VALOR LIQUIDO DA NFS-e + IBS/CBS', dados.valores.valorTotal, true);

    this.campoCompacto(pdf, x + 4, conteudoY + 20, col - 6, 'Total das Retencoes (ISSQN / Federais)', '-', true);
    this.campoCompacto(pdf, x + col + 4, conteudoY + 20, col - 6, 'VALOR LIQUIDO DA NFS-e', dados.valores.valorTotal, true);
    this.campoCompacto(pdf, x + col * 2 + 4, conteudoY + 20, col - 6, 'Total do IBS/CBS', '0,00', true);
    this.campoCompacto(pdf, x + col * 3 + 4, conteudoY + 20, col - 6, 'VALOR LIQUIDO DA NFS-e + IBS/CBS', dados.valores.valorTotal, true);
    pdf.line(x, y + 47, x + largura, y + 47);
    return y + 47;
  }

  private secaoInformacoesComplementares(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    dados: DadosDanfse,
  ): number {
    this.tituloTabela(pdf, x, y, largura, 'INFORMACOES COMPLEMENTARES');
    const texto = dados.informacoesComplementares === '-' ?
      'Totais aproximados dos Tributos cf. Lei n 12.741/2012: Federais: -; Estaduais: -; Municipais: -;' :
      dados.informacoesComplementares;

    pdf.text(texto, x + 4, y + 17, { size: 5.5, maxWidth: largura - 8 });
    pdf.line(x, 795, x + largura, 795);
    return 795;
  }

  private desenharRodape(
    pdf: PdfSimples,
    dados: DadosDanfse,
    esquerda: number,
    direita: number,
  ): void {
    const y = 804;
    const altura = 24;
    const largura = direita - esquerda;
    const larguraData = 126;
    const larguraAssinatura = 126;
    const xAssinatura = esquerda + larguraData;
    const xChave = xAssinatura + larguraAssinatura;

    pdf.rect(esquerda, y, largura, altura);
    pdf.line(xAssinatura, y, xAssinatura, y + altura);
    pdf.line(xChave, y, xChave, y + altura);

    pdf.text('DATA CERTIFICACAO', esquerda + 4, y + 3, { size: 5, bold: true });
    pdf.text(dados.dataEmissaoNfse, esquerda + 4, y + 13, {
      size: 5.5,
      maxWidth: larguraData - 8,
    });

    pdf.text('IDENTIFICACAO E ASSINATURA', xAssinatura + 4, y + 3, {
      size: 5,
      bold: true,
    });
    pdf.text('-', xAssinatura + 4, y + 13, {
      size: 5.5,
      maxWidth: larguraAssinatura - 8,
    });

    pdf.text('NFS-e / CHAVE NFS-e', xChave + 4, y + 3, { size: 5, bold: true });
    pdf.text(`${dados.numeroNfse} / ${dados.chaveAcesso}`, xChave + 4, y + 13, {
      size: 5.2,
      maxWidth: direita - xChave - 8,
    });
  }
  private desenharMarcaStatus(pdf: PdfSimples, dados: DadosDanfse): void {
    if (dados.status === StatusNota.CANCELADA) {
      pdf.text('CANCELADA', 145, 410, { size: 50, bold: true, colorHex: '666666' });
    }

    if (dados.status === StatusNota.SUBSTITUIDA) {
      pdf.text('SUBSTITUIDA', 112, 410, { size: 46, bold: true, colorHex: '666666' });
    }
  }

  private tituloTabela(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    texto: string,
  ): void {
    pdf.fillRect(x, y, largura, 10, 'EEEEEE');
    pdf.rect(x, y, largura, 10);
    pdf.text(texto, x + 4, y + 2.3, { size: 6.2, bold: true, maxWidth: largura - 8 });
  }

  private campoCompacto(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    titulo: string,
    valor: string,
    boldValor = false,
    maxLinhas = 2,
  ): void {
    pdf.text(titulo, x, y, { size: 5.2, bold: true, maxWidth: largura });
    pdf.text(valor || '-', x, y + 7.2, {
      size: 5.8,
      bold: boldValor,
      maxWidth: largura,
      maxLines: maxLinhas,
    });
  }

  private desenharQrCode(
    pdf: PdfSimples,
    x: number,
    y: number,
    tamanho: number,
    conteudo: string,
  ): void {
    pdf.rect(x, y, tamanho, tamanho);

    try {
      const qr = criarQrCode(conteudo || '-', {
        errorCorrectionLevel: 'M',
      }) as unknown as { modules: { size: number; data: boolean[] } };
      const modulos = qr.modules.size;
      const celula = (tamanho - 8) / modulos;
      const inicioX = x + 4;
      const inicioY = y + 4;

      for (let linha = 0; linha < modulos; linha += 1) {
        for (let coluna = 0; coluna < modulos; coluna += 1) {
          if (!qr.modules.data[linha * modulos + coluna]) {
            continue;
          }

          pdf.fillRect(
            inicioX + coluna * celula,
            inicioY + linha * celula,
            Math.max(celula, 0.9),
            Math.max(celula, 0.9),
            '000000',
          );
        }
      }
    } catch {
      pdf.text('QR Code', x + 17, y + 26, { size: 7, bold: true });
      pdf.text(conteudo.slice(-8), x + 16, y + 38, { size: 5.5 });
    }
  }

  private extrairCodigoIbgeCep(pessoa: PessoaDanfse): string {
    return `${pessoa.codigoMunicipio || '-'} / ${pessoa.cep}`;
  }

  private formatarAmbiente(ambiente: AmbienteFiscal): string {
    return ambiente === AmbienteFiscal.PRODUCAO ? '1' : '2';
  }
  private extrairPessoa(elementos: XmlElement[], nomesSecao: string[]): PessoaDanfse {
    const secao = this.buscarPrimeiroElemento(elementos, nomesSecao);
    const filhos = secao ? Array.from(secao.getElementsByTagName('*')) : [];
    const endereco = this.buscarPrimeiroElemento(filhos, ['end', 'endereco']);
    const filhosEndereco = endereco
      ? Array.from(endereco.getElementsByTagName('*'))
      : filhos;

    return {
      cpfCnpj: this.formatarDocumento(
        this.buscarTexto(filhos, ['CNPJ', 'CPF', 'NIF']) ?? '-',
      ),
      inscricaoMunicipal:
        this.buscarTexto(filhos, ['IM', 'inscricaoMunicipal']) ?? '-',
      nome: this.buscarTexto(filhos, ['xNome', 'nome', 'razaoSocial']) ?? '-',
      email: this.buscarTexto(filhos, ['email', 'xEmail']) ?? '-',
      telefone: this.buscarTexto(filhos, ['fone', 'telefone']) ?? '-',
      codigoMunicipio:
        this.buscarTexto(filhosEndereco, ['cMun', 'cMunNac', 'codigoMunicipio']) ?? '-',
      endereco: this.formatarEndereco(filhosEndereco),
      municipio: this.formatarMunicipioUf(
        this.buscarTexto(filhosEndereco, ['cMun', 'cMunNac', 'codigoMunicipio']),
        this.buscarTexto(filhosEndereco, ['xMun', 'municipio']),
        this.buscarTexto(filhosEndereco, ['UF', 'uf']),
      ),
      cep: this.formatarCep(this.buscarTexto(filhosEndereco, ['CEP', 'cep'])),
    };
  }

  private formatarEndereco(elementos: XmlElement[]): string {
    const partes = [
      this.buscarTexto(elementos, ['xLgr', 'logradouro']),
      this.buscarTexto(elementos, ['nro', 'numero']),
      this.buscarTexto(elementos, ['xCpl', 'complemento']),
      this.buscarTexto(elementos, ['xBairro', 'bairro']),
    ]
      .map((valor) => valor?.trim())
      .filter(Boolean);

    return partes.length ? partes.join(', ') : '-';
  }

  private buscarLocalPrestacao(elementos: XmlElement[]): string | undefined {
    const localPrestacao = this.buscarPrimeiroElemento(elementos, [
      'locPrest',
      'localPrestacao',
    ]);
    const filhos = localPrestacao
      ? Array.from(localPrestacao.getElementsByTagName('*'))
      : elementos;

    return this.formatarMunicipioUf(
      this.buscarTexto(filhos, ['cLocPrestacao', 'cMun', 'codigoMunicipio']),
      this.buscarTexto(filhos, ['xLocPrestacao', 'xMun', 'municipio']),
      this.buscarTexto(filhos, ['UF', 'uf']),
    );
  }

  private extrairChaveAcesso(
    infNfse: XmlElement | undefined,
    elementos: XmlElement[],
  ): string | undefined {
    const id = infNfse?.getAttribute('Id')?.trim();

    if (id?.startsWith('NFS')) {
      return id.slice(3);
    }

    return this.buscarTexto(elementos, ['chNFSe', 'chaveAcesso']);
  }

  private buscarNumero(
    elementos: XmlElement[],
    nomes: string[],
  ): number | undefined {
    const texto = this.buscarTexto(elementos, nomes);
    const numero = texto ? Number(texto.replace(',', '.')) : Number.NaN;

    return Number.isFinite(numero) ? numero : undefined;
  }

  private buscarTexto(
    elementos: XmlElement[],
    nomes: string[],
  ): string | undefined {
    for (const nome of nomes) {
      const elemento = this.buscarElemento(elementos, nome);
      const texto = elemento?.textContent?.trim();

      if (texto) {
        return texto;
      }
    }

    return undefined;
  }

  private buscarPrimeiroElemento(
    elementos: XmlElement[],
    nomes: string[],
  ): XmlElement | undefined {
    for (const nome of nomes) {
      const elemento = this.buscarElemento(elementos, nome);

      if (elemento) {
        return elemento;
      }
    }

    return undefined;
  }

  private buscarElemento(
    elementos: XmlElement[],
    nome: string,
  ): XmlElement | undefined {
    return elementos.find(
      (elemento) => this.localName(elemento).toLowerCase() === nome.toLowerCase(),
    );
  }

  private localName(elemento: XmlElement): string {
    return elemento.localName || elemento.nodeName.split(':').pop() || '';
  }

  private formatarCompetencia(valor?: string): string {
    if (!valor) {
      return '-';
    }

    const data = this.extrairData(valor);

    if (!data) {
      return valor;
    }

    return `${String(data.getUTCMonth() + 1).padStart(2, '0')}/${data.getUTCFullYear()}`;
  }

  private formatarDataHora(valor?: string): string {
    if (!valor) {
      return '-';
    }

    const data = this.extrairData(valor);

    if (!data) {
      return valor;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
  }

  private extrairData(valor: string): Date | undefined {
    const data = new Date(valor);

    return Number.isNaN(data.getTime()) ? undefined : data;
  }

  private formatarDocumento(valor: string): string {
    const digitos = valor.replace(/\D/g, '');

    if (digitos.length === 14) {
      return digitos.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5',
      );
    }

    if (digitos.length === 11) {
      return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    return valor || '-';
  }

  private formatarCep(valor?: string): string {
    const digitos = valor?.replace(/\D/g, '') ?? '';

    if (digitos.length === 8) {
      return digitos.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }

    return valor ?? '-';
  }

  private formatarMunicipioUf(
    codigoMunicipio?: string,
    municipio?: string,
    uf?: string,
  ): string {
    const texto = [municipio, uf].filter(Boolean).join(' / ');

    return texto || codigoMunicipio || '-';
  }

  private formatarMoeda(valor?: number): string {
    if (valor === undefined || !Number.isFinite(valor)) {
      return '-';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  private formatarAliquota(valor?: number): string {
    if (valor === undefined || !Number.isFinite(valor)) {
      return '-';
    }

    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(valor)}%`;
  }
}

interface TextoOptions {
  size?: number;
  bold?: boolean;
  align?: 'left' | 'right';
  maxWidth?: number;
  maxLines?: number;
  colorHex?: string;
}

class PdfSimples {
  private readonly objetos: string[] = [];
  private readonly conteudo: string[] = [];
  private fonteNormalId = 0;
  private fonteBoldId = 0;

  constructor(
    private readonly largura: number,
    private readonly altura: number,
  ) {}

  text(texto: string, x: number, y: number, options: TextoOptions = {}): void {
    const tamanho = options.size ?? 9;
    const linhas = this.quebrarTexto(texto, options.maxWidth, tamanho, options.maxLines);
    let atualY = y;

    for (const linha of linhas) {
      const textoX =
        options.align === 'right' && options.maxWidth
          ? x + options.maxWidth - this.estimarLarguraTexto(linha, tamanho)
          : x;

      const cor = options.colorHex ? `${this.corTexto(options.colorHex)} ` : '';
      const resetCor = options.colorHex ? ' 0 0 0 rg' : '';

      this.conteudo.push(
        `${cor}BT /${options.bold ? 'F2' : 'F1'} ${tamanho} Tf ${textoX.toFixed(2)} ${this.converterY(
          atualY,
        ).toFixed(2)} Td (${this.escapar(linha)}) Tj ET${resetCor}`,
      );
      atualY += tamanho + 3;
    }
  }

  line(x1: number, y1: number, x2: number, y2: number): void {
    this.conteudo.push(
      `${x1.toFixed(2)} ${this.converterY(y1).toFixed(2)} m ${x2.toFixed(
        2,
      )} ${this.converterY(y2).toFixed(2)} l S`,
    );
  }

  rect(x: number, y: number, largura: number, altura: number): void {
    this.conteudo.push(
      `${x.toFixed(2)} ${this.converterY(y + altura).toFixed(2)} ${largura.toFixed(
        2,
      )} ${altura.toFixed(2)} re S`,
    );
  }

  fillRect(
    x: number,
    y: number,
    largura: number,
    altura: number,
    corHex: string,
  ): void {
    const [r, g, b] = this.hexParaRgb(corHex);
    this.conteudo.push(
      `${r} ${g} ${b} rg ${x.toFixed(2)} ${this.converterY(y + altura).toFixed(
        2,
      )} ${largura.toFixed(2)} ${altura.toFixed(2)} re f 0 0 0 rg`,
    );
  }

  finalizar(): Buffer {
    this.objetos.length = 0;
    this.fonteNormalId = this.adicionarObjeto('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    this.fonteBoldId = this.adicionarObjeto('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const conteudoId = this.adicionarObjeto(
      `<< /Length ${Buffer.byteLength(this.conteudo.join(LINHA), 'latin1')} >>${LINHA}stream${LINHA}${this.conteudo.join(
        LINHA,
      )}${LINHA}endstream`,
    );
    const paginaId = this.adicionarObjeto(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${this.largura} ${this.altura}] /Resources << /Font << /F1 ${this.fonteNormalId} 0 R /F2 ${this.fonteBoldId} 0 R >> >> /Contents ${conteudoId} 0 R >>`,
    );
    const paginasId = this.adicionarObjeto(
      `<< /Type /Pages /Kids [${paginaId} 0 R] /Count 1 >>`,
    );
    const catalogoId = this.adicionarObjeto(
      `<< /Type /Catalog /Pages ${paginasId} 0 R >>`,
    );

    this.objetos[paginaId - 1] = this.objetos[paginaId - 1].replace(
      '/Parent 0 0 R',
      `/Parent ${paginasId} 0 R`,
    );

    return this.montarArquivo(catalogoId);
  }

  private adicionarObjeto(conteudo: string): number {
    this.objetos.push(conteudo);
    return this.objetos.length;
  }

  private montarArquivo(catalogoId: number): Buffer {
    const partes = ['%PDF-1.4'];
    const offsets = [0];
    let tamanho = Buffer.byteLength(`${partes[0]}${LINHA}`, 'latin1');

    this.objetos.forEach((objeto, indice) => {
      offsets.push(tamanho);
      const trecho = `${indice + 1} 0 obj${LINHA}${objeto}${LINHA}endobj`;
      partes.push(trecho);
      tamanho += Buffer.byteLength(`${trecho}${LINHA}`, 'latin1');
    });

    const xrefOffset = tamanho;
    const xref = [
      `xref${LINHA}0 ${this.objetos.length + 1}`,
      '0000000000 65535 f ',
      ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
      `trailer${LINHA}<< /Size ${this.objetos.length + 1} /Root ${catalogoId} 0 R >>`,
      'startxref',
      String(xrefOffset),
      '%%EOF',
    ].join(LINHA);
    partes.push(xref);

    return Buffer.from(partes.join(LINHA), 'latin1');
  }

  private converterY(y: number): number {
    return this.altura - y;
  }

  private quebrarTexto(
    texto: string,
    larguraMaxima: number | undefined,
    tamanho: number,
    maxLines = 4,
  ): string[] {
    const textoNormalizado = texto.replace(/\s+/g, ' ').trim() || '-';

    if (!larguraMaxima) {
      return [textoNormalizado];
    }

    const palavras = textoNormalizado.split(' ');
    const linhas: string[] = [];
    let linhaAtual = '';

    for (const palavra of palavras) {
      const candidata = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;

      if (this.estimarLarguraTexto(candidata, tamanho) <= larguraMaxima) {
        linhaAtual = candidata;
        continue;
      }

      if (linhaAtual) {
        linhas.push(linhaAtual);
      }

      linhaAtual = palavra;
    }

    if (linhaAtual) {
      linhas.push(linhaAtual);
    }

    return linhas.slice(0, maxLines);
  }

  private estimarLarguraTexto(texto: string, tamanho: number): number {
    return texto.length * tamanho * 0.52;
  }

  private escapar(texto: string): string {
    return this.removerAcentos(texto)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private removerAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private corTexto(hex: string): string {
    const [r, g, b] = this.hexParaRgb(hex);

    return `${r} ${g} ${b} rg`;
  }

  private hexParaRgb(hex: string): [string, string, string] {
    const normalizado = hex.replace('#', '');
    const r = parseInt(normalizado.slice(0, 2), 16) / 255;
    const g = parseInt(normalizado.slice(2, 4), 16) / 255;
    const b = parseInt(normalizado.slice(4, 6), 16) / 255;

    return [r.toFixed(3), g.toFixed(3), b.toFixed(3)];
  }
}

