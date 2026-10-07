import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimStatus } from '@nati-lotto/shared-types';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import { resolveShortTikTokUrl } from '../draws/draws.service';

export interface FeaturedWinnerVideo {
  id: string;
  winnerId?: string;
  winnerName: string;
  winnerPhone?: string;
  winnerLocation?: string;
  prizeTitle: string;
  prizeImageUrl?: string;
  winningTicketNumber?: string;
  drawNumber?: string;
  drawTitle?: string;
  videoUrl: string;
  directVideoUrl?: string;
  videoPlatform?: 'tiktok' | 'youtube' | 'mp4' | 'other';
  tiktokVideoId?: string;
  tiktokAuthor?: string;
  tiktokAuthorUrl?: string;
  tiktokEmbedHtml?: string;
  thumbnailUrl?: string;
  handoverDate: string;
  handoverLocation: string;
  testimonialQuote?: string;
  permitNumber?: string;
  publishedAt: string;
  publishedBy?: string;
}

export interface PromotionVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  directVideoUrl?: string;
  videoPlatform?: 'tiktok' | 'youtube' | 'mp4' | 'other';
  tiktokVideoId?: string;
  tiktokAuthor?: string;
  tiktokAuthorUrl?: string;
  tiktokEmbedHtml?: string;
  thumbnailUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  campaignBadge?: string;
  publishedAt: string;
  publishedBy?: string;
  isActive: boolean;
}

const DEFAULT_FEATURED_WINNER_VIDEO: FeaturedWinnerVideo = {
  id: 'hw-vid-nati-official-01',
  winnerName: 'Dagim Bekele',
  winnerPhone: '+251 911 ••• 567',
  winnerLocation: 'Addis Ababa (Bole Medhanealem)',
  prizeTitle: 'Rolex Submariner Date 41mm Oystersteel',
  prizeImageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
  winningTicketNumber: '#0008',
  drawNumber: 'NL-000123',
  drawTitle: 'Rolex Submariner Draw',
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  videoPlatform: 'mp4',
  tiktokVideoId: '7688259337197767943',
  tiktokAuthor: 'nati_lotto',
  tiktokAuthorUrl: 'https://www.tiktok.com/@nati_lotto',
  thumbnailUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
  handoverDate: '27 Sep 2026',
  handoverLocation: 'NATI LOTTO Addis Ababa Central Hub, Bole Sub-City',
  testimonialQuote: 'በቴሌብር 5 ቲኬት ቆርጬ ይሄንን የሮሌክስ ሰዓት አሸንፋለሁ ብዬ በፍጹም አላሰብኩም ነበር። በብሔራዊ ሎተሪ አስተዳደር ተቆጣጣሪዎች ፊት ተረጋግጦ በእጄ ደርሶኛል! አመሰግናለሁ ናቲ ሎቶ!',
  permitNumber: 'NL-ET-2026-0892',
  publishedAt: '2026-09-27T18:00:00.000Z',
  publishedBy: 'Natnael T. (SuperAdmin)',
};

const DEFAULT_PROMOTION_VIDEO: PromotionVideo = {
  id: 'promo-vid-nati-official-01',
  title: 'Official Nati Lotto Brand & Weekly Draw Campaign',
  description: 'Play licensed national lottery draws via Telebirr starting from only 5 ETB! 100% tax settled & NLA verified.',
  videoUrl: 'https://www.tiktok.com/@nati_lotto/video/7688259337197767943',
  videoPlatform: 'tiktok',
  tiktokVideoId: '7688259337197767943',
  tiktokAuthor: 'nati_lotto',
  tiktokAuthorUrl: 'https://www.tiktok.com/@nati_lotto',
  thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
  ctaText: "Play Today's Draws",
  ctaLink: '/draws',
  campaignBadge: 'Official Promotion',
  publishedAt: '2026-09-28T08:00:00.000Z',
  publishedBy: 'Natnael T. (SuperAdmin)',
  isActive: true,
};

@Injectable()
export class WinnersService {
  private readonly logger = new Logger(WinnersService.name);
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly videosDir = path.join(this.dataDir, 'videos');
  private readonly featuredFilePath = path.join(this.dataDir, 'featured_winner_video.json');
  private readonly historyFilePath = path.join(this.dataDir, 'winner_videos_history.json');
  private readonly promotionFilePath = path.join(this.dataDir, 'promotion_video.json');
  private readonly promotionHistoryFilePath = path.join(this.dataDir, 'promotion_videos_history.json');
  private cachedFeaturedVideo: FeaturedWinnerVideo = DEFAULT_FEATURED_WINNER_VIDEO;
  private cachedPromotionVideo: PromotionVideo = DEFAULT_PROMOTION_VIDEO;

  constructor(private readonly prisma: PrismaService) {
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (!fs.existsSync(this.videosDir)) {
        fs.mkdirSync(this.videosDir, { recursive: true });
      }
      if (fs.existsSync(this.featuredFilePath)) {
        const raw = fs.readFileSync(this.featuredFilePath, 'utf8');
        this.cachedFeaturedVideo = JSON.parse(raw);
      } else {
        fs.writeFileSync(this.featuredFilePath, JSON.stringify(DEFAULT_FEATURED_WINNER_VIDEO, null, 2), 'utf8');
        this.cachedFeaturedVideo = DEFAULT_FEATURED_WINNER_VIDEO;
      }

      if (fs.existsSync(this.promotionFilePath)) {
        const rawPromo = fs.readFileSync(this.promotionFilePath, 'utf8');
        this.cachedPromotionVideo = JSON.parse(rawPromo);
      } else {
        fs.writeFileSync(this.promotionFilePath, JSON.stringify(DEFAULT_PROMOTION_VIDEO, null, 2), 'utf8');
        this.cachedPromotionVideo = DEFAULT_PROMOTION_VIDEO;
      }
    } catch (err) {
      this.logger.warn('Failed to init video storage, using memory fallback: ' + err);
    }
  }

  async getRecentWinners(limit: number = 20) {
    const winners = await this.prisma.winner.findMany({
      include: {
        draw: {
          include: {
            prize: {
              include: { images: { where: { isPrimary: true } } },
            },
            result: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return winners.map((w) => ({
      id: w.id,
      drawId: w.drawId,
      drawNumber: w.draw.drawNumber,
      drawTitle: w.draw.title,
      prizeTitle: w.draw.prize?.title || 'Grand Prize',
      prizeImageUrl: w.draw.prize?.images[0]?.url || '',
      ticketId: w.ticketId,
      winningTicketNumber: w.winningTicketNumber,
      winnerDisplayName: w.winnerDisplayName,
      drawDate: w.draw.drawDate.toISOString(),
      claimStatus: w.claimStatus,
      resultHash: w.draw.result?.resultHash || '',
      snapshotHash: w.draw.result?.snapshotHash || '',
      createdAt: w.createdAt.toISOString(),
    }));
  }

  async getWinnerById(id: string) {
    const winner = await this.prisma.winner.findUnique({
      where: { id },
      include: {
        draw: {
          include: {
            prize: { include: { images: true } },
            result: true,
          },
        },
        claim: {
          include: { delivery: true },
        },
      },
    });

    if (!winner) {
      throw new NotFoundException('Winner record not found');
    }

    return winner;
  }

  // Get currently featured winner handover video for homepage
  async getFeaturedWinnerVideo(): Promise<FeaturedWinnerVideo> {
    try {
      if (fs.existsSync(this.featuredFilePath)) {
        const raw = fs.readFileSync(this.featuredFilePath, 'utf8');
        this.cachedFeaturedVideo = JSON.parse(raw);
      }
    } catch (err) {
      this.logger.warn('Failed to read featured winner video: ' + err);
    }
    return this.cachedFeaturedVideo;
  }

  // Fetch direct unwatermarked TikTok MP4 URL via helper
  async fetchTikTokDirectPlayUrl(url: string): Promise<{ playUrl?: string; coverUrl?: string; title?: string; author?: string } | null> {
    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.code === 0 && data.data?.play) {
          return {
            playUrl: data.data.play,
            coverUrl: data.data.cover || data.data.origin_cover,
            title: data.data.title,
            author: data.data.author?.nickname || data.data.author?.unique_id,
          };
        }
      }
    } catch (err) {
      this.logger.warn('TikTok direct stream lookup error: ' + err);
    }
    return null;
  }

  // Stream cached MP4 video directly with HTTP Range (206) support
  async streamVideo(filename: string, req: Request, res: Response) {
    let cleanName = path.basename(filename.trim());
    if (!cleanName.endsWith('.mp4')) {
      cleanName += '.mp4';
    }
    const filePath = path.join(this.videosDir, cleanName);

    // If file does not exist, try auto-downloading if it's a numeric TikTok ID
    if (!fs.existsSync(filePath)) {
      const videoId = cleanName.replace(/\.mp4$/, '');
      if (/^\d{16,21}$/.test(videoId)) {
        try {
          // Look up if any draw prize or winner has this video ID in its specifications or videoUrl
          let targetUrl = `https://www.tiktok.com/@a/video/${videoId}`;
          try {
            const prizes = await this.prisma.prize.findMany({
              select: { specifications: true },
            });
            for (const p of prizes) {
              const specs = p.specifications as any;
              if (specs && typeof specs === 'object') {
                for (const v of Object.values(specs)) {
                  if (typeof v === 'string' && v.includes(videoId)) {
                    targetUrl = v.trim();
                    break;
                  }
                }
              }
            }
          } catch (_) {}

          const direct = await this.fetchTikTokDirectPlayUrl(targetUrl);
          if (direct?.playUrl) {
            // Asynchronously cache for future fast Range streaming
            fetch(direct.playUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.tiktok.com/',
              },
            }).then(async (vidRes) => {
              if (vidRes.ok) {
                const buffer = Buffer.from(await vidRes.arrayBuffer());
                if (buffer.length > 50000 && !fs.existsSync(filePath)) {
                  fs.writeFileSync(filePath, buffer);
                }
              }
            }).catch(err => this.logger.warn(`Background cache write error for ${videoId}: ${err}`));

            // Immediately redirect player to valid direct playUrl if local file is not ready yet
            return res.redirect(direct.playUrl);
          }
        } catch (e) {
          this.logger.warn(`Failed to resolve or auto-cache video ${videoId}: ${e}`);
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      if (cleanName === 'promo-latest.mp4') {
        const fallbackVideo = path.join(this.videosDir, 'promo-latest.mp4');
        if (fs.existsSync(fallbackVideo)) {
          return this.serveFileWithRange(fallbackVideo, req, res);
        }
      }
      return res.status(404).json({ error: 'Video not found', requested: cleanName });
    }

    return this.serveFileWithRange(filePath, req, res);
  }

  private serveFileWithRange(filePath: string, req: Request, res: Response) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    if (req.method === 'HEAD') {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
      });
      res.end();
      return;
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).header('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  }

  // Resolve TikTok video details from URL or embed code
  async resolveTikTok(url: string): Promise<{
    isTikTok: boolean;
    videoId?: string;
    authorName?: string;
    authorUrl?: string;
    title?: string;
    thumbnailUrl?: string;
    embedHtml?: string;
    directVideoUrl?: string;
  }> {
    if (!url || typeof url !== 'string') {
      return { isTikTok: false };
    }
    let cleanUrl = url.trim();
    if (/(?:vt|vm)\.tiktok\.com/i.test(cleanUrl)) {
      try {
        const canonical = await resolveShortTikTokUrl(cleanUrl);
        if (canonical && canonical !== cleanUrl) {
          cleanUrl = canonical;
        }
      } catch (_) {}
    }

    const isTikTok = /tiktok\.com/.test(cleanUrl) || /data-video-id=/.test(cleanUrl);
    if (!isTikTok) {
      return { isTikTok: false };
    }

    // Extract video ID from URL
    let videoId: string | undefined;
    const idMatch = cleanUrl.match(/(?:video|v|embed|v2|shorts)\/(\d+)/i) ||
                    cleanUrl.match(/data-video-id=["'](\d+)["']/i) ||
                    cleanUrl.match(/\b(\d{16,21})\b/);
    if (idMatch) {
      videoId = idMatch[1];
    }

    // Extract username
    let authorName: string | undefined;
    const userMatch = cleanUrl.match(/@([a-zA-Z0-9_.-]+)/);
    if (userMatch) {
      authorName = userMatch[1];
    }

    // Fetch direct stream URL if possible
    let directVideoUrl: string | undefined;
    let tikwmTitle: string | undefined;
    let tikwmThumb: string | undefined;

    try {
      const direct = await this.fetchTikTokDirectPlayUrl(cleanUrl);
      if (direct?.playUrl) {
        directVideoUrl = direct.playUrl;
        tikwmTitle = direct.title;
        tikwmThumb = direct.coverUrl;
        authorName = direct.author || authorName;
      }
    } catch (_) {}

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data: any = await res.json();
        const vId = data.embed_product_id || videoId;
        const localStreamUrl = vId ? `/api/v1/winners/video/${vId}.mp4` : undefined;

        return {
          isTikTok: true,
          videoId: vId,
          authorName: data.author_name || authorName || data.author_unique_id,
          authorUrl: data.author_url,
          title: data.title || tikwmTitle,
          thumbnailUrl: data.thumbnail_url || tikwmThumb,
          embedHtml: data.html,
          directVideoUrl: localStreamUrl || directVideoUrl,
        };
      }
    } catch (err) {
      this.logger.warn('TikTok oEmbed request failed: ' + err);
    }

    // Graceful fallback if oEmbed is unreachable or blocked
    const fallbackId = videoId || '7690049442619084033';
    const fallbackHtml = `<blockquote class="tiktok-embed" cite="${cleanUrl}" data-video-id="${fallbackId}" style="max-width: 605px;min-width: 325px;"><section><a target="_blank" href="${cleanUrl}">@${authorName || 'winner'}</a><p>NATI LOTTO Official Promotion</p></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;

    return {
      isTikTok: true,
      videoId: fallbackId,
      authorName: authorName || 'natilotto_official',
      authorUrl: authorName ? `https://www.tiktok.com/@${authorName}` : 'https://www.tiktok.com',
      title: tikwmTitle || 'NATI LOTTO Official Promotion',
      thumbnailUrl: tikwmThumb,
      embedHtml: fallbackHtml,
      directVideoUrl: `/api/v1/winners/video/${fallbackId}.mp4`,
    };
  }

  // Admin posts a new video of a winner receiving a product
  async postFeaturedWinnerVideo(payload: Partial<FeaturedWinnerVideo>, actor?: { id: string; role: string }): Promise<FeaturedWinnerVideo> {
    let videoPlatform: 'tiktok' | 'youtube' | 'mp4' | 'other' = payload.videoPlatform || 'mp4';
    let tiktokVideoId = payload.tiktokVideoId;
    let tiktokAuthor = payload.tiktokAuthor;
    let tiktokAuthorUrl = payload.tiktokAuthorUrl;
    let tiktokEmbedHtml = payload.tiktokEmbedHtml;
    let thumbnailUrl = payload.thumbnailUrl || payload.prizeImageUrl;
    let videoUrl = (payload.videoUrl || DEFAULT_FEATURED_WINNER_VIDEO.videoUrl).trim();

    if (/tiktok\.com/.test(videoUrl) || tiktokEmbedHtml || tiktokVideoId) {
      videoPlatform = 'tiktok';
      // Auto-resolve if missing
      if (!tiktokEmbedHtml || !tiktokVideoId) {
        const resolved = await this.resolveTikTok(videoUrl);
        if (resolved.isTikTok) {
          tiktokVideoId = resolved.videoId || tiktokVideoId;
          tiktokAuthor = resolved.authorName || tiktokAuthor;
          tiktokAuthorUrl = resolved.authorUrl || tiktokAuthorUrl;
          tiktokEmbedHtml = resolved.embedHtml || tiktokEmbedHtml;
          if (resolved.thumbnailUrl && !payload.thumbnailUrl) {
            thumbnailUrl = resolved.thumbnailUrl;
          }
          if (resolved.title && !payload.testimonialQuote) {
            payload.testimonialQuote = resolved.title;
          }
        }
      }
    } else if (/youtube\.com|youtu\.be/.test(videoUrl)) {
      videoPlatform = 'youtube';
    } else if (/\.(mp4|webm|ogg)($|\?)/i.test(videoUrl)) {
      videoPlatform = 'mp4';
    }

    const video: FeaturedWinnerVideo = {
      id: payload.id || `hw-vid-${Date.now()}`,
      winnerId: payload.winnerId,
      winnerName: payload.winnerName || 'Certified Winner',
      winnerPhone: payload.winnerPhone || '+251 911 ••• ••',
      winnerLocation: payload.winnerLocation || 'Addis Ababa',
      prizeTitle: payload.prizeTitle || 'Physical Prize',
      prizeImageUrl: payload.prizeImageUrl || 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80',
      winningTicketNumber: payload.winningTicketNumber || '#0382',
      drawNumber: payload.drawNumber || 'NL-000123',
      drawTitle: payload.drawTitle || payload.prizeTitle || 'Lottery Draw',
      videoUrl: videoUrl,
      videoPlatform: videoPlatform,
      tiktokVideoId: tiktokVideoId,
      tiktokAuthor: tiktokAuthor,
      tiktokAuthorUrl: tiktokAuthorUrl,
      tiktokEmbedHtml: tiktokEmbedHtml,
      thumbnailUrl: thumbnailUrl,
      handoverDate: payload.handoverDate || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      handoverLocation: payload.handoverLocation || 'NATI LOTTO Addis Ababa Central Hub',
      testimonialQuote: payload.testimonialQuote || 'Thank you NATI LOTTO! I received my prize in person under full Ethiopian National Lottery Administration oversight!',
      permitNumber: payload.permitNumber || 'NL-ET-2026-0892',
      publishedAt: new Date().toISOString(),
      publishedBy: actor ? `${actor.role} (${actor.id})` : 'Natnael T. (SuperAdmin)',
    };

    this.cachedFeaturedVideo = video;

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.featuredFilePath, JSON.stringify(video, null, 2), 'utf8');

      // Append to history
      let history: FeaturedWinnerVideo[] = [];
      if (fs.existsSync(this.historyFilePath)) {
        try {
          history = JSON.parse(fs.readFileSync(this.historyFilePath, 'utf8'));
        } catch (_) {}
      }
      history = [video, ...history.filter(h => h.id !== video.id)].slice(0, 50);
      fs.writeFileSync(this.historyFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
      this.logger.error('Failed to write winner video to disk: ' + err);
    }

    // If winnerId matches a database winner, update notes or claim delivery
    if (payload.winnerId) {
      try {
        const dbWinner = await this.prisma.winner.findFirst({
          where: {
            OR: [
              { id: payload.winnerId },
              { id: { startsWith: payload.winnerId.replace(/^DLV-/, '') } },
            ],
          },
        });
        if (dbWinner) {
          await this.prisma.winner.update({
            where: { id: dbWinner.id },
            data: {
              claimStatus: ClaimStatus.DELIVERED,
              trackingNumber: payload.permitNumber || dbWinner.trackingNumber,
            },
          });
        }
      } catch (err) {
        this.logger.warn('Failed to link video with DB winner record: ' + err);
      }
    }

    return video;
  }

  // Get all posted handover videos history
  async getAllWinnerVideos(): Promise<FeaturedWinnerVideo[]> {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      this.logger.warn('Failed to read winner videos history: ' + err);
    }
    return [this.cachedFeaturedVideo];
  }

  // Reset to default winner video
  async resetFeaturedWinnerVideo(): Promise<FeaturedWinnerVideo> {
    this.cachedFeaturedVideo = DEFAULT_FEATURED_WINNER_VIDEO;
    try {
      fs.writeFileSync(this.featuredFilePath, JSON.stringify(DEFAULT_FEATURED_WINNER_VIDEO, null, 2), 'utf8');
    } catch (_) {}
    return DEFAULT_FEATURED_WINNER_VIDEO;
  }

  // Get current active promotion video
  async getPromotionVideo(): Promise<PromotionVideo> {
    try {
      if (fs.existsSync(this.promotionFilePath)) {
        const raw = fs.readFileSync(this.promotionFilePath, 'utf8');
        this.cachedPromotionVideo = JSON.parse(raw);
      }
    } catch (err) {
      this.logger.warn('Failed to read promotion video: ' + err);
    }
    return this.cachedPromotionVideo;
  }

  // Get all posted promotion videos history
  async getAllPromotionVideos(): Promise<PromotionVideo[]> {
    try {
      if (fs.existsSync(this.promotionHistoryFilePath)) {
        const raw = fs.readFileSync(this.promotionHistoryFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      this.logger.warn('Failed to read promotion videos history: ' + err);
    }
    return [this.cachedPromotionVideo];
  }

  // Admin posts a new promotion / campaign video
  async postPromotionVideo(payload: Partial<PromotionVideo>, actor?: { id: string; role: string }): Promise<PromotionVideo> {
    let videoPlatform: 'tiktok' | 'youtube' | 'mp4' | 'other' = payload.videoPlatform || 'mp4';
    let tiktokVideoId = payload.tiktokVideoId;
    let tiktokAuthor = payload.tiktokAuthor;
    let tiktokAuthorUrl = payload.tiktokAuthorUrl;
    let tiktokEmbedHtml = payload.tiktokEmbedHtml;
    let thumbnailUrl = payload.thumbnailUrl;
    let videoUrl = (payload.videoUrl || DEFAULT_PROMOTION_VIDEO.videoUrl).trim();

    if (/tiktok\.com/.test(videoUrl) || tiktokEmbedHtml || tiktokVideoId) {
      videoPlatform = 'tiktok';
      if (!tiktokEmbedHtml || !tiktokVideoId) {
        const resolved = await this.resolveTikTok(videoUrl);
        if (resolved.isTikTok) {
          tiktokVideoId = resolved.videoId || tiktokVideoId;
          tiktokAuthor = resolved.authorName || tiktokAuthor;
          tiktokAuthorUrl = resolved.authorUrl || tiktokAuthorUrl;
          tiktokEmbedHtml = resolved.embedHtml || tiktokEmbedHtml;
          if (resolved.thumbnailUrl && !payload.thumbnailUrl) {
            thumbnailUrl = resolved.thumbnailUrl;
          }
          if (resolved.title && !payload.description) {
            payload.description = resolved.title;
          }
        }
      }
    } else if (/youtube\.com|youtu\.be/.test(videoUrl)) {
      videoPlatform = 'youtube';
    } else if (/\.(mp4|webm|ogg)($|\?)/i.test(videoUrl)) {
      videoPlatform = 'mp4';
    }

    const localDirectStream = tiktokVideoId ? `/api/v1/winners/video/${tiktokVideoId}.mp4` : (videoPlatform === 'mp4' ? videoUrl : undefined);

    const video: PromotionVideo = {
      id: payload.id || `promo-vid-${Date.now()}`,
      title: payload.title || 'Official Nati Lotto Campaign & Promotion',
      description: payload.description || 'Watch our latest official promotion and join exciting national lottery prize draws!',
      videoUrl: videoUrl,
      directVideoUrl: payload.directVideoUrl || localDirectStream,
      videoPlatform: videoPlatform,
      tiktokVideoId: tiktokVideoId,
      tiktokAuthor: tiktokAuthor,
      tiktokAuthorUrl: tiktokAuthorUrl,
      tiktokEmbedHtml: tiktokEmbedHtml,
      thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
      ctaText: payload.ctaText || "Play Today's Draws",
      ctaLink: payload.ctaLink || '/draws',
      campaignBadge: payload.campaignBadge || 'Official Promotion',
      publishedAt: new Date().toISOString(),
      publishedBy: actor ? `${actor.role} (${actor.id})` : 'Natnael T. (SuperAdmin)',
      isActive: true,
    };

    this.cachedPromotionVideo = video;

    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.promotionFilePath, JSON.stringify(video, null, 2), 'utf8');

      // Append to history
      let history: PromotionVideo[] = [];
      if (fs.existsSync(this.promotionHistoryFilePath)) {
        try {
          history = JSON.parse(fs.readFileSync(this.promotionHistoryFilePath, 'utf8'));
        } catch (_) {}
      }
      history = [video, ...history.filter(h => h.id !== video.id)].slice(0, 50);
      fs.writeFileSync(this.promotionHistoryFilePath, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
      this.logger.error('Failed to write promotion video to disk: ' + err);
    }

    return video;
  }

  // Reset to default promotion video
  async resetPromotionVideo(): Promise<PromotionVideo> {
    this.cachedPromotionVideo = DEFAULT_PROMOTION_VIDEO;
    try {
      fs.writeFileSync(this.promotionFilePath, JSON.stringify(DEFAULT_PROMOTION_VIDEO, null, 2), 'utf8');
    } catch (_) {}
    return DEFAULT_PROMOTION_VIDEO;
  }
}

