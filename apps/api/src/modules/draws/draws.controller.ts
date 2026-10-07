import { Controller, Get, Post, Param, Query, Body, Req, Res, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DrawsService } from './draws.service';
import { DrawStatus, PrizeCategory } from '@nati-lotto/shared-types';

@ApiTags('Draws')
@Controller('draws')
export class DrawsController {
  constructor(private readonly drawsService: DrawsService) {}

  @Get()
  @ApiOperation({ summary: 'Discover active, ending soon, completed, and featured draws' })
  async findAll(
    @Query('status') status?: DrawStatus,
    @Query('category') category?: PrizeCategory,
    @Query('isFeatured') isFeatured?: boolean,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'endingSoon' | 'newest' | 'popular',
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.drawsService.findAll({ status, category, isFeatured, search, sortBy, page, limit });
  }

  @Get('live-broadcast/current')
  @ApiOperation({ summary: 'Get current active live broadcast post' })
  async getLiveBroadcastPost() {
    return this.drawsService.getLiveBroadcastPost();
  }

  @Get('live-broadcast/comments')
  @ApiOperation({ summary: 'Get live broadcast chat messages, likes and viewer count' })
  async getLiveComments() {
    const post = DrawsService.getLiveBroadcastPostStatic();
    return {
      chatMessages: post.chatMessages || [],
      likeCount: post.likeCount || 15420,
      viewerCount: post.viewerCount || 1845,
      diamondCount: post.diamondCount || 28400,
    };
  }

  @Post('live-broadcast/comments')
  @ApiOperation({ summary: 'Send a live chat comment' })
  async sendLiveComment(@Body() body: { sender: string; text: string; badge?: string; badgeColor?: string }) {
    return this.drawsService.addChatMessage(body.sender, body.text, body.badge, body.badgeColor);
  }

  @Post('live-broadcast/likes')
  @ApiOperation({ summary: 'Increment live broadcast likes' })
  async incrementLiveLikes(@Body() body: { count?: number }) {
    const newLikes = this.drawsService.incrementLikes(body.count || 1);
    return { success: true, likeCount: newLikes };
  }

  @Post('live-broadcast/gifts')
  @ApiOperation({ summary: 'Send a gift during live stream' })
  async sendLiveGift(@Body() body: { sender: string; giftName: string; costEtb: number; emoji: string }) {
    const msg = this.drawsService.sendGift(body.sender, body.giftName, body.costEtb, body.emoji);
    return { success: true, message: msg };
  }

  @Get('live-broadcast/frame')
  @ApiOperation({ summary: 'Get current webcam frame and status for mobile and web spectators' })
  async getLiveWebcamFrame() {
    const post = DrawsService.getLiveBroadcastPostStatic();
    return {
      isLive: DrawsService.isWebcamLive(),
      frame: DrawsService.getLatestWebcamFrame(),
      status: post.status,
      videoStartedAt: post.videoStartedAt,
      winningTicketNumber: post.winningTicketNumber,
      winnerName: post.winnerName,
      likeCount: post.likeCount || 15420,
      viewerCount: post.viewerCount || 1845,
      diamondCount: post.diamondCount || 28400,
    };
  }

  @Post('live-broadcast/frame')
  @ApiOperation({ summary: 'Update latest webcam frame from admin studio' })
  async updateLiveWebcamFrame(@Body() body: { frame: string; isLive?: boolean }) {
    if (body.frame) {
      DrawsService.setLatestWebcamFrame(body.frame);
    } else if (body.isLive === false) {
      DrawsService.setWebcamLive(false);
    }
    return { success: true };
  }

  @Get('live-broadcast/tiktok-status')
  @ApiOperation({ summary: 'Check if TikTok user is broadcasting live and get HLS stream' })
  async checkTikTokLiveStatus(@Query('url') url?: string, @Query('username') username?: string) {
    return this.drawsService.checkTikTokLiveStatus(url || username || '');
  }

  @Get('live-broadcast/proxy-stream')
  @ApiOperation({ summary: 'Proxy TikTok live HLS stream or video chunk with CORS' })
  async proxyTikTokStream(@Query('url') url: string, @Req() req: any, @Res() res: any) {
    return this.drawsService.proxyTikTokStream(url, req, res);
  }

  @Post('live-broadcast/upload-video')
  @ApiOperation({ summary: 'Upload draw video file (.mp4) directly from admin studio' })
  @UseInterceptors(FileInterceptor('video'))
  async uploadLiveVideo(@UploadedFile() file: any, @Body() body: { base64Data?: string; filename?: string }) {
    if (file && file.buffer) {
      return this.drawsService.saveUploadedLiveVideo(file.buffer, file.originalname || 'draw-live.mp4');
    }
    if (body?.base64Data) {
      const base64Clean = body.base64Data.replace(/^data:video\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');
      return this.drawsService.saveUploadedLiveVideo(buffer, body.filename || 'draw-live.mp4');
    }
    throw new BadRequestException('No video file or base64Data provided');
  }

  @Get(':id/ticket-availability')
  @ApiOperation({ summary: 'Get available and booked ticket numbers for a draw' })
  async getTicketAvailability(@Param('id') id: string) {
    return this.drawsService.getTicketAvailability(id);
  }

  @Get(':id/ticket-owner')
  @ApiOperation({ summary: 'Find the ticket owner for a given draw and ticket number from the database' })
  async findTicketOwner(
    @Param('id') id: string,
    @Query('ticketNumber') ticketNumber: string,
  ) {
    return this.drawsService.findTicketOwner(id, ticketNumber);
  }

  @Get(':id/sold-tickets')
  @ApiOperation({ summary: 'Get all sold tickets and their owners from the database for a draw' })
  async getSoldTickets(@Param('id') id: string) {
    return this.drawsService.getSoldTickets(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full draw details, prize specs, countdown, and rules' })
  async findById(@Param('id') id: string) {
    return this.drawsService.findById(id);
  }
}
