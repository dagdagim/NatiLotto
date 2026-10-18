"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDrawSchema = void 0;
const zod_1 = require("zod");
const shared_types_1 = require("@nati-lotto/shared-types");
exports.CreateDrawSchema = zod_1.z.object({
    title: zod_1.z.string().min(5, 'Title must be at least 5 characters').max(120),
    description: zod_1.z.string().min(20, 'Description must be at least 20 characters'),
    ticketPriceEtb: zod_1.z.number().int().positive().min(10, 'Minimum ticket price is 10 ETB'),
    totalTickets: zod_1.z.number().int().positive().min(10, 'Minimum 10 tickets required').max(1000000),
    maxTicketsPerUser: zod_1.z.number().int().positive().max(100).default(25),
    salesStartDate: zod_1.z.string().datetime(),
    salesEndDate: zod_1.z.string().datetime(),
    drawDate: zod_1.z.string().datetime(),
    permitNumber: zod_1.z.string().min(3, 'Official National Lottery permit number is required'),
    isFeatured: zod_1.z.boolean().default(false),
    prize: zod_1.z.object({
        title: zod_1.z.string().min(3).max(120),
        description: zod_1.z.string().min(10),
        specifications: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
        retailValueEtb: zod_1.z.number().positive(),
        category: zod_1.z.nativeEnum(shared_types_1.PrizeCategory),
        imageUrls: zod_1.z.array(zod_1.z.string().url()).min(1, 'At least 1 prize image is required'),
    }),
});
//# sourceMappingURL=draw.schema.js.map