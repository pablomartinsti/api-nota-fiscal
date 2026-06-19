export interface SalvarCertificadoA1Input {
  empresaId: string;
  nomeArquivo: string;
  conteudoBase64: string;
}

export interface CertificadoA1Armazenado {
  caminho: string;
  tamanhoBytes: number;
}

export interface ArmazenadorCertificadoA1 {
  salvar(input: SalvarCertificadoA1Input): Promise<CertificadoA1Armazenado>;
  remover(caminho: string): Promise<void>;
}
