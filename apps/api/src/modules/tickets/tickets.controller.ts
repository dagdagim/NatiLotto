import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { TicketStatus } from '@nati-lotto/shared-types';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get tickets owned by a user, filterable by status' })
  async getUserTickets(
    @Param('userId') userId: string,
    @Query('status') status?: TicketStatus
  ) {
    return this.ticketsService.getUserTickets(userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comprehensive ticket details with QR code payload' })
  async getTicketDetails(@Param('id') id: string) {
    return this.ticketsService.getTicketDetails(id);
  }
}
