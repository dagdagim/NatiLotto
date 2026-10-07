import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { DrawsService } from '../draws/draws.service';
import { ClaimStatus } from '@nati-lotto/shared-types';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
    private readonly drawsService: DrawsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get administrative KPIs and metrics' })
  async getDashboard() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get live database analytics and financial aggregates' })
  async getAnalytics(@Query('range') range?: string) {
    return this.adminService.getAnalytics(range);
  }

  @Post('draws/live-broadcast')
  @ApiOperation({ summary: 'Admin post or update live broadcast schedule and webcam status' })
  async updateLiveBroadcast(@Body() body: any) {
    return this.drawsService.updateLiveBroadcastPost(body);
  }

  @Post('draws')
  @ApiOperation({ summary: 'Create a new draw in DRAFT status' })
  async createDraw(@Body() body: any) {
    return this.adminService.createDraw(body, { id: 'admin-1', role: 'SUPER_ADMIN' });
  }

  @Put('draws/:id')
  @ApiOperation({ summary: 'Update draw specifications, time, tickets, or status' })
  async updateDraw(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateDraw(id, body, { id: 'admin-1', role: 'SUPER_ADMIN' });
  }

  @Post('draws/:id/publish')
  @ApiOperation({ summary: 'Publish draw to OPEN status after regulatory validation' })
  async publishDraw(@Param('id') id: string) {
    return this.adminService.publishDraw(id, { id: 'admin-1', role: 'OPERATIONS' });
  }

  @Post('draws/:id/close')
  @ApiOperation({ summary: 'Close ticket sales and freeze entries' })
  async closeSales(@Param('id') id: string) {
    return this.adminService.closeDrawSales(id, { id: 'admin-1', role: 'OPERATIONS' });
  }

  @Post('draws/:id/snapshot')
  @ApiOperation({ summary: 'Create cryptographic snapshot hash of all eligible entries' })
  async createSnapshot(@Param('id') id: string) {
    return this.adminService.createDrawSnapshot(id, { id: 'admin-1', role: 'OPERATIONS' });
  }

  @Post('draws/:id/authorize')
  @ApiOperation({ summary: 'Dual-control compliance authorization before drawing' })
  async authorizeDraw(@Param('id') id: string) {
    return this.adminService.authorizeDraw(id, { id: 'admin-1', role: 'COMPLIANCE' });
  }

  @Post('draws/:id/execute')
  @ApiOperation({ summary: 'Execute authoritative CSPRNG winner selection' })
  async executeDraw(@Param('id') id: string) {
    return this.adminService.executeDraw(id, { id: 'admin-1', role: 'SUPER_ADMIN' });
  }

  @Get('fulfillment')
  @ApiOperation({ summary: 'Get fulfillment operations tracking list' })
  async getFulfillment(@Query('status') status?: ClaimStatus) {
    return this.adminService.getFulfillmentList(status);
  }

  @Put('fulfillment/:winnerId')
  @ApiOperation({ summary: 'Update prize fulfillment claim state' })
  async updateFulfillment(
    @Param('winnerId') winnerId: string,
    @Body() body: { status: ClaimStatus; trackingNumber?: string; deliveryNotes?: string }
  ) {
    return this.adminService.updateFulfillmentStatus({
      winnerId,
      status: body.status,
      trackingNumber: body.trackingNumber,
      deliveryNotes: body.deliveryNotes,
      actor: { id: 'admin-ops', role: 'OPERATIONS' },
    });
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Inspect immutable append-only audit trail' })
  async getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.auditService.getLogs({ entityType, entityId, action, page, limit });
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all registered users from database' })
  async getUsers() {
    return this.adminService.getAllUsers();
  }

  @Put('users/:id/kyc')
  @ApiOperation({ summary: 'Toggle/update user KYC verification in database' })
  async updateUserKyc(@Param('id') id: string, @Body() body: { kycStatus: string }) {
    return this.adminService.updateUserKyc(id, body.kycStatus);
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Toggle/update user account restriction in database' })
  async updateUserStatus(@Param('id') id: string, @Body() body: { accountStatus: string }) {
    return this.adminService.updateUserStatus(id, body.accountStatus);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Permanently delete user and all associated records from database' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id, { id: 'admin-1', role: 'SUPER_ADMIN' });
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get all issued tickets from database' })
  async getTickets() {
    return this.adminService.getAllTickets();
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get all payment transactions from database' })
  async getPayments() {
    return this.adminService.getAllPayments();
  }

  @Get('draws-list')
  @ApiOperation({ summary: 'Get all draws from database for admin console' })
  async getDrawsList() {
    return this.adminService.getAllDraws();
  }

  @Get('support')
  @ApiOperation({ summary: 'Get all support inquiries from database' })
  async getSupport() {
    return this.adminService.getAllSupport();
  }

  @Put('support/:id/status')
  @ApiOperation({ summary: 'Update support inquiry status' })
  async updateSupportStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.adminService.updateSupportStatus(id, body.status);
  }

  @Get('featured-winner-video')
  @ApiOperation({ summary: 'Get current featured winner handover video and history' })
  async getFeaturedWinnerVideo() {
    const current = await this.adminService.getFeaturedWinnerVideo();
    const history = await this.adminService.getAllWinnerVideos();
    return { current, history };
  }

  @Post('featured-winner-video')
  @ApiOperation({ summary: 'Publish or update winner handover ceremony video on the homepage' })
  async postFeaturedWinnerVideo(@Body() body: any) {
    return this.adminService.postFeaturedWinnerVideo(body, { id: 'admin-1', role: 'SUPER_ADMIN' });
  }

  @Post('featured-winner-video/reset')
  @ApiOperation({ summary: 'Reset featured winner video to default celebration video' })
  async resetFeaturedWinnerVideo() {
    return this.adminService.resetFeaturedWinnerVideo();
  }

  @Get('promotion-video')
  @ApiOperation({ summary: 'Get current active promotion video and history' })
  async getPromotionVideo() {
    const current = await this.adminService.getPromotionVideo();
    const history = await this.adminService.getAllPromotionVideos();
    return { current, history };
  }

  @Post('promotion-video')
  @ApiOperation({ summary: 'Publish or update official campaign / promotion video on homepage' })
  async postPromotionVideo(@Body() body: any) {
    return this.adminService.postPromotionVideo(body, { id: 'admin-1', role: 'SUPER_ADMIN' });
  }

  @Post('promotion-video/reset')
  @ApiOperation({ summary: 'Reset promotion video to default official promotion' })
  async resetPromotionVideo() {
    return this.adminService.resetPromotionVideo();
  }
}

