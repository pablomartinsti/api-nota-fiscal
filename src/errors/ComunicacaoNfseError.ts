export class ComunicacaoNfseError extends Error {
  constructor(message = 'Nao foi possivel comunicar com a SEFIN Nacional.') {
    super(message);
  }
}
