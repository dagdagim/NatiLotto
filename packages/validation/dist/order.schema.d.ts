import { z } from 'zod';
import { PaymentMethod } from '@nati-lotto/shared-types';
export declare const CreateOrderSchema: z.ZodObject<{
    drawId: z.ZodString;
    quantity: z.ZodNumber;
    paymentMethod: z.ZodNativeEnum<typeof PaymentMethod>;
    idempotencyKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    drawId: string;
    quantity: number;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
}, {
    drawId: string;
    quantity: number;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
}>;
//# sourceMappingURL=order.schema.d.ts.map