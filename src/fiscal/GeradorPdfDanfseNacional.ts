import { DOMParser, Element as XmlElement } from '@xmldom/xmldom';

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
    pdf.rect(MARGEM, MARGEM, LARGURA_A4 - MARGEM * 2, ALTURA_A4 - MARGEM * 2);
    pdf.text('NFS-e', 24, 20, { size: 20, bold: true });
    pdf.text('DANFSe v2.0', 245, 22, { size: 11, bold: true });
    pdf.text('Documento Auxiliar da NFS-e', 220, 36, {
      size: 11,
      bold: true,
    });
    pdf.text('Portal Nacional da NFS-e', 430, 25, { size: 8, align: 'right' });
    pdf.line(24, 58, 571, 58);

    if (dados.ambienteFiscal === AmbienteFiscal.HOMOLOGACAO) {
      pdf.text('NFS-e SEM VALIDADE JURIDICA', 175, 63, {
        size: 11,
        bold: true,
      });
    }

    this.secaoCampos(pdf, 24, 72, 382, [
      { titulo: 'Chave de Acesso da NFS-e', valor: dados.chaveAcesso },
      { titulo: 'Numero da NFS-e', valor: dados.numeroNfse },
      { titulo: 'Numero da DPS', valor: dados.numeroDps },
    ]);
    this.secaoCampos(pdf, 255, 72, 170, [
      { titulo: 'Competencia da NFS-e', valor: dados.competencia },
      { titulo: 'Serie da DPS', valor: dados.serieDps },
      { titulo: 'Data e hora da emissao da NFS-e', valor: dados.dataEmissaoNfse },
      { titulo: 'Data e hora da emissao da DPS', valor: dados.dataEmissaoDps },
    ]);
    this.desenharQrPlaceholder(pdf, 462, 72, dados.chaveAcesso);

    this.secaoPessoa(pdf, 24, 160, 'EMITENTE DA NFS-e', dados.prestador);
    this.secaoPessoa(pdf, 24, 270, 'TOMADOR DO SERVICO', dados.tomador);

    this.tituloSecao(pdf, 24, 376, 'SERVICO PRESTADO');
    this.secaoCamposEmLinha(pdf, 24, 392, [
      {
        titulo: 'Codigo de Tributacao Nacional',
        valor: dados.servico.codigoTributacaoNacional,
      },
      {
        titulo: 'Codigo de Tributacao Municipal',
        valor: dados.servico.codigoTributacaoMunicipal,
      },
      { titulo: 'Local da Prestacao', valor: dados.servico.localPrestacao },
      { titulo: 'Pais da Prestacao', valor: dados.servico.paisPrestacao },
    ]);
    this.caixaTexto(pdf, 24, 448, 547, 64, [
      { titulo: 'Descricao do Servico', valor: dados.servico.descricao },
    ]);

    this.tituloSecao(pdf, 24, 526, 'TRIBUTACAO MUNICIPAL');
    this.secaoCamposEmLinha(pdf, 24, 542, [
      { titulo: 'Tributacao do ISSQN', valor: dados.valores.tributacaoIssqn },
      { titulo: 'Tipo de Retencao do ISSQN', valor: dados.valores.tipoRetencaoIssqn },
      { titulo: 'Aliquota ISSQN', valor: dados.valores.aliquotaIss },
      { titulo: 'Valor ISSQN', valor: dados.valores.valorIss },
    ]);

    this.tituloSecao(pdf, 24, 606, 'VALOR TOTAL DA NFS-e');
    this.secaoCamposEmLinha(pdf, 24, 622, [
      { titulo: 'Valor do Servico', valor: dados.valores.valorServico },
      { titulo: 'Desconto Condicionado', valor: '-' },
      { titulo: 'Desconto Incondicionado', valor: '-' },
      { titulo: 'Valor Liquido da NFS-e', valor: dados.valores.valorTotal },
    ]);

    this.caixaTexto(pdf, 24, 692, 547, 70, [
      {
        titulo: 'Informacoes Complementares',
        valor: dados.informacoesComplementares,
      },
    ]);

    if (dados.status === StatusNota.CANCELADA) {
      pdf.text('CANCELADA', 170, 405, { size: 48, bold: true });
    }

    if (dados.status === StatusNota.SUBSTITUIDA) {
      pdf.text('SUBSTITUIDA', 130, 405, { size: 44, bold: true });
    }

    pdf.text(
      'A autenticidade desta NFS-e pode ser consultada no Portal Nacional da NFS-e pela chave de acesso.',
      24,
      790,
      { size: 7 },
    );
  }

  private secaoPessoa(
    pdf: PdfSimples,
    x: number,
    y: number,
    titulo: string,
    pessoa: PessoaDanfse,
  ): void {
    this.tituloSecao(pdf, x, y, titulo);
    this.secaoCamposEmLinha(pdf, x, y + 16, [
      { titulo: 'CNPJ / CPF / NIF', valor: pessoa.cpfCnpj },
      { titulo: 'Inscricao Municipal', valor: pessoa.inscricaoMunicipal },
      { titulo: 'Telefone', valor: pessoa.telefone },
    ]);
    this.secaoCamposEmLinha(pdf, x, y + 50, [
      { titulo: 'Nome / Nome Empresarial', valor: pessoa.nome },
      { titulo: 'E-mail', valor: pessoa.email },
    ]);
    this.secaoCamposEmLinha(pdf, x, y + 84, [
      { titulo: 'Endereco', valor: pessoa.endereco },
      { titulo: 'Municipio', valor: pessoa.municipio },
      { titulo: 'CEP', valor: pessoa.cep },
    ]);
  }

  private secaoCampos(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    campos: CampoDanfse[],
  ): void {
    let atualY = y;

    for (const campo of campos) {
      pdf.text(campo.titulo, x, atualY, { size: 7, bold: true });
      pdf.text(campo.valor || '-', x, atualY + 10, {
        size: 8,
        maxWidth: largura,
      });
      atualY += 34;
    }
  }

  private secaoCamposEmLinha(
    pdf: PdfSimples,
    x: number,
    y: number,
    campos: CampoDanfse[],
  ): void {
    const largura = 547 / campos.length;

    campos.forEach((campo, indice) => {
      const campoX = x + largura * indice;
      pdf.text(campo.titulo, campoX, y, { size: 7, bold: true });
      pdf.text(campo.valor || '-', campoX, y + 12, {
        size: 8,
        maxWidth: largura - 8,
      });
    });
  }

  private caixaTexto(
    pdf: PdfSimples,
    x: number,
    y: number,
    largura: number,
    altura: number,
    campos: CampoDanfse[],
  ): void {
    pdf.fillRect(x, y, largura, altura, 'F3F5FA');
    pdf.rect(x, y, largura, altura);
    let atualY = y + 12;

    for (const campo of campos) {
      pdf.text(campo.titulo, x + 10, atualY, { size: 8, bold: true });
      atualY += 16;
      pdf.text(campo.valor || '-', x + 10, atualY, {
        size: 9,
        maxWidth: largura - 20,
      });
      atualY += 22;
    }
  }

  private tituloSecao(pdf: PdfSimples, x: number, y: number, texto: string): void {
    pdf.line(x, y, 571, y);
    pdf.text(texto, x, y + 4, { size: 8, bold: true });
  }

  private desenharQrPlaceholder(
    pdf: PdfSimples,
    x: number,
    y: number,
    chaveAcesso: string,
  ): void {
    pdf.rect(x, y, 70, 70);
    pdf.text('QR Code', x + 18, y + 24, { size: 8, bold: true });
    pdf.text(chaveAcesso.slice(-8), x + 14, y + 38, { size: 7 });
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
    const linhas = this.quebrarTexto(texto, options.maxWidth, tamanho);
    let atualY = y;

    for (const linha of linhas) {
      const textoX =
        options.align === 'right' && options.maxWidth
          ? x + options.maxWidth - this.estimarLarguraTexto(linha, tamanho)
          : x;

      this.conteudo.push(
        `BT /${options.bold ? 'F2' : 'F1'} ${tamanho} Tf ${textoX.toFixed(2)} ${this.converterY(
          atualY,
        ).toFixed(2)} Td (${this.escapar(linha)}) Tj ET`,
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

    return linhas.slice(0, 4);
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

  private hexParaRgb(hex: string): [string, string, string] {
    const normalizado = hex.replace('#', '');
    const r = parseInt(normalizado.slice(0, 2), 16) / 255;
    const g = parseInt(normalizado.slice(2, 4), 16) / 255;
    const b = parseInt(normalizado.slice(4, 6), 16) / 255;

    return [r.toFixed(3), g.toFixed(3), b.toFixed(3)];
  }
}
