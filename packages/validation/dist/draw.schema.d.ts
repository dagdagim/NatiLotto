import { z } from 'zod';
import { PrizeCategory } from '@nati-lotto/shared-types';
export declare const CreateDrawSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    ticketPriceEtb: z.ZodNumber;
    totalTickets: z.ZodNumber;
    maxTicketsPerUser: z.ZodDefault<z.ZodNumber>;
    salesStartDate: z.ZodString;
    salesEndDate: z.ZodString;
    drawDate: z.ZodString;
    permitNumber: z.ZodString;
    isFeatured: z.ZodDefault<z.ZodBoolean>;
    prize: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodString;
        specifications: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
        retailValueEtb: z.ZodNumber;
        category: z.ZodNativeEnum<typeof PrizeCategory>;
        imageUrls: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        description: string;
        specifications: Record<string, string>;
        retailValueEtb: number;
        category: PrizeCategory;
        imageUrls: string[];
    }, {
        title: string;
        description: string;
        retailValueEtb: number;
        category: PrizeCategory;
        imageUrls: string[];
        specifications?: Record<string, string> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    ticketPriceEtb: number;
    totalTickets: number;
    maxTicketsPerUser: number;
    salesStartDate: string;
    salesEndDate: string;
    drawDate: string;
    permitNumber: string;
    isFeatured: boolean;
    prize: {
        title: string;
        description: string;
        specifications: Record<string, string>;
        retailValueEtb: number;
        category: PrizeCategory;
        imageUrls: string[];
    };
}, {
    title: string;
    description: string;
    ticketPriceEtb: number;
    totalTickets: number;
    salesStartDate: string;
    salesEndDate: string;
    drawDate: string;
    permitNumber: string;
    prize: {
        title: string;
        description: string;
        retailValueEtb: number;
        category: PrizeCategory;
        imageUrls: string[];
        specifications?: Record<string, string> | undefined;
    };
    maxTicketsPerUser?: number | undefined;
    isFeatured?: boolean | undefined;
}>;
//# sourceMappingURL=draw.schema.d.ts.map