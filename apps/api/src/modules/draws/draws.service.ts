import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ComplianceService } from '../compliance/compliance.service';
import { DrawStatus, PrizeCategory } from '@nati-lotto/shared-types';
import * as fs from 'fs';
import * as path from 'path';
import type { Request, Response } from 'express';

const shortUrlCache = new Map<string, string>();

export async function resolveShortTikTokUrl(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return url;
  const clean = url.trim();
  if (!/(?:vt|vm)\.tiktok\.com/i.test(clean)) return clean;
  if (shortUrlCache.has(clean)) return shortUrlCache.get(clean)!;

  try {
    const res = await fetch(clean, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const location = res.headers.get('location');
    if (location && (location.includes('/video/') || location.includes('/live') || location.includes('@'))) {
      const canonical = location.split('?')[0];
      shortUrlCache.set(clean, canonical);
      return canonical;
    }
  } catch (_) {}

  return clean;
}

function extractDrawVideoUrl(specs: any, drawTitle?: string): string | undefined {
  if (specs && typeof specs === 'object') {
    const candidateKeys = [
      'videoUrl',
      'video_url',
      'Product Video',
      'productVideo',
      'productVideoUrl',
      'product_video_url',
      'video',
      'tikTokUrl',
      'tiktokUrl',
      'directVideoUrl',
    ];
    for (const k of candidateKeys) {
      if (typeof specs[k] === 'string' && specs[k].trim().length > 0) {
        const val = specs[k].trim();
        return shortUrlCache.get(val) || val;
      }
    }
    for (const [k, v] of Object.entries(specs)) {
      if (k.toLowerCase().includes('video') && typeof v === 'string' && v.trim().length > 0) {
        const val = v.trim();
        return shortUrlCache.get(val) || val;
      }
    }
  }

  return undefined;
}

@Injectable()
export class DrawsService {
  private readonly logger = new Logger(DrawsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly compliance: ComplianceService,
  ) {}

  async findAll(query: {
    status?: DrawStatus;
    category?: PrizeCategory;
    isFeatured?: boolean;
    search?: string;
    sortBy?: 'endingSoon' | 'newest' | 'popular';
    page?: number;
    limit?: number;
  }) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured === true || String(query.isFeatured) === 'true';
    }
    if (query.category) {
      where.prize = { category: query.category };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { drawNumber: { contains: query.search, mode: 'insensitive' } },
        { prize: { title: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'endingSoon') {
      orderBy = { salesEndDate: 'asc' };
    } else if (query.sortBy === 'popular') {
      orderBy = { soldTickets: 'desc' };
    }

    const [total, draws] = await Promise.all([
      this.prisma.draw.count({ where }),
      this.prisma.draw.findMany({
        where,
        include: {
          prize: {
            include: { images: { orderBy: { displayOrder: 'asc' } } },
          },
          rules: { orderBy: { displayOrder: 'asc' } },
          result: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const formattedDraws = draws.map((d) => ({
      id: d.id,
      drawNumber: d.drawNumber,
      title: d.title,
      description: d.description,
      ticketPriceEtb: d.ticketPriceEtb,
      totalTickets: d.totalTickets,
      soldTickets: d.soldTickets,
      remainingTickets: Math.max(0, d.totalTickets - d.soldTickets),
      maxTicketsPerUser: d.maxTicketsPerUser,
      status: d.status,
      salesStartDate: d.salesStartDate.toISOString(),
      salesEndDate: d.salesEndDate.toISOString(),
      drawDate: d.drawDate.toISOString(),
      permitNumber: d.permitNumber,
      isFeatured: d.isFeatured,
      snapshotHash: d.snapshotHash || undefined,
      resultHash: d.resultHash || undefined,
      videoUrl: extractDrawVideoUrl(d.prize?.specifications, d.title),
      prize: d.prize
        ? {
            id: d.prize.id,
            title: d.prize.title,
            description: d.prize.description,
            specifications: d.prize.specifications as Record<string, string>,
            videoUrl: extractDrawVideoUrl(d.prize.specifications, d.title),
            retailValueEtb: d.prize.retailValueEtb,
            category: d.prize.category,
            images: d.prize.images.map((img) => ({
              id: img.id,
              url: img.url,
              isPrimary: img.isPrimary,
              displayOrder: img.displayOrder,
            })),
          }
        : null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return { total, page, limit, draws: formattedDraws };
  }

  async getTicketAvailability(drawId: string) {
    const draw = await this.prisma.draw.findFirst({
      where: {
        OR: [{ id: drawId }, { drawNumber: drawId }],
      },
      select: {
        id: true,
        drawNumber: true,
        totalTickets: true,
        soldTickets: true,
        ticketPriceEtb: true,
        status: true,
      },
    });

    if (!draw) {
      throw new NotFoundException(`Draw not found: ${drawId}`);
    }

    const bookedTickets = await this.prisma.ticket.findMany({
      where: { drawId: draw.id },
      select: { sequenceNumber: true, ticketNumber: true },
      orderBy: { sequenceNumber: 'asc' },
    });

    const bookedSequenceNumbers = bookedTickets.map((t) => t.sequenceNumber);
    const bookedTicketNumbers = bookedTickets.map((t) => t.ticketNumber);

    return {
      drawId: draw.id,
      drawNumber: draw.drawNumber,
      totalTickets: draw.totalTickets,
      soldTickets: draw.soldTickets,
      remainingTickets: Math.max(0, draw.totalTickets - draw.soldTickets),
      ticketPriceEtb: draw.ticketPriceEtb,
      status: draw.status,
      bookedSequenceNumbers,
      bookedTicketNumbers,
    };
  }

  async findById(id: string) {
    const draw = await this.prisma.draw.findFirst({
      where: {
        OR: [{ id }, { drawNumber: id }],
      },
      include: {
        prize: {
          include: { images: { orderBy: { displayOrder: 'asc' } } },
        },
        rules: { orderBy: { displayOrder: 'asc' } },
        result: {
          include: {
            winningTicket: true,
            winnerUser: {
              select: { firstName: true, lastName: true, phone: true },
            },
            randomnessRecord: true,
          },
        },
        winner: true,
      },
    });

    if (!draw) {
      throw new NotFoundException(`Draw not found: ${id}`);
    }

    return {
      id: draw.id,
      drawNumber: draw.drawNumber,
      title: draw.title,
      description: draw.description,
      ticketPriceEtb: draw.ticketPriceEtb,
      totalTickets: draw.totalTickets,
      soldTickets: draw.soldTickets,
      remainingTickets: Math.max(0, draw.totalTickets - draw.soldTickets),
      maxTicketsPerUser: draw.maxTicketsPerUser,
      status: draw.status,
      salesStartDate: draw.salesStartDate.toISOString(),
      salesEndDate: draw.salesEndDate.toISOString(),
      drawDate: draw.drawDate.toISOString(),
      permitNumber: draw.permitNumber,
      isFeatured: draw.isFeatured,
      snapshotHash: draw.snapshotHash || undefined,
      resultHash: draw.resultHash || undefined,
      videoUrl: await resolveShortTikTokUrl(extractDrawVideoUrl(draw.prize?.specifications, draw.title) || ''),
      prize: draw.prize
        ? {
            id: draw.prize.id,
            title: draw.prize.title,
            description: draw.prize.description,
            specifications: draw.prize.specifications as Record<string, string>,
            videoUrl: await resolveShortTikTokUrl(extractDrawVideoUrl(draw.prize.specifications, draw.title) || ''),
            retailValueEtb: draw.prize.retailValueEtb,
            category: draw.prize.category,
            images: draw.prize.images.map((img) => ({
              id: img.id,
              url: img.url,
              isPrimary: img.isPrimary,
              displayOrder: img.displayOrder,
            })),
          }
        : null,
      rules: draw.rules.map((r) => r.ruleText),
      result: draw.result
        ? {
            winningTicketNumber: draw.result.winningTicketNumber,
            winningSequenceNumber: draw.result.winningSequenceNumber,
            resultHash: draw.result.resultHash,
            snapshotHash: draw.result.snapshotHash,
            publishedAt: draw.result.publishedAt.toISOString(),
            randomnessProvider: draw.result.randomnessRecord?.provider,
            seedHash: draw.result.randomnessRecord?.seedHash,
            entropyTimestamp: draw.result.randomnessRecord?.entropyTimestamp.toISOString(),
          }
        : null,
      winner: draw.winner
        ? {
            displayName: draw.winner.winnerDisplayName,
            claimStatus: draw.winner.claimStatus,
          }
        : null,
      createdAt: draw.createdAt.toISOString(),
      updatedAt: draw.updatedAt.toISOString(),
    };
  }

  async createDraw(dto: any, actor: { id: string; role: string }) {
    const drawCount = await this.prisma.draw.count();
    const drawNumber = `NL-${String(drawCount + 1).padStart(6, '0')}`;

    const rawCategory = String(dto.prize?.category || 'ELECTRONICS').toUpperCase();
    let category: PrizeCategory = PrizeCategory.ELECTRONICS;
    if (rawCategory === 'VEHICLES') category = PrizeCategory.VEHICLES;
    else if (rawCategory === 'REAL_ESTATE') category = PrizeCategory.REAL_ESTATE;
    else if (rawCategory === 'CASH') category = PrizeCategory.CASH;
    else if (rawCategory === 'TRAVEL') category = PrizeCategory.TRAVEL;
    else if (rawCategory === 'LIFESTYLE' || rawCategory === 'LUXURY') category = PrizeCategory.LIFESTYLE;
    else if (rawCategory === 'GAMING' || rawCategory === 'ELECTRONICS') category = PrizeCategory.ELECTRONICS;

    const permitNumber = dto.permitNumber && dto.permitNumber.trim().length >= 3
      ? dto.permitNumber.trim()
      : 'NL-ET-2026-0941';

    let incomingVideoUrl = String(
      dto.videoUrl ||
      dto.prize?.videoUrl ||
      dto.prize?.productVideoUrl ||
      dto.prize?.specifications?.videoUrl ||
      dto.prize?.specifications?.['Product Video'] ||
      dto.prize?.specifications?.productVideoUrl ||
      ''
    ).trim();

    if (incomingVideoUrl && /(?:vt|vm)\.tiktok\.com/i.test(incomingVideoUrl)) {
      incomingVideoUrl = await resolveShortTikTokUrl(incomingVideoUrl);
    }
    const specifications: Record<string, any> = {
      ...(dto.prize?.specifications || {}),
    };
    if (incomingVideoUrl) {
      specifications.videoUrl = incomingVideoUrl;
      specifications.productVideoUrl = incomingVideoUrl;
      specifications['Product Video'] = incomingVideoUrl;
    }

    const draw = await this.prisma.draw.create({
      data: {
        drawNumber,
        title: dto.title,
        description: dto.description || `${dto.title} - Official National Lottery Draw`,
        ticketPriceEtb: Number(dto.ticketPriceEtb),
        totalTickets: Number(dto.totalTickets),
        maxTicketsPerUser: Number(dto.maxTicketsPerUser) || 25,
        status: DrawStatus.DRAFT,
        salesStartDate: new Date(dto.salesStartDate || Date.now()),
        salesEndDate: new Date(dto.salesEndDate || Date.now() + 7 * 86400000),
        drawDate: new Date(dto.drawDate || Date.now() + 7 * 86400000),
        permitNumber,
        isFeatured: dto.isFeatured || false,
        prize: {
          create: {
            title: dto.prize?.title || dto.title,
            description: dto.prize?.description || dto.description || `${dto.title} Specifications`,
            specifications,
            retailValueEtb: Number(dto.prize?.retailValueEtb) || 10000,
            category,
            images: {
              create: (dto.prize?.imageUrls || []).map((url: string, index: number) => ({
                url,
                isPrimary: index === 0,
                displayOrder: index,
              })),
            },
          },
        },
      },
      include: { prize: { include: { images: true } } },
    });

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DRAW_CREATED',
      entityType: 'Draw',
      entityId: draw.id,
      details: { drawNumber, title: draw.title, totalTickets: draw.totalTickets },
    });

    return this.findById(draw.id);
  }

  async publishDraw(id: string, actor: { id: string; role: string }) {
    await this.compliance.verifyDrawLicensing(id);

    const draw = await this.prisma.draw.findUnique({ where: { id } });
    if (!draw) throw new NotFoundException('Draw not found');

    if (draw.status !== DrawStatus.DRAFT && draw.status !== DrawStatus.PENDING_REVIEW) {
      throw new BadRequestException(`Cannot publish draw in status ${draw.status}`);
    }

    const updated = await this.prisma.draw.update({
      where: { id },
      data: { status: DrawStatus.OPEN },
    });

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DRAW_PUBLISHED',
      entityType: 'Draw',
      entityId: id,
      details: { permitNumber: draw.permitNumber },
    });

    return updated;
  }

  async closeSales(id: string, actor: { id: string; role: string }) {
    const draw = await this.prisma.draw.findUnique({ where: { id } });
    if (!draw) throw new NotFoundException('Draw not found');

    if (draw.status !== DrawStatus.OPEN && draw.status !== DrawStatus.CLOSING) {
      throw new BadRequestException(`Draw cannot be closed from current status ${draw.status}`);
    }

    const updated = await this.prisma.draw.update({
      where: { id },
      data: { status: DrawStatus.CLOSED },
    });

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DRAW_SALES_CLOSED',
      entityType: 'Draw',
      entityId: id,
      details: { soldTickets: draw.soldTickets },
    });

    return updated;
  }

  async updateDraw(id: string, dto: any, actor: { id: string; role: string }) {
    let draw = await this.prisma.draw.findUnique({
      where: { id },
      include: { prize: true },
    });
    if (!draw) {
      draw = await this.prisma.draw.findUnique({
        where: { drawNumber: id },
        include: { prize: true },
      });
    }
    if (!draw) {
      throw new NotFoundException(`Draw ${id} not found`);
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.ticketPriceEtb !== undefined) data.ticketPriceEtb = Number(dto.ticketPriceEtb);
    if (dto.totalTickets !== undefined) {
      const newTotal = Number(dto.totalTickets);
      if (newTotal < draw.soldTickets) {
        throw new BadRequestException(`Cannot set total tickets (${newTotal}) lower than already sold tickets (${draw.soldTickets})`);
      }
      data.totalTickets = newTotal;
    }
    if (dto.salesEndDate) {
      data.salesEndDate = new Date(dto.salesEndDate);
    }
    if (dto.drawDate) {
      data.drawDate = new Date(dto.drawDate);
    }
    if (dto.status) {
      data.status = dto.status;
    }
    if (dto.permitNumber) {
      data.permitNumber = dto.permitNumber;
    }
    if (dto.isFeatured !== undefined) {
      data.isFeatured = dto.isFeatured;
    }

    const incomingUpdateVideo = dto.videoUrl !== undefined
      ? dto.videoUrl
      : (dto.prize?.videoUrl !== undefined ? dto.prize.videoUrl : dto.prize?.specifications?.videoUrl);

    if (incomingUpdateVideo !== undefined && draw.prize) {
      const currentSpecs = (draw.prize.specifications as any) || {};
      let cleaned = String(incomingUpdateVideo).trim();
      if (cleaned && /(?:vt|vm)\.tiktok\.com/i.test(cleaned)) {
        cleaned = await resolveShortTikTokUrl(cleaned);
      }
      const newSpecs = {
        ...currentSpecs,
        videoUrl: cleaned,
        productVideoUrl: cleaned,
      };
      if (cleaned) {
        newSpecs['Product Video'] = cleaned;
      } else {
        delete newSpecs['Product Video'];
        delete newSpecs['videoUrl'];
        delete newSpecs['productVideoUrl'];
      }
      await this.prisma.prize.update({
        where: { id: draw.prize.id },
        data: { specifications: newSpecs },
      });
    }

    const updated = await this.prisma.draw.update({
      where: { id: draw.id },
      data,
      include: {
        prize: { include: { images: true } },
      },
    });

    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DRAW_UPDATED',
      entityType: 'Draw',
      entityId: draw.id,
      details: {
        title: updated.title,
        totalTickets: updated.totalTickets,
        salesEndDate: updated.salesEndDate,
        status: updated.status,
      },
    });

    return this.findById(draw.id);
  }

  // Persistent Live Broadcast Post State (Synchronized across all ports/clients)
  private static liveBroadcastPost: any = {
    id: 'live-post-current',
    drawId: '',
    drawNumber: '',
    drawTitle: '',
    prizeImageUrl: '',
    scheduledDate: '',
    scheduledTime: '',
    announcementTitle: 'Grand Official Live Draw - Physical Manual Draw On Camera with NLA Oversight',
    announcementDetails: 'Broadcasted live on TikTok (@natilotto) directly from NATI LOTTO Central Studio. Dual-witnessed by NLA Inspector under permit #NL-ET-2026-0941.',
    status: 'SCHEDULED', // 'SCHEDULED' | 'LIVE' | 'CONCLUDED'
    tiktokLiveUrl: 'https://www.tiktok.com/@natilotto/live',
    isWebcamLive: false,
    currentWebcamFrame: null,
    permitNumber: 'NL-ET-2026-0941',
    preDrawCommitmentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    resultHash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
    winningTicketNumber: null,
    winnerName: null,
    viewerCount: 1845,
    likeCount: 15420,
    diamondCount: 28400,
    videoStartedAt: null,
    isCustomized: false,
    updatedAt: new Date().toISOString(),
    chatMessages: [
      {
        id: 'msg-1',
        sender: 'Natnael_T',
        text: 'Welcome to the Official Nati Lotto Live Draw! 🇪🇹',
        time: 'Just now',
        badge: 'HOST',
        badgeColor: '#EF4444',
        isGift: false,
      },
      {
        id: 'msg-2',
        sender: 'Dawit.M',
        text: 'Good luck everyone! Picked my 5 tickets 🙏',
        time: 'Just now',
        badge: 'VIP',
        badgeColor: '#8B5CF6',
        isGift: false,
      },
      {
        id: 'msg-3',
        sender: 'Selam_A',
        text: 'Is the draw starting now? 📱',
        time: 'Just now',
        badge: 'Lv.7',
        badgeColor: '#10B981',
        isGift: false,
      },
    ],
  };

  async getLiveBroadcastPost() {
    try {
      const activeDraw = await this.prisma.draw.findFirst({
        where: {
          status: { in: ['CLOSING', 'OPEN', 'DRAFT'] as any },
        },
        include: {
          prize: {
            include: { images: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (activeDraw) {
        if (!DrawsService.liveBroadcastPost.isCustomized || !DrawsService.liveBroadcastPost.drawId || !DrawsService.liveBroadcastPost.drawTitle) {
          DrawsService.liveBroadcastPost.drawId = activeDraw.id;
          DrawsService.liveBroadcastPost.drawNumber = activeDraw.drawNumber;
          DrawsService.liveBroadcastPost.drawTitle = activeDraw.title;
          DrawsService.liveBroadcastPost.permitNumber = activeDraw.permitNumber || 'NL-ET-2026-0941';
          if (activeDraw.prize?.images?.[0]?.url) {
            DrawsService.liveBroadcastPost.prizeImageUrl = activeDraw.prize.images[0].url;
          }
          DrawsService.liveBroadcastPost.announcementTitle = `Official Live Draw for ${activeDraw.title}`;
          DrawsService.liveBroadcastPost.announcementDetails = `Broadcasted live on TikTok (@natilotto) directly from NATI LOTTO Central Studio under FDRE NLA Permit #${activeDraw.permitNumber || 'NL-ET-2026-0941'}.`;
        }

        // If scheduledDate is missing or already expired in the past, align with the active draw
        if (!DrawsService.liveBroadcastPost.scheduledDate || new Date(`${DrawsService.liveBroadcastPost.scheduledDate}T${DrawsService.liveBroadcastPost.scheduledTime || '20:00'}:00`).getTime() < Date.now()) {
          if (activeDraw.drawDate) {
            const dt = new Date(activeDraw.drawDate);
            if (!isNaN(dt.getTime())) {
              DrawsService.liveBroadcastPost.scheduledDate = dt.toISOString().split('T')[0];
              DrawsService.liveBroadcastPost.scheduledTime = dt.toISOString().split('T')[1].slice(0, 5);
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn('Failed to dynamically query active draw for broadcast post: ' + err);
    }
    if (!DrawsService.liveBroadcastPost.tiktokLiveUrl) {
      DrawsService.liveBroadcastPost.tiktokLiveUrl = 'https://www.tiktok.com/@natilotto/live';
    }
    return DrawsService.liveBroadcastPost;
  }

  async updateLiveBroadcastPost(payload: any) {
    if (payload.tiktokLiveUrl) {
      let cleanUrl = String(payload.tiktokLiveUrl).trim();
      if (/(?:vt|vm)\.tiktok\.com/i.test(cleanUrl)) {
        try {
          cleanUrl = await resolveShortTikTokUrl(cleanUrl);
        } catch (_) {}
      }
      if (cleanUrl.includes('tiktok.com/@') && cleanUrl.includes('?')) {
        cleanUrl = cleanUrl.split('?')[0];
      }
      payload.tiktokLiveUrl = cleanUrl;
    }

    DrawsService.liveBroadcastPost = {
      ...DrawsService.liveBroadcastPost,
      ...payload,
      isCustomized: true,
      updatedAt: new Date().toISOString(),
    };
    return DrawsService.liveBroadcastPost;
  }

  addChatMessage(sender: string, text: string, badge = 'Lv.5', badgeColor = '#F59E0B', isGift = false) {
    if (!DrawsService.liveBroadcastPost.chatMessages) {
      DrawsService.liveBroadcastPost.chatMessages = [];
    }
    const msg = {
      id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      sender: sender || 'Player',
      text: text,
      time: 'Just now',
      badge: badge || 'Lv.5',
      badgeColor: badgeColor || '#F59E0B',
      isGift: !!isGift,
    };
    DrawsService.liveBroadcastPost.chatMessages.push(msg);
    if (DrawsService.liveBroadcastPost.chatMessages.length > 50) {
      DrawsService.liveBroadcastPost.chatMessages.shift();
    }
    return msg;
  }

  incrementLikes(count = 1) {
    DrawsService.liveBroadcastPost.likeCount = (DrawsService.liveBroadcastPost.likeCount || 15420) + count;
    return DrawsService.liveBroadcastPost.likeCount;
  }

  sendGift(sender: string, giftName: string, costEtb: number, emoji: string) {
    DrawsService.liveBroadcastPost.diamondCount = (DrawsService.liveBroadcastPost.diamondCount || 28400) + costEtb * 10;
    DrawsService.liveBroadcastPost.likeCount = (DrawsService.liveBroadcastPost.likeCount || 15420) + costEtb * 5;
    return this.addChatMessage(
      sender,
      `sent a ${giftName} ${emoji} (${costEtb} ETB)!`,
      'GIFT',
      '#EC4899',
      true
    );
  }

  public static setLatestWebcamFrame(frame: string | null) {
    DrawsService.liveBroadcastPost.currentWebcamFrame = frame;
    if (frame) {
      DrawsService.liveBroadcastPost.isWebcamLive = true;
      DrawsService.liveBroadcastPost.status = 'LIVE';
      if (!DrawsService.liveBroadcastPost.videoStartedAt) {
        DrawsService.liveBroadcastPost.videoStartedAt = Date.now();
      }
    } else {
      DrawsService.liveBroadcastPost.isWebcamLive = false;
    }
  }

  public static setWebcamLive(isLive: boolean) {
    DrawsService.liveBroadcastPost.isWebcamLive = isLive;
    DrawsService.liveBroadcastPost.status = isLive ? 'LIVE' : 'CONCLUDED';
    if (isLive && !DrawsService.liveBroadcastPost.videoStartedAt) {
      DrawsService.liveBroadcastPost.videoStartedAt = Date.now();
    }
    if (!isLive) {
      DrawsService.liveBroadcastPost.currentWebcamFrame = null;
    }
  }

  public static getLatestWebcamFrame(): string | null {
    return DrawsService.liveBroadcastPost.currentWebcamFrame || null;
  }

  public static isWebcamLive(): boolean {
    return !!DrawsService.liveBroadcastPost.isWebcamLive;
  }

  public static getLiveBroadcastPostStatic(): any {
    return DrawsService.liveBroadcastPost;
  }

  async findTicketOwner(drawIdOrNumber: string, ticketNumber: string) {
    if (!ticketNumber || !ticketNumber.trim()) {
      return { found: false, message: 'Ticket number is required' };
    }

    const rawNum = ticketNumber.trim();
    const cleanNum = rawNum.startsWith('#') ? rawNum : '#' + rawNum;
    const numWithoutHash = rawNum.replace(/^#/, '');
    const numPadded = numWithoutHash.padStart(4, '0');
    const cleanNumPadded = '#' + numPadded;

    const orConditions: any[] = [
      { drawId: drawIdOrNumber, ticketNumber: cleanNum },
      { drawId: drawIdOrNumber, ticketNumber: numWithoutHash },
      { drawId: drawIdOrNumber, ticketNumber: cleanNumPadded },
      { drawId: drawIdOrNumber, ticketNumber: numPadded },
      { draw: { drawNumber: drawIdOrNumber }, ticketNumber: cleanNum },
      { draw: { drawNumber: drawIdOrNumber }, ticketNumber: numWithoutHash },
      { draw: { drawNumber: drawIdOrNumber }, ticketNumber: cleanNumPadded },
      { draw: { title: drawIdOrNumber }, ticketNumber: cleanNum },
    ];

    let ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            phone: true,
            location: true,
          },
        },
        draw: {
          select: {
            id: true,
            drawNumber: true,
            title: true,
          },
        },
      },
    });

    // Fallback: If not found in specified draw, search across all sold tickets for this ticket number
    if (!ticket) {
      ticket = await this.prisma.ticket.findFirst({
        where: {
          OR: [
            { ticketNumber: cleanNum },
            { ticketNumber: numWithoutHash },
            { ticketNumber: cleanNumPadded },
            { ticketNumber: numPadded },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              phone: true,
              location: true,
            },
          },
          draw: {
            select: {
              id: true,
              drawNumber: true,
              title: true,
            },
          },
        },
      });
    }

    if (!ticket || !ticket.user) {
      return {
        found: false,
        ticketNumber: cleanNum,
        message: `Ticket ${cleanNum} was not found in sold tickets.`,
      };
    }

    const fullName = [ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(' ') || ticket.user.displayName || 'Verified Player';
    const loc = ticket.user.location ? ` (${ticket.user.location})` : '';

    return {
      found: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ownerName: `${fullName}${loc}`,
      userId: ticket.userId,
      drawId: ticket.drawId,
      drawTitle: ticket.draw?.title,
      drawNumber: ticket.draw?.drawNumber,
    };
  }

  async getSoldTickets(drawIdOrNumber: string) {
    const tickets: any[] = await this.prisma.ticket.findMany({
      where: {
        OR: [
          { drawId: drawIdOrNumber },
          { draw: { drawNumber: drawIdOrNumber } },
        ],
        status: { in: ['CONFIRMED', 'WON'] as any },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            displayName: true,
            location: true,
          },
        },
      },
      orderBy: { ticketNumber: 'asc' },
      take: 200,
    });

    return tickets.map((t: any) => {
      const name = [t.user?.firstName, t.user?.lastName].filter(Boolean).join(' ') || t.user?.displayName || 'Verified Player';
      const loc = t.user?.location ? ` (${t.user.location})` : '';
      return {
        ticketNumber: t.ticketNumber,
        ownerName: `${name}${loc}`,
      };
    });
  }

  async checkTikTokLiveStatus(usernameOrUrl: string) {
    let cleanHandle = (usernameOrUrl || '').trim();
    const handleMatch = cleanHandle.match(/@([a-zA-Z0-9_.-]+)/);
    if (handleMatch && handleMatch[1]) {
      cleanHandle = handleMatch[1];
    } else {
      cleanHandle = cleanHandle.replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@?/, '').split('/')[0].split('?')[0];
    }

    if (!cleanHandle) {
      return { isLive: false, username: '', message: 'Invalid TikTok username' };
    }

    try {
      const webcastUrl = `https://webcast.tiktok.com/webcast/room/info_by_user/?aid=1988&unique_id=${encodeURIComponent(cleanHandle)}`;
      const res = await fetch(webcastUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/',
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data.status_code === 0 && data.data && data.data.status === 2) {
          const hlsUrl = data.data.stream_url?.hls_pull_url ||
            data.data.stream_url?.live_core_sdk_data?.pull_data?.stream_data;
          return {
            isLive: true,
            username: cleanHandle,
            title: data.data.title || `Live Stream by @${cleanHandle}`,
            viewerCount: data.data.user_count || 1200,
            hlsUrl: hlsUrl || '',
            flvUrl: data.data.stream_url?.flv_pull_url || '',
            streamUrl: hlsUrl ? `http://localhost:4000/api/v1/draws/live-broadcast/proxy-stream?url=${encodeURIComponent(hlsUrl)}` : '',
            rawHlsUrl: hlsUrl || '',
          };
        }
      }
    } catch (err) {
      this.logger.warn(`TikTok Webcast API error for ${cleanHandle}: ${err}`);
    }

    return {
      isLive: false,
      username: cleanHandle,
      message: `Waiting for @${cleanHandle} to broadcast on TikTok`,
    };
  }

  async proxyTikTokStream(streamUrl: string, req: Request, res: Response) {
    if (!streamUrl) {
      return res.status(400).send('Stream URL required');
    }
    try {
      const response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.tiktok.com/',
        },
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/vnd.apple.mpegurl');

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('mpegurl') || streamUrl.includes('.m3u8')) {
        const text = await response.text();
        const base = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
        const rewritten = text.replace(/^(?!#)(.*)$/gm, (line) => {
          const trimmed = line.trim();
          if (!trimmed) return trimmed;
          const absolute = trimmed.startsWith('http') ? trimmed : base + trimmed;
          return `http://localhost:4000/api/v1/draws/live-broadcast/proxy-stream?url=${encodeURIComponent(absolute)}`;
        });
        return res.send(rewritten);
      }

      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (e: any) {
      return res.status(500).send('Proxy error: ' + e.message);
    }
  }

  async saveUploadedLiveVideo(buffer: Buffer, originalFilename: string) {
    const videosDir = path.join(process.cwd(), 'data', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    const safeName = `draw-live-${Date.now()}.mp4`;
    const filePath = path.join(videosDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const videoUrl = `http://localhost:4000/api/v1/winners/video/${safeName}`;

    DrawsService.liveBroadcastPost.tiktokLiveUrl = videoUrl;
    DrawsService.liveBroadcastPost.isCustomized = true;
    DrawsService.liveBroadcastPost.status = 'LIVE';
    DrawsService.liveBroadcastPost.updatedAt = new Date().toISOString();

    return {
      success: true,
      videoUrl,
      filename: safeName,
    };
  }
}

