import { ConfiguracaoFiscalEmpresa } from '../entities/ConfiguracaoFiscalEmpresa';
import { AmbienteFiscal } from '../entities/NotaServico';
import { AutenticacaoInvalidaError } from '../errors/AutenticacaoInvalidaError';
import { CertificadoA1CnpjDivergenteError } from '../errors/CertificadoA1CnpjDivergenteError';
import { ProvedorCertificadoA1 } from '../fiscal/CertificadoA1';
import {
  ConfiguracaoCertificadoA1,
  ProvedorCertificadoA1Arquivo,
} from '../fiscal/ProvedorCertificadoA1Arquivo';
import { ConfiguracaoFiscalEmpresaRepository } from '../repositories/ConfiguracaoFiscalEmpresaRepository';
import { EmpresaRepository } from '../repositories/EmpresaRepository';
import { CifradorTexto } from '../security/CifradorTexto';
import { TokenPayload } from '../security/GerenciadorToken';
import { ArmazenadorCertificadoA1 } from '../storage/ArmazenadorCertificadoA1';

export interface ConfigurarCertificadoA1EmpresaAutenticadaInput {
  certificadoA1NomeArquivo: string;
  certificadoA1Base64: string;
  certificadoA1Senha: string;
}

export type CriarProvedorCertificadoA1Upload = (
  configuracao: ConfiguracaoCertificadoA1,
) => ProvedorCertificadoA1;

export class ConfigurarCertificadoA1EmpresaAutenticadaService {
  constructor(
    private readonly configuracaoFiscalRepository: ConfiguracaoFiscalEmpresaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly cifradorTexto: CifradorTexto,
    private readonly armazenadorCertificado: ArmazenadorCertificadoA1,
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
    const certificadoArmazenado = await this.armazenadorCertificado.salvar({
      empresaId: autenticacao.empresaId,
      nomeArquivo: input.certificadoA1NomeArquivo,
      conteudoBase64: input.certificadoA1Base64,
    });

    try {
      const certificado = await this.criarProvedorCertificado({
        caminho: certificadoArmazenado.caminho,
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
        certificadoA1Path: certificadoArmazenado.caminho,
        certificadoA1Senha: this.cifradorTexto.criptografar(
          input.certificadoA1Senha,
        ),
      });
      configuracao.ativar();

      const configuracaoSalva =
        await this.configuracaoFiscalRepository.salvar(configuracao);

      return configuracaoSalva;
    } catch (error) {
      await this.armazenadorCertificado.remover(certificadoArmazenado.caminho);
      throw error;
    }
  }
}
