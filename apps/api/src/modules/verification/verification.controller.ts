import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VerificationService } from './verification.service';

@ApiTags('Verification')
@Controller('verify')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  @ApiOperation({ summary: 'Publicly verify any ticket against draw records and cryptographic proof' })
  async verifyTicket(
    @Query('drawNumber') drawNumber: string,
    @Query('ticketNumber') ticketNumber: string
  ) {
    return this.verificationService.verifyTicket(drawNumber, ticketNumber);
  }

  @Get('draw/:id')
  @ApiOperation({ summary: 'Get public cryptographic proof and snapshot hash for a completed draw' })
  async getDrawVerification(@Param('id') id: string) {
    return this.verificationService.getDrawVerificationSummary(id);
  }
}
