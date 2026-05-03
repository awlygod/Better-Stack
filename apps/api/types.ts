import { z } from "zod";

export const AuthInput = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(6).max(100),
});

export interface AuthRequest extends z.infer<typeof AuthInput> {}