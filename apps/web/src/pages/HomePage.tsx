import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, ShieldCheck, Ticket, Sparkles, Clock, ArrowRight, 
  CheckCircle2, Flame, PlayCircle, ExternalLink, ChevronRight, ChevronLeft, Lock,
  Zap, HeartHandshake, HelpCircle, Video, Award, CheckCircle, MapPin, Gift, Settings,
  Play, Pause, RotateCcw, SkipForward, SkipBack, Volume2, VolumeX, Repeat
} from 'lucide-react';
import { api, DrawItem, FeaturedWinnerVideo, PromotionVideo } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { isAdmin } = useAuth();
  const [dbDraws, setDbDraws] = useState<DrawItem[]>([]);
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 14, seconds: 38 });
  const [winnerVideo, setWinnerVideo] = useState<FeaturedWinnerVideo | null>(null);
  const [winnerVideosList, setWinnerVideosList] = useState<FeaturedWinnerVideo[]>([]);
  const [promotionVideo, setPromotionVideo] = useState<PromotionVideo | null>(null);
  const [promotionVideosList, setPromotionVideosList] = useState<PromotionVideo[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<'WINNER' | 'PROMOTION'>('WINNER');
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [videoReloadCounter, setVideoReloadCounter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    loadDraws();
    loadFeaturedWinnerVideo();
  }, []);

  const loadFeaturedWinnerVideo = async () => {
    try {
      const [featRes, historyRes, promoRes, promoHistoryRes] = await Promise.allSettled([
        api.getFeaturedWinnerVideo(),
        api.getAllWinnerVideos(),
        api.getPromotionVideo(),
        api.getAllPromotionVideos(),
      ]);

      let wList: FeaturedWinnerVideo[] = [];
      if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value) && historyRes.value.length > 0) {
        wList = [...historyRes.value];
      }

      if (featRes.status === 'fulfilled' && featRes.value) {
        const feat = featRes.value;
        const exists = wList.some(v => v.id === feat.id);
        if (!exists) {
          wList = [feat, ...wList];
        }
      }
      // Sort newest publishedAt first so index 0 is always the most recently posted
      wList.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
      setWinnerVideosList(wList);
      if (wList.length > 0) {
        setWinnerVideo(wList[0]);
      }

      let pList: PromotionVideo[] = [];
      if (promoHistoryRes.status === 'fulfilled' && Array.isArray(promoHistoryRes.value) && promoHistoryRes.value.length > 0) {
        pList = [...promoHistoryRes.value];
      }

      if (promoRes.status === 'fulfilled' && promoRes.value) {
        const promo = promoRes.value;
        const exists = pList.some(v => v.id === promo.id);
        if (!exists) {
          pList = [promo, ...pList];
        }
      }
      // Sort newest publishedAt first so index 0 is always the most recently posted
      pList.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
      setPromotionVideosList(pList);
      if (pList.length > 0) {
        setPromotionVideo(pList[0]);
      }

      // Automatically show whichever post was published most recently (Winner or Promotion)
      const latestWinnerTime = wList[0]?.publishedAt ? new Date(wList[0].publishedAt).getTime() : 0;
      const latestPromoTime = pList[0]?.publishedAt ? new Date(pList[0].publishedAt).getTime() : 0;
      if (latestPromoTime > latestWinnerTime) {
        setActiveMediaTab('PROMOTION');
      } else {
        setActiveMediaTab('WINNER');
      }
    } catch (err) {
      console.warn('Failed to load featured videos:', err);
    }
  };

  const loadDraws = async () => {
    try {
      const res = await api.getDraws();
      if (res.draws && res.draws.length > 0) {
        setDbDraws(res.draws);
      }
    } catch (err) {
      console.error('Failed to load draws for HomePage from DB:', err);
    }
  };


  const heroDraw = dbDraws.find(d => d.isFeatured) || dbDraws[0] || {
    id: 'NL-000123',
    drawNumber: 'NL-000123',
    title: 'Samsung Galaxy S23 Ultra',
    ticketPriceEtb: 100,
    soldTickets: 742,
    totalTickets: 1000,
    salesEndDate: new Date(Date.now() + 2 * 3600000 + 14 * 60000).toISOString(),
    prize: {
      images: [{ url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=85' }],
    }
  };

  useEffect(() => {
    if (!heroDraw.salesEndDate) return;

    const timer = setInterval(() => {
      const end = new Date(heroDraw.salesEndDate).getTime();
      const diff = end - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ hours: h, minutes: m, seconds: s });
    }, 1000);

    return () => clearInterval(timer);
  }, [heroDraw.salesEndDate]);

  const formatDigits = (n: number) => n.toString().padStart(2, '0');

  const heroPct = heroDraw.totalTickets > 0 ? (heroDraw.soldTickets / heroDraw.totalTickets) * 100 : 0;
  const heroRemaining = Math.max(0, heroDraw.totalTickets - heroDraw.soldTickets);
  const isHeroSoldOut = heroDraw.totalTickets > 0 && (heroDraw.soldTickets >= heroDraw.totalTickets || heroRemaining <= 0);
  const isHeroTimeFinished = (timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) || new Date(heroDraw.salesEndDate).getTime() <= Date.now();
  const isHeroWinnerPicked = heroDraw.status === 'COMPLETED' || Boolean(heroDraw.result) || Boolean((heroDraw as any).winningTicketNumber);
  const isHeroClosed = isHeroSoldOut || isHeroTimeFinished || heroDraw.status !== 'OPEN' || isHeroWinnerPicked;
  const heroImage = heroDraw.prize?.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=900&q=85';

  const calculateCountdownTag = (salesEndDate: string) => {
    const end = new Date(salesEndDate).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return { text: 'Closed', type: 'closed', color: '#64748B' };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours < 24) {
      return {
        text: `${formatDigits(hours)}:${formatDigits(mins)}:${formatDigits(secs)}`,
        type: 'urgent',
        color: hours < 3 ? '#EF4444' : '#F59E0B',
      };
    }
    const days = Math.floor(hours / 24);
    return {
      text: `${days} day${days > 1 ? 's' : ''} left`,
      type: 'days',
      color: '#3B82F6',
    };
  };

  const isTikTokVideo = (item?: { videoPlatform?: string; videoUrl?: string; tiktokVideoId?: string; tiktokEmbedHtml?: string } | null) => {
    if (!item) return false;
    return (
      item.videoPlatform === 'tiktok' ||
      Boolean(item.videoUrl?.includes('tiktok.com')) ||
      Boolean(item.tiktokVideoId) ||
      Boolean(item.tiktokEmbedHtml)
    );
  };

  const isYouTubeVideo = (url?: string) => {
    if (!url) return false;
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2] && match[2].length === 11) {
      return `https://www.youtube-nocookie.com/embed/${match[2]}?autoplay=0&rel=0&modestbranding=1`;
    }
    if (url.includes('/embed/')) return url;
    return url;
  };

  const defaultWinnerVideo: FeaturedWinnerVideo = {
    id: 'hw-vid-nati-official-01',
    winnerName: 'Dagim B. (+251***567)',
    winnerPhone: '+251 911 ••• 567',
    winnerLocation: 'Addis Ababa (Bole Medhanealem)',
    prizeTitle: 'new product',
    winningTicketNumber: '#0001',
    drawNumber: 'NL-000007',
    drawTitle: 'new product',
    videoUrl: 'https://www.tiktok.com/@nati_lotto/video/7688259337197767943',
    videoPlatform: 'tiktok',
    tiktokVideoId: '7688259337197767943',
    tiktokAuthor: 'nati_lotto',
    permitNumber: 'NL-ET-2026-0892',
    handoverDate: '27 Sep 2026',
    handoverLocation: 'NATI LOTTO Addis Ababa Central Hub, Bole Sub-City',
    testimonialQuote: 'በቴሌብር 5 ቲኬት ቆርጬ ይሄንን የሮሌክስ ሰዓት አሸንፋለሁ ብዬ በፍጹም አላሰብኩም ነበር። በብሔራዊ ሎተሪ አስተዳደር ተቆጣጣሪዎች ፊት ተረጋግጦ በእጄ ደርሶኛል! አመሰግናለሁ ናቲ ሎቶ!',
    publishedAt: '2026-09-28T07:00:00.000Z'
  };

  const defaultPromotionVideo: PromotionVideo = {
    id: 'promo-official-default',
    title: 'Official Nati Lotto Brand & Weekly Draw Campaign',
    description: 'ለ በለጠ መረጃ 0921416569   #Nati_lotto  #luckynumber  #smartwatch ',
    videoUrl: 'https://vt.tiktok.com/ZSbMtQU9A/',
    videoPlatform: 'tiktok',
    tiktokVideoId: '7690049442619084033',
    tiktokAuthor: 'Nati_lotto',
    campaignBadge: 'Official Promotion',
    ctaText: "Play Today's Draws",
    ctaLink: '/draws',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    publishedAt: '2026-09-28T09:47:48.472Z'
  };

  // Full lists of posts for Winner and Promotion categories (sorted newest first)
  const currentWinnerList: FeaturedWinnerVideo[] = React.useMemo(() => {
    if (winnerVideosList.length > 0) return winnerVideosList;
    if (winnerVideo) return [winnerVideo];
    return [defaultWinnerVideo];
  }, [winnerVideosList, winnerVideo]);

  const currentPromoList: PromotionVideo[] = React.useMemo(() => {
    if (promotionVideosList.length > 0) return promotionVideosList;
    if (promotionVideo) return [promotionVideo];
    return [defaultPromotionVideo];
  }, [promotionVideosList, promotionVideo]);

  // The single recent post for Winner and Promotion (always the newest published item)
  const currentWinner: FeaturedWinnerVideo = currentWinnerList[0] || defaultWinnerVideo;
  const currentPromo: PromotionVideo = currentPromoList[0] || defaultPromotionVideo;

  const getWinnerTikTokId = (winner: FeaturedWinnerVideo) => {
    if (winner.tiktokVideoId) return winner.tiktokVideoId;
    const m = winner.videoUrl?.match(/\/video\/(\d+)/);
    if (m && m[1]) return m[1];
    const dm = winner.tiktokEmbedHtml?.match(/data-video-id=["'](\d+)["']/);
    if (dm && dm[1]) return dm[1];
    return '7688259337197767943';
  };

  const getPromoTikTokId = (promo: PromotionVideo) => {
    if (promo.tiktokVideoId) return promo.tiktokVideoId;
    const m = promo.videoUrl?.match(/\/video\/(\d+)/);
    if (m && m[1]) return m[1];
    const dm = promo.tiktokEmbedHtml?.match(/data-video-id=["'](\d+)["']/);
    if (dm && dm[1]) return dm[1];
    return '7690049442619084033';
  };

  const currentWinnerTikTokId = getWinnerTikTokId(currentWinner);
  const currentPromoTikTokId = getPromoTikTokId(currentPromo);

  const formatPostDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSecs < 120) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return 'Recent';
    }
  };

  const currentTikTokId = activeMediaTab === 'WINNER' ? currentWinnerTikTokId : currentPromoTikTokId;

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // absolutely prevent redirect!
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleReplayVideo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      const dur = videoRef.current.duration || 1;
      setVideoCurrentTime(cur);
      setVideoDuration(dur);
      setVideoProgress((cur / dur) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pct = Number(e.target.value);
    if (videoRef.current && videoDuration) {
      videoRef.current.currentTime = (pct / 100) * videoDuration;
      setVideoProgress(pct);
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(false);
      });
    }
  }, [activeVideoIndex]);

  return (
    <div style={{ paddingBottom: '5rem', backgroundColor: 'var(--color-bg)' }}>

      {/* 1. Main Hero Card - Loaded from PostgreSQL database */}
      <section className="container" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #161D31 50%, #1E1B4B 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: 'clamp(2rem, 4vw, 3.5rem)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.8)'
        }}>
          {/* Subtle Aurora Glow in background */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            right: '10%',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(108, 93, 211, 0.28) 0%, rgba(255, 193, 7, 0.08) 50%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            {/* Left Content Column */}
            <div>
              <div style={{ display: 'inline-flex', marginBottom: '1rem' }}>
                <span className="badge-purple">
                  <Sparkles size={13} /> Featured Draw
                </span>
              </div>

              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '0.6rem'
              }}>
                {heroDraw.title}
              </h1>

              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: 700, 
                color: '#CBD5E1', 
                marginBottom: '1.75rem' 
              }}>
                {heroDraw.ticketPriceEtb} ETB <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>/ ticket</span>
              </div>

              {/* Progress Bar with Labels */}
              <div style={{ marginBottom: '1.75rem', maxWidth: '420px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  marginBottom: '0.5rem',
                  color: '#94A3B8'
                }}>
                  <span style={{ color: '#F1F5F9' }}>{heroDraw.soldTickets} / {heroDraw.totalTickets} tickets sold</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{heroRemaining} left</span>
                </div>
                <div className="progress-container" style={{ height: '8px' }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(heroPct, 100)}%` }} />
                </div>
              </div>

              {/* If winner picked, remove countdown blocks and show winner certification */}
              {isHeroWinnerPicked ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  marginBottom: '2rem',
                  background: 'rgba(255, 193, 7, 0.15)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '14px',
                  maxWidth: '420px'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: '#F59E0B',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Trophy size={22} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-gold)', fontWeight: 800, fontSize: '0.95rem' }}>
                      🏆 Official Winner Certified
                    </div>
                    <div style={{ color: '#F1F5F9', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                      Ticket: <strong style={{ color: 'var(--color-text-gold)' }}>{heroDraw.result?.winningTicketNumber || (heroDraw as any).winningTicketNumber || '#0382'}</strong>
                    </div>
                  </div>
                </div>
              ) : !isHeroClosed ? (
                /* Countdown Timer Blocks */
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div className="countdown-digit-box">
                    <div className="countdown-number">{formatDigits(timeLeft.hours)}</div>
                    <div className="countdown-label">Hours</div>
                  </div>
                  <span style={{ color: '#64748B', fontWeight: 800, fontSize: '1.2rem' }}>:</span>
                  <div className="countdown-digit-box">
                    <div className="countdown-number">{formatDigits(timeLeft.minutes)}</div>
                    <div className="countdown-label">Minutes</div>
                  </div>
                  <span style={{ color: '#64748B', fontWeight: 800, fontSize: '1.2rem' }}>:</span>
                  <div className="countdown-digit-box">
                    <div className="countdown-number">{formatDigits(timeLeft.seconds)}</div>
                    <div className="countdown-label">Seconds</div>
                  </div>
                </div>
              ) : null}

              {/* Enter Draw Button */}
              <div>
                {isHeroWinnerPicked ? (
                  <button 
                    onClick={() => onNavigate('draw-detail', { drawId: heroDraw.drawNumber || heroDraw.id })}
                    className="btn-gold"
                    style={{ width: '100%', maxWidth: '340px', padding: '0.9rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Trophy size={18} />
                    <span>View Certified Winner</span>
                  </button>
                ) : isHeroClosed ? (
                  <button 
                    onClick={() => onNavigate('draw-detail', { drawId: heroDraw.drawNumber || heroDraw.id })}
                    className="btn-ghost"
                    style={{ 
                      width: '100%', 
                      maxWidth: '340px', 
                      padding: '0.9rem', 
                      fontSize: '1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#F87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontWeight: 800
                    }}
                  >
                    <Lock size={18} />
                    <span>{isHeroSoldOut ? 'Sold Out (Post Locked)' : 'Sales Ended (Post Closed)'}</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => onNavigate('draw-detail', { drawId: heroDraw.drawNumber || heroDraw.id })}
                    className={isAdmin ? 'btn-purple' : 'btn-gold'}
                    style={{ width: '100%', maxWidth: '340px', padding: '0.9rem', fontSize: '1.05rem' }}
                  >
                    {isAdmin ? 'Inspect Draw (Admin Oversight)' : 'Enter Draw'}
                  </button>
                )}
              </div>
            </div>

            {/* Right Product Image */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              position: 'relative'
            }}>
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '440px',
                height: '380px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={heroImage} 
                  alt={heroDraw.title} 
                  style={{ 
                    maxHeight: '100%', 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 20px 30px rgba(0, 0, 0, 0.7))',
                    borderRadius: '16px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Official Video Showcase with By-Post Selector (Light Mode) */}
      {(currentWinner || currentPromo) && (
        <section className="container" style={{ paddingTop: '0.5rem', paddingBottom: '2.5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 50%, #FEF9EE 100%)',
            borderRadius: '24px',
            border: '1.5px solid #FDE68A',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.08), 0 0 30px rgba(245, 158, 11, 0.06)',
            padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle warm golden ambiance in background */}
            <div style={{
              position: 'absolute',
              top: '-15%',
              left: '20%',
              width: '450px',
              height: '450px',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.03) 50%, transparent 70%)',
              filter: 'blur(50px)',
              pointerEvents: 'none'
            }} />

            {/* Header / Pill Banner with Tab Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', position: 'relative', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {/* Switcher buttons between Winner and Promotion */}
                <div style={{ display: 'flex', gap: '0.35rem', background: '#F1F5F9', padding: '0.25rem', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('WINNER')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeMediaTab === 'WINNER' ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'transparent',
                      color: activeMediaTab === 'WINNER' ? '#FFFFFF' : '#475569',
                      boxShadow: activeMediaTab === 'WINNER' ? '0 2px 8px rgba(217, 119, 6, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Trophy size={13} />
                    <span>🏆 Winner Handover</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('PROMOTION')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeMediaTab === 'PROMOTION' ? 'linear-gradient(135deg, #00F2FE 0%, #0284C7 100%)' : 'transparent',
                      color: activeMediaTab === 'PROMOTION' ? '#FFFFFF' : '#475569',
                      boxShadow: activeMediaTab === 'PROMOTION' ? '0 2px 8px rgba(2, 132, 199, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Sparkles size={13} />
                    <span>🚀 Official Promo Video</span>
                  </button>
                </div>

                <span style={{
                  color: activeMediaTab === 'WINNER' ? '#047857' : '#0284C7',
                  background: activeMediaTab === 'WINNER' ? '#ECFDF5' : '#F0F9FF',
                  border: activeMediaTab === 'WINNER' ? '1px solid #A7F3D0' : '1px solid #BAE6FD',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  {activeMediaTab === 'WINNER' ? (
                    <><ShieldCheck size={14} color="#059669" /> Official Handover Proof</>
                  ) : (
                    <><Award size={14} color="#0284C7" /> {currentPromo.campaignBadge || 'Official Campaign'}</>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>
                  Witnessed under Permit: <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{currentWinner.permitNumber || 'NL-ET-2026-0892'}</strong>
                </span>
                {isAdmin && (
                  <button
                    onClick={() => onNavigate('admin')}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      color: '#334155',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                    title="Change or post a new winner/promotion video from the Admin console"
                  >
                    <Settings size={12} /> Post Video
                  </button>
                )}
              </div>
            </div>

            {/* Content Grid: Video on Left, Details on Right */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2
            }}>
              {/* Left Column: Video Player Container (Light Mode) */}
              <div>
                <div style={{
                  maxWidth: '380px',
                  margin: '0 auto',
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '24px',
                  boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12), 0 0 25px rgba(245, 158, 11, 0.08)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {/* Light Mode Header Bar */}
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(90deg, #F8FAFC 0%, #F1F5F9 100%)',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        background: activeMediaTab === 'WINNER' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)',
                        color: '#FFFFFF',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                      }}>
                        {activeMediaTab === 'WINNER' ? '● HD HANDOVER' : '● OFFICIAL PROMO'}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeMediaTab === 'WINNER' ? currentWinner.prizeTitle.split('(')[0] : currentPromo.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        background: activeMediaTab === 'WINNER' ? 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)' : 'linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                      }}>
                        <Flame size={11} /> RECENT POST
                      </span>
                    </div>
                  </div>

                  {/* Video Player Screen Area */}
                  <div 
                    style={{
                      position: 'relative',
                      minHeight: '480px',
                      maxHeight: '520px',
                      background: '#0B0F19',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {activeMediaTab === 'WINNER' ? (
                      isYouTubeVideo(currentWinner.videoUrl) ? (
                        <iframe
                          key={`winner-yt-${currentWinner.id}-${currentWinner.videoUrl}`}
                          src={getYouTubeEmbedUrl(currentWinner.videoUrl)}
                          style={{
                            width: '100%',
                            height: '520px',
                            border: 'none',
                            display: 'block'
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                          title={`Winner Handover Video - ${currentWinner.winnerName}`}
                        />
                      ) : (
                        <video
                          ref={videoRef}
                          key={`winner-video-${currentWinner.id}-${currentWinner.videoUrl}`}
                          src={
                            currentWinner.directVideoUrl ||
                            (currentWinner.videoUrl?.includes('.mp4') ? currentWinner.videoUrl : `http://localhost:4000/api/v1/winners/video/${currentWinnerTikTokId}.mp4`)
                          }
                          poster={currentWinner.thumbnailUrl || currentWinner.prizeImageUrl}
                          controls
                          playsInline
                          preload="auto"
                          muted={isMuted}
                          onTimeUpdate={handleTimeUpdate}
                          onEnded={handleVideoEnded}
                          style={{
                            width: '100%',
                            height: '100%',
                            maxHeight: '520px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                      )
                    ) : (
                      /* Promotion Video Player */
                      isYouTubeVideo(currentPromo.videoUrl) ? (
                        <iframe
                          key={`promo-yt-${currentPromo.id}-${currentPromo.videoUrl}`}
                          src={getYouTubeEmbedUrl(currentPromo.videoUrl)}
                          style={{
                            width: '100%',
                            height: '520px',
                            border: 'none',
                            display: 'block'
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                          title={`Promotion YouTube Video - ${currentPromo.title}`}
                        />
                      ) : (
                        <video
                          key={`promo-mp4-${currentPromo.id}-${currentPromo.videoUrl}`}
                          src={
                            currentPromo.directVideoUrl ||
                            (currentPromo.videoUrl?.includes('.mp4') ? currentPromo.videoUrl : `http://localhost:4000/api/v1/winners/video/${currentPromoTikTokId}.mp4`)
                          }
                          poster={currentPromo.thumbnailUrl}
                          controls
                          playsInline
                          preload="auto"
                          style={{
                            width: '100%',
                            height: '100%',
                            maxHeight: '520px',
                            objectFit: 'cover',
                            display: 'block'
                          }}
                        />
                      )
                    )}

                    {/* Top Floating Badge on Video */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#FFFFFF',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      zIndex: 3,
                      pointerEvents: 'none'
                    }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: activeMediaTab === 'WINNER' ? '#10B981' : '#00F2FE', display: 'inline-block' }} />
                      {activeMediaTab === 'WINNER' ? '🔥 Recent Winner Handover' : '🔥 Recent Promo Campaign'}
                    </div>
                  </div>

                  {/* Verified FDRE NLA Proof Footer (Light Mode) */}
                  <div style={{
                    padding: '0.65rem 1rem',
                    background: '#F8FAFC',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem'
                  }}>
                    <span style={{ color: activeMediaTab === 'WINNER' ? '#059669' : '#0284C7', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}>
                      <ShieldCheck size={14} color={activeMediaTab === 'WINNER' ? '#059669' : '#0284C7'} /> Verified by National Lottery Administration
                    </span>
                    <span style={{ color: '#475569', fontFamily: 'monospace', fontWeight: 700 }}>
                      {activeMediaTab === 'WINNER' ? (currentWinner.permitNumber || 'NL-ET-2026-0892') : 'NL-ET-2026-CAMPAIGN'}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#64748B',
                  maxWidth: '380px',
                  margin: '0.75rem auto 0'
                }}>
                  <span>📍 {activeMediaTab === 'WINNER' ? (currentWinner.handoverLocation || 'Addis Ababa Central Hub') : 'FDRE National Lottery Approved'}</span>
                  <span>📅 {activeMediaTab === 'WINNER' ? `Handed over on ${currentWinner.handoverDate || '27 Sep 2026'}` : `Posted ${formatPostDate(currentPromo.publishedAt)}`}</span>
                </div>
              </div>

              {/* Right Column: Certified Winner Details vs Official Promotion Details */}
              {activeMediaTab === 'WINNER' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#D97706', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Award size={20} color="#D97706" />
                      <span>Certified Lottery Winner</span>
                    </div>
                    <span style={{
                      background: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)',
                      color: '#FFFFFF',
                      padding: '0.18rem 0.55rem',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
                    }}>
                      <Flame size={12} /> RECENT POST
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: 'clamp(1.6rem, 3.2vw, 2.3rem)',
                    fontWeight: 900,
                    color: '#0F172A',
                    lineHeight: 1.2,
                    marginBottom: '0.4rem',
                    letterSpacing: '-0.02em'
                  }}>
                    {currentWinner.winnerName}
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#475569',
                    fontSize: '0.88rem',
                    marginBottom: '1.25rem',
                    fontWeight: 600
                  }}>
                    <MapPin size={15} color="#2563EB" />
                    <span>{currentWinner.winnerLocation || 'Addis Ababa, Ethiopia'}</span>
                    {currentWinner.winnerPhone && (
                      <>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span style={{ color: '#334155', fontWeight: 700 }}>{currentWinner.winnerPhone}</span>
                      </>
                    )}
                  </div>

                  {/* Prize Received Highlight Box (Light Mode) */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '1.15rem 1.35rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 4px 18px -2px rgba(15, 23, 42, 0.05)'
                  }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                      border: '1px solid #FCD34D',
                      color: '#B45309',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 10px rgba(245, 158, 11, 0.2)'
                    }}>
                      <Gift size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                        Product Received in Hand
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', marginTop: '0.15rem', letterSpacing: '-0.01em' }}>
                        {currentWinner.prizeTitle}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                        Winning Ticket: <strong style={{ color: '#D97706', fontFamily: 'monospace', fontSize: '0.9rem' }}>{currentWinner.winningTicketNumber || '#0008'}</strong>
                        <span style={{ margin: '0 0.4rem', color: '#CBD5E1' }}>•</span>
                        <span>Draw: <strong style={{ color: '#0F172A' }}>{currentWinner.drawNumber || 'NL-000123'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Winner Testimonial Quote (Light Mode) */}
                  {currentWinner.testimonialQuote && (
                    <div style={{
                      background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 25%, #F8FAFC 100%)',
                      borderLeft: '4px solid #F59E0B',
                      borderTop: '1px solid #FDE68A',
                      borderRight: '1px solid #FDE68A',
                      borderBottom: '1px solid #FDE68A',
                      padding: '0.95rem 1.15rem',
                      borderRadius: '0 14px 14px 0',
                      marginBottom: '1.25rem',
                      color: '#1E293B',
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                      lineHeight: 1.55,
                      boxShadow: '0 2px 10px rgba(245, 158, 11, 0.05)'
                    }}>
                      "{currentWinner.testimonialQuote}"
                    </div>
                  )}

                  {/* Legal & Delivery Verification Badges (Light Mode) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: '#065F46',
                      fontWeight: 800,
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '10px'
                    }}>
                      <CheckCircle size={15} color="#059669" /> National Lottery Verified
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: '#065F46',
                      fontWeight: 800,
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '10px'
                    }}>
                      <CheckCircle size={15} color="#059669" /> Physical Handover Signed
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: '#065F46',
                      fontWeight: 800,
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '10px'
                    }}>
                      <CheckCircle size={15} color="#059669" /> 100% Tax Settled
                    </div>
                  </div>

                  {/* CTA Buttons in Light Mode */}
                  <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onNavigate('draws')}
                      className="btn-gold"
                      style={{
                        padding: '0.8rem 1.6rem',
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 18px rgba(245, 158, 11, 0.35)'
                      }}
                    >
                      <span>Play Today's Draws</span>
                      <ArrowRight size={16} />
                    </button>

                    <button
                      onClick={() => onNavigate('winners')}
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #CBD5E1',
                        color: '#0F172A',
                        padding: '0.8rem 1.4rem',
                        borderRadius: '12px',
                        fontSize: '0.94rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#94A3B8';
                        e.currentTarget.style.background = '#F8FAFC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      <Trophy size={16} color="#D97706" />
                      <span>View All Winners</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* PROMOTION VIDEO DETAILS */
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0284C7', fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Sparkles size={20} color="#0284C7" />
                      <span>Official Campaign Showcase</span>
                    </div>
                    <span style={{
                      background: 'linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)',
                      color: '#FFFFFF',
                      padding: '0.18rem 0.55rem',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                    }}>
                      <Flame size={12} /> RECENT POST
                    </span>
                  </div>

                  <h3 style={{
                    fontSize: 'clamp(1.6rem, 3.2vw, 2.3rem)',
                    fontWeight: 900,
                    color: '#0F172A',
                    lineHeight: 1.2,
                    marginBottom: '0.4rem',
                    letterSpacing: '-0.02em'
                  }}>
                    {currentPromo.title}
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#475569',
                    fontSize: '0.88rem',
                    marginBottom: '1.25rem',
                    fontWeight: 600
                  }}>
                    <Video size={15} color="#0284C7" />
                    <span>Official Nati Lotto Channel</span>
                    {currentPromo.tiktokAuthor && (
                      <>
                        <span style={{ color: '#CBD5E1' }}>•</span>
                        <span style={{ color: '#0284C7', fontWeight: 700 }}>@{currentPromo.tiktokAuthor}</span>
                      </>
                    )}
                  </div>

                  {/* Campaign Value Box */}
                  <div style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #E0F2FE',
                    borderRadius: '16px',
                    padding: '1.15rem 1.35rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 4px 18px -2px rgba(2, 132, 199, 0.08)'
                  }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
                      border: '1px solid #7DD3FC',
                      color: '#0284C7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 10px rgba(2, 132, 199, 0.2)'
                    }}>
                      <Flame size={26} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: '#0284C7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                        {currentPromo.campaignBadge || 'National Lottery Promotion'}
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', marginTop: '0.15rem', letterSpacing: '-0.01em' }}>
                        Weekly Super Jackpots & Daily Luxury Prizes
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem' }}>
                        Tickets from <strong style={{ color: '#0284C7' }}>5 ETB</strong>
                        <span style={{ margin: '0 0.4rem', color: '#CBD5E1' }}>•</span>
                        <span>Pay via <strong style={{ color: '#0F172A' }}>Telebirr</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Description Box */}
                  {currentPromo.description && (
                    <div style={{
                      background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 30%, #F8FAFC 100%)',
                      borderLeft: '4px solid #0284C7',
                      borderTop: '1px solid #BAE6FD',
                      borderRight: '1px solid #BAE6FD',
                      borderBottom: '1px solid #BAE6FD',
                      padding: '0.95rem 1.15rem',
                      borderRadius: '0 14px 14px 0',
                      marginBottom: '1.25rem',
                      color: '#1E293B',
                      fontSize: '0.9rem',
                      lineHeight: 1.55,
                      boxShadow: '0 2px 10px rgba(2, 132, 199, 0.05)'
                    }}>
                      "{currentPromo.description}"
                    </div>
                  )}

                  {/* Legal & Telebirr Verification Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', marginBottom: '1.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: '#0369A1',
                      fontWeight: 800,
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '10px'
                    }}>
                      <CheckCircle size={15} color="#0284C7" /> NLA License #NL-ET-2026
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: '#0369A1',
                      fontWeight: 800,
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '10px'
                    }}>
                      <CheckCircle size={15} color="#0284C7" /> Instant Telebirr Tickets
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.78rem',
                      color: '#0369A1',
                      fontWeight: 800,
                      background: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '10px'
                    }}>
                      <CheckCircle size={15} color="#0284C7" /> Live Broadcast Certified
                    </div>
                  </div>

                  {/* CTA Buttons for Promotion */}
                  <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onNavigate('draws')}
                      style={{
                        background: 'linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '0.8rem 1.6rem',
                        borderRadius: '12px',
                        fontSize: '0.94rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 18px rgba(2, 132, 199, 0.4)'
                      }}
                    >
                      <span>{currentPromo.ctaText || "Play Today's Draws"}</span>
                      <ArrowRight size={16} />
                    </button>

                    <button
                      onClick={() => onNavigate('live')}
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #CBD5E1',
                        color: '#0F172A',
                        padding: '0.8rem 1.4rem',
                        borderRadius: '12px',
                        fontSize: '0.94rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Video size={16} color="#0284C7" />
                      <span>Watch Live Studio</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. Featured Draws Section - Loaded from PostgreSQL database */}
      <section className="container" style={{ paddingTop: '1rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: '1.6rem', 
            fontWeight: 800, 
            color: 'var(--color-text-main)' 
          }}>
            Featured Draws
          </h2>
          <button 
            onClick={() => onNavigate('draws')} 
            className="btn-ghost"
            style={{ fontSize: '0.88rem', color: 'var(--color-purple)' }}
          >
            View All <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {dbDraws.slice(0, 4).map(draw => {
            const percentSold = draw.totalTickets > 0 ? Math.round((draw.soldTickets / draw.totalTickets) * 100) : 0;
            const remaining = Math.max(0, draw.totalTickets - draw.soldTickets);
            const tag = calculateCountdownTag(draw.salesEndDate);
            const cardImg = draw.prize?.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80';

            return (
              <div 
                key={draw.id} 
                className="card"
                onClick={() => onNavigate('draw-detail', { drawId: draw.drawNumber || draw.id })}
                style={{ cursor: 'pointer', padding: '1rem', display: 'flex', flexDirection: 'column' }}
              >
                {/* Image Container with Surface Elevated Background */}
                <div style={{ 
                  background: 'var(--color-surface-elevated)', 
                  borderRadius: '12px', 
                  height: '160px', 
                  overflow: 'hidden', 
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <img 
                    src={cardImg} 
                    alt={draw.title} 
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                  />
                  {/* Video indicator badge if product has video */}
                  {Boolean(draw.videoUrl || draw.prize?.videoUrl || (draw.prize?.specifications as any)?.videoUrl) && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(254, 44, 85, 0.9)',
                      color: '#FFFFFF',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '20px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 8px rgba(254, 44, 85, 0.4)',
                      backdropFilter: 'blur(4px)',
                      zIndex: 2
                    }}>
                      <Video size={10} />
                      VIDEO
                    </div>
                  )}
                  {/* Countdown pill in top right corner OR Winner badge */}
                  {(draw.status === 'COMPLETED' || Boolean(draw.result) || Boolean((draw as any).winningTicketNumber)) ? (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(245, 158, 11, 0.95)',
                      color: '#000000',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                    }}>
                      <Trophy size={11} />
                      WINNER
                    </div>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      border: `1px solid ${tag.color}`,
                      color: tag.color,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backdropFilter: 'blur(4px)'
                    }}>
                      <Clock size={11} />
                      {tag.text}
                    </div>
                  )}
                </div>

                {/* Card Title & Ticket Price */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: 'var(--color-text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                  }}>
                    {draw.drawNumber}
                  </div>
                  <h3 style={{ 
                    fontSize: '1.05rem', 
                    fontWeight: 700, 
                    color: 'var(--color-text-main)', 
                    marginBottom: '0.25rem',
                    lineHeight: 1.3
                  }}>
                    {draw.title}
                  </h3>
                  <div style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: 800, 
                    color: 'var(--color-text-gold)' 
                  }}>
                    {draw.ticketPriceEtb} ETB <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ ticket</span>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                {(() => {
                  const isSoldOut = draw.totalTickets > 0 && (draw.soldTickets >= draw.totalTickets || remaining <= 0);
                  const isTimeFinished = new Date(draw.salesEndDate).getTime() <= Date.now();
                  const isCardClosed = isSoldOut || isTimeFinished || draw.status !== 'OPEN';

                  return (
                    <div style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        fontSize: '0.75rem', 
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.35rem'
                      }}>
                        <span>{draw.soldTickets} / {draw.totalTickets} sold</span>
                        <span style={{ color: isCardClosed ? '#EF4444' : undefined, fontWeight: isCardClosed ? 700 : undefined }}>
                          {isSoldOut ? 'Sold out' : `${remaining} left`}
                        </span>
                      </div>
                      <div className="progress-container" style={{ height: '6px', marginBottom: '0.75rem' }}>
                        <div className="progress-bar-fill" style={{ width: `${percentSold}%`, backgroundColor: isCardClosed ? '#EF4444' : undefined }} />
                      </div>

                      {/* Card Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('draw-detail', { drawId: draw.drawNumber || draw.id });
                        }}
                        className="btn-ghost"
                        style={{ 
                          width: '100%', 
                          padding: '0.5rem', 
                          fontSize: '0.82rem', 
                          background: isCardClosed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                          border: isCardClosed ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: isCardClosed ? '#F87171' : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          fontWeight: isCardClosed ? 700 : 500
                        }}
                      >
                        {isCardClosed ? (
                          <>
                            <Lock size={12} />
                            <span>{isSoldOut ? 'Sold Out' : 'Closed'}</span>
                          </>
                        ) : (
                          <>
                            {isAdmin ? 'Inspect Draw' : 'Enter Draw'} <ChevronRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Value Props & Trust Badges */}
      <section className="container" style={{ paddingTop: '4rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              background: 'rgba(108, 93, 211, 0.15)',
              padding: '0.75rem',
              borderRadius: '12px',
              color: 'var(--color-purple)'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                100% Cryptographic Proof
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Every draw uses 256-bit CSPRNG entropy with immutable pre-draw SHA-256 hashes you can independently verify.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              background: 'rgba(255, 193, 7, 0.15)',
              padding: '0.75rem',
              borderRadius: '12px',
              color: 'var(--color-primary)'
            }}>
              <Zap size={24} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                Instant Telebirr & CBE Birr
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Seamless, certified Ethiopian payment rails with instant ticket confirmation and zero delayed SMS codes.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              padding: '0.75rem',
              borderRadius: '12px',
              color: '#22C55E'
            }}>
              <Trophy size={24} />
            </div>
            <div>
              <h4 style={{ fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.3rem' }}>
                Government Licensed
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Regulated and audited under Ethiopian National Lottery Administration permit NL-ET-2026-0892.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
