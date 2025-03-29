import { z } from "zod";

export const TokenResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	token_type: z.string(), // should be "bearer"
	expires_in: z.number(),
	expires_at: z.string().datetime(),
	user: z.object({
		email: z.string().email(),
		id: z.string(),
		name: z.string(),
	}),
	scope: z.string(),
});
