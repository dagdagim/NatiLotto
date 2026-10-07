import React, { useState, useEffect } from 'react';
import { Search, Clock, Sparkles, Loader2, Lock, Trophy, Video } from 'lucide-react';
import { api, DrawItem } from '../services/api';

interface DrawsPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const DrawsPage: React.FC<DrawsPageProps> = ({ onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState<'Active (Open)' | 'Ending Soon' | 'All' | 'Closed / Sold Out'>('Active (Open)');
  const [searchTerm, setSearchTerm] = useState('');
  const [draws, setDraws] = useState<DrawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDraws();
  }, []);

  const loadDraws = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDraws();
      setDraws(res.draws || []);
    } catch (err: any) {
      console.error('Error fetching draws from database:', err);
      setError('Could not connect to database. Retrying...');
    } finally {
      setLoading(false);
    }
  };

  const calculateCountdown = (salesEndDate: string) => {
    const end = new Date(salesEndDate).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return { text: 'Sales Closed', color: '#94A3B8', isEndingSoon: false };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours < 24) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return {
        text: `${pad(hours)}:${pad(mins)}:${pad(secs)}`,
        color: hours < 3 ? '#EF4444' : '#F59E0B',
        isEndingSoon: true,
      };
    } else {
      const days = Math.floor(hours / 24);
      return {
        text: `${days} day${days > 1 ? 's' : ''} left`,
        color: '#3B82F6',
        isEndingSoon: false,
      };
    }
  };

  const filteredDraws = draws.filter((draw) => {
    const isSoldOut = draw.totalTickets > 0 && (draw.soldTickets >= draw.totalTickets || (draw.remainingTickets !== undefined && draw.remainingTickets <= 0));
    const isTimeFinished = new Date(draw.salesEndDate).getTime() <= Date.now();
    const isClosed = isSoldOut || isTimeFinished || draw.status !== 'OPEN';
    const countdownInfo = calculateCountdown(draw.salesEndDate);

    if (activeFilter === 'Active (Open)' && isClosed) return false;
    if (activeFilter === 'Ending Soon' && (!countdownInfo.isEndingSoon || isClosed)) return false;
    if (activeFilter === 'Closed / Sold Out' && !isClosed) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      draw.title.toLowerCase().includes(q) ||
      draw.drawNumber.toLowerCase().includes(q) ||
      (draw.prize?.title && draw.prize.title.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: 'calc(100vh - 4.5rem)', padding: '2.5rem 0 5rem' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
              Explore Draws
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              Discover certified prize draws with cryptographically auditable fairness from live PostgreSQL database
            </p>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Showing {filteredDraws.length} verified draws
          </span>
        </div>

        {/* Filter Pills & Search Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}>
          {/* Search Input Bar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search draws by title, permit, or prize..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                paddingLeft: '2.85rem',
                borderRadius: '12px'
              }}
            />
          </div>

          {/* Filter Pills: Active (Open), Ending Soon, All, Closed / Sold Out */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {(['Active (Open)', 'Ending Soon', 'All', 'Closed / Sold Out'] as const).map(tab => {
              const isSelected = activeFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  style={{
                    backgroundColor: isSelected ? 'var(--color-purple)' : 'var(--color-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                    border: isSelected ? '1px solid var(--color-purple)' : '1px solid var(--color-surface-border)',
                    borderRadius: '24px',
                    padding: '0.45rem 1.4rem',
                    fontSize: '0.88rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? 'var(--shadow-purple)' : 'none'
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--color-purple)' }} />
            <p>Fetching active prize draws from database...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '2rem' }}>
            <p style={{ color: '#EF4444', marginBottom: '1rem' }}>{error}</p>
            <button onClick={loadDraws} className="btn-gold" style={{ padding: '0.5rem 1.5rem' }}>Retry</button>
          </div>
        )}

        {/* 4-Column Grid of Draws */}
        {!loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {filteredDraws.map(draw => {
              const pct = draw.totalTickets > 0 ? Math.round((draw.soldTickets / draw.totalTickets) * 100) : 0;
              const remaining = draw.remainingTickets ?? (draw.totalTickets - draw.soldTickets);
              const isSoldOut = draw.totalTickets > 0 && (draw.soldTickets >= draw.totalTickets || remaining <= 0);
              const isTimeFinished = new Date(draw.salesEndDate).getTime() <= Date.now();
              const isWinnerPicked = draw.status === 'COMPLETED' || Boolean(draw.result) || Boolean((draw as any).winningTicketNumber);
              const isClosed = isSoldOut || isTimeFinished || draw.status !== 'OPEN' || isWinnerPicked;
              const countdownInfo = calculateCountdown(draw.salesEndDate);
              const imageUrl = draw.prize?.images?.[0]?.url ||
                'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80';

              return (
                <div
                  key={draw.id}
                  onClick={() => onNavigate('draw-detail', { drawId: draw.drawNumber || draw.id })}
                  style={{
                    backgroundColor: 'var(--color-surface-card)',
                    border: isClosed ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid var(--color-surface-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    cursor: isClosed ? 'default' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-card)',
                    opacity: isClosed ? 0.85 : 1,
                    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isClosed) {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = 'rgba(108, 93, 211, 0.4)';
                      e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isClosed) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--color-surface-border)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-card)';
                    }
                  }}
                >
                  {/* Image Container with Badges */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '200px',
                    backgroundColor: 'var(--color-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={imageUrl}
                      alt={draw.title}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        filter: isClosed ? 'grayscale(40%)' : 'none'
                      }}
                    />

                    {/* Draw ID Tag */}
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(6px)',
                      color: '#F8FAFC',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em'
                    }}>
                      {draw.drawNumber || draw.id}
                    </span>

                    {/* Video Indicator Badge */}
                    {Boolean(draw.videoUrl || draw.prize?.videoUrl || (draw.prize?.specifications as any)?.videoUrl) && (
                      <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        background: 'rgba(254, 44, 85, 0.9)',
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
                      </span>
                    )}

                    {/* Winner Announced OR Closed Lock Badge OR Live Countdown Tag */}
                    {isWinnerPicked ? (
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        color: '#000000',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)'
                      }}>
                        <Trophy size={12} />
                        WINNER ANNOUNCED
                      </span>
                    ) : isClosed ? (
                      <span style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(239, 68, 68, 0.95)',
                        backdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                      }}>
                        <Lock size={12} />
                        {isSoldOut ? 'SOLD OUT' : 'POST CLOSED'}
                      </span>
                    ) : (
                      /* Time / Countdown Tag (Only rendered when sales are active and NO winner picked) */
                      <span style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: countdownInfo.color,
                        border: `1px solid ${countdownInfo.color}`,
                        padding: '0.2rem 0.65rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <Clock size={11} />
                        {countdownInfo.text}
                      </span>
                    )}
                  </div>

                  {/* Details Section */}
                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                      {draw.title}
                    </h3>

                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text-gold)', marginBottom: '0.85rem' }}>
                      {draw.ticketPriceEtb} ETB
                    </div>

                    {/* Sold Counter & Remaining */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                      <span>{draw.soldTickets} / {draw.totalTickets} sold</span>
                      <span style={{ color: isClosed ? '#EF4444' : undefined, fontWeight: isClosed ? 700 : undefined }}>
                        {isSoldOut ? 'Sold out' : `${remaining} left`}
                      </span>
                    </div>

                    {/* Gradient Progress Bar */}
                    <div className="progress-bar-bg" style={{ marginBottom: '1.25rem' }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%`, backgroundColor: isClosed ? '#EF4444' : undefined }} />
                    </div>

                    {/* Action Button: Disabled when closed */}
                    {isClosed ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('draw-detail', { drawId: draw.drawNumber || draw.id });
                        }}
                        className="btn-ghost"
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          fontSize: '0.82rem',
                          marginTop: 'auto',
                          backgroundColor: isWinnerPicked ? 'rgba(255, 193, 7, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                          color: isWinnerPicked ? 'var(--color-text-gold)' : '#F87171',
                          border: isWinnerPicked ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(239, 68, 68, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isWinnerPicked ? (
                          <>
                            <Trophy size={14} color="#F59E0B" />
                            <span>View Certified Winner →</span>
                          </>
                        ) : (
                          <>
                            <Lock size={13} />
                            <span>{isSoldOut ? 'Sold Out (Post Locked)' : 'Closed (Time Finished)'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('draw-detail', { drawId: draw.drawNumber || draw.id });
                        }}
                        className="btn-gold"
                        style={{ width: '100%', padding: '0.65rem', fontSize: '0.85rem', marginTop: 'auto' }}
                      >
                        Enter Draw
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
