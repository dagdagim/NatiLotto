"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpVerifySchema = exports.OtpRequestSchema = exports.RegisterSchema = exports.LoginSchema = exports.PhoneSchema = void 0;
const zod_1 = require("zod");
exports.PhoneSchema = zod_1.z
    .string()
    .regex(/^(\+251|0)?9\d{8}$/, 'Valid Ethiopian mobile number required (e.g., +251911234567 or 0911234567)');
exports.LoginSchema = zod_1.z.object({
    phone: exports.PhoneSchema,
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters').optional(),
});
exports.RegisterSchema = zod_1.z.object({
    phone: exports.PhoneSchema,
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(2, 'First name is required').max(50),
    lastName: zod_1.z.string().min(2, 'Last name is required').max(50),
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
    termsAccepted: zod_1.z.literal(true, {
        errorMap: () => ({ message: 'You must accept the terms & conditions' }),
    }),
    responsiblePlayAcknowledged: zod_1.z.literal(true, {
        errorMap: () => ({ message: 'You must acknowledge the responsible play policy' }),
    }),
});
exports.OtpRequestSchema = zod_1.z.object({
    phone: exports.PhoneSchema,
});
exports.OtpVerifySchema = zod_1.z.object({
    phone: exports.PhoneSchema,
    code: zod_1.z.string().length(6, 'OTP must be 6 digits'),
});
//# sourceMappingURL=auth.schema.js.map