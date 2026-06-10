import 'dotenv/config';

export function obterJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret?.trim()) {
    throw new Error('JWT_SECRET não está definida.');
  }

  return secret;
}
