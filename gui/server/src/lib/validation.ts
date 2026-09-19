import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  name: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const projectSchema = z.object({
  name: z.string().min(3),
  description: z.string().max(500).optional(),
});

export const targetSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(3),
  url: z.string().url(),
  description: z.string().max(300).optional(),
  allowHosts: z.array(z.string().url()).optional(),
});
