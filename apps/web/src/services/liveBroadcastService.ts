/**
 * Live Broadcast Service
 * Synchronizes the Live Studio (Admin) with the Live Player Stage (User)
 * in real-time with Socket.IO cross-origin streaming, backend REST synchronization,
 * storage events, and direct webcam video frame relay.
 */

import { io, Socket } from 'socket.io-client';
import { api } from './api';

export interface LiveChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  badge?: 'HOST' | 'VIP' | 'PLAYER' | 'ADMIN';
  isOfficial?: boolean;
}

export interface LiveBroadcastState {
  status: 'SCHEDULED' | 'LIVE' | 'PAUSED' | 'CONCLUDED';
  drawId: string;
  drawTitle: string;
  drawNumber: string;
  prizeImageUrl: string;
  prizeValueEtb: number;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  announcementTitle: string;
  announcementDetails: string;
  tiktokLiveUrl: string;
  viewerCount: number;
  isWebcamLive: boolean;
  manuallyPickedTicket: string | null;
  manuallyPickedWinner: string | null;
  isManualPickAnnounced: boolean;
  preDrawCommitmentHash: string;
  resultHash: string;
  permitNumber: string;
  entropySeed: string;
  leadAuditor: string;
  complianceOfficer: string;
  chatMessages: LiveChatMessage[];
  videoStartedAt: number | null;
}

const STORAGE_KEY = 'nati_lotto_live_broadcast_state';
const BROADCAST_EVENT = 'nati-live-broadcast-event';
const REACTION_EVENT = 'nati-live-reaction-event';
const WEBCAM_CHANNEL = 'nati_live_webcam_stream_channel';

// No fake demo messages - only real chat from active users
const INITIAL_MESSAGES: LiveChatMessage[] = [];

const DEFAULT_STATE: LiveBroadcastState = {
  status: 'SCHEDULED',
  drawId: '2ed361c9-68f1-46d2-b265-78e1d74a8bb9',
  drawTitle: 'pharmacy app',
  drawNumber: 'NL-000008',
  prizeImageUrl: 'https://images.unsplash.com/photo-1586015555751-63c254e4f715?auto=format&fit=crop&w=600&q=80',
  prizeValueEtb: 10000,
  scheduledDate: '2026-09-26',
  scheduledTime: '20:00',
  announcementTitle: 'Grand Official Live Draw - Physical Manual Draw On Camera with NLA Oversight',
  announcementDetails: 'Broadcasted live on TikTok (@natilotto) directly from NATI LOTTO Central Studio. Dual-witnessed by NLA Inspector under permit #NL-ET-2026-0941.',
  tiktokLiveUrl: 'https://www.tiktok.com/@natilotto/live',
  viewerCount: 0, // Real spectator count from active connected sockets
  isWebcamLive: false,
  manuallyPickedTicket: null,
  manuallyPickedWinner: null,
  isManualPickAnnounced: false,
  preDrawCommitmentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  resultHash: '7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
  permitNumber: 'NL-ET-2026-0941',
  entropySeed: '0x8f2a9c14e578b30d924ca60e83b1d7f452179830',
  leadAuditor: 'Ato Bekele M. (Lead Gaming Inspector)',
  complianceOfficer: 'Wro. Sara T. (NLA Legal Directorate)',
  chatMessages: INITIAL_MESSAGES,
  videoStartedAt: null,
};

class LiveBroadcastService {
  private state: LiveBroadcastState;
  private socket: Socket | null = null;
  private webcamBroadcastChannel: BroadcastChannel | null = null;
  private webcamFrameListeners: ((dataUrl: string) => void)[] = [];
  private reactionListeners: ((reaction: { emoji: string; id: number }) => void)[] = [];
  private latestFrame: string | null = null;

  constructor() {
    this.state = this.loadFromStorage();

    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          this.webcamBroadcastChannel = new BroadcastChannel(WEBCAM_CHANNEL);
          this.webcamBroadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'WEBCAM_FRAME' && event.data.dataUrl) {
              this.notifyWebcamFrame(event.data.dataUrl);
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel fallback');
        }
      }

      this.initSocket();
    }
  }

  private initSocket() {
    try {
      const socketUrl = `${window.location.protocol}//${window.location.hostname}:4000`;
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        this.socket?.emit('draw:join_live');
      });

      // Receive real-time webcam frame from server (works across ports 3000, 3001, etc.)
      this.socket.on('webcam:frame', (frameDataUrl: string) => {
        this.notifyWebcamFrame(frameDataUrl);
      });

      // Receive real-time stream status (camera on/off)
      this.socket.on('webcam:status', (data: { isLive: boolean }) => {
        this.state.isWebcamLive = data.isLive;
        this.state.status = data.isLive ? 'LIVE' : 'CONCLUDED';
        if (!data.isLive) {
          this.latestFrame = null;
          this.notifyWebcamFrame('');
        }
        this.persistAndNotify();
      });

      // Receive real-time active watcher count from connected sockets
      this.socket.on('live:watchers_count', (data: { count: number }) => {
        if (typeof data?.count === 'number') {
          this.state.viewerCount = data.count;
          this.persistAndNotify();
        }
      });

      // Initial sync when joining live room
      this.socket.on('live:initial_sync', (data: any) => {
        if (typeof data.watchersCount === 'number') this.state.viewerCount = data.watchersCount;
        if (data.isWebcamBroadcasting !== undefined) this.state.isWebcamLive = data.isWebcamBroadcasting;
        if (data.latestFrame) this.notifyWebcamFrame(data.latestFrame);
        if (Array.isArray(data.chatMessages) && data.chatMessages.length > 0) {
          this.state.chatMessages = data.chatMessages;
        }
        this.persistAndNotify();
      });

      // Real live chat message received
      this.socket.on('live:chat_message', (msg: LiveChatMessage) => {
        const exists = this.state.chatMessages.some((m) => m.id === msg.id);
        if (!exists) {
          this.state.chatMessages = [...this.state.chatMessages.slice(-49), msg];
          this.persistAndNotify();
        }
      });

      // Live reaction received
      this.socket.on('live:reaction', (data: { emoji: string }) => {
        this.notifyReaction(data.emoji);
      });

      // Real-time manual winner announcement
      this.socket.on('live:manual_winner_announced', (data: { ticketNumber: string; winnerName: string }) => {
        this.state.manuallyPickedTicket = data.ticketNumber;
        this.state.manuallyPickedWinner = data.winnerName;
        this.state.isManualPickAnnounced = true;
        this.persistAndNotify();
      });
    } catch (err) {
      console.warn('Socket.IO connection warning:', err);
    }
  }

  private loadFromStorage(): LiveBroadcastState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          tiktokLiveUrl: parsed.tiktokLiveUrl || DEFAULT_STATE.tiktokLiveUrl,
          manuallyPickedTicket: parsed.isManualPickAnnounced ? parsed.manuallyPickedTicket : null,
          manuallyPickedWinner: parsed.isManualPickAnnounced ? parsed.manuallyPickedWinner : null,
          chatMessages: [], // Never restore old mock messages
          viewerCount: 0, // Real active spectator count
        };
      }
    } catch (e) {
      console.error('Failed to parse live broadcast state from storage:', e);
    }
    return { ...DEFAULT_STATE };
  }

  public getState(): LiveBroadcastState {
    return { ...this.state };
  }

  /**
   * Fetch latest live broadcast post directly from Backend API
   */
  public async fetchFromBackend(): Promise<LiveBroadcastState> {
    try {
      const post = await api.getLiveBroadcastPost().catch(() => null);
      if (post) {
        const hasManualWinner = Boolean(post.winningTicketNumber && post.winningTicketNumber.trim().length > 0);
        this.state = {
          ...this.state,
          drawId: post.drawId || this.state.drawId,
          drawTitle: post.drawTitle || this.state.drawTitle,
          drawNumber: post.drawNumber || this.state.drawNumber,
          prizeImageUrl: post.prizeImageUrl || this.state.prizeImageUrl,
          scheduledDate: post.scheduledDate || this.state.scheduledDate,
          scheduledTime: post.scheduledTime || this.state.scheduledTime,
          announcementTitle: post.announcementTitle || this.state.announcementTitle,
          announcementDetails: post.announcementDetails || this.state.announcementDetails,
          tiktokLiveUrl: post.tiktokLiveUrl || this.state.tiktokLiveUrl || DEFAULT_STATE.tiktokLiveUrl,
          permitNumber: post.permitNumber || this.state.permitNumber,
          preDrawCommitmentHash: post.preDrawCommitmentHash || this.state.preDrawCommitmentHash,
          resultHash: post.resultHash || this.state.resultHash,
          status: post.status || this.state.status,
          isWebcamLive: post.isWebcamLive !== undefined ? post.isWebcamLive : (post.status === 'LIVE'),
          manuallyPickedTicket: hasManualWinner ? post.winningTicketNumber : null,
          manuallyPickedWinner: hasManualWinner ? post.winnerName : null,
          isManualPickAnnounced: hasManualWinner,
          videoStartedAt: post.videoStartedAt !== undefined ? post.videoStartedAt : this.state.videoStartedAt,
        };
        this.persistAndNotify();
      }
    } catch (err) {
      console.warn('Backend live broadcast fetch warning:', err);
    }
    return this.getState();
  }

  private persistAndNotify() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save live broadcast state to storage:', e);
    }
    window.dispatchEvent(new CustomEvent(BROADCAST_EVENT, { detail: this.state }));
  }

  public subscribe(callback: (state: LiveBroadcastState) => void): () => void {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<LiveBroadcastState>;
      if (customEvent.detail) {
        this.state = customEvent.detail;
        callback(this.state);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          this.state = JSON.parse(e.newValue);
          callback(this.state);
        } catch (err) {
          console.error('Error handling storage event in LiveBroadcastService:', err);
        }
      }
    };

    window.addEventListener(BROADCAST_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    // Initial callback
    callback(this.state);

    return () => {
      window.removeEventListener(BROADCAST_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }

  // Admin Actions with Backend Persistence
  public async postSchedule(params: {
    scheduledDate: string;
    scheduledTime: string;
    drawId?: string;
    drawTitle?: string;
    drawNumber?: string;
    prizeImageUrl?: string;
    announcementTitle?: string;
    announcementDetails?: string;
    tiktokLiveUrl?: string;
  }) {
    this.state = {
      ...this.state,
      ...params,
      tiktokLiveUrl: params.tiktokLiveUrl || this.state.tiktokLiveUrl,
      status: 'SCHEDULED',
      isWebcamLive: false,
      manuallyPickedTicket: null,
      manuallyPickedWinner: null,
      isManualPickAnnounced: false,
      videoStartedAt: null,
    };

    this.persistAndNotify();

    if (this.socket && this.socket.connected) {
      this.socket.emit('webcam:status', { isLive: false });
    }

    try {
      await api.updateLiveBroadcastPost({
        ...params,
        tiktokLiveUrl: this.state.tiktokLiveUrl,
        status: 'SCHEDULED',
        isWebcamLive: false,
        winningTicketNumber: null,
        winnerName: null,
      });
    } catch (e) {
      console.warn('Failed to update live broadcast schedule in backend API:', e);
    }
  }

  public async updateTikTokLiveUrl(url: string) {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    this.state.tiktokLiveUrl = cleanUrl;
    this.persistAndNotify();
    try {
      await api.updateLiveBroadcastPost({
        tiktokLiveUrl: cleanUrl,
      });
    } catch (e) {
      console.warn('Failed to update TikTok Live URL:', e);
    }
  }

  public async startTikTokLive(url?: string) {
    const startTime = Date.now();
    const liveUrl = url ? url.trim() : this.state.tiktokLiveUrl;
    this.state = {
      ...this.state,
      status: 'LIVE',
      isWebcamLive: true,
      tiktokLiveUrl: liveUrl,
      videoStartedAt: startTime,
      manuallyPickedTicket: null,
      manuallyPickedWinner: null,
      isManualPickAnnounced: false,
    };

    this.persistAndNotify();

    if (this.socket && this.socket.connected) {
      this.socket.emit('webcam:status', { isLive: true });
    }

    try {
      await api.updateLiveBroadcastPost({
        status: 'LIVE',
        isWebcamLive: true,
        tiktokLiveUrl: liveUrl,
        videoStartedAt: startTime,
        winningTicketNumber: null,
        winnerName: null,
      });
    } catch (e) {
      console.warn('Backend live status update notice:', e);
    }
  }

  public async stopTikTokLive() {
    this.state = {
      ...this.state,
      status: 'CONCLUDED',
      isWebcamLive: false,
    };

    this.persistAndNotify();

    if (this.socket && this.socket.connected) {
      this.socket.emit('webcam:status', { isLive: false });
    }

    try {
      await api.updateLiveBroadcastPost({
        status: 'CONCLUDED',
        isWebcamLive: false,
      });
    } catch (e) {
      console.warn('Backend live status update notice:', e);
    }
  }

  public async startWebcamLiveStream() {
    return this.startTikTokLive();
  }

  public async stopWebcamLiveStream() {
    return this.stopTikTokLive();
  }

  /**
   * Admin posts the manually drawn winning number (from physical drum/box on camera)
   */
  public async postManualWinningNumber(ticketNumber: string, winnerName: string) {
    const cleanTicket = ticketNumber.trim().startsWith('#') ? ticketNumber.trim() : '#' + ticketNumber.trim();
    const cleanWinner = winnerName.trim() || 'Verified Ticket Holder';

    this.state = {
      ...this.state,
      manuallyPickedTicket: cleanTicket,
      manuallyPickedWinner: cleanWinner,
      isManualPickAnnounced: true,
    };

    this.persistAndNotify();

    if (this.socket && this.socket.connected) {
      this.socket.emit('live:announce_winner', {
        ticketNumber: cleanTicket,
        winnerName: cleanWinner,
        permitNumber: this.state.permitNumber,
      });
    }

    try {
      await api.updateLiveBroadcastPost({
        winningTicketNumber: cleanTicket,
        winnerName: cleanWinner,
      });
    } catch (e) {
      console.warn('Backend manual winner update notice:', e);
    }
  }

  public async resetManualPick() {
    this.state = {
      ...this.state,
      manuallyPickedTicket: null,
      manuallyPickedWinner: null,
      isManualPickAnnounced: false,
    };
    this.persistAndNotify();

    try {
      await api.updateLiveBroadcastPost({
        winningTicketNumber: null,
        winnerName: null,
      });
    } catch (e) {
      console.warn('Backend manual pick reset notice:', e);
    }
  }

  // Real-time Video Frame Streaming (Webcam Admin -> Server -> Spectators across all ports)
  private lastPostTimestamp = 0;
  public broadcastWebcamFrame(dataUrl: string) {
    this.latestFrame = dataUrl;

    // 1. Send via Socket.IO to server (relays cross-port: 3000 -> 3001, etc.)
    if (this.socket && this.socket.connected) {
      this.socket.emit('webcam:frame', { frame: dataUrl });
    }

    // 2. Also throttle HTTP POST every 800ms so backend cache always has the live camera frame
    const now = Date.now();
    if (now - this.lastPostTimestamp > 800) {
      this.lastPostTimestamp = now;
      api.uploadWebcamFrame(dataUrl).catch(() => {});
    }

    // 3. BroadcastChannel for same-origin tabs
    if (this.webcamBroadcastChannel) {
      this.webcamBroadcastChannel.postMessage({ type: 'WEBCAM_FRAME', dataUrl, timestamp: Date.now() });
    }
  }

  public getLatestWebcamFrame(): string | null {
    return this.latestFrame;
  }

  private notifyWebcamFrame(dataUrl: string) {
    this.latestFrame = dataUrl || null;
    this.webcamFrameListeners.forEach((listener) => listener(dataUrl));
  }

  public subscribeToWebcamFrames(callback: (dataUrl: string) => void): () => void {
    this.webcamFrameListeners.push(callback);
    if (this.latestFrame) {
      callback(this.latestFrame);
    }
    return () => {
      this.webcamFrameListeners = this.webcamFrameListeners.filter((l) => l !== callback);
    };
  }

  // Real User Chat (Sent via Socket.IO to all real viewers)
  public sendChatMessage(sender: string, text: string, badge: 'HOST' | 'VIP' | 'PLAYER' | 'ADMIN' = 'PLAYER') {
    if (!text.trim()) return;

    if (this.socket && this.socket.connected) {
      this.socket.emit('live:chat_send', {
        sender: sender.trim() || 'Player',
        text: text.trim(),
        badge,
      });
    } else {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg: LiveChatMessage = {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        sender: sender.trim() || 'Player',
        text: text.trim(),
        timestamp: timeStr,
        badge,
      };
      this.state.chatMessages = [...this.state.chatMessages.slice(-49), newMsg];
      this.persistAndNotify();
    }
  }

  // Real User Reactions
  public triggerReaction(emoji: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('live:reaction', { emoji });
    }
    this.notifyReaction(emoji);
  }

  private notifyReaction(emoji: string) {
    const id = Date.now() + Math.random();
    this.reactionListeners.forEach((l) => l({ emoji, id }));
    window.dispatchEvent(new CustomEvent(REACTION_EVENT, { detail: { emoji, id } }));
  }

  public subscribeToReactions(callback: (reaction: { emoji: string; id: number }) => void): () => void {
    this.reactionListeners.push(callback);
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ emoji: string; id: number }>;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };
    window.addEventListener(REACTION_EVENT, handler);
    return () => {
      this.reactionListeners = this.reactionListeners.filter((l) => l !== callback);
      window.removeEventListener(REACTION_EVENT, handler);
    };
  }
}

export const liveBroadcastService = new LiveBroadcastService();

