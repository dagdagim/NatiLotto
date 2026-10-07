export const API_BASE_URL = 'http://localhost:4000/api/v1';

export interface DrawItem {
  id: string;
  drawNumber: string;
  title: string;
  description: string;
  ticketPriceEtb: number;
  totalTickets: number;
  soldTickets: number;
  remainingTickets: number;
  maxTicketsPerUser: number;
  status: 'OPEN' | 'COMPLETED' | 'DRAWING' | 'CLOSED' | 'DRAFT' | 'AUTHORIZED';
  salesStartDate: string;
  salesEndDate: string;
  drawDate: string;
  permitNumber: string;
  isFeatured: boolean;
  videoUrl?: string;
  snapshotHash?: string;
  resultHash?: string;
  prize?: {
    id: string;
    title: string;
    description: string;
    specifications: Record<string, string>;
    videoUrl?: string;
    retailValueEtb: number;
    category: string;
    images: Array<{
      id: string;
      url: string;
      isPrimary: boolean;
      displayOrder: number;
    }>;
  };
  rules?: Array<{ id: string; ruleText: string; displayOrder: number }>;
  result?: any;
}

export interface TicketItem {
  id: string;
  ticketNumber: string;
  sequenceNumber: number;
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  prizeTitle: string;
  prizeImageUrl: string;
  ticketPriceEtb: number;
  userId: string;
  orderId: string;
  status: string;
  isWinningTicket: boolean;
  qrPayload: string;
  hashSignature: string;
  createdAt: string;
  drawDate: string;
  drawStatus: string;
}

export interface WinnerItem {
  id: string;
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  prizeTitle: string;
  prizeImageUrl: string;
  ticketId: string;
  winningTicketNumber: string;
  winnerDisplayName: string;
  drawDate: string;
  claimStatus: string;
  resultHash: string;
  snapshotHash: string;
  createdAt: string;
}

export interface VerificationResult {
  isValidTicket: boolean;
  isWinningTicket: boolean;
  drawNumber: string;
  ticketNumber: string;
  drawTitle: string;
  prizeTitle: string;
  drawDate: string;
  drawStatus: string;
  snapshotHash?: string;
  resultHash?: string;
  randomnessProof?: any;
  winnerName?: string;
  verifiedAt: string;
}

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

class ApiService {

  private getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const activeToken = token || localStorage.getItem('nati_lotto_token');
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  // --- DRAWS ---
  async getDraws(params?: {
    status?: string;
    category?: string;
    isFeatured?: boolean;
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<{ total: number; draws: DrawItem[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.isFeatured !== undefined) query.append('isFeatured', String(params.isFeatured));
    if (params?.search) query.append('search', params.search);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await fetch(`${API_BASE_URL}/draws?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch draws: ${res.statusText}`);
    return res.json();
  }

  async getDrawById(id: string): Promise<DrawItem> {
    const res = await fetch(`${API_BASE_URL}/draws/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch draw ${id}: ${res.statusText}`);
    return res.json();
  }

  async getTicketAvailability(id: string): Promise<{
    drawId: string;
    drawNumber: string;
    totalTickets: number;
    soldTickets: number;
    remainingTickets: number;
    ticketPriceEtb: number;
    status: string;
    bookedSequenceNumbers: number[];
    bookedTicketNumbers: string[];
  }> {
    const res = await fetch(`${API_BASE_URL}/draws/${id}/ticket-availability`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch ticket availability for draw ${id}`);
    return res.json();
  }

  // --- TICKETS ---
  async getUserTickets(userId: string, status?: string): Promise<TicketItem[]> {
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE_URL}/tickets/user/${userId}${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch tickets: ${res.statusText}`);
    return res.json();
  }

  async getTicketDetails(id: string): Promise<TicketItem> {
    const res = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch ticket ${id}`);
    return res.json();
  }

  // --- WINNERS ---
  async getWinners(limit = 20): Promise<WinnerItem[]> {
    const res = await fetch(`${API_BASE_URL}/winners?limit=${limit}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch winners: ${res.statusText}`);
    return res.json();
  }

  // --- VERIFICATION ---
  async verifyTicket(drawNumber: string, ticketNumber: string): Promise<VerificationResult> {
    const query = new URLSearchParams({ drawNumber, ticketNumber });
    const res = await fetch(`${API_BASE_URL}/verify?${query.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Verification query failed: ${res.statusText}`);
    return res.json();
  }

  async getDrawVerification(drawId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/verify/draw/${drawId}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch draw verification`);
    return res.json();
  }

  // --- ORDERS / PURCHASE TICKETS ---
  async purchaseTickets(data: {
    userId: string;
    drawId: string;
    quantity: number;
    paymentMethod: string;
    selectedSequenceNumbers?: number[];
    idempotencyKey?: string;
    returnUrl?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...data,
        idempotencyKey: data.idempotencyKey || `ord_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Ticket order failed');
    }
    return res.json();
  }

  async verifyPayment(reference: string): Promise<{
    success: boolean;
    orderId?: string;
    orderNumber?: string;
    drawId?: string;
    drawNumber?: string;
    drawTitle?: string;
    userId?: string;
    quantity?: number;
    totalEtb?: number;
    ticketNumbers?: string[];
    status: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/payments/verify/${encodeURIComponent(reference)}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Payment verification failed');
    return res.json();
  }

  // --- AUTH ---
  async login(phone: string, password?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Login failed');
    }
    return res.json();
  }

  async register(data: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Registration failed');
    }
    return res.json();
  }

  async forgotPassword(emailOrPhone: string): Promise<{ success: boolean; email?: string; maskedEmail?: string; devOtp?: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrPhone }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to request password reset code');
    }
    return data;
  }

  async resetPassword(params: { emailOrPhone: string; code: string; newPassword: string }): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }
    return data;
  }

  // --- ADMIN CONTROL CENTER (LIVE POSTGRESQL) ---
  async getAdminDashboard(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin dashboard metrics');
    return res.json();
  }

  async getAdminDraws(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/draws-list`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin draws list');
    return res.json();
  }

  async getAdminTickets(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/tickets`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin tickets');
    return res.json();
  }

  async getAdminUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/users`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin users');
    return res.json();
  }

  async getAdminPayments(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/payments`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin payments');
    return res.json();
  }

  async getAdminSupport(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/admin/support`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin support tickets');
    return res.json();
  }

  async createAdminDraw(drawData: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(drawData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Failed to create draw');
    }
    return res.json();
  }

  async publishDraw(drawId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/${drawId}/publish`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Failed to publish draw');
    }
    return res.json();
  }

  async closeDrawSales(drawId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/${drawId}/close`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async createDrawSnapshot(drawId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/${drawId}/snapshot`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async authorizeDraw(drawId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/${drawId}/authorize`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async executeDraw(drawId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/${drawId}/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async updateUserKyc(userId: string, kycStatus: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/kyc`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ kycStatus }),
    });
    return res.json();
  }

  async updateUserStatus(userId: string, accountStatus: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ accountStatus }),
    });
    return res.json();
  }

  async deleteUser(userId: string): Promise<{ success: boolean; message: string; deletedUserId: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Failed to delete user from database');
    }
    return res.json();
  }

  async updateSupportStatus(ticketId: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/support/${ticketId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    return res.json();
  }

  async getAdminAnalytics(range?: string): Promise<any> {
    const query = range ? `?range=${range}` : '';
    const res = await fetch(`${API_BASE_URL}/admin/analytics${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin analytics');
    return res.json();
  }

  async updateDraw(drawId: string, drawData: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/${drawId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(drawData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || 'Failed to update draw');
    }
    return res.json();
  }

  async getAdminFulfillment(status?: string): Promise<any[]> {
    const query = status ? `?status=${status}` : '';
    const res = await fetch(`${API_BASE_URL}/admin/fulfillment${query}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin fulfillment list');
    return res.json();
  }

  async updateFulfillmentStatus(winnerId: string, status: string, trackingNumber?: string, deliveryNotes?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/fulfillment/${winnerId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, trackingNumber, deliveryNotes }),
    });
    if (!res.ok) throw new Error('Failed to update fulfillment status');
    return res.json();
  }

  async getLiveBroadcastPost(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/draws/live-broadcast/current`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch live broadcast post');
    return res.json();
  }

  async updateLiveBroadcastPost(payload: any): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/admin/draws/live-broadcast`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update live broadcast post');
    return res.json();
  }

  async uploadWebcamFrame(frame: string): Promise<any> {
    try {
      await fetch(`${API_BASE_URL}/draws/live-broadcast/frame`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ frame, isLive: true }),
      });
    } catch (_) {}
  }

  async findTicketOwner(drawId: string, ticketNumber: string): Promise<any> {
    const encTicket = encodeURIComponent(ticketNumber);
    const res = await fetch(`${API_BASE_URL}/draws/${drawId}/ticket-owner?ticketNumber=${encTicket}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to lookup ticket owner');
    return res.json();
  }

  async getSoldTickets(drawId: string): Promise<{ ticketNumber: string; ownerName: string }[]> {
    const res = await fetch(`${API_BASE_URL}/draws/${drawId}/sold-tickets`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch sold tickets');
    return res.json();
  }

  async getFeaturedWinnerVideo(): Promise<FeaturedWinnerVideo> {
    const res = await fetch(`${API_BASE_URL}/winners/featured-video`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch featured winner video');
    return res.json();
  }

  async postFeaturedWinnerVideo(payload: Partial<FeaturedWinnerVideo>): Promise<FeaturedWinnerVideo> {
    const res = await fetch(`${API_BASE_URL}/admin/featured-winner-video`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to post featured winner video');
    return res.json();
  }

  async getAdminWinnerVideos(): Promise<{ current: FeaturedWinnerVideo; history: FeaturedWinnerVideo[] }> {
    const res = await fetch(`${API_BASE_URL}/admin/featured-winner-video`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin winner videos');
    return res.json();
  }

  async getAllWinnerVideos(): Promise<FeaturedWinnerVideo[]> {
    const res = await fetch(`${API_BASE_URL}/winners/videos`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch all winner videos');
    return res.json();
  }

  async resetFeaturedWinnerVideo(): Promise<FeaturedWinnerVideo> {
    const res = await fetch(`${API_BASE_URL}/admin/featured-winner-video/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset featured winner video');
    return res.json();
  }

  async resolveTikTok(url: string): Promise<{
    isTikTok: boolean;
    videoId?: string;
    authorName?: string;
    authorUrl?: string;
    title?: string;
    thumbnailUrl?: string;
    embedHtml?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/winners/tiktok-resolve?url=${encodeURIComponent(url)}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to resolve TikTok metadata');
    return res.json();
  }

  // --- PROMOTION VIDEO API ---

  async getPromotionVideo(): Promise<PromotionVideo> {
    const res = await fetch(`${API_BASE_URL}/winners/promotion-video`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch promotion video');
    return res.json();
  }

  async getAllPromotionVideos(): Promise<PromotionVideo[]> {
    const res = await fetch(`${API_BASE_URL}/winners/promotion-videos`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch all promotion videos');
    return res.json();
  }

  async postPromotionVideo(payload: Partial<PromotionVideo>): Promise<PromotionVideo> {
    const res = await fetch(`${API_BASE_URL}/admin/promotion-video`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to post promotion video');
    return res.json();
  }

  async getAdminPromotionVideos(): Promise<{ current: PromotionVideo; history: PromotionVideo[] }> {
    const res = await fetch(`${API_BASE_URL}/admin/promotion-video`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch admin promotion videos');
    return res.json();
  }

  async resetPromotionVideo(): Promise<PromotionVideo> {
    const res = await fetch(`${API_BASE_URL}/admin/promotion-video/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset promotion video');
    return res.json();
  }
}

export const api = new ApiService();

