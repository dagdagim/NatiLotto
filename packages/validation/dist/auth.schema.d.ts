import { z } from 'zod';
export declare const PhoneSchema: z.ZodString;
export declare const LoginSchema: z.ZodObject<{
    phone: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    password?: string | undefined;
}, {
    phone: string;
    password?: string | undefined;
}>;
export declare const RegisterSchema: z.ZodObject<{
    phone: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    dateOfBirth: z.ZodString;
    termsAccepted: z.ZodLiteral<true>;
    responsiblePlayAcknowledged: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    termsAccepted: true;
    responsiblePlayAcknowledged: true;
}, {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    termsAccepted: true;
    responsiblePlayAcknowledged: true;
}>;
export declare const OtpRequestSchema: z.ZodObject<{
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export declare const OtpVerifySchema: z.ZodObject<{
    phone: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    code: string;
}, {
    phone: string;
    code: string;
}>;
//# sourceMappingURL=auth.schema.d.ts.map