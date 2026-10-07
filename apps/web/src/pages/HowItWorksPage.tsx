import React from 'react';
import { ShieldCheck, Lock, Cpu, CheckCircle2, Ticket, Award, ArrowRight } from 'lucide-react';

export const HowItWorksPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem 6rem', maxWidth: '880px' }}>
      <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div className="badge-gold" style={{ marginBottom: '0.75rem' }}>
          <ShieldCheck size={14} /> TRANSPARENCY ARCHITECTURE
        </div>
        <h1 style={{ fontSize: '2.6rem', fontWeight: 900, marginBottom: '0.75rem' }}>
          How Nati Lotto Works
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Nati Lotto was engineered from the ground up to replace black-box draws with 
          verifiable cryptographic fairness and strict Ethiopian regulatory oversight.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {[
          {
            step: '01',
            title: 'Regulatory Authorization & Fixed Capacities',
            desc: 'Every draw requires an official National Lottery permit number before tickets can be published. Each draw has a fixed maximum ticket capacity (e.g. 1,000 tickets). Once reached, sales instantly lock.',
            icon: ShieldCheck,
          },
          {
            step: '02',
            title: 'Atomic Entry Allocation & Anti-Overselling',
            desc: 'When you purchase tickets with Telebirr or CBE Birr, our PostgreSQL transactional engine uses pessimistic row locks (SELECT ... FOR UPDATE) to guarantee that tickets are strictly never oversold or duplicated.',
            icon: Ticket,
          },
          {
            step: '03',
            title: 'Pre-Draw SHA-256 Snapshot',
            desc: '15 minutes before draw execution, ticket sales are permanently closed. The system generates an SHA-256 hash of all eligible ticket serial numbers. This snapshot is published so the entry list can never be altered.',
            icon: Lock,
          },
          {
            step: '04',
            title: 'Cryptographically Secure Random Winner Selection (CSPRNG)',
            desc: 'We never use pseudo-random Math.random(). Winner selection uses 256-bit system entropy from hardware CSPRNG combined with the pre-draw snapshot hash. The winning entry index is calculated deterministically: index = seed % total_tickets.',
            icon: Cpu,
          },
          {
            step: '05',
            title: 'Immutable Result Commitment & Public Proof',
            desc: 'The final result hash bindings (snapshot hash + seed hex + winning ticket) are permanently certified and recorded to an append-only audit ledger monitored by the National Lottery Administration.',
            icon: Award,
          },
        ].map((item, idx) => (
          <div key={idx} className="card" style={{ padding: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '16px', 
              background: 'var(--color-primary-container)', 
              color: 'var(--color-primary)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <item.icon size={28} />
            </div>
            <div>
              <div style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                STEP {item.step}
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
        <button className="btn-primary" onClick={() => onNavigate('draws')}>
          EXPLORE ACTIVE DRAWS <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
