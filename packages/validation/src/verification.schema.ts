import { z } from 'zod';

export const VerifyTicketSchema = z.object({
  drawNumber: z.string().min(3, 'Draw number is required (e.g. NL-000123)'),
  ticketNumber: z.string().min(1, 'Ticket number is required (e.g. 0382 or #0382)'),
});
