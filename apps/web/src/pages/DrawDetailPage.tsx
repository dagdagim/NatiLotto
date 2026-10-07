import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, Clock, CheckCircle2, Ticket, ArrowLeft, 
  Smartphone, Building2, QrCode, Lock, AlertCircle, Check,
  CreditCard, ChevronRight, UserCheck, Loader2, Sparkles,
  Dices, Search, X, ChevronLeft, Filter, RefreshCw, Trophy,
  Video, Play, ExternalLink
} from 'lucide-react';
import { api, DrawItem } from '../services/api';

interface DrawDetailPageProps {
  drawId?: string;
  onNavigate: (page: string, params?: any) => void;
  onRequireAuth?: () => void;
}

export const DrawDetailPage: React.FC<DrawDetailPageProps> = ({ drawId, onNavigate, onRequireAuth }) => {
  const { user, isAuthenticated, isAdmin, login, updateWallet } = useAuth();
  const [draw, setDraw] = useState<DrawItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [showProductVideo, setShowProductVideo] = useState(false);
  const [preferDirectPlayer, setPreferDirectPlayer] = useState(true);
  const [resolvedTikTokId, setResolvedTikTokId] = useState<string | null>(null);
  const [isResolvingTikTok, setIsResolvingTikTok] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'Details' | 'How It Works' | 'Rules'>('Details');
  const [quantity, setQuantity] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState<'Telebirr' | 'CBE Birr' | 'Bank Card' | 'Chapa' | 'Commercial Bank'>('Telebirr');
  const [savePayment, setSavePayment] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAuthRequiredModal, setShowAuthRequiredModal] = useState(false);
  const [showChapaPendingModal, setShowChapaPendingModal] = useState(false);
  const [chapaPendingData, setChapaPendingData] = useState<{
    orderId?: string;
    orderNumber?: string;
    txRef?: string;
    checkoutUrl?: string;
    quantity: number;
    totalEtb: number;
  } | null>(null);
  const [isVerifyingChapa, setIsVerifyingChapa] = useState(false);
  const [chapaVerifyError, setChapaVerifyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchasedOrder, setPurchasedOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 2, minutes: 14, seconds: 38 });

  // Custom lucky ticket selection states
  const [pickMode, setPickMode] = useState<'QUICK' | 'CUSTOM'>('QUICK');
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [bookedNumbers, setBookedNumbers] = useState<Set<number>>(new Set());
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [batchRangeIndex, setBatchRangeIndex] = useState(0);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'AVAILABLE' | 'SELECTED'>('ALL');

  const getEffectiveDrawId = (): string => {
    // 1. If explicit prop is provided (and not stale demo)
    if (drawId && drawId.trim() && drawId !== 'NL-000123') return drawId.trim();

    // 2. Read from window.location.hash
    try {
      if (window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        const fromHash = hashParams.get('id') || hashParams.get('drawId');
        if (fromHash && fromHash.trim()) return fromHash.trim();
      }
    } catch {}

    // 3. Read from window.location.search
    try {
      const fromSearch = new URLSearchParams(window.location.search).get('id') || new URLSearchParams(window.location.search).get('drawId');
      if (fromSearch && fromSearch.trim()) return fromSearch.trim();
    } catch {}

    // 4. Read from localStorage
    try {
      const saved = localStorage.getItem('nati_lotto_selected_draw_id');
      if (saved && saved.trim() && saved !== 'NL-000123') return saved.trim();
    } catch {}

    return drawId || 'NL-000014';
  };

  useEffect(() => {
    const activeId = getEffectiveDrawId();
    loadDraw(activeId);

    const handleHashSync = () => {
      const newId = getEffectiveDrawId();
      loadDraw(newId);
    };
    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, [drawId]);

  useEffect(() => {
    // Check if user returned from Chapa checkout with tx_ref
    const verifyReturningChapa = async () => {
      try {
        let txRef: string | null = null;
        const searchParams = new URLSearchParams(window.location.search);
        txRef = searchParams.get('tx_ref');

        if (!txRef && window.location.hash.includes('?')) {
          const hashQuery = window.location.hash.split('?')[1];
          const hashParams = new URLSearchParams(hashQuery);
          txRef = hashParams.get('tx_ref');
        }

        if (txRef) {
          setIsSubmitting(true);
          const res = await api.verifyPayment(txRef);
          if (res.success && res.status === 'SUCCESS') {
            setPurchasedOrder({
              orderNumber: res.orderNumber || 'ORD-CHAPA-CONFIRMED',
              ticketNumbers: res.ticketNumbers && res.ticketNumbers.length > 0 ? res.ticketNumbers : undefined,
              quantity: res.quantity || 1,
              totalEtb: res.totalEtb || 0,
              paymentMethod: 'Chapa',
            });
            setShowSuccessModal(true);

            // Clean up the URL query parameters so refreshing stays on #draw-detail cleanly
            const cleanUrl = `${window.location.origin}/#draw-detail${drawId ? `?id=${drawId}` : ''}`;
            window.history.replaceState({}, document.title, cleanUrl);

            // Refresh draw and ticket availability
            loadDraw();
            if (res.drawId) {
              loadTicketAvailability(res.drawId);
            }
          }
        }
      } catch (err) {
        console.error('Failed to verify returning Chapa payment:', err);
      } finally {
        setIsSubmitting(false);
      }
    };

    verifyReturningChapa();
  }, [drawId]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const targetTime = draw?.salesEndDate ? new Date(draw.salesEndDate).getTime() : Date.now() + 8078000;
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { days, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [draw?.salesEndDate]);

  const loadDraw = async (overrideId?: string) => {
    try {
      setLoading(true);
      const targetId = overrideId || getEffectiveDrawId();
      let data: DrawItem | null = null;
      try {
        data = await api.getDrawById(targetId);
      } catch (err) {
        console.warn(`Draw ${targetId} could not be retrieved directly:`, err);
      }

      // If draw not found (e.g. stale ID or demo), fetch newest active draws from DB
      if (!data || !data.id) {
        try {
          const allDraws = await api.getDraws({ limit: 10 });
          if (allDraws?.draws && allDraws.draws.length > 0) {
            data = allDraws.draws[0];
          }
        } catch (_) {}
      }

      if (data) {
        setDraw(data);
        const canonicalId = data.drawNumber || data.id;
        localStorage.setItem('nati_lotto_selected_draw_id', canonicalId);
        // Sync URL hash with the exact canonical draw ID
        const targetHash = `#draw-detail?id=${encodeURIComponent(canonicalId)}`;
        if (window.location.hash !== targetHash) {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${targetHash}`);
        }
        if (data.id) {
          loadTicketAvailability(data.id);
        }
      }
    } catch (err) {
      console.error('Error fetching draw details from database:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketAvailability = async (idToFetch?: string) => {
    const targetId = idToFetch || draw?.id;
    if (!targetId) return;
    try {
      setIsLoadingAvailability(true);
      const data = await api.getTicketAvailability(targetId);
      if (data && Array.isArray(data.bookedSequenceNumbers)) {
        setBookedNumbers(new Set(data.bookedSequenceNumbers));
      }
    } catch (err) {
      console.warn('Failed to load ticket availability:', err);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const totalTicketsCount = draw?.totalTickets || 1000;
  const padLen = totalTicketsCount > 9999 ? 6 : 4;
  const formatTicketNum = (seq: number) => `#${String(seq).padStart(padLen, '0')}`;

  const toggleTicketNumber = (seq: number) => {
    if (bookedNumbers.has(seq)) return;
    setSelectedNumbers((prev) => {
      if (prev.includes(seq)) {
        return prev.filter((n) => n !== seq);
      } else {
        if (prev.length >= 25) {
          alert('Maximum limit is 25 tickets per user per draw.');
          return prev;
        }
        return [...prev, seq].sort((a, b) => a - b);
      }
    });
  };

  const addRandomLucky = (count: number) => {
    const available: number[] = [];
    const currentSet = new Set(selectedNumbers);
    const totalTix = draw?.totalTickets || 1000;
    for (let i = 1; i <= totalTix; i++) {
      if (!bookedNumbers.has(i) && !currentSet.has(i)) {
        available.push(i);
      }
    }
    if (available.length === 0) return;
    const remainingQuota = 25 - selectedNumbers.length;
    const howManyToAdd = Math.min(count, remainingQuota, available.length);
    if (howManyToAdd <= 0) return;

    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const toAdd = shuffled.slice(0, howManyToAdd);
    setSelectedNumbers((prev) => [...prev, ...toAdd].sort((a, b) => a - b));
  };

  const clearSelectedNumbers = () => {
    setSelectedNumbers([]);
  };

  const effectiveQuantity = pickMode === 'CUSTOM' ? selectedNumbers.length : quantity;
  const ticketPrice = draw?.ticketPriceEtb || 100;
  const totalEtb = effectiveQuantity * ticketPrice;

  const galleryImages = draw?.prize?.images && draw.prize.images.length > 0
    ? draw.prize.images.map(img => img.url)
    : [
        'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=1000&q=85',
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=600&q=80',
      ];

  const productVideoUrl: string = (() => {
    if (draw?.videoUrl?.trim()) return draw.videoUrl.trim();
    if (draw?.prize?.videoUrl?.trim()) return draw.prize.videoUrl.trim();
    const specs = (draw?.prize?.specifications as any);
    if (specs && typeof specs === 'object') {
      for (const k of ['videoUrl', 'Product Video', 'productVideo', 'productVideoUrl', 'video_url', 'video', 'tikTokUrl', 'tiktokUrl', 'directVideoUrl']) {
        if (typeof specs[k] === 'string' && specs[k].trim()) return specs[k].trim();
      }
      for (const [k, v] of Object.entries(specs)) {
        if (k.toLowerCase().includes('video') && typeof v === 'string' && v.trim()) {
          return v.trim();
        }
      }
    }
    return '';
  })();

  useEffect(() => {
    if (!productVideoUrl) {
      setResolvedTikTokId(null);
      setIsResolvingTikTok(false);
      return;
    }
    const directMatch = productVideoUrl.match(/\/video\/(\d+)/)?.[1] || 
      productVideoUrl.match(/\b(\d{16,21})\b/)?.[1];
    if (directMatch) {
      setResolvedTikTokId(directMatch);
      setIsResolvingTikTok(false);
      return;
    }

    if (/tiktok\.com/i.test(productVideoUrl)) {
      setIsResolvingTikTok(true);
      api.resolveTikTok(productVideoUrl)
        .then((res) => {
          if (res?.videoId && /^\d+$/.test(res.videoId)) {
            setResolvedTikTokId(res.videoId);
          }
        })
        .catch((err) => {
          console.warn('Failed to auto-resolve TikTok video:', err);
        })
        .finally(() => {
          setIsResolvingTikTok(false);
        });
    } else {
      setResolvedTikTokId(null);
      setIsResolvingTikTok(false);
    }
  }, [productVideoUrl]);

  const isTikTokProductVideo = Boolean(
    productVideoUrl && (/tiktok\.com/.test(productVideoUrl) || /^\d{16,21}$/.test(productVideoUrl))
  );
  const directTikTokId = productVideoUrl?.match(/\/video\/(\d+)/)?.[1] || 
    productVideoUrl?.match(/\b(\d{16,21})\b/)?.[1];
  const tiktokProductId = directTikTokId || resolvedTikTokId || null;

  const youtubeProductId = productVideoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1];

  const sold = draw?.soldTickets ?? 742;
  const total = draw?.totalTickets ?? 1000;
  const remaining = Math.max(0, total - sold);
  const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;

  const isSoldOut = total > 0 && (sold >= total || remaining <= 0);
  const isTimeFinished = (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) || (draw?.salesEndDate ? new Date(draw.salesEndDate).getTime() <= Date.now() : false);
  const isWinnerPicked = draw?.status === 'COMPLETED' || Boolean(draw?.result) || Boolean((draw as any)?.winningTicketNumber);
  const isPostClosed = isSoldOut || isTimeFinished || (draw?.status ? draw.status !== 'OPEN' : false) || isWinnerPicked;

  // Auto-poll Chapa verification while the Chapa Pending modal is open
  useEffect(() => {
    if (!showChapaPendingModal || !chapaPendingData?.txRef) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.verifyPayment(chapaPendingData.txRef!);
        if (res.success && res.status === 'SUCCESS') {
          clearInterval(interval);
          let confirmedNums: string[] = [];
          try {
            const effectiveUserId = user?.id || '2aded889-5b39-4a78-8dcf-15348e4c8004';
            const tickets = await api.getUserTickets(effectiveUserId);
            const drawTickets = tickets.filter(
              (t: any) => t.drawId === draw?.id || t.orderId === chapaPendingData.orderId
            );
            confirmedNums = drawTickets.map((t: any) => t.ticketNumber);
          } catch {
            // fallback
          }

          setShowChapaPendingModal(false);
          setPurchasedOrder({
            orderNumber: chapaPendingData.orderNumber,
            ticketNumbers: confirmedNums.length > 0 ? confirmedNums : undefined,
            quantity: chapaPendingData.quantity,
            totalEtb: chapaPendingData.totalEtb,
            paymentMethod: 'Chapa',
          });
          setShowSuccessModal(true);
          loadDraw();
          loadTicketAvailability();
        }
      } catch {
        // Silent polling error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [showChapaPendingModal, chapaPendingData?.txRef, draw?.id, user?.id]);

  const handleVerifyChapaPayment = async () => {
    if (!chapaPendingData?.txRef) return;
    setIsVerifyingChapa(true);
    setChapaVerifyError(null);
    try {
      const res = await api.verifyPayment(chapaPendingData.txRef);
      if (res.success && res.status === 'SUCCESS') {
        let confirmedNums: string[] = [];
        try {
          const effectiveUserId = user?.id || '2aded889-5b39-4a78-8dcf-15348e4c8004';
          const tickets = await api.getUserTickets(effectiveUserId);
          const drawTickets = tickets.filter(
            (t: any) => t.drawId === draw?.id || t.orderId === chapaPendingData.orderId
          );
          confirmedNums = drawTickets.map((t: any) => t.ticketNumber);
        } catch {
          // fallback
        }

        setShowChapaPendingModal(false);
        setPurchasedOrder({
          orderNumber: chapaPendingData.orderNumber,
          ticketNumbers: confirmedNums.length > 0 ? confirmedNums : undefined,
          quantity: chapaPendingData.quantity,
          totalEtb: chapaPendingData.totalEtb,
          paymentMethod: 'Chapa',
        });
        setShowSuccessModal(true);
        loadDraw();
        loadTicketAvailability();
      } else {
        setChapaVerifyError(
          res.message ||
            'Payment has not been confirmed yet on Chapa. Please complete your transaction on Chapa and retry.'
        );
      }
    } catch (err: any) {
      setChapaVerifyError(err.message || 'Unable to verify payment with Chapa. Please try again.');
    } finally {
      setIsVerifyingChapa(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!draw || isPostClosed) {
      alert('This draw post is closed. Tickets can no longer be purchased.');
      return;
    }
    const effectiveQty = pickMode === 'CUSTOM' ? selectedNumbers.length : quantity;
    if (effectiveQty <= 0) return;

    const currentTotalEtb = effectiveQty * ticketPrice;
    const customSeqs = pickMode === 'CUSTOM' && selectedNumbers.length > 0 ? selectedNumbers : undefined;

    setIsSubmitting(true);
    try {
      const pmMap: Record<string, string> = {
        'Telebirr': 'TELEBIRR',
        'CBE Birr': 'CBE_BIRR',
        'Bank Card': 'MOCK',
        'Chapa': 'CHAPA',
        'Commercial Bank': 'CBE_BIRR',
      };

      const selectedPm = pmMap[paymentMethod] || 'CHAPA';
      const isChapa = selectedPm === 'CHAPA';

      const result = await api.purchaseTickets({
        userId: user?.id || '2aded889-5b39-4a78-8dcf-15348e4c8004',
        drawId: draw.id,
        quantity: effectiveQty,
        paymentMethod: selectedPm,
        selectedSequenceNumbers: customSeqs,
        returnUrl: `${window.location.origin}/#draw-detail?id=${draw.id}`,
      });

      if (isChapa) {
        // STRICT USER RULE: If user chooses Chapa, they MUST receive success confirmation
        // from Chapa before they can receive or view any ticket numbers!
        setShowPaymentModal(false);
        setChapaPendingData({
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          txRef: result.txRef,
          checkoutUrl: result.checkoutUrl,
          quantity: effectiveQty,
          totalEtb: currentTotalEtb,
        });
        setShowChapaPendingModal(true);
        if (result.checkoutUrl) {
          window.open(result.checkoutUrl, '_blank');
        }
        return;
      }

      // Direct / Instant payment (Telebirr, CBE Birr, Card)
      setPurchasedOrder(result);
      updateWallet(-currentTotalEtb);
      setShowPaymentModal(false);
      setShowSuccessModal(true);

      // Refresh draw count and ticket availability from database
      loadDraw();
      loadTicketAvailability();
    } catch (e: any) {
      console.error('Purchase failed:', e);
      alert(e.message || 'Ticket order could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: '5rem', backgroundColor: 'var(--color-bg)' }}>
      <div className="container" style={{ paddingTop: '2rem' }}>
        {/* Back navigation */}
        <button 
          onClick={() => onNavigate('draws')}
          className="btn-ghost"
          style={{ marginBottom: '1.5rem', paddingLeft: 0, color: '#94A3B8' }}
        >
          <ArrowLeft size={16} /> Back to Draws
        </button>

        {/* Post Closed / Access Locked Alert Banner */}
        {isPostClosed && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '14px',
            padding: '1rem 1.4rem',
            marginBottom: '1.75rem',
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0
              }}>
                <Lock size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isWinnerPicked ? 'var(--color-text-gold)' : '#F87171' }}>
                  {isWinnerPicked
                    ? '🏆 Official Winner Announced — Draw Certified'
                    : isSoldOut 
                      ? '🔒 Draw Sold Out — Post Closed' 
                      : '⏰ Sales Concluded — Post Closed'}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                  {isWinnerPicked
                    ? 'Winner selection completed via dual-node CSPRNG. Entry purchases are closed and certified winner results are displayed below.'
                    : isSoldOut 
                      ? 'All available tickets for this draw have been sold out. This post is locked and entries cannot be accepted.' 
                      : 'The sales countdown timer for this draw has expired. Ticket purchases and number selections are now closed.'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('draws')}
              className="btn-gold"
              style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem', fontWeight: 700, flexShrink: 0 }}
            >
              Explore Active Draws →
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 1.5rem', color: 'var(--color-purple)' }} />
            <p>Loading draw specifications from database...</p>
          </div>
        ) : (
          /* 2-Column Product Detail Layout */
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
            gap: '3rem',
            alignItems: 'start'
          }}>
            {/* Left Column: Image & Video Gallery */}
            <div>
              {/* Main Stage Image or Product Video Player */}
              <div style={{
                background: '#101626',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                height: '420px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                marginBottom: '1rem',
                position: 'relative'
              }}>
                {showProductVideo && productVideoUrl ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0B0F19' }}>
                    {isTikTokProductVideo && tiktokProductId ? (
                      <video
                        src={`http://localhost:4000/api/v1/winners/video/${tiktokProductId}.mp4`}
                        controls
                        playsInline
                        autoPlay
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    ) : (isTikTokProductVideo && isResolvingTikTok) ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--color-text-muted)',
                        gap: '0.85rem'
                      }}>
                        <Loader2 size={36} className="animate-spin" style={{ color: '#EF4444' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#E2E8F0' }}>
                          Loading TikTok Showcase Video...
                        </span>
                      </div>
                    ) : youtubeProductId ? (
                      <iframe
                        key={`product-yt-${youtubeProductId}`}
                        src={`https://www.youtube.com/embed/${youtubeProductId}?autoplay=1&rel=0`}
                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                        title="Product Showcase Video"
                      />
                    ) : (
                      <video
                        src={productVideoUrl}
                        controls
                        playsInline
                        autoPlay
                        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                      />
                    )}

                    {/* Switch Video Player Mode Button for TikTok videos */}
                    {isTikTokProductVideo && tiktokProductId && (
                      <button
                        type="button"
                        onClick={() => setPreferDirectPlayer(!preferDirectPlayer)}
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          background: 'rgba(15, 23, 42, 0.88)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          color: '#FFFFFF',
                          borderRadius: '20px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          zIndex: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}
                        title={preferDirectPlayer ? 'Switch to TikTok official web embed' : 'Switch to direct local MP4 video player'}
                      >
                        <Sparkles size={12} color="#F59E0B" />
                        {preferDirectPlayer ? 'Use TikTok Embed' : 'Direct MP4 Stream'}
                      </button>
                    )}

                    {/* Open on TikTok Link */}
                    {isTikTokProductVideo && (
                      <a
                        href={productVideoUrl.startsWith('http') ? productVideoUrl : `https://www.tiktok.com/@nati_lotto/video/${tiktokProductId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '12px',
                          background: 'rgba(15, 23, 42, 0.88)',
                          backdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          color: '#FFFFFF',
                          borderRadius: '20px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          zIndex: 10,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}
                        title="View video directly on TikTok"
                      >
                        <ExternalLink size={12} color="#00F2FE" />
                        <span>Open on TikTok</span>
                      </a>
                    )}

                    {/* Back to Photos Button */}
                    <button
                      type="button"
                      onClick={() => setShowProductVideo(false)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(15, 23, 42, 0.88)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        color: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        zIndex: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                      }}
                    >
                      <X size={14} /> Back to Photos
                    </button>
                  </div>
                ) : (
                  <>
                    <img 
                      src={galleryImages[selectedImageIdx] || galleryImages[0]} 
                      alt={draw?.title || 'Product'} 
                      style={{ 
                        maxHeight: '90%', 
                        maxWidth: '90%', 
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 15px 25px rgba(0, 0, 0, 0.6))',
                        borderRadius: '12px'
                      }}
                    />

                    {/* If product video exists, floating Watch Video pill over image */}
                    {productVideoUrl && (
                      <button
                        type="button"
                        onClick={() => setShowProductVideo(true)}
                        style={{
                          position: 'absolute',
                          bottom: '14px',
                          right: '14px',
                          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '24px',
                          padding: '0.45rem 0.95rem',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.5)',
                          transition: 'all 0.2s ease',
                          zIndex: 5
                        }}
                      >
                        <Play size={13} fill="#FFFFFF" />
                        <span>Watch Product Video</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Thumbnails Carousel Row (Photos + Video) */}
              <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {/* Product Video Thumbnail */}
                {productVideoUrl && (
                  <div
                    onClick={() => setShowProductVideo(true)}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '10px',
                      border: showProductVideo ? '2px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      flexShrink: 0,
                      boxShadow: showProductVideo ? '0 0 12px rgba(239, 68, 68, 0.45)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Watch Demonstration Video of this Product"
                  >
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF'
                    }}>
                      <Play size={13} fill="#FFFFFF" style={{ marginLeft: '1px' }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em' }}>VIDEO</span>
                  </div>
                )}

                {/* Photo Thumbnails */}
                {galleryImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setShowProductVideo(false);
                      setSelectedImageIdx(idx);
                    }}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '10px',
                      border: !showProductVideo && selectedImageIdx === idx ? '2px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: '#141B2D',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      flexShrink: 0,
                      padding: '3px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <img 
                      src={img} 
                      alt={`Thumbnail ${idx + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Information, Pricing, & Action */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className="badge-gold">{draw?.drawNumber || 'NL-000123'}</span>
                <span className="badge-purple">Permit: {draw?.permitNumber || 'NL-ET-2026-0892'}</span>
              </div>

              <h1 style={{ 
                fontFamily: 'var(--font-heading)', 
                fontSize: 'clamp(2rem, 3.5vw, 2.5rem)', 
                fontWeight: 800, 
                color: 'var(--color-text-main)',
                lineHeight: 1.2,
                marginBottom: '0.4rem' 
              }}>
                {draw?.title || 'Prize Draw'}
              </h1>

              <div style={{ 
                fontSize: '1.4rem', 
                fontWeight: 900, 
                color: 'var(--color-text-gold)', 
                marginBottom: '1.5rem' 
              }}>
                {ticketPrice} ETB <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ ticket</span>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '1.5rem', background: 'var(--color-surface-card)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--color-surface-border)', boxShadow: 'var(--shadow-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--color-text-main)' }}>{sold} / {total} tickets sold</span>
                  <span>{remaining} left</span>
                </div>
                <div className="progress-container" style={{ height: '8px' }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* If winner is picked, remove time from post and show certified winner card */}
              {isWinnerPicked ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(108, 93, 211, 0.18) 100%)',
                  border: '1px solid rgba(255, 193, 7, 0.45)',
                  borderRadius: '16px',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 8px 24px rgba(255, 193, 7, 0.1)'
                }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
                  }}>
                    <Trophy size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--color-text-gold)' }}>
                        🏆 Official Winner Selected & Certified
                      </span>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#10B981',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800
                      }}>
                        NLA VERIFIED
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)', marginTop: '0.3rem' }}>
                      Winning Ticket: <strong style={{ color: 'var(--color-text-gold)', fontFamily: 'monospace', fontSize: '1rem' }}>
                        {draw?.result?.winningTicketNumber || (draw as any)?.winningTicketNumber || '#0382'}
                      </strong>
                      {' • '}
                      Winner: <strong>{draw?.result?.winnerDisplayName || (draw as any)?.winnerDisplayName || 'Verified Winner (Identity Protected)'}</strong>
                    </div>
                  </div>
                </div>
              ) : !isPostClosed ? (
                /* Real-time Ticking Countdown Box (Only shown when sales are actively open) */
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  {timeLeft.days > 0 && (
                    <>
                      <div className="countdown-digit-box">
                        <div className="countdown-number">{String(timeLeft.days).padStart(2, '0')}</div>
                        <div className="countdown-label">Days</div>
                      </div>
                      <span style={{ color: 'var(--color-text-muted)', fontWeight: 800 }}>:</span>
                    </>
                  )}
                  <div className="countdown-digit-box">
                    <div className="countdown-number">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="countdown-label">Hours</div>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 800 }}>:</span>
                  <div className="countdown-digit-box">
                    <div className="countdown-number">{String(timeLeft.minutes).padStart(2, '0')}</div>
                    <div className="countdown-label">Minutes</div>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 800 }}>:</span>
                  <div className="countdown-digit-box">
                    <div className="countdown-number" style={{ color: timeLeft.hours === 0 && timeLeft.days === 0 ? '#EF4444' : undefined }}>
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="countdown-label">Seconds</div>
                  </div>
                </div>
              ) : null}

              {/* Availability Indicator & CTAs or Locked Post Card */}
              {isPostClosed ? (
                <div style={{
                  background: 'var(--color-surface-elevated)',
                  border: `1px solid ${isWinnerPicked ? 'rgba(255, 193, 7, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  borderRadius: '16px',
                  padding: '1.75rem',
                  textAlign: 'center',
                  marginBottom: '2.5rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: isWinnerPicked ? 'rgba(255, 193, 7, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${isWinnerPicked ? 'rgba(255, 193, 7, 0.4)' : 'rgba(239, 68, 68, 0.35)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: isWinnerPicked ? '#F59E0B' : '#EF4444'
                  }}>
                    {isWinnerPicked ? <Trophy size={28} /> : <Lock size={26} />}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                    {isWinnerPicked
                      ? 'Winner Officially Drawn & Verified'
                      : isSoldOut 
                        ? 'Tickets Sold Out — Post Locked' 
                        : 'Sales Concluded — Post Closed'}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                    {isWinnerPicked
                      ? `Congratulations to the winner holding ticket ${draw?.result?.winningTicketNumber || (draw as any)?.winningTicketNumber || '#0382'}. The draw is completed and closed for new entries.`
                      : isSoldOut 
                        ? 'All available tickets for this draw have been claimed. Entry submissions and number selections are now locked.' 
                        : 'The sales countdown timer has concluded. This draw post is now archived and no longer accepting entries.'}
                  </p>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    fontSize: '0.82rem',
                    color: '#10B981',
                    fontWeight: 600,
                    marginBottom: '1.5rem'
                  }}>
                    <ShieldCheck size={16} />
                    <span>Cryptographic Winner Selection In Progress</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => onNavigate('draws')}
                      className="btn-purple"
                      style={{ padding: '0.75rem 1.6rem', fontSize: '0.9rem', fontWeight: 700 }}
                    >
                      Browse Active Draws →
                    </button>
                    <button 
                      onClick={() => onNavigate('live')}
                      className="btn-ghost"
                      style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                      Watch Live
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Availability Indicator & CTAs */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    color: '#10B981',
                    fontWeight: 600,
                    marginBottom: '1rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <Sparkles size={16} />
                    <span>{remaining} of {total} tickets currently available • Pick your lucky number!</span>
                  </div>

                  {/* Action Buttons: Quick Pick vs Choose Lucky Numbers (Blocked for Admin) */}
                  {isAdmin ? (
                    <div style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      marginBottom: '2.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#EF4444', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem' }}>
                        <Lock size={18} />
                        <span>ADMINISTRATIVE ACCOUNT RESTRICTION</span>
                      </div>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.86rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
                        In strict compliance with National Lottery Administration (NLA) integrity standards, lottery administrators, operators, and staff are legally prohibited from purchasing tickets or entering draws.
                      </p>
                      <button
                        onClick={() => onNavigate('admin')}
                        style={{
                          background: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-surface-border)',
                          color: 'var(--color-text-main)',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Manage This Draw in Admin Dashboard →
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2.5rem' }}>
                      <button 
                        onClick={() => {
                          setPickMode('QUICK');
                          if (!isAuthenticated) {
                            setShowAuthRequiredModal(true);
                          } else {
                            setShowPurchaseModal(true);
                          }
                        }}
                        className="btn-gold"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Sparkles size={17} />
                        <span>Quick Pick</span>
                      </button>

                      <button 
                        onClick={() => {
                          setPickMode('CUSTOM');
                          loadTicketAvailability();
                          if (!isAuthenticated) {
                            setShowAuthRequiredModal(true);
                          } else {
                            setShowPurchaseModal(true);
                          }
                        }}
                        className="btn-purple"
                        style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Dices size={17} />
                        <span>Choose Numbers</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Tabs: Details, How It Works, Rules */}
              <div style={{ borderBottom: '1px solid var(--color-surface-border)', display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
                {(['Details', 'How It Works', 'Rules'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'transparent',
                      color: activeTab === tab ? 'var(--color-purple)' : 'var(--color-text-muted)',
                      border: 'none',
                      borderBottom: activeTab === tab ? '2px solid var(--color-purple)' : '2px solid transparent',
                      padding: '0.6rem 0',
                      fontSize: '0.95rem',
                      fontWeight: activeTab === tab ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab 1 Content: Prize Description & Specifications from DB */}
              {activeTab === 'Details' && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                    Prize Description
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {draw?.description || 'Factory sealed genuine prize with full manufacturer warranty and verified serial numbers.'}
                  </p>

                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '0.75rem' }}>
                    Specifications
                  </h4>
                  <div style={{ 
                    background: 'var(--color-surface-elevated)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--color-surface-border)',
                    overflow: 'hidden'
                  }}>
                    {draw?.prize?.specifications ? (
                      Object.entries(draw.prize.specifications)
                        .filter(([k]) => !['videoUrl', 'productVideoUrl', 'videoPlatform', 'Product Video'].includes(k))
                        .map(([key, val], i, arr) => (
                          <div 
                            key={key} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              padding: '0.75rem 1rem',
                              borderBottom: i < arr.length - 1 ? '1px solid var(--color-surface-border)' : 'none',
                              fontSize: '0.85rem'
                            }}
                          >
                            <span style={{ color: 'var(--color-text-muted)' }}>{key}</span>
                            <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{val}</span>
                          </div>
                        ))
                    ) : (
                      <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        Official specifications registered with National Lottery Permit.
                      </div>
                    )}
                  </div>

                  {/* Official Product Video Showcase Box */}
                  {productVideoUrl && (
                    <div style={{
                      marginTop: '1.25rem',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: '#EF4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
                        }}>
                          <Play size={20} fill="#FFFFFF" style={{ marginLeft: '2px' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text-main)' }}>
                            Official Product Video Showcase Available
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                            Watch authentic unboxing and demonstration proof of this physical prize
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowProductVideo(true);
                          window.scrollTo({ top: 180, behavior: 'smooth' });
                        }}
                        className="btn-gold"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Play size={13} fill="currentColor" /> Watch Video
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: How It Works */}
              {activeTab === 'How It Works' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(108, 93, 211, 0.15)', color: 'var(--color-purple)', padding: '0.4rem', borderRadius: '8px' }}>
                      <Ticket size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>1. Select Your Tickets</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        Choose ticket quantities and pay securely via Telebirr or CBE Birr.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(255, 193, 7, 0.15)', color: 'var(--color-primary)', padding: '0.4rem', borderRadius: '8px' }}>
                      <Lock size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>2. Pre-Draw Snapshot Hash</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        At sales close, an immutable SHA-256 fingerprint of all entries is generated and locked.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22C55E', padding: '0.4rem', borderRadius: '8px' }}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>3. Verified CSPRNG Draw</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        Cryptographic 256-bit entropy selects the winner uniformly with zero modulo bias.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Official Rules */}
              {activeTab === 'Rules' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                  <p>• Must be 18 years or older with valid Ethiopian ID or passport.</p>
                  <p>• Maximum 25 tickets per user per draw to ensure responsible play.</p>
                  <p>• National Lottery Administration Permit: {draw?.permitNumber || 'NL-ET-2026-0892'}.</p>
                  <p>• Official handover ceremony in Bole, Addis Ababa within 30 days of draw completion.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auth Required Modal */}
      {showAuthRequiredModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(108, 93, 211, 0.15)',
              color: 'var(--color-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <UserCheck size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.5rem' }}>
              Sign In to Enter
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              Participating in verified draws requires age verification (18+) and Telebirr/CBE payment authorization.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => {
                  setShowAuthRequiredModal(false);
                  if (onRequireAuth) onRequireAuth();
                }}
                className="btn-purple"
                style={{ width: '100%', padding: '0.85rem' }}
              >
                Sign In with Phone
              </button>
              <button 
                onClick={() => setShowAuthRequiredModal(false)}
                className="btn-ghost"
                style={{ width: '100%', padding: '0.6rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 Modal: Purchase Tickets */}
      {!isPostClosed && showPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '620px', padding: '1.75rem', position: 'relative', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button 
                  onClick={() => setShowPurchaseModal(false)}
                  className="btn-ghost"
                  style={{ padding: '0.3rem', color: 'var(--color-text-muted)', borderRadius: '8px' }}
                >
                  <ArrowLeft size={18} />
                </button>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                  Purchase Tickets
                </h3>
              </div>
              <span className="badge-purple" style={{ fontSize: '0.75rem' }}>
                {draw?.drawNumber || 'NL-000123'}
              </span>
            </div>

            {/* Product Summary Row */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              background: 'var(--color-surface-elevated)', 
              border: '1px solid var(--color-surface-border)',
              padding: '0.75rem 1rem', 
              borderRadius: '12px',
              marginBottom: '1.25rem'
            }}>
              <img 
                src={galleryImages[0]} 
                alt="Product" 
                style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '8px' }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {draw?.title || 'Prize Draw'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-gold)', fontWeight: 700 }}>
                  {ticketPrice} ETB / ticket
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Max 25 / user
              </div>
            </div>

            {/* Mode Switcher: Quick Pick vs Choose Lucky Numbers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.4rem',
              background: 'var(--color-surface-elevated)',
              padding: '4px',
              borderRadius: '12px',
              marginBottom: '1.25rem',
              border: '1px solid var(--color-surface-border)'
            }}>
              <button
                type="button"
                onClick={() => setPickMode('QUICK')}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: '9px',
                  border: 'none',
                  background: pickMode === 'QUICK' ? '#FFFFFF' : 'transparent',
                  color: pickMode === 'QUICK' ? '#0F172A' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  boxShadow: pickMode === 'QUICK' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={16} color={pickMode === 'QUICK' ? '#D97706' : undefined} />
                <span>⚡ Quick Quantity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPickMode('CUSTOM');
                  if (bookedNumbers.size === 0) {
                    loadTicketAvailability();
                  }
                }}
                style={{
                  padding: '0.65rem 0.5rem',
                  borderRadius: '9px',
                  border: 'none',
                  background: pickMode === 'CUSTOM' ? '#FFFFFF' : 'transparent',
                  color: pickMode === 'CUSTOM' ? '#0F172A' : 'var(--color-text-muted)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  boxShadow: pickMode === 'CUSTOM' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Dices size={16} color={pickMode === 'CUSTOM' ? '#6C5DD3' : undefined} />
                <span>🎯 Choose Numbers</span>
              </button>
            </div>

            {/* MODE 1: QUICK QUANTITY PILLS */}
            {pickMode === 'QUICK' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                    Select Number of Entries
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Auto-allocated from available pool
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {[1, 5, 10, 25].map(q => {
                    const isSelected = quantity === q;
                    return (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '10px',
                          background: isSelected ? 'var(--color-purple)' : 'var(--color-surface-elevated)',
                          border: isSelected ? '1px solid var(--color-purple)' : '1px solid var(--color-surface-border)',
                          color: isSelected ? '#FFFFFF' : 'var(--color-text-main)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          boxShadow: isSelected ? 'var(--shadow-purple)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>

                {/* Custom quantity counter */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-surface-border)',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px'
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                    Custom Quantity:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-surface-border)',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-main)'
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', minWidth: '32px', textAlign: 'center', color: 'var(--color-text-main)' }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(prev => Math.min(25, prev + 1))}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-surface-border)',
                        background: '#FFFFFF',
                        cursor: 'pointer',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-main)'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', lineHeight: 1.4 }}>
                  ⚡ The system will automatically select {quantity} random available ticket numbers for you upon payment confirmation.
                </p>
              </div>
            )}

            {/* MODE 2: CUSTOM LUCKY NUMBERS SELECTION */}
            {pickMode === 'CUSTOM' && (() => {
              const BATCH_SIZE = 100;
              const totalBatches = Math.max(1, Math.ceil(totalTicketsCount / BATCH_SIZE));
              const currentBatchStart = batchRangeIndex * BATCH_SIZE + 1;
              const currentBatchEnd = Math.min(totalTicketsCount, (batchRangeIndex + 1) * BATCH_SIZE);

              let displayedTickets: number[] = [];
              if (ticketSearch.trim()) {
                const clean = ticketSearch.trim().replace(/[^0-9]/g, '');
                const num = parseInt(clean, 10);
                if (!isNaN(num) && num >= 1 && num <= totalTicketsCount) {
                  displayedTickets = [num];
                } else if (clean) {
                  for (let s = 1; s <= totalTicketsCount && displayedTickets.length < 60; s++) {
                    if (String(s).includes(clean)) displayedTickets.push(s);
                  }
                }
              } else if (ticketFilter === 'SELECTED') {
                displayedTickets = [...selectedNumbers];
              } else {
                for (let s = currentBatchStart; s <= currentBatchEnd; s++) {
                  if (ticketFilter === 'AVAILABLE' && bookedNumbers.has(s)) continue;
                  displayedTickets.push(s);
                }
              }

              const availableInDraw = Math.max(0, totalTicketsCount - bookedNumbers.size);

              return (
                <div style={{ marginBottom: '1.5rem' }}>
                  {/* Status Strip */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    background: 'var(--color-surface-elevated)',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    marginBottom: '0.75rem',
                    border: '1px solid var(--color-surface-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 700 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                        {availableInDraw} Available
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94A3B8', fontWeight: 600 }}>
                        <Lock size={12} />
                        {bookedNumbers.size} Sold
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        fontWeight: 800, 
                        color: selectedNumbers.length > 0 ? '#B45309' : 'var(--color-text-muted)',
                        background: selectedNumbers.length > 0 ? '#FEF3C7' : 'transparent',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {selectedNumbers.length} / 25 Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => loadTicketAvailability()}
                        title="Refresh ticket availability"
                        style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px', display: 'flex' }}
                      >
                        <RefreshCw size={14} className={isLoadingAvailability ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Filter & Lucky Picks Toolbar */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: '0.5rem', 
                    marginBottom: '0.75rem' 
                  }}>
                    {/* Lucky Random Pickers */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => addRandomLucky(1)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          color: 'var(--color-text-main)'
                        }}
                      >
                        <Dices size={14} color="#D97706" />
                        +1 Lucky
                      </button>

                      <button
                        type="button"
                        onClick={() => addRandomLucky(5)}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          color: 'var(--color-text-main)'
                        }}
                      >
                        <Sparkles size={14} color="#6C5DD3" />
                        +5 Lucky
                      </button>

                      {selectedNumbers.length > 0 && (
                        <button
                          type="button"
                          onClick={clearSelectedNumbers}
                          style={{
                            background: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            color: '#B91C1C',
                            borderRadius: '8px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Search & Batch Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                          type="text"
                          placeholder="Search #..."
                          value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          style={{
                            padding: '0.35rem 0.5rem 0.35rem 1.65rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.78rem',
                            width: '105px',
                            outline: 'none',
                            background: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>

                      {totalBatches > 1 && !ticketSearch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            disabled={batchRangeIndex === 0}
                            onClick={() => setBatchRangeIndex(prev => Math.max(0, prev - 1))}
                            style={{
                              padding: '0.35rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: batchRangeIndex === 0 ? 'not-allowed' : 'pointer',
                              opacity: batchRangeIndex === 0 ? 0.4 : 1
                            }}
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)', padding: '0 4px' }}>
                            {batchRangeIndex + 1}/{totalBatches}
                          </span>
                          <button
                            type="button"
                            disabled={batchRangeIndex >= totalBatches - 1}
                            onClick={() => setBatchRangeIndex(prev => Math.min(totalBatches - 1, prev + 1))}
                            style={{
                              padding: '0.35rem',
                              borderRadius: '6px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              cursor: batchRangeIndex >= totalBatches - 1 ? 'not-allowed' : 'pointer',
                              opacity: batchRangeIndex >= totalBatches - 1 ? 0.4 : 1
                            }}
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
                    {(['ALL', 'AVAILABLE', 'SELECTED'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => {
                          setTicketFilter(f);
                          setTicketSearch('');
                        }}
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: ticketFilter === f ? 'var(--color-purple)' : 'var(--color-surface-elevated)',
                          color: ticketFilter === f ? '#FFFFFF' : 'var(--color-text-muted)',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {f === 'ALL' && `All (${currentBatchStart}-${currentBatchEnd})`}
                        {f === 'AVAILABLE' && `Available Only`}
                        {f === 'SELECTED' && `Selected (${selectedNumbers.length})`}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Ticket Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))',
                    gap: '6px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'var(--color-surface-elevated)',
                    borderRadius: '12px',
                    border: '1px solid var(--color-surface-border)'
                  }}>
                    {isLoadingAvailability ? (
                      <div style={{ gridColumn: '1 / -1', padding: '2rem 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem', color: 'var(--color-purple)' }} />
                        Checking live ticket numbers in PostgreSQL...
                      </div>
                    ) : displayedTickets.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', padding: '2rem 0', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                        {ticketFilter === 'SELECTED' 
                          ? 'No lucky numbers selected yet. Click any white ticket above!' 
                          : 'No tickets matching your filter.'}
                      </div>
                    ) : (
                      displayedTickets.map(seq => {
                        const isBooked = bookedNumbers.has(seq);
                        const isSelected = selectedNumbers.includes(seq);
                        const label = formatTicketNum(seq);

                        if (isBooked) {
                          return (
                            <div
                              key={seq}
                              title={`Ticket ${label} is already taken`}
                              style={{
                                padding: '0.45rem 0.2rem',
                                borderRadius: '8px',
                                background: '#E2E8F0',
                                border: '1px solid #CBD5E1',
                                color: '#94A3B8',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textAlign: 'center',
                                cursor: 'not-allowed',
                                opacity: 0.55,
                                textDecoration: 'line-through',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px'
                              }}
                            >
                              <span>{label}</span>
                              <Lock size={10} />
                            </div>
                          );
                        }

                        if (isSelected) {
                          return (
                            <button
                              key={seq}
                              type="button"
                              onClick={() => toggleTicketNumber(seq)}
                              title={`Ticket ${label} selected - click to remove`}
                              style={{
                                padding: '0.45rem 0.2rem',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                border: '1.5px solid #F59E0B',
                                color: '#FFFFFF',
                                fontSize: '0.74rem',
                                fontWeight: 900,
                                textAlign: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                                transform: 'scale(1.03)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span>{label}</span>
                              <Check size={11} strokeWidth={3} />
                            </button>
                          );
                        }

                        // Available Ticket Tile
                        return (
                          <button
                            key={seq}
                            type="button"
                            onClick={() => toggleTicketNumber(seq)}
                            title={`Click to pick ticket ${label}`}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              color: '#0F172A',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              textAlign: 'center',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#F59E0B';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <span>{label}</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Selected Numbers Tray */}
                  {selectedNumbers.length > 0 ? (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      background: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E' }}>
                          Your Chosen Numbers ({selectedNumbers.length}):
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#B45309' }}>
                          Click any number to remove
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '75px', overflowY: 'auto' }}>
                        {selectedNumbers.map(n => (
                          <span
                            key={n}
                            onClick={() => toggleTicketNumber(n)}
                            title="Click to remove"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#FFFFFF',
                              color: '#B45309',
                              border: '1px solid #FCD34D',
                              borderRadius: '6px',
                              padding: '2px 7px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            <span>{formatTicketNum(n)}</span>
                            <X size={11} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '0.65rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(108, 93, 211, 0.08)',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--color-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <Sparkles size={14} />
                      <span>Click any available ticket number above or tap <strong>+1 Lucky</strong> / <strong>+5 Lucky</strong> to choose.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Summary Breakdown */}
            <div style={{ 
              borderTop: '1px solid var(--color-surface-border)',
              paddingTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              fontSize: '0.88rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                <span>Ticket price</span>
                <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{ticketPrice} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                <span>
                  {pickMode === 'CUSTOM' ? 'Chosen tickets' : 'Quantity'}
                </span>
                <span style={{ color: 'var(--color-text-main)', fontWeight: 700 }}>
                  {effectiveQuantity} entries
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                color: 'var(--color-text-main)', 
                fontWeight: 900, 
                fontSize: '1.1rem', 
                paddingTop: '0.5rem', 
                borderTop: '1px solid var(--color-surface-border)' 
              }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--color-primary-dark)' }}>{totalEtb} ETB</span>
              </div>
            </div>

            <button 
              disabled={pickMode === 'CUSTOM' && selectedNumbers.length === 0}
              onClick={() => { setShowPurchaseModal(false); setShowPaymentModal(true); }}
              className="btn-gold"
              style={{ 
                width: '100%', 
                padding: '0.95rem', 
                fontSize: '1.02rem',
                opacity: pickMode === 'CUSTOM' && selectedNumbers.length === 0 ? 0.5 : 1,
                cursor: pickMode === 'CUSTOM' && selectedNumbers.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {pickMode === 'CUSTOM' && selectedNumbers.length === 0 
                ? 'Please select at least 1 ticket' 
                : `Continue to Payment • ${totalEtb} ETB`}
            </button>
          </div>
        </div>
      )}

      {/* Step 2 Modal: Payment Method */}
      {!isPostClosed && showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '460px', padding: '2rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button 
                onClick={() => { setShowPaymentModal(false); setShowPurchaseModal(true); }}
                className="btn-ghost"
                style={{ padding: '0.2rem', color: 'var(--color-text-muted)' }}
              >
                <ArrowLeft size={18} />
              </button>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)', margin: 0 }}>
                Payment Confirmation
              </h3>
            </div>

            {/* Order summary pill */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              background: 'var(--color-surface-elevated)', 
              border: '1px solid var(--color-surface-border)',
              padding: '0.75rem 1rem', 
              borderRadius: '12px',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              <img 
                src={galleryImages[0]} 
                alt="Product" 
                style={{ width: '42px', height: '42px', objectFit: 'contain', borderRadius: '6px' }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{draw?.title}</div>
                <div style={{ color: 'var(--color-text-muted)' }}>{effectiveQuantity} tickets • {totalEtb} ETB</div>
              </div>
            </div>

            {/* Chosen Tickets Badge Row (if CUSTOM mode) */}
            {pickMode === 'CUSTOM' && selectedNumbers.length > 0 ? (
              <div style={{ 
                marginBottom: '1.25rem',
                background: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', marginBottom: '0.35rem' }}>
                  Confirmed Lucky Numbers ({selectedNumbers.length}):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '75px', overflowY: 'auto' }}>
                  {selectedNumbers.map(n => (
                    <span 
                      key={n} 
                      style={{
                        background: '#FFFFFF',
                        color: '#B45309',
                        border: '1px solid #FCD34D',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}
                    >
                      {formatTicketNum(n)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ 
                marginBottom: '1.25rem',
                background: 'rgba(108, 93, 211, 0.08)',
                border: '1px solid rgba(108, 93, 211, 0.2)',
                borderRadius: '10px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.8rem',
                color: 'var(--color-purple)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Sparkles size={15} />
                <span>⚡ <strong>Quick Pick:</strong> {quantity} random available ticket numbers will be assigned upon confirmation.</span>
              </div>
            )}

            {/* Payment Method Radio Options */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Select Payment Rail
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { id: 'Telebirr', label: 'Telebirr', tag: 'Instant' },
                  { id: 'CBE Birr', label: 'CBE Birr', tag: 'Direct' },
                  { id: 'Bank Card', label: 'Bank Card (Visa / Mastercard)' },
                  { id: 'Chapa', label: 'Chapa Gateway' },
                ].map(m => {
                  const isChecked = paymentMethod === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: isChecked ? 'var(--color-purple-container)' : 'var(--color-surface-elevated)',
                        border: isChecked ? '1.5px solid var(--color-purple)' : '1px solid var(--color-surface-border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: isChecked ? 'var(--color-purple)' : 'var(--color-text-main)' }}>
                        <span>{m.label}</span>
                      </div>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isChecked ? '5px solid var(--color-purple)' : '2px solid var(--color-surface-border)',
                        background: isChecked ? '#FFFFFF' : 'transparent'
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gold Pay CTA Button */}
            <button 
              disabled={isSubmitting}
              onClick={handleConfirmPayment}
              className="btn-gold"
              style={{ width: '100%', padding: '0.95rem', fontSize: '1.05rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Securing Tickets in PostgreSQL...
                </>
              ) : (
                `Pay ${totalEtb} ETB & Confirm Tickets`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Chapa Payment Pending & Verification Modal */}
      {showChapaPendingModal && chapaPendingData && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '460px', padding: '2.25rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(108, 93, 211, 0.12)',
              border: '2px solid rgba(108, 93, 211, 0.3)',
              color: 'var(--color-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              fontSize: '1.8rem',
            }}>
              💳
            </div>

            <div style={{
              display: 'inline-block',
              background: '#E0F2FE',
              color: '#0369A1',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '20px',
              marginBottom: '0.75rem',
              letterSpacing: '0.5px'
            }}>
              CHAPA PAYMENT GATEWAY
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
              Complete Payment on Chapa
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Under NLA regulations, your {chapaPendingData.quantity} tickets are reserved. 
              <strong> You will only receive your verified ticket numbers after Chapa confirms successful payment.</strong>
            </p>

            {/* Order Specs breakdown */}
            <div style={{
              background: 'var(--color-surface-elevated)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.25rem',
              textAlign: 'left',
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              border: '1px solid var(--color-surface-border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Order Reference:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)', fontFamily: 'monospace' }}>{chapaPendingData.txRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Quantity:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{chapaPendingData.quantity} Tickets</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Amount Payable:</span>
                <span style={{ fontWeight: 800, color: '#D97706', fontSize: '0.95rem' }}>{chapaPendingData.totalEtb} ETB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Ticket Numbers:</span>
                <span style={{ fontWeight: 700, color: '#E11D48', background: '#FFE4E6', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  WITHHELD UNTIL CHAPA SUCCESS
                </span>
              </div>
            </div>

            {chapaVerifyError && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                textAlign: 'left'
              }}>
                ⚠️ {chapaVerifyError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {chapaPendingData.checkoutUrl && (
                <button
                  onClick={() => window.open(chapaPendingData.checkoutUrl, '_blank')}
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: '1.5px solid var(--color-purple)',
                    color: 'var(--color-purple)',
                    fontWeight: 700,
                    borderRadius: '8px'
                  }}
                >
                  <ExternalLink size={16} /> Open Chapa Payment Window
                </button>
              )}

              <button
                disabled={isVerifyingChapa}
                onClick={handleVerifyChapaPayment}
                className="btn-gold"
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isVerifyingChapa ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Verifying with Chapa Gateway...
                  </>
                ) : (
                  'I Have Paid — Verify & Reveal Ticket Numbers'
                )}
              </button>

              <button
                onClick={() => {
                  setShowChapaPendingModal(false);
                  setChapaVerifyError(null);
                }}
                className="btn-ghost"
                style={{ width: '100%', padding: '0.5rem', color: '#94A3B8', fontSize: '0.85rem' }}
              >
                Close & Check Status Later in My Tickets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px', padding: '2.5rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <Check size={32} strokeWidth={3} />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
              Tickets Issued Successfully!
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Your {effectiveQuantity} entries for <strong>{draw?.title}</strong> have been cryptographically committed to PostgreSQL database.
            </p>

            {/* Assigned Lucky Tickets Badge Tray */}
            <div style={{ 
              background: '#FEF3C7', 
              border: '1px solid #FCD34D',
              borderRadius: '12px', 
              padding: '0.85rem', 
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', marginBottom: '0.4rem' }}>
                Your Assigned Lucky Ticket Numbers:
              </div>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.35rem', 
                justifyContent: 'center', 
                maxHeight: '110px', 
                overflowY: 'auto',
                padding: '2px'
              }}>
                {(
                  purchasedOrder?.ticketNumbers || 
                  (selectedNumbers.length > 0 
                    ? selectedNumbers.map(formatTicketNum) 
                    : Array.from({ length: effectiveQuantity }, (_, i) => `#00${i + 1}`))
                ).map((tNum: string, idx: number) => (
                  <span 
                    key={idx} 
                    style={{
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
                    }}
                  >
                    {tNum}
                  </span>
                ))}
              </div>
            </div>

            {/* Order Specs breakdown */}
            <div style={{ 
              background: 'var(--color-surface-elevated)', 
              borderRadius: '12px', 
              padding: '1rem', 
              marginBottom: '1.5rem',
              textAlign: 'left',
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              border: '1px solid var(--color-surface-border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Draw Number:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{draw?.drawNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Tickets Purchased:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{effectiveQuantity} Tickets</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Payment Rail:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary-dark)' }}>{paymentMethod} Verified</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Order ID:</span>
                <span style={{ fontWeight: 600, color: '#94A3B8' }}>{purchasedOrder?.orderNumber || 'ORD-PG-CONFIRMED'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  onNavigate('my-tickets');
                }}
                className="btn-purple"
                style={{ width: '100%', padding: '0.85rem' }}
              >
                View My Tickets
              </button>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  onNavigate('draws');
                }}
                className="btn-ghost"
                style={{ width: '100%', padding: '0.6rem' }}
              >
                Browse Other Draws
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
