import { z } from 'zod';
import { PaymentMethod } from '@nati-lotto/shared-types';

export const CreateOrderSchema = z.object({
  drawId: z.string().uuid('Invalid draw ID format'),
  quantity: z.number().int().positive().min(1).max(50, 'Cannot purchase more than 50 tickets at once'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  idempotencyKey: z.string().min(16, 'Idempotency key must be at least 16 characters').max(64),
});
