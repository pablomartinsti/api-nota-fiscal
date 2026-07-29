import { OAuth2Client } from 'google-auth-library';

export interface GoogleIdentityPayload {
  email: string;
  emailVerified: boolean;
  nome?: string;
}

export interface VerificadorTokenGoogle {
  verificar(idToken: string): Promise<GoogleIdentityPayload>;
}

export class GoogleIdentityTokenVerifier implements VerificadorTokenGoogle {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  async verificar(idToken: string): Promise<GoogleIdentityPayload> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw new Error('Token Google sem e-mail.');
    }

    return {
      email: payload.email,
      emailVerified: payload.email_verified === true,
      nome: payload.name,
    };
  }
}
