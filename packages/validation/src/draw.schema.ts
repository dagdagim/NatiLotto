import { z } from 'zod';
import { PrizeCategory } from '@nati-lotto/shared-types';

export const CreateDrawSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  ticketPriceEtb: z.number().int().positive().min(10, 'Minimum ticket price is 10 ETB'),
  totalTickets: z.number().int().positive().min(10, 'Minimum 10 tickets required').max(1000000),
  maxTicketsPerUser: z.number().int().positive().max(100).default(25),
  salesStartDate: z.string().datetime(),
  salesEndDate: z.string().datetime(),
  drawDate: z.string().datetime(),
  permitNumber: z.string().min(3, 'Official National Lottery permit number is required'),
  isFeatured: z.boolean().default(false),
  prize: z.object({
    title: z.string().min(3).max(120),
    description: z.string().min(10),
    specifications: z.record(z.string(), z.string()).default({}),
    retailValueEtb: z.number().positive(),
    category: z.nativeEnum(PrizeCategory),
    imageUrls: z.array(z.string().url()).min(1, 'At least 1 prize image is required'),
  }),
});
