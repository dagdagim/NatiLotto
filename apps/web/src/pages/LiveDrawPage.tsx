import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, ShieldCheck, Radio, Award, Check, ChevronRight,
  Eye, Send, Calendar, Clock, Volume2, 
  VolumeX, Copy, CheckCircle, Video, VideoOff, ExternalLink, Maximize2, RefreshCw
} from 'lucide-react';
import Hls from 'hls.js';

const getApiStreamUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `http://localhost:4000${path.startsWith('/') ? '' : '/'}${path}`;
};

const resolveLiveStreamMedia = (rawUrl: string) => {
  let url = (rawUrl || '').trim();
  if (!url) {
    return {
      type: 'none' as const,
      embedUrl: '',
      directVideoUrl: '',
      channelHandle: '@natilotto',
      username: 'natilotto',
      isTikTokLive: false
    };
  }

  // YouTube Live or video
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube' as const,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&playsinline=1&rel=0`,
      directVideoUrl: '',
      channelHandle: '@natilotto',
      username: 'natilotto',
      isTikTokLive: false
    };
  }

  // Direct video file (.mp4, .webm, .m3u8, or local /api/v1/winners/video/...)
  if (/\.(mp4|webm|m3u8)($|\?)/i.test(url) || url.includes('/api/v1/winners/video/')) {
    return {
      type: 'video' as const,
      embedUrl: url,
      directVideoUrl: getApiStreamUrl(url),
      channelHandle: '@natilotto',
      username: 'natilotto',
      isTikTokLive: false
    };
  }

  // TikTok Video numeric ID: Stream direct video so it plays directly with sound controls
  const ttMatch = url.match(/\/video\/(\d+)/) || url.match(/\b(\d{16,21})\b/);
  if (ttMatch && ttMatch[1]) {
    const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
    const handle = handleMatch ? `@${handleMatch[1]}` : '@natilotto';
    return {
      type: 'video' as const,
      embedUrl: `https://www.tiktok.com/${handle}/video/${ttMatch[1]}`,
      directVideoUrl: getApiStreamUrl(`/api/v1/winners/video/${ttMatch[1]}.mp4`),
      channelHandle: handle,
      username: handle.replace('@', ''),
      isTikTokLive: false
    };
  }

  // TikTok Live Room (@username/live)
  if (url.includes('tiktok.com')) {
    const handleMatch = url.match(/@([a-zA-Z0-9_.-]+)/);
    const handle = handleMatch ? `@${handleMatch[1]}` : '@natilotto';
    const cleanUsername = handle.replace('@', '');
    return {
      type: 'tiktok-live-room' as const,
      embedUrl: url.split('?')[0],
      directVideoUrl: '', // NO FAKE PROMO VIDEO!
      channelHandle: handle,
      username: cleanUsername,
      isTikTokLive: true
    };
  }

  return {
    type: 'video' as const,
    embedUrl: url,
    directVideoUrl: url,
    channelHandle: '@natilotto',
    username: 'natilotto',
    isTikTokLive: false
  };
};
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { api, DrawItem, WinnerItem } from '../services/api';
import { 
  liveBroadcastService, 
  LiveBroadcastState 
} from '../services/liveBroadcastService';

interface LiveDrawPageProps {
  drawId?: string;
  onNavigate: (page: string, params?: any) => void;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  leftOffset: number;
}

export const LiveDrawPage: React.FC<LiveDrawPageProps> = ({ drawId = 'NL-000123', onNavigate }) => {
  const { user } = useAuth();
  const [broadcastState, setBroadcastState] = useState<LiveBroadcastState>(liveBroadcastService.getState());
  const [recentWinners, setRecentWinners] = useState<WinnerItem[]>([]);
  const [currentDraw, setCurrentDraw] = useState<DrawItem | null>(null);
  const [userDrawTickets, setUserDrawTickets] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
  const [liveSessionUptime, setLiveSessionUptime] = useState('00:00:00');
  const [activeTab, setActiveTab] = useState<'stream' | 'winners' | 'transparency'>('stream');
  const [tryInStageIframe, setTryInStageIframe] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const hlsVideoRef = useRef<HTMLVideoElement>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const [tikTokLiveInfo, setTikTokLiveInfo] = useState<{
    isChecking: boolean;
    isLive: boolean;
    streamUrl?: string;
    rawHlsUrl?: string;
    title?: string;
    viewerCount?: number;
    lastChecked?: number;
  }>({ isChecking: false, isLive: false });

  const checkTikTokStatus = async (username: string) => {
    if (!username) return;
    setTikTokLiveInfo(prev => ({ ...prev, isChecking: true }));
    try {
      const res = await fetch(`http://localhost:4000/api/v1/draws/live-broadcast/tiktok-status?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setTikTokLiveInfo({
          isChecking: false,
          isLive: !!data.isLive,
          streamUrl: data.streamUrl || '',
          rawHlsUrl: data.rawHlsUrl || '',
          title: data.title,
          viewerCount: data.viewerCount,
          lastChecked: Date.now(),
        });
        return;
      }
    } catch (e) {
      console.warn('Failed to check TikTok live status:', e);
    }
    setTikTokLiveInfo(prev => ({ ...prev, isChecking: false, isLive: false, lastChecked: Date.now() }));
  };

  useEffect(() => {
    const media = resolveLiveStreamMedia(broadcastState.tiktokLiveUrl);
    if (media.type === 'tiktok-live-room' && media.username) {
      checkTikTokStatus(media.username);
      const interval = setInterval(() => {
        checkTikTokStatus(media.username);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [broadcastState.tiktokLiveUrl]);

  useEffect(() => {
    const video = hlsVideoRef.current;
    const streamSrc = tikTokLiveInfo.streamUrl;
    if (!video || !tikTokLiveInfo.isLive || !streamSrc) return;

    if (Hls.isSupported()) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
      }
      const hls = new Hls({ enableWorker: true });
      hlsInstanceRef.current = hls;
      hls.loadSource(streamSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      return () => {
        hls.destroy();
        hlsInstanceRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamSrc;
      video.play().catch(() => {});
    }
  }, [tikTokLiveInfo.isLive, tikTokLiveInfo.streamUrl]);

  // 1. Fetch live broadcast post from Backend API on mount & periodically
  useEffect(() => {
    fetchBackendPost();
    const pollInterval = setInterval(() => {
      fetchBackendPost();
    }, 1500);
    return () => clearInterval(pollInterval);
  }, []);

  const fetchBackendPost = async () => {
    try {
      const state = await liveBroadcastService.fetchFromBackend();
      if (state) setBroadcastState({ ...state });
    } catch (e) {
      console.warn('Failed to fetch live broadcast post from backend:', e);
    }
  };

  // 2. Subscribe to live broadcast service state & floating reactions
  useEffect(() => {
    const unsubscribeState = liveBroadcastService.subscribe((state) => {
      setBroadcastState({ ...state });
    });

    const unsubscribeReactions = liveBroadcastService.subscribeToReactions((reaction) => {
      addReactionBubble(reaction.emoji);
    });

    return () => {
      unsubscribeState();
      unsubscribeReactions();
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [broadcastState.chatMessages]);

  // Load database winners and real user tickets from database
  useEffect(() => {
    loadDatabaseData();
  }, [drawId, broadcastState.drawId, user?.id]);

  const loadDatabaseData = async () => {
    try {
      const targetId = broadcastState.drawId || drawId;
      const d = await api.getDrawById(targetId).catch(() => null);
      if (d) setCurrentDraw(d);
      const w = await api.getWinners(6).catch(() => []);
      if (w && w.length > 0) setRecentWinners(w);

      if (user?.id) {
        const myTickets = await api.getUserTickets(user.id).catch(() => []);
        const matched = (myTickets || []).filter(
          (t: any) => t.drawId === targetId || t.draw?.drawNumber === broadcastState.drawNumber
        );
        setUserDrawTickets(matched);
      }
    } catch (err) {
      console.error('Failed to load database winners:', err);
    }
  };

  // Scheduled date countdown calculation (Days, Hours, Minutes, Seconds)
  useEffect(() => {
    const calculateCountdown = () => {
      if (!broadcastState.scheduledDate || !broadcastState.scheduledTime) return;
      const targetStr = `${broadcastState.scheduledDate}T${broadcastState.scheduledTime}:00`;
      const targetTime = new Date(targetStr).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setCountdownRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
      } else {
        const totalSecs = Math.max(0, Math.floor(diff / 1000));
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const minutes = Math.floor((totalSecs % 3600) / 60);
        const seconds = totalSecs % 60;
        setCountdownRemaining({ days, hours, minutes, seconds, isPast: false });
      }
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [broadcastState.scheduledDate, broadcastState.scheduledTime]);

  // Live session uptime timer (counts up every second when stream is live)
  useEffect(() => {
    const isCurrentlyLive = broadcastState.status === 'LIVE' || broadcastState.isWebcamLive;
    if (!isCurrentlyLive) return;

    const updateUptime = () => {
      const startedAt = broadcastState.videoStartedAt || (Date.now() - 1000);
      const elapsedSecs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const h = Math.floor(elapsedSecs / 3600);
      const m = Math.floor((elapsedSecs % 3600) / 60);
      const s = elapsedSecs % 60;
      setLiveSessionUptime(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [broadcastState.status, broadcastState.isWebcamLive, broadcastState.videoStartedAt]);

  // Confetti when manual pick is announced
  useEffect(() => {
    if (broadcastState.isManualPickAnnounced) {
      confetti({
        particleCount: 130,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#FFC107', '#6C5DD3', '#10B981', '#FFFFFF', '#EF4444'],
      });
    }
  }, [broadcastState.isManualPickAnnounced]);

  const addReactionBubble = (emoji: string) => {
    const id = Date.now() + Math.random();
    const leftOffset = Math.floor(Math.random() * 50) - 25;
    setFloatingReactions((prev) => [...prev.slice(-15), { id, emoji, leftOffset }]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2400);
  };

  const handleSendReaction = (emoji: string) => {
    liveBroadcastService.triggerReaction(emoji);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const senderName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.displayName || user.phone || 'Player'
      : 'Viewer_' + Math.floor(100 + Math.random() * 900);
    const isAdminRole = user?.role === 'SUPER_ADMIN' || user?.role === 'OPERATIONS';
    const badge = isAdminRole ? 'ADMIN' : (user ? 'VIP' : 'PLAYER');
    liveBroadcastService.sendChatMessage(senderName, chatInput.trim(), badge);
    setChatInput('');
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  const handleOpenPopoutStream = (streamUrl?: string) => {
    const target = streamUrl || broadcastState.tiktokLiveUrl || 'https://www.tiktok.com/@natilotto/live';
    const width = 480;
    const height = 820;
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));
    window.open(
      target,
      'NatiLottoLiveStream',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=no,resizable=yes,status=no,toolbar=no,menubar=no,location=no`
    );
  };

  const isLive = broadcastState.status === 'LIVE' || broadcastState.isWebcamLive;

  return (
    <div style={{ paddingBottom: '6rem', backgroundColor: 'var(--color-bg)', minHeight: '100vh' }}>
      <section className="container" style={{ paddingTop: '1.75rem' }}>
        
        {/* Navigation Tabs Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '1rem',
          marginBottom: '1.25rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="badge-live">
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#FFFFFF', 
                boxShadow: '0 0 8px #FFFFFF' 
              }} />
              {isLive ? `LIVE ON AIR • ${liveSessionUptime}` : 'LIVE'}
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              NATI LOTTO Official Broadcast • Verified from Central Studio
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--color-surface)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--color-surface-border)' }}>
            <button
              onClick={() => setActiveTab('stream')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'stream' ? 'var(--color-purple)' : 'transparent',
                color: activeTab === 'stream' ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Radio size={15} /> Live Stage
            </button>

            <button
              onClick={() => setActiveTab('winners')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'winners' ? 'var(--color-purple)' : 'transparent',
                color: activeTab === 'winners' ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Trophy size={15} /> Recent Winners ({recentWinners.length})
            </button>

            <button
              onClick={() => setActiveTab('transparency')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'transparency' ? 'var(--color-purple)' : 'transparent',
                color: activeTab === 'transparency' ? '#FFFFFF' : 'var(--color-text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <ShieldCheck size={15} /> Provably Fair
            </button>
          </div>
        </div>

        {/* MAIN LIGHT MODE LIVE STAGE */}
        {activeTab === 'stream' && (
          <div className="tiktok-live-stage" style={{ minHeight: '620px', padding: '1.5rem', background: '#FFFFFF' }}>
            
            {/* Stage Top Bar: Streamer Channel, Live Viewers & Quality */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              position: 'relative',
              zIndex: 30,
              paddingBottom: '1rem',
              borderBottom: '1px solid var(--color-surface-border)'
            }}>
              {/* Host Profile Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FFC107 0%, #D97706 100%)',
                  padding: '2px',
                  boxShadow: '0 2px 10px rgba(255, 193, 7, 0.3)'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    color: 'var(--color-primary-dark)',
                    fontSize: '1rem'
                  }}>
                    NL
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-text-main)' }}>
                      NATI LOTTO Studio
                    </span>
                    <span style={{ background: '#10B981', color: '#FFF', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>✓</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    Draw #{broadcastState.drawNumber} • Regulatory License #{broadcastState.permitNumber || 'NL-ET-2026-0941'}
                  </div>
                </div>
              </div>

              {/* Viewers, Live Session Timer & Audio Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {isLive && (
                  <div style={{
                    background: '#FEE2E2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '20px',
                    padding: '0.35rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#DC2626'
                  }}>
                    <Clock size={15} color="#DC2626" />
                    <span>Duration: {liveSessionUptime}</span>
                  </div>
                )}

                <div style={{
                  background: isLive ? '#FEE2E2' : '#FEF3C7',
                  border: isLive ? '1px solid #FCA5A5' : '1px solid #FDE68A',
                  borderRadius: '20px',
                  padding: '0.35rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: isLive ? '#DC2626' : '#B45309'
                }}>
                  <Eye size={15} color={isLive ? '#DC2626' : '#B45309'} />
                  <span>{broadcastState.viewerCount.toLocaleString()} watching</span>
                </div>

                <div style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '20px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 700
                }}>
                  {isLive ? '🔴 Webcam HD 720p' : 'HD Ready'}
                </div>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-surface-border)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-main)',
                    cursor: 'pointer'
                  }}
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </div>

            {/* STAGE MAIN BODY: LIGHT MODE SCHEDULE POST OR WEBCAM LIVE STREAM */}
            <div style={{ position: 'relative', zIndex: 20, minHeight: '440px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '1.25rem' }}>
              
              {/* STATE 1: SCHEDULED POST FETCHED FROM BACKEND (LIGHT MODE) */}
              {!isLive && broadcastState.status !== 'CONCLUDED' && (
                <div style={{
                  textAlign: 'center',
                  maxWidth: '720px',
                  margin: '1.5rem auto',
                  background: '#FFFFFF',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '24px',
                  padding: '2.5rem 2rem',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(255, 193, 7, 0.15)',
                    border: '1px solid rgba(255, 193, 7, 0.4)',
                    color: '#B45309',
                    padding: '0.35rem 1rem',
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    marginBottom: '1.25rem'
                  }}>
                    <Calendar size={15} /> OFFICIAL DRAW SCHEDULED
                  </div>

                  <h1 style={{
                    fontSize: 'clamp(1.75rem, 3.2vw, 2.4rem)',
                    fontWeight: 900,
                    color: 'var(--color-text-main)',
                    lineHeight: 1.2,
                    marginBottom: '0.75rem'
                  }}>
                    {broadcastState.drawTitle}
                  </h1>

                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6, maxWidth: '620px', margin: '0 auto 2rem' }}>
                    {broadcastState.announcementDetails}
                  </p>

                  {/* Scheduled Date & Time Badge (Light Mode) */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1.75rem',
                    flexWrap: 'wrap',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-surface-border)',
                    borderRadius: '16px',
                    padding: '1.25rem 1.75rem',
                    marginBottom: '2rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar size={20} color="var(--color-primary-dark)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>PICKING DATE</div>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-main)' }}>
                          {broadcastState.scheduledDate}
                        </div>
                      </div>
                    </div>

                    <div style={{ width: '1px', background: 'var(--color-surface-border)' }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Clock size={20} color="var(--color-purple)" />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>BROADCAST TIME</div>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-text-main)' }}>
                          {broadcastState.scheduledTime} EAT (Addis Ababa)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Big Live Countdown (Light Mode) */}
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.85rem' }}>
                      LIVE BROADCAST STARTS IN
                    </div>

                    {countdownRemaining.isPast ? (
                      <div style={{
                        background: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        borderRadius: '16px',
                        padding: '1.25rem 2rem',
                        maxWidth: '520px',
                        margin: '0 auto',
                        color: '#B45309',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem'
                      }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706', boxShadow: '0 0 8px #D97706' }} />
                        <span>Central Studio is getting ready for live broadcast. Stream will start momentarily!</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                        {countdownRemaining.days > 0 && (
                          <>
                            <div style={{
                              background: '#FFFFFF',
                              border: '2px solid var(--color-surface-border)',
                              borderRadius: '16px',
                              padding: '0.85rem 1.25rem',
                              minWidth: '80px',
                              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                            }}>
                              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary-dark)', lineHeight: 1 }}>
                                {String(countdownRemaining.days).padStart(2, '0')}
                              </div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                                Days
                              </div>
                            </div>

                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-muted)', alignSelf: 'center' }}>:</div>
                          </>
                        )}

                        <div style={{
                          background: '#FFFFFF',
                          border: '2px solid var(--color-surface-border)',
                          borderRadius: '16px',
                          padding: '0.85rem 1.25rem',
                          minWidth: '80px',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                        }}>
                          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary-dark)', lineHeight: 1 }}>
                            {String(countdownRemaining.hours).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                            Hours
                          </div>
                        </div>

                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-muted)', alignSelf: 'center' }}>:</div>

                        <div style={{
                          background: '#FFFFFF',
                          border: '2px solid var(--color-surface-border)',
                          borderRadius: '16px',
                          padding: '0.85rem 1.25rem',
                          minWidth: '80px',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                        }}>
                          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary-dark)', lineHeight: 1 }}>
                            {String(countdownRemaining.minutes).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                            Minutes
                          </div>
                        </div>

                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-muted)', alignSelf: 'center' }}>:</div>

                        <div style={{
                          background: '#FFFFFF',
                          border: '2px solid var(--color-surface-border)',
                          borderRadius: '16px',
                          padding: '0.85rem 1.25rem',
                          minWidth: '80px',
                          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                        }}>
                          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary-dark)', lineHeight: 1 }}>
                            {String(countdownRemaining.seconds).padStart(2, '0')}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                            Seconds
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pre-Draw Transparency Proof (Light Mode) */}
                  <div style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '12px',
                    padding: '0.9rem 1.25rem',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <ShieldCheck size={22} color="#16A34A" />
                      <div>
                        <div style={{ color: '#166534', fontWeight: 800, fontSize: '0.85rem' }}>
                          Pre-Draw SHA-256 Hash Committed (Locked Before Sales Ended)
                        </div>
                        <div style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {broadcastState.preDrawCommitmentHash.slice(0, 32)}...{broadcastState.preDrawCommitmentHash.slice(-8)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyHash(broadcastState.preDrawCommitmentHash)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #BBF7D0',
                        color: '#166534',
                        borderRadius: '8px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      {copiedHash ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                      {copiedHash ? 'Copied' : 'Copy Hash'}
                    </button>
                  </div>
                </div>
              )}

              {/* STATE 2: ADMIN RECORDING LIVE ON WEBCAM DIRECTLY (User sees webcam video stream!) */}
              {isLive && (
                <div style={{ textAlign: 'center', padding: '0.5rem 0 1.5rem' }}>
                  
                  {/* Broadcast Title Banner */}
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#DC2626',
                      padding: '0.35rem 1rem',
                      borderRadius: '999px',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span className="badge-live-dot" style={{ background: '#DC2626', boxShadow: '0 0 8px #DC2626' }} />
                      TIKTOK LIVE STREAM BROADCAST • OFFICIAL NATI LOTTO • {liveSessionUptime}
                    </span>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', fontWeight: 900, color: 'var(--color-text-main)', marginTop: '0.4rem' }}>
                      {broadcastState.drawTitle}
                    </h2>
                  </div>

                  {/* TIKTOK LIVE STREAM STAGE */}
                  <div style={{
                    position: 'relative',
                    maxWidth: '840px',
                    margin: '0 auto 1.5rem',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    background: 'linear-gradient(180deg, #090C15 0%, #030712 100%)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
                    border: '3px solid rgba(37, 244, 238, 0.3)'
                  }}>
                    {/* TikTok Live Player View */}
                    <div style={{ position: 'relative', width: '100%', minHeight: '460px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                      
                      {/* Top Overlay Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1.25rem',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%)',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        pointerEvents: 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', pointerEvents: 'auto' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#000000',
                            border: '2px solid #25F4EE',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            fontSize: '0.85rem',
                            color: '#FE2C55',
                            boxShadow: '0 0 10px rgba(37, 244, 238, 0.4)'
                          }}>
                            TT
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.9rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                Nati Lotto Live
                              </span>
                              <CheckCircle size={14} color="#38BDF8" />
                            </div>
                            <span style={{ color: '#E2E8F0', fontSize: '0.72rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                              @natilotto • Official Stream
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto' }}>
                          <div style={{
                            background: 'rgba(239, 68, 68, 0.95)',
                            color: '#FFFFFF',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.28rem 0.7rem',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                          }}>
                            <span className="badge-live-dot" style={{ background: '#FFF' }} />
                            <span>LIVE • {liveSessionUptime}</span>
                          </div>

                          <div style={{
                            background: 'rgba(16, 185, 129, 0.9)',
                            color: '#FFFFFF',
                            padding: '0.28rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                          }}>
                            <ShieldCheck size={13} /> NLA Inspector
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenPopoutStream(broadcastState.tiktokLiveUrl)}
                            title="Open standalone popout player without iframe app prompts"
                            style={{
                              background: 'rgba(37, 244, 238, 0.15)',
                              border: '1px solid rgba(37, 244, 238, 0.6)',
                              color: '#25F4EE',
                              borderRadius: '999px',
                              padding: '0.28rem 0.75rem',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              cursor: 'pointer',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                            }}
                          >
                            <ExternalLink size={12} color="#25F4EE" /> Popout Stream ↗
                          </button>
                        </div>
                      </div>

                      {/* DIRECT LIVE VIDEO PLAYER CONTAINER */}
                      <div style={{
                        position: 'relative',
                        width: '100%',
                        minHeight: '520px',
                        height: '520px',
                        background: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        {(() => {
                          const media = resolveLiveStreamMedia(broadcastState.tiktokLiveUrl);

                          // 1. Direct Video Stream (.mp4, .webm, .m3u8, or uploaded draw video)
                          if (media.type === 'video' && media.directVideoUrl) {
                            return (
                              <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <video
                                  key={`live-stream-player-${media.directVideoUrl}`}
                                  src={media.directVideoUrl}
                                  controls
                                  autoPlay
                                  playsInline
                                  loop
                                  muted={isMuted}
                                  onLoadedMetadata={(e) => {
                                    e.currentTarget.play().catch(() => {});
                                  }}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    background: '#000000',
                                    display: 'block'
                                  }}
                                />
                              </div>
                            );
                          }

                          // 2. YouTube Live Embed Player
                          if (media.type === 'youtube') {
                            return (
                              <iframe
                                key={`live-player-${media.embedUrl}`}
                                src={media.embedUrl}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                  display: 'block',
                                  background: '#000000'
                                }}
                                allow="accelerometer; autoplay; camera; microphone; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Live Draw Stream Broadcast"
                              />
                            );
                          }

                          // 3. TikTok Live Room (@username/live)
                          if (media.type === 'tiktok-live-room') {
                            // If live stream feed is active via HLS
                            if (tikTokLiveInfo.isLive && tikTokLiveInfo.streamUrl) {
                              return (
                                <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000000' }}>
                                  <div style={{
                                    position: 'absolute',
                                    top: '14px',
                                    left: '16px',
                                    zIndex: 10,
                                    background: 'rgba(15, 23, 42, 0.92)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '20px',
                                    padding: '0.35rem 0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    fontSize: '0.76rem',
                                    color: '#FFFFFF',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.6)'
                                  }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444', fontWeight: 900 }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF4444' }} />
                                      TIKTOK LIVE STREAM
                                    </span>
                                    <span style={{ color: '#475569' }}>|</span>
                                    <span style={{ color: '#38BDF8', fontWeight: 700 }}>{media.channelHandle}</span>
                                    {tikTokLiveInfo.viewerCount && (
                                      <span style={{ color: '#E2E8F0', fontSize: '0.7rem' }}>
                                        👥 {tikTokLiveInfo.viewerCount.toLocaleString()} watching
                                      </span>
                                    )}
                                  </div>

                                  <video
                                    ref={hlsVideoRef}
                                    controls
                                    autoPlay
                                    playsInline
                                    muted={isMuted}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'contain',
                                      background: '#000000',
                                      display: 'block'
                                    }}
                                  />
                                </div>
                              );
                            }

                            // When TikTok broadcast is in Standby mode / Waiting to connect
                            return (
                              <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem',
                                background: 'radial-gradient(ellipse at center, #111827 0%, #030712 100%)',
                                textAlign: 'center',
                                position: 'relative'
                              }}>
                                {/* Pulsing Ambient Indicator */}
                                <div style={{
                                  position: 'relative',
                                  width: '84px',
                                  height: '84px',
                                  borderRadius: '50%',
                                  background: 'linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)',
                                  padding: '3px',
                                  marginBottom: '1.25rem',
                                  boxShadow: '0 0 35px rgba(254, 44, 85, 0.45)'
                                }}>
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    background: '#0A0E17',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '2rem'
                                  }}>
                                    🎥
                                  </div>
                                </div>

                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#EF4444',
                                  padding: '0.3rem 0.85rem',
                                  borderRadius: '999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                  marginBottom: '0.75rem',
                                  letterSpacing: '0.05em'
                                }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF4444' }} />
                                  TIKTOK LIVE ROOM • {media.channelHandle}
                                </div>

                                <h3 style={{
                                  color: '#FFFFFF',
                                  fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
                                  fontWeight: 900,
                                  marginBottom: '0.4rem',
                                  maxWidth: '620px'
                                }}>
                                  Waiting for {media.channelHandle} to Stream Video
                                </h3>

                                <p style={{
                                  color: '#94A3B8',
                                  fontSize: '0.88rem',
                                  maxWidth: '540px',
                                  lineHeight: 1.5,
                                  marginBottom: '1.4rem'
                                }}>
                                  Official live drawing for <strong>{broadcastState.drawTitle}</strong> under FDRE NLA Permit #{broadcastState.permitNumber}. 
                                  Once the live feed begins on TikTok, it will stream here in HD automatically.
                                </p>

                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                  <a
                                    href={broadcastState.tiktokLiveUrl || `https://www.tiktok.com/@${media.username}/live`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: 'linear-gradient(135deg, #FE2C55 0%, #25F4EE 100%)',
                                      color: '#FFFFFF',
                                      fontWeight: 800,
                                      fontSize: '0.85rem',
                                      padding: '0.65rem 1.35rem',
                                      borderRadius: '12px',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.45rem',
                                      boxShadow: '0 4px 15px rgba(254, 44, 85, 0.4)'
                                    }}
                                  >
                                    <ExternalLink size={15} /> Watch Live on TikTok ↗
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => checkTikTokStatus(media.username)}
                                    disabled={tikTokLiveInfo.isChecking}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.1)',
                                      color: '#E2E8F0',
                                      fontWeight: 700,
                                      fontSize: '0.85rem',
                                      padding: '0.65rem 1.25rem',
                                      borderRadius: '12px',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.45rem'
                                    }}
                                  >
                                    <RefreshCw size={14} className={tikTokLiveInfo.isChecking ? 'animate-spin' : ''} />
                                    {tikTokLiveInfo.isChecking ? 'Checking Feed...' : 'Check Live Feed 🔄'}
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div style={{ color: '#94A3B8', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
                              Waiting for live broadcast feed...
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bottom Stream Status Strip */}
                      <div style={{
                        padding: '0.75rem 1.25rem',
                        background: 'rgba(0, 0, 0, 0.9)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: '#94A3B8',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#25F4EE', fontWeight: 700 }}>Live Feed:</span>
                          <a
                            href={broadcastState.tiktokLiveUrl || 'https://www.tiktok.com/@natilotto/live'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#38BDF8', textDecoration: 'none', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {broadcastState.tiktokLiveUrl}
                          </a>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span>FDRE NLA Permit #{broadcastState.permitNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenPopoutStream(broadcastState.tiktokLiveUrl)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#FE2C55',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.78rem',
                              padding: 0
                            }}
                          >
                            <ExternalLink size={12} /> Popout Stream ↗
                          </button>
                        </div>
                      </div>

                      {/* MANUALLY DRAWN WINNING NUMBER POPUP OVERLAY */}
                      {broadcastState.isManualPickAnnounced && broadcastState.manuallyPickedTicket && (
                        <div style={{
                          position: 'absolute',
                          bottom: '24px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '90%',
                          maxWidth: '520px',
                          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(254, 243, 199, 0.96) 100%)',
                          border: '2px solid #FFC107',
                          borderRadius: '20px',
                          padding: '1.25rem 1.5rem',
                          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
                          textAlign: 'center',
                          color: '#0F172A',
                          animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          zIndex: 20
                        }}>
                          <div style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 900, letterSpacing: '0.06em' }}>
                            🎉 OFFICIAL MANUALLY DRAWN WINNING TICKET
                          </div>
                          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-primary-dark)', fontFamily: 'monospace', margin: '0.2rem 0' }}>
                            {broadcastState.manuallyPickedTicket}
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                            Winner: {broadcastState.manuallyPickedWinner || 'Verified Player'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                            Permit: {broadcastState.permitNumber} • Confirmed Live On Camera
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual Picking Status Details */}
                  {!broadcastState.isManualPickAnnounced ? (
                    <div style={{
                      maxWidth: '650px',
                      margin: '0 auto 1.5rem',
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-surface-border)',
                      borderRadius: '16px',
                      padding: '1.1rem 1.5rem',
                      fontSize: '0.9rem',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#10B981',
                        boxShadow: '0 0 8px #10B981'
                      }} />
                      <span>
                        <strong>Physical Manual Draw In Progress:</strong> The host is drawing the winning ball in front of the webcam live. The winning ticket will be verified and displayed here as soon as announced!
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: '650px',
                      margin: '0 auto 1.5rem',
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '16px',
                      padding: '1.1rem 1.5rem',
                      fontSize: '0.9rem',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem'
                    }}>
                      <CheckCircle size={20} color="#16A34A" />
                      <span>
                        <strong>Winning Number Verified:</strong> Ticket <strong>{broadcastState.manuallyPickedTicket}</strong> has been drawn live on camera and confirmed by NLA inspector!
                      </span>
                    </div>
                  )}

                  {/* Real User Purchased Tickets for this Live Draw */}
                  {userDrawTickets.length > 0 && (
                    <div style={{
                      maxWidth: '650px',
                      margin: '0 auto 1.5rem',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-surface-border)',
                      borderRadius: '16px',
                      padding: '1rem 1.25rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                          🎟 Your Tickets in this Live Draw ({userDrawTickets.length}):
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-purple)', fontWeight: 800, background: 'rgba(108, 93, 211, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                          Verified in Database
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {userDrawTickets.map((t: any) => {
                          const isWinner = broadcastState.manuallyPickedTicket && (
                            t.ticketNumber.toLowerCase() === broadcastState.manuallyPickedTicket.toLowerCase() ||
                            t.ticketNumber.replace('#', '') === broadcastState.manuallyPickedTicket.replace('#', '')
                          );
                          return (
                            <span
                              key={t.id || t.ticketNumber}
                              style={{
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                background: isWinner ? '#FEF08A' : 'var(--color-surface-elevated)',
                                color: isWinner ? '#854D0E' : 'var(--color-primary-dark)',
                                border: isWinner ? '2px solid #EAB308' : '1px solid var(--color-surface-border)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: isWinner ? '0 0 15px rgba(234, 179, 8, 0.4)' : 'none'
                              }}
                            >
                              {isWinner && '🏆 '}
                              {t.ticketNumber}
                              {isWinner && ' (WINNER!)'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STATE 3: CONCLUDED MODE */}
              {broadcastState.status === 'CONCLUDED' && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ display: 'inline-flex', padding: '1rem', background: '#DCFCE7', borderRadius: '50%', color: '#16A34A', marginBottom: '1rem' }}>
                    <CheckCircle size={40} />
                  </div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
                    Live Broadcast Concluded
                  </h2>
                  <p style={{ color: 'var(--color-text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
                    All numbers were drawn with 100% manual transparency on camera and certified by the National Lottery Authority inspector.
                  </p>
                  <button
                    onClick={() => setActiveTab('winners')}
                    className="btn-gold"
                    style={{ padding: '0.75rem 1.75rem' }}
                  >
                    View Certified Results
                  </button>
                </div>
              )}
            </div>

            {/* LIVE STREAM FOOTER: CHAT STREAM + FLOATING REACTIONS (LIGHT THEME) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 420px) 1fr',
              gap: '1rem',
              alignItems: 'end',
              position: 'relative',
              zIndex: 35,
              marginTop: '1.25rem',
              borderTop: '1px solid var(--color-surface-border)',
              paddingTop: '1rem'
            }}>
              {/* Left: TikTok/Instagram Style Live Chat Feed Overlay */}
              <div>
                <div 
                  ref={chatScrollRef}
                  className="live-chat-scroll"
                  style={{ marginBottom: '0.75rem' }}
                >
                  {broadcastState.chatMessages.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      💬 No messages yet. Say hello in the live chat!
                    </div>
                  ) : (
                    broadcastState.chatMessages.map((msg) => (
                      <div key={msg.id} className="chat-bubble-stream">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '2px' }}>
                          {msg.badge === 'ADMIN' && (
                            <span style={{ background: '#EF4444', color: '#FFF', fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                              OFFICIAL
                            </span>
                          )}
                          {msg.badge === 'VIP' && (
                            <span style={{ background: '#FFC107', color: '#000', fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                              VIP
                            </span>
                          )}
                          <span style={{ fontWeight: 800, color: msg.badge === 'ADMIN' ? '#DC2626' : 'var(--color-purple)', fontSize: '0.78rem' }}>
                            {msg.sender}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                            {msg.timestamp}
                          </span>
                        </div>
                        <div style={{ color: 'var(--color-text-main)', fontSize: '0.82rem' }}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Chat Send Input Box */}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Send a comment in live stream..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-surface-border)',
                      borderRadius: '20px',
                      padding: '0.55rem 1rem',
                      color: 'var(--color-text-main)',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'var(--color-purple)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '38px',
                      height: '38px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>

              {/* Right: Quick Reaction Buttons (Tap to trigger TikTok floating hearts/fire) */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>
                  Send Reaction:
                </span>
                {[
                  { emoji: '❤️', label: 'Heart' },
                  { emoji: '🔥', label: 'Fire' },
                  { emoji: '👏', label: 'Clap' },
                  { emoji: '🎯', label: 'Target' },
                  { emoji: '💎', label: 'Diamond' },
                  { emoji: '🇪🇹', label: 'Flag' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleSendReaction(item.emoji)}
                    style={{
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-surface-border)',
                      borderRadius: '50%',
                      width: '42px',
                      height: '42px',
                      fontSize: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    title={`Send ${item.label}`}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* FLYING FLOATING REACTIONS PARTICLES (TikTok / IG LIVE STYLE) */}
            {floatingReactions.map((r) => (
              <div
                key={r.id}
                className="floating-reaction-item"
                style={{
                  fontSize: '2rem',
                  transform: `translateX(${r.leftOffset}px)`,
                }}
              >
                {r.emoji}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: RECENT WINNERS SHOWCASE */}
        {activeTab === 'winners' && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  Recent Verified Winners
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
                  All draws are committed to the public database and verified by National Lottery Authority
                </p>
              </div>

              <button
                onClick={() => onNavigate('winners')}
                className="btn-ghost"
                style={{ fontSize: '0.88rem', color: 'var(--color-purple)' }}
              >
                View Full Archive <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {recentWinners.map((w) => (
                <div
                  key={w.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid var(--color-surface-border)',
                    boxShadow: 'var(--shadow-card)',
                    background: '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <img
                      src={w.prizeImageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=200&q=80'}
                      alt={w.prizeTitle}
                      style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Draw #{w.drawNumber} • {w.createdAt || w.drawDate ? new Date(w.createdAt || w.drawDate).toLocaleDateString() : 'Recent'}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                        {w.prizeTitle}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        Winner: {w.winnerDisplayName || 'Verified Player'}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-surface-elevated)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem'
                  }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>Ticket: </span>
                      <strong style={{ color: 'var(--color-primary-dark)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                        {w.winningTicketNumber}
                      </strong>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: 'var(--color-success)',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      <ShieldCheck size={14} /> NLA Certified
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 100% PROVABLY FAIR & TRANSPARENCY CARD */}
        {activeTab === 'transparency' && (
          <div style={{ marginTop: '1rem' }}>
            <div className="card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10B981',
                  padding: '0.65rem',
                  borderRadius: '50%'
                }}>
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--color-text-main)' }}>
                    100% Physical Drawing Transparency & Regulatory Audit
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Under Federal Democratic Republic of Ethiopia National Lottery Authority (FDRE NLA) License
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                <div>
                  <h4 style={{ color: 'var(--color-text-main)', fontWeight: 800, marginBottom: '0.3rem' }}>
                    1. Pre-Draw SHA-256 Snapshot Commitment
                  </h4>
                  <p>
                    Before any numbers are drawn, an immutable SHA-256 hash of all eligible ticket purchases is generated and locked.
                    This cryptographically proves that no tickets could be injected, removed, or modified after the sales cutoff.
                  </p>
                  <div style={{
                    marginTop: '0.5rem',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-surface-border)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    wordBreak: 'break-all',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{broadcastState.preDrawCommitmentHash}</span>
                    <button
                      onClick={() => handleCopyHash(broadcastState.preDrawCommitmentHash)}
                      className="btn-ghost"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      {copiedHash ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div>
                  <h4 style={{ color: 'var(--color-text-main)', fontWeight: 800, marginBottom: '0.3rem' }}>
                    2. Physical Manual Draw Live on Camera
                  </h4>
                  <p>
                    In accordance with National Lottery regulations, the draw operator does not use computer random generators during the live broadcast.
                    The operator physically draws the balls from the transparent container directly in front of the webcam so all users watch the live manual selection process.
                  </p>
                </div>

                <div>
                  <h4 style={{ color: 'var(--color-text-main)', fontWeight: 800, marginBottom: '0.3rem' }}>
                    3. Dual Auditor Oversight & Legal Permit
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ background: 'var(--color-surface-elevated)', padding: '0.85rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Lead Gaming Inspector</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-text-main)' }}>{broadcastState.leadAuditor}</div>
                    </div>

                    <div style={{ background: 'var(--color-surface-elevated)', padding: '0.85rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Compliance Officer</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-text-main)' }}>{broadcastState.complianceOfficer}</div>
                    </div>

                    <div style={{ background: 'var(--color-surface-elevated)', padding: '0.85rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>NLA Permit Number</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>{broadcastState.permitNumber}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </section>
    </div>
  );
};
