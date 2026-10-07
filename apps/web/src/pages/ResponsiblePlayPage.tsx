import React from 'react';
import { ShieldCheck, Heart, AlertTriangle, Clock, UserX, PhoneCall } from 'lucide-react';

interface ResponsiblePlayPageProps {
  onNavigate?: (page: string, params?: any) => void;
}

export const ResponsiblePlayPage: React.FC<ResponsiblePlayPageProps> = () => {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem 6rem', maxWidth: '840px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div className="badge-gold" style={{ marginBottom: '0.75rem' }}>
          <Heart size={14} /> PLAYER PROTECTION
        </div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '0.75rem' }}>
          Responsible Play & Age Gating
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Nati Lotto strictly adheres to responsible gaming standards set by the Ethiopian National Lottery Administration.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={24} color="var(--color-primary)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Strict 18+ Age Restriction</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            Underage participation is strictly prohibited under Ethiopian federal law. Every user account requires 
            mandatory birth date registration and identity verification prior to claiming any physical prize. 
            Accounts found to belong to minors are immediately suspended and entries voided.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Clock size={24} color="var(--color-info)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Enforced Purchase Limits</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            To prevent excessive play, our backend enforces strict algorithmic velocity limits:
          </p>
          <ul style={{ color: 'var(--color-text-secondary)', marginTop: '0.75rem', paddingLeft: '1.25rem', lineHeight: 1.7, fontSize: '0.95rem' }}>
            <li><strong>Maximum 25 tickets</strong> per draw per user</li>
            <li><strong>Maximum 100 tickets</strong> across all draws in a single 24-hour window</li>
            <li>Configurable personalized daily and weekly spend limits directly from your account settings</li>
          </ul>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <UserX size={24} color="var(--color-error)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Self-Exclusion & Cooling-Off</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            If you ever feel the need to pause, you can trigger an irrevocable self-exclusion period ranging from 
            30 days to 180 days. Once activated, our system prevents ticket purchases, blocks notifications, and 
            disallows account reactivation until the cooldown period expires.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', background: 'var(--color-surface-elevated)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <PhoneCall size={24} color="var(--color-success)" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Support & Resources</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
            If you or someone you know needs advice or assistance regarding responsible play, our support specialists 
            are available 24/7 in Amharic, Afaan Oromo, and English at <strong>+251 911 000 000</strong> or via email at <strong>support@natilotto.et</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
