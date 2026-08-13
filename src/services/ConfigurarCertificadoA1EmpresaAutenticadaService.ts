import { extname } from 'node:path';

import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { CertificadoA1InvalidoError } from '../errors/CertificadoA1InvalidoError';
import { ProvedorCertificadoA1 } from '../fiscal/certificados-a1/CertificadoA1';
import {
  ConfiguracaoCertificadoA1,
  ProvedorCertificadoA1Arquivo,
} from '../fiscal/certificados-a1/ProvedorCertificadoA1Arquivo';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
import { TokenPayload } from '../security/GerenciadorToken';

export interface ConfigurarCertificadoA1EmpresaAutenticadaInput {
  certificadoA1NomeArquivo: string;
  certificadoA1Base64: string;
  certificadoA1Senha: string;
}

export type CriarProvedorCertificadoA1Upload = (
  configuracao: ConfiguracaoCertificadoA1,
) => ProvedorCertificadoA1;

const TAMANHO_MAXIMO_CERTIFICADO_BYTES = 5 * 1024 * 1024;

export class ConfigurarCertificadoA1EmpresaAutenticadaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly cifradorTexto: CifradorTexto,
    private readonly criarProvedorCertificado: CriarProvedorCertificadoA1Upload = (
      configuracao,
    ) => new ProvedorCertificadoA1Arquivo(() => configuracao),
  ) {}

  async executar(
    autenticacao: TokenPayload,
    input: ConfigurarCertificadoA1EmpresaAutenticadaInput,
  ): Promise<ConfiguracaoFiscalEmpresa> {
    const empresa = await this.empresaRepository.buscarPorId(
      autenticacao.empresaId,
    );

    if (!empresa) {
      throw new AutenticacaoInvalidaError();
    }

    const configuracaoExistente =
      await this.configuracaoFiscalRepository.buscarPorEmpresaId(
        autenticacao.empresaId,
      );
    const nomeArquivo = this.normalizarNomeArquivo(
      input.certificadoA1NomeArquivo,
    );
    const conteudoBase64 = this.normalizarConteudoBase64(
      input.certificadoA1Base64,
    );
    const certificado = await this.criarProvedorCertificado({
      conteudoBase64,
      senha: input.certificadoA1Senha,
    }).obter();

    if (certificado.cnpj !== empresa.cnpj) {
      throw new CertificadoA1CnpjDivergenteError();
    }

    const configuracao =
      configuracaoExistente ??
      new ConfiguracaoFiscalEmpresa({
        empresaId: autenticacao.empresaId,
      });

    configuracao.alterarDados({
      ambienteFiscalPadrao:
        configuracaoExistente?.ambienteFiscalPadrao ??
        AmbienteFiscal.HOMOLOGACAO,
      serieDpsPadrao: configuracaoExistente?.serieDpsPadrao ?? '1',
      certificadoA1Path: undefined,
      certificadoA1NomeArquivo: nomeArquivo,
      certificadoA1Conteudo: this.cifradorTexto.criptografar(conteudoBase64),
      certificadoA1Senha: this.cifradorTexto.criptografar(
        input.certificadoA1Senha,
      ),
      certificadoA1ValidoAte: certificado.validoAte,
    });
    configuracao.ativar();

    return this.configuracaoFiscalRepository.salvar(configuracao);
  }

  private normalizarNomeArquivo(nomeArquivo: string): string {
    const nome = nomeArquivo.trim();
    const extensao = extname(nome).toLowerCase();

    if (extensao !== '.pfx' && extensao !== '.p12') {
      throw new CertificadoA1InvalidoError(
        'Arquivo do certificado A1 deve ter extensao .pfx ou .p12.',
      );
    }

    return nome;
  }

  private normalizarConteudoBase64(conteudoBase64: string): string {
    const conteudoNormalizado = conteudoBase64
      .replace(/^data:[^;]+;base64,/i, '')
      .replace(/\s/g, '');

    if (
      !conteudoNormalizado ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(conteudoNormalizado)
    ) {
      throw new CertificadoA1InvalidoError(
        'Conteudo do certificado A1 deve estar em Base64.',
      );
    }

    const buffer = Buffer.from(conteudoNormalizado, 'base64');
    const base64Reprocessado = buffer.toString('base64').replace(/=+$/, '');
    const base64Informado = conteudoNormalizado.replace(/=+$/, '');

    if (!buffer.length || base64Reprocessado !== base64Informado) {
      throw new CertificadoA1InvalidoError(
        'Conteudo do certificado A1 deve estar em Base64.',
      );
    }

    if (buffer.length > TAMANHO_MAXIMO_CERTIFICADO_BYTES) {
      throw new CertificadoA1InvalidoError(
        'Arquivo do certificado A1 excede o tamanho maximo permitido.',
      );
    }

    return buffer.toString('base64');
  }
}
