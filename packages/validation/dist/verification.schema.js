"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyTicketSchema = void 0;
const zod_1 = require("zod");
exports.VerifyTicketSchema = zod_1.z.object({
    drawNumber: zod_1.z.string().min(3, 'Draw number is required (e.g. NL-000123)'),
    ticketNumber: zod_1.z.string().min(1, 'Ticket number is required (e.g. 0382 or #0382)'),
});
//# sourceMappingURL=verification.schema.js.map