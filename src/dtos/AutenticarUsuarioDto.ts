import { z } from 'zod';

export const autenticarUsuarioSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1),
});

export type AutenticarUsuarioDto = z.infer<typeof autenticarUsuarioSchema>;
