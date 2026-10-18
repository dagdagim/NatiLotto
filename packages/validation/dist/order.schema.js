"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@nati-lotto/shared-types");
exports.CreateOrderSchema = zod_1.z.object({
    drawId: zod_1.z.string().uuid('Invalid draw ID format'),
    quantity: zod_1.z.number().int().positive().min(1).max(50, 'Cannot purchase more than 50 tickets at once'),
    paymentMethod: zod_1.z.nativeEnum(shared_types_1.PaymentMethod),
    idempotencyKey: zod_1.z.string().min(16, 'Idempotency key must be at least 16 characters').max(64),
});
//# sourceMappingURL=order.schema.js.map