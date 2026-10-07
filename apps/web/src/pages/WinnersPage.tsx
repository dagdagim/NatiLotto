import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, ShieldCheck, ExternalLink, Award, Loader2 } from 'lucide-react';
import { api, WinnerItem } from '../services/api';

interface WinnersPageProps {
  onNavigate: (page: string, params?: any) => void;
}

export const WinnersPage: React.FC<WinnersPageProps> = ({ onNavigate }) => {
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    try {
      setLoading(true);
      const data = await api.getWinners(20);
      setWinners(data);
    } catch (err) {
      console.error('Failed to fetch winners from database:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: 'calc(100vh - 4.5rem)', padding: '3rem 0 6rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
          <div className="badge-gold" style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
            <Trophy size={14} /> HALL OF FAME
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            Nati Lotto Winners
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem' }}>
            Celebrating real Ethiopian winners from live PostgreSQL database records. Every draw result is backed by immutable cryptographic proof.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 1rem', color: 'var(--color-purple)' }} />
            <p>Fetching certified winners from database...</p>
          </div>
        )}

        {/* 4 Cards Grid */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.75rem' }}>
            {winners.map(winner => (
              <div
                key={winner.id}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: '#0F172A' }}>
                  <img
                    src={winner.prizeImageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80'}
                    alt={winner.prizeTitle}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(11, 15, 25, 0.85)',
                    backdropFilter: 'blur(6px)',
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <Award size={13} /> Draw #{winner.drawNumber}
                  </span>

                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10B981',
                    color: '#10B981',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}>
                    {winner.claimStatus}
                  </span>
                </div>

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.85rem' }}>
                    {winner.prizeTitle}
                  </h3>

                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Winning Ticket:</span>
                      <span style={{ fontWeight: 800, color: 'var(--color-text-gold)', fontFamily: 'monospace' }}>
                        {winner.winningTicketNumber}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Winner:</span>
                      <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{winner.winnerDisplayName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Draw Date:</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(winner.drawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('verify', { drawNumber: winner.drawNumber, ticketNumber: winner.winningTicketNumber })}
                    className="btn-ghost"
                    style={{
                      marginTop: 'auto',
                      width: '100%',
                      padding: '0.65rem',
                      fontSize: '0.85rem',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      color: 'var(--color-purple)'
                    }}
                  >
                    <ShieldCheck size={16} /> Verify Cryptographic Proof
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
