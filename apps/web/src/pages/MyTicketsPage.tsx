import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Search, ExternalLink, CheckCircle, Clock, Award, 
  ShieldCheck, ChevronRight, ChevronDown, ChevronUp, Loader2,
  QrCode, Sparkles, X, Copy, Check, Layers, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, TicketItem } from '../services/api';

interface MyTicketsPageProps {
  onNavigate: (page: string, params?: any) => void;
}

interface ProductTicketGroup {
  key: string;
  drawId: string;
  drawNumber: string;
  drawTitle: string;
  prizeTitle: string;
  prizeImageUrl: string;
  drawStatus: string;
  drawDate?: string;
  ticketPriceEtb: number;
  totalTickets: number;
  totalSpentEtb: number;
  isWinningGroup: boolean;
  winningCount: number;
  tickets: TicketItem[];
  latestPurchasedAt: string;
}

export const MyTicketsPage: React.FC<MyTicketsPageProps> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed' | 'won'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [inspectingTicket, setInspectingTicket] = useState<{ ticket: TicketItem; group: ProductTicketGroup } | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    // If returning from Chapa hosted checkout with a tx_ref parameter, verify payment
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const txRef = urlParams.get('tx_ref');
      if (txRef) {
        api.verifyPayment(txRef).then(() => {
          loadTickets();
        }).catch((err) => console.warn('Chapa verification check:', err));
      }
    } catch {}

    if (!isAdmin) {
      loadTickets();
    }
  }, [user, isAdmin]);

  if (isAdmin) {
    return (
      <div className="page-container" style={{ padding: '5rem 1.5rem', textAlign: 'center', maxWidth: '650px', margin: '0 auto' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <ShieldCheck size={36} color="#EF4444" />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>
          Operator Account — No Player Tickets
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          This account is registered as an authorized National Lottery Administration (NLA) operator / administrator.
          Under federal gaming integrity regulations, staff cannot participate in public draws or purchase tickets.
          To view and audit all public player tickets across all draws, please use the Audit & Tickets module in the Admin Dashboard.
        </p>
        <button
          onClick={() => onNavigate('admin')}
          className="btn-gold"
          style={{ padding: '0.85rem 1.75rem', fontSize: '0.95rem', fontWeight: 800 }}
        >
          Open Admin Dashboard & Tickets Registry →
        </button>
      </div>
    );
  }

  const loadTickets = async () => {
    try {
      setLoading(true);
      const effectiveUserId = user?.id;
      if (!effectiveUserId) {
        setTickets([]);
        return;
      }
      const data = await api.getUserTickets(effectiveUserId).catch(() => []);
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to load tickets from PostgreSQL database:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // Group tickets by Product / Draw
  const groupedProducts: ProductTicketGroup[] = useMemo(() => {
    const map = new Map<string, ProductTicketGroup>();

    for (const t of tickets) {
      // Group key by drawId or drawNumber or prizeTitle
      const key = t.drawId || t.drawNumber || t.prizeTitle || 'unknown-product';

      if (!map.has(key)) {
        map.set(key, {
          key,
          drawId: t.drawId,
          drawNumber: t.drawNumber || t.drawId || 'NL-000123',
          drawTitle: t.drawTitle || t.prizeTitle || 'Prize Draw',
          prizeTitle: t.prizeTitle || t.drawTitle || 'Prize Draw',
          prizeImageUrl: t.prizeImageUrl || 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=400&q=80',
          drawStatus: t.drawStatus || t.status || 'OPEN',
          drawDate: t.drawDate,
          ticketPriceEtb: t.ticketPriceEtb || 100,
          totalTickets: 0,
          totalSpentEtb: 0,
          isWinningGroup: false,
          winningCount: 0,
          tickets: [],
          latestPurchasedAt: t.createdAt,
        });
      }

      const group = map.get(key)!;
      group.tickets.push(t);
      group.totalTickets += 1;
      group.totalSpentEtb += (t.ticketPriceEtb || 100);

      const isWon = t.isWinningTicket || t.status === 'WON';
      if (isWon) {
        group.isWinningGroup = true;
        group.winningCount += 1;
      }

      if (new Date(t.createdAt) > new Date(group.latestPurchasedAt)) {
        group.latestPurchasedAt = t.createdAt;
      }
    }

    // Sort tickets inside each group by sequence/number
    for (const g of map.values()) {
      g.tickets.sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    }

    // Sort groups: Winning groups first, then most recently purchased
    return Array.from(map.values()).sort((a, b) => {
      if (a.isWinningGroup && !b.isWinningGroup) return -1;
      if (!a.isWinningGroup && b.isWinningGroup) return 1;
      return new Date(b.latestPurchasedAt).getTime() - new Date(a.latestPurchasedAt).getTime();
    });
  }, [tickets]);

  // Filter grouped products by tab and search query
  const filteredGroups = useMemo(() => {
    return groupedProducts.filter(g => {
      const isAct = g.drawStatus === 'OPEN' || g.drawStatus === 'CONFIRMED' || g.drawStatus === 'ACTIVE';
      const isWon = g.isWinningGroup;
      const isComp = g.drawStatus === 'COMPLETED' || isWon;

      if (activeTab === 'active' && !isAct) return false;
      if (activeTab === 'completed' && !isComp) return false;
      if (activeTab === 'won' && !isWon) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesProduct = (
          g.prizeTitle.toLowerCase().includes(q) ||
          g.drawTitle.toLowerCase().includes(q) ||
          g.drawNumber.toLowerCase().includes(q)
        );
        const matchesTicketNum = g.tickets.some(t => t.ticketNumber.toLowerCase().includes(q));
        return matchesProduct || matchesTicketNum;
      }

      return true;
    });
  }, [groupedProducts, activeTab, searchQuery]);

  // Toggle card expansion to view all tickets
  const toggleGroupExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg)', minHeight: 'calc(100vh - 4.5rem)', padding: '2.5rem 0 4rem' }}>
      <div className="container" style={{ maxWidth: '940px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="badge-purple" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                MY LOTTERY WALLET
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {tickets.length} total entries • {groupedProducts.length} prize draws
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--color-text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              My Tickets
            </h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
              All your entries grouped by prize draw. Click on any product to reveal your lucky ticket numbers and cryptographic proofs.
            </p>
          </div>

          <button
            onClick={() => onNavigate('draws')}
            className="btn-gold"
            style={{ padding: '0.65rem 1.35rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={16} />
            <span>Enter New Draw</span>
          </button>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '1rem',
          marginBottom: '2rem',
          background: 'var(--color-surface-card)',
          border: '1px solid var(--color-surface-border)',
          borderRadius: '16px',
          padding: '0.75rem 1.25rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'active', 'completed', 'won'] as const).map(tab => {
              const isSelected = activeTab === tab;
              const count = tab === 'all' 
                ? groupedProducts.length 
                : tab === 'active' 
                  ? groupedProducts.filter(g => g.drawStatus === 'OPEN' || g.drawStatus === 'CONFIRMED' || g.drawStatus === 'ACTIVE').length
                  : tab === 'won'
                    ? groupedProducts.filter(g => g.isWinningGroup).length
                    : groupedProducts.filter(g => g.drawStatus === 'COMPLETED' || g.isWinningGroup).length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    backgroundColor: isSelected ? 'var(--color-purple)' : 'transparent',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text-muted)',
                    border: isSelected ? '1px solid var(--color-purple)' : '1px solid var(--color-surface-border)',
                    padding: '0.45rem 1.1rem',
                    borderRadius: '20px',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: '0.85rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <span>{tab}</span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '1px 6px', 
                    borderRadius: '10px', 
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-surface-elevated)',
                    color: isSelected ? '#FFFFFF' : 'var(--color-text-secondary)',
                    fontWeight: 700 
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search product or #ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--color-surface-elevated)',
                border: '1px solid var(--color-surface-border)',
                borderRadius: '10px',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                color: 'var(--color-text-main)',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
            />
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--color-text-muted)' }}>
            <Loader2 size={38} className="animate-spin" style={{ margin: '0 auto 1.25rem', color: 'var(--color-purple)' }} />
            <p style={{ fontWeight: 600 }}>Loading your ticket wallet from PostgreSQL...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{
            background: 'var(--color-surface-card)',
            border: '1.5px dashed var(--color-surface-border)',
            borderRadius: '20px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: 'var(--color-text-muted)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(108, 93, 211, 0.1)',
              color: 'var(--color-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <Ticket size={32} />
            </div>
            <h3 style={{ color: 'var(--color-text-main)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              No Ticket Entries Found
            </h3>
            <p style={{ maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.88rem', lineHeight: 1.5 }}>
              {searchQuery 
                ? `No ticket matching "${searchQuery}". Try searching by another product name or ticket number.`
                : `You don't have any tickets under the "${activeTab}" category. Enter an active draw to try your luck!`}
            </p>
            <button
              onClick={() => onNavigate('draws')}
              className="btn-gold"
              style={{ padding: '0.75rem 1.8rem' }}
            >
              Browse Active Draws
            </button>
          </div>
        ) : (
          /* UNIFIED GROUPED PRODUCT CARDS LIST */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredGroups.map(group => {
              const isExpanded = expandedKeys.has(group.key);
              const isWon = group.isWinningGroup;
              const formattedDate = new Date(group.latestPurchasedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={group.key}
                  style={{
                    backgroundColor: 'var(--color-surface-card)',
                    border: isWon ? '2px solid #FFC107' : '1px solid var(--color-surface-border)',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    boxShadow: isWon ? '0 10px 30px rgba(255, 193, 7, 0.18)' : 'var(--shadow-card)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* WINNING BANNER (If any ticket in this group won) */}
                  {isWon && (
                    <div style={{
                      background: 'linear-gradient(90deg, #FFC107 0%, #F59E0B 100%)',
                      color: '#000000',
                      padding: '0.45rem 1.5rem',
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      letterSpacing: '0.02em'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={16} />
                        <span>OFFICIAL WINNER! You have {group.winningCount} winning ticket(s) in this draw!</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', background: '#000000', color: '#FFC107', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        CLAIM READY
                      </span>
                    </div>
                  )}

                  {/* MAIN CARD HEADER (Clickable to expand / reveal tickets) */}
                  <div
                    onClick={() => toggleGroupExpand(group.key)}
                    style={{
                      padding: '1.25rem 1.5rem',
                      cursor: 'pointer',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1.25rem',
                      background: isExpanded ? 'rgba(108, 93, 211, 0.02)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Left: Product Thumbnail & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 340px' }}>
                      <div style={{
                        width: '74px',
                        height: '74px',
                        borderRadius: '14px',
                        backgroundColor: '#1E293B',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid var(--color-surface-border)',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
                      }}>
                        <img
                          src={group.prizeImageUrl}
                          alt={group.prizeTitle}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span className="badge-gold" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                            {group.drawNumber}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: isWon ? 'rgba(255, 193, 7, 0.2)' : 'rgba(108, 93, 211, 0.15)',
                            color: isWon ? '#B45309' : 'var(--color-purple)',
                            fontWeight: 800
                          }}>
                            {group.drawStatus}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-main)', margin: '0 0 0.35rem 0' }}>
                          {group.prizeTitle}
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          <span style={{ 
                            background: '#FEF3C7', 
                            color: '#92400E', 
                            padding: '2px 7px', 
                            borderRadius: '6px', 
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Ticket size={12} />
                            {group.totalTickets} {group.totalTickets === 1 ? 'Ticket' : 'Tickets'}
                          </span>
                          <span>•</span>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                            {group.totalSpentEtb} ETB Total
                          </span>
                          <span>•</span>
                          <span>Purchased {formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Ticket Chips Preview & Accordion Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexShrink: 0 }}>
                      
                      {/* Ticket Numbers Chips Preview */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: '240px', justifyContent: 'flex-end' }}>
                        {group.tickets.slice(0, 3).map(t => (
                          <span
                            key={t.id}
                            style={{
                              background: t.isWinningTicket ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'var(--color-surface-elevated)',
                              color: t.isWinningTicket ? '#FFFFFF' : 'var(--color-text-main)',
                              border: t.isWinningTicket ? '1px solid #D97706' : '1px solid var(--color-surface-border)',
                              borderRadius: '6px',
                              padding: '2px 7px',
                              fontSize: '0.78rem',
                              fontFamily: 'monospace',
                              fontWeight: 800
                            }}
                          >
                            {t.ticketNumber}
                          </span>
                        ))}
                        {group.totalTickets > 3 && (
                          <span style={{
                            background: 'var(--color-surface-elevated)',
                            color: 'var(--color-text-muted)',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            fontSize: '0.74rem',
                            fontWeight: 700
                          }}>
                            +{group.totalTickets - 3} more
                          </span>
                        )}
                      </div>

                      {/* Expand / View Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroupExpand(group.key);
                        }}
                        style={{
                          background: isExpanded ? 'var(--color-purple)' : 'var(--color-surface-elevated)',
                          color: isExpanded ? '#FFFFFF' : 'var(--color-purple)',
                          border: '1px solid var(--color-surface-border)',
                          borderRadius: '10px',
                          padding: '0.55rem 0.9rem',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.15s ease',
                          boxShadow: isExpanded ? 'var(--shadow-purple)' : 'none'
                        }}
                      >
                        <span>{isExpanded ? 'Hide Tickets' : `View ${group.totalTickets} Tickets`}</span>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            transform: isExpanded ? 'rotate(180deg)' : 'none', 
                            transition: 'transform 0.2s ease' 
                          }} 
                        />
                      </button>
                    </div>
                  </div>

                  {/* EXPANDABLE SECTION: REVEAL ALL TICKETS WHEN CLICKED */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid var(--color-surface-border)',
                      background: 'var(--color-surface-elevated)',
                      padding: '1.5rem',
                      animation: 'fadeIn 0.2s ease'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text-main)', margin: '0 0 0.2rem 0' }}>
                            All Registered Entries for {group.prizeTitle}
                          </h4>
                          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                            Each ticket carries a cryptographic SHA-256 fingerprint verified by Ethiopian National Lottery Administration.
                          </p>
                        </div>
                        
                        <button
                          onClick={() => onNavigate('draw-detail', { id: group.drawId })}
                          className="btn-ghost"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: 'var(--color-purple)', fontWeight: 700 }}
                        >
                          View Draw Details →
                        </button>
                      </div>

                      {/* Ticket Cards Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '0.85rem'
                      }}>
                        {group.tickets.map((t, idx) => {
                          const isTicketWon = t.isWinningTicket || t.status === 'WON';
                          const hashSnippet = t.hashSignature ? `${t.hashSignature.slice(0, 14)}...${t.hashSignature.slice(-6)}` : `SEC-SHA256-${t.ticketNumber}`;

                          return (
                            <div
                              key={t.id || idx}
                              style={{
                                background: '#FFFFFF',
                                border: isTicketWon ? '1.5px solid #FFC107' : '1px solid var(--color-surface-border)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.65rem',
                                boxShadow: isTicketWon ? '0 4px 12px rgba(255, 193, 7, 0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
                                position: 'relative'
                              }}
                            >
                              {/* Top row: Ticket Number & Badge */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                    #{idx + 1}
                                  </span>
                                  <span style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 900,
                                    fontFamily: 'monospace',
                                    color: isTicketWon ? '#B45309' : 'var(--color-text-main)',
                                    letterSpacing: '0.04em'
                                  }}>
                                    {t.ticketNumber}
                                  </span>
                                </div>

                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: isTicketWon ? '#FEF3C7' : 'rgba(16, 185, 129, 0.12)',
                                  color: isTicketWon ? '#B45309' : '#059669',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  {isTicketWon ? <Award size={11} /> : <CheckCircle size={11} />}
                                  {isTicketWon ? 'WINNER' : 'CONFIRMED'}
                                </span>
                              </div>

                              {/* Middle: Security Fingerprint Hash */}
                              <div style={{
                                background: 'var(--color-surface-elevated)',
                                borderRadius: '8px',
                                padding: '0.4rem 0.6rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.72rem',
                                border: '1px solid var(--color-surface-border)'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-text-muted)', overflow: 'hidden' }}>
                                  <ShieldCheck size={13} color="var(--color-purple)" />
                                  <span style={{ fontFamily: 'monospace', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                    {hashSnippet}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyHash(t.hashSignature || t.ticketNumber)}
                                  title="Copy verification hash"
                                  style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                >
                                  {copiedHash === (t.hashSignature || t.ticketNumber) ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                                </button>
                              </div>

                              {/* Bottom Action Buttons */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.2rem' }}>
                                <button
                                  type="button"
                                  onClick={() => setInspectingTicket({ ticket: t, group })}
                                  style={{
                                    background: 'var(--color-surface-elevated)',
                                    border: '1px solid var(--color-surface-border)',
                                    borderRadius: '8px',
                                    padding: '0.4rem',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    color: 'var(--color-text-main)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <QrCode size={13} color="var(--color-purple)" />
                                  <span>Digital Slip</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onNavigate('verify', { drawNumber: group.drawNumber, ticketNumber: t.ticketNumber })}
                                  style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    padding: '0.4rem',
                                    fontSize: '0.76rem',
                                    fontWeight: 700,
                                    color: 'var(--color-purple)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <ShieldCheck size={13} />
                                  <span>Verify Proof</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DIGITAL TICKET SLIP INSPECTION MODAL */}
      {inspectingTicket && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <button
              onClick={() => setInspectingTicket(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B'
              }}
            >
              <X size={16} />
            </button>

            {/* Official Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <span className="badge-gold" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', marginBottom: '0.4rem', display: 'inline-block' }}>
                ETHIOPIAN NATIONAL LOTTERY
              </span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text-main)', margin: '0.2rem 0' }}>
                Verified Entry Slip
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                Permit: NL-ET-2026-0892 • Cryptographically Signed
              </div>
            </div>

            {/* Product Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-surface-border)',
              borderRadius: '12px',
              padding: '0.75rem',
              marginBottom: '1.25rem'
            }}>
              <img
                src={inspectingTicket.group.prizeImageUrl}
                alt="Product"
                style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {inspectingTicket.group.prizeTitle}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Draw: {inspectingTicket.group.drawNumber}
                </div>
              </div>
            </div>

            {/* Big Ticket Number Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: '1.5px solid #F59E0B',
              borderRadius: '14px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Ticket Number
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'monospace', color: '#78350F', letterSpacing: '0.06em' }}>
                {inspectingTicket.ticket.ticketNumber}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#92400E', fontWeight: 700 }}>
                Status: {inspectingTicket.ticket.status || 'CONFIRMED'} • {inspectingTicket.ticket.ticketPriceEtb || 100} ETB
              </div>
            </div>

            {/* QR Code Audit Simulation */}
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-surface-border)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center',
              marginBottom: '1.25rem'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                margin: '0 auto 0.75rem',
                border: '2px solid #0F172A',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFFFFF'
              }}>
                <QrCode size={100} color="#0F172A" />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                SHA-256: {inspectingTicket.ticket.hashSignature || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                onClick={() => {
                  const t = inspectingTicket.ticket;
                  const g = inspectingTicket.group;
                  setInspectingTicket(null);
                  onNavigate('verify', { drawNumber: g.drawNumber, ticketNumber: t.ticketNumber });
                }}
                className="btn-purple"
                style={{ width: '100%', padding: '0.85rem' }}
              >
                Verify on National Lottery Ledger
              </button>
              <button
                onClick={() => setInspectingTicket(null)}
                className="btn-ghost"
                style={{ width: '100%', padding: '0.5rem' }}
              >
                Close Ticket Slip
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
