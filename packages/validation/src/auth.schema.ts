import { z } from 'zod';

export const PhoneSchema = z
  .string()
  .regex(/^(\+251|0)?9\d{8}$/, 'Valid Ethiopian mobile number required (e.g., +251911234567 or 0911234567)');

export const LoginSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
});

export const RegisterSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name is required').max(50),
  lastName: z.string().min(2, 'Last name is required').max(50),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms & conditions' }),
  }),
  responsiblePlayAcknowledged: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the responsible play policy' }),
  }),
});

export const OtpRequestSchema = z.object({
  phone: PhoneSchema,
});

export const OtpVerifySchema = z.object({
  phone: PhoneSchema,
  code: z.string().length(6, 'OTP must be 6 digits'),
});
