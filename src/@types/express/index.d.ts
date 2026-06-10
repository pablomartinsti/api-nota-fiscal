import { TokenPayload } from '../../security/GerenciadorToken';

declare global {
  namespace Express {
    interface Request {
      autenticacao: TokenPayload;
    }
  }
}

export {};
