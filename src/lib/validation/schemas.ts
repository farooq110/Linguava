// src/lib/validation/schemas.ts
// Zod schemas used by react-hook-form across all auth & translation forms.

import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const translateSchema = z.object({
  text: z.string().min(1, 'Enter some text').max(10000),
  from: z.string().min(2).max(10),
  to: z.string().min(2).max(10),
  mode: z.enum(['text', 'voice']).default('text'),
});

export type TranslateValues = z.infer<typeof translateSchema>;

export const profileSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  preferredLang: z.string().min(2).max(10),
});

export type ProfileSettingsValues = z.infer<typeof profileSettingsSchema>;
