import { Controller, Get, Head, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WinnersService } from './winners.service';

@ApiTags('Winners')
@Controller('winners')
export class WinnersController {
  constructor(private readonly winnersService: WinnersService) {}

  @Get('video/:filename')
  @Head('video/:filename')
  @ApiOperation({ summary: 'Stream MP4 video directly with HTTP Range support' })
  async streamVideo(
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    return this.winnersService.streamVideo(filename, req, res);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of recent public winners and prize claim status' })
  async getRecentWinners(@Query('limit') limit?: number) {
    return this.winnersService.getRecentWinners(limit ? Number(limit) : 20);
  }

  @Get('featured-video')
  @ApiOperation({ summary: 'Get current featured winner handover celebration video for homepage' })
  async getFeaturedWinnerVideo() {
    return this.winnersService.getFeaturedWinnerVideo();
  }

  @Get('videos')
  @ApiOperation({ summary: 'Get history of posted winner handover videos' })
  async getAllWinnerVideos() {
    return this.winnersService.getAllWinnerVideos();
  }

  @Get('promotion-video')
  @ApiOperation({ summary: 'Get current active official promotion / campaign video' })
  async getPromotionVideo() {
    return this.winnersService.getPromotionVideo();
  }

  @Get('promotion-videos')
  @ApiOperation({ summary: 'Get history of posted promotion / campaign videos' })
  async getAllPromotionVideos() {
    return this.winnersService.getAllPromotionVideos();
  }

  @Get('tiktok-resolve')
  @ApiOperation({ summary: 'Resolve TikTok video URL metadata, author, and embed code' })
  async resolveTikTok(@Query('url') url: string) {
    return this.winnersService.resolveTikTok(url);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific winner record' })
  async getWinnerById(@Param('id') id: string) {
    return this.winnersService.getWinnerById(id);
  }
}

