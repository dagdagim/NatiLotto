import React, { useState, useEffect } from 'react';
import { NatiLogo } from './components/NatiLogo';
import { HomePage } from './pages/HomePage';
import { DrawsPage } from './pages/DrawsPage';
import { DrawDetailPage } from './pages/DrawDetailPage';
import { LiveDrawPage } from './pages/LiveDrawPage';
import { VerifyPage } from './pages/VerifyPage';
import { WinnersPage } from './pages/WinnersPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { ResponsiblePlayPage } from './pages/ResponsiblePlayPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { 
  ShieldCheck, Lock, ExternalLink, Ticket, Trophy, Smartphone, 
  User as UserIcon, LogOut, CheckCircle2, AlertTriangle, Sun, Moon,
  Mail, MapPin, RefreshCw, Key
} from 'lucide-react';

export type PageRoute = 
  | 'home' 
  | 'draws' 
  | 'draw-detail' 
  | 'live' 
  | 'verify' 
  | 'winners' 
  | 'how-it-works' 
  | 'my-tickets'
  | 'responsible-play' 
  | 'admin';

const getInitialPage = (): PageRoute => {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const search = window.location.search.toLowerCase();

  // If returning from Chapa with tx_ref or hash specifies draw-detail, route directly to draw-detail
  if (
    hash.includes('draw-detail') ||
    hash.includes('draw_detail') ||
    search.includes('tx_ref') ||
    hash.includes('tx_ref')
  ) {
    return 'draw-detail';
  }
  if (path.includes('admin') || hash.includes('admin')) return 'admin';
  if (path.includes('live') || hash.includes('live')) return 'live';
  if (path.includes('draws') || hash.includes('draws')) return 'draws';
  if (path.includes('winners') || hash.includes('winners')) return 'winners';
  if (path.includes('tickets') || hash.includes('tickets')) return 'my-tickets';
  return 'home';
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isAdmin, login, register, verifyEmailCode, resendCode, forgotPassword, resetPassword, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageRoute>(getInitialPage);
  const [selectedDrawId, setSelectedDrawId] = useState<string>(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlDrawId = searchParams.get('id') || searchParams.get('drawId');
      if (urlDrawId && urlDrawId !== 'NL-000123') return urlDrawId;

      if (window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        const hashDrawId = hashParams.get('id') || hashParams.get('drawId');
        if (hashDrawId && hashDrawId !== 'NL-000123') return hashDrawId;
      }

      const saved = localStorage.getItem('nati_lotto_selected_draw_id');
      if (saved && saved !== 'NL-000123') return saved;
    } catch {}
    return 'NL-000014';
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authStep, setAuthStep] = useState<'form' | 'verify_otp' | 'forgot_request' | 'forgot_reset'>('form');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      if (
        hash.includes('draw-detail') ||
        hash.includes('draw_detail') ||
        search.includes('tx_ref') ||
        hash.includes('tx_ref')
      ) {
        // Also extract drawId if present in query or localStorage
        try {
          let dId: string | null = null;
          if (window.location.hash.includes('?')) {
            const hashQuery = window.location.hash.split('?')[1];
            const hashParams = new URLSearchParams(hashQuery);
            dId = hashParams.get('id') || hashParams.get('drawId');
          }
          if (!dId) {
            const searchParams = new URLSearchParams(window.location.search);
            dId = searchParams.get('id') || searchParams.get('drawId');
          }
          if (!dId) {
            const saved = localStorage.getItem('nati_lotto_selected_draw_id');
            if (saved && saved !== 'NL-000123') dId = saved;
          }
          if (dId) {
            setSelectedDrawId(dId);
            localStorage.setItem('nati_lotto_selected_draw_id', dId);
          }
        } catch {}
        setCurrentPage('draw-detail');
      } else if (hash.includes('admin')) setCurrentPage('admin');
      else if (hash.includes('live')) setCurrentPage('live');
      else if (hash.includes('draws')) setCurrentPage('draws');
      else if (hash.includes('winners')) setCurrentPage('winners');
      else if (hash.includes('tickets')) setCurrentPage('my-tickets');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Theme State - LIGHT MODE IS THE MAIN / DEFAULT MODE
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nati_lotto_theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nati_lotto_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Form states for login/signup/forgot password
  const [phoneInput, setPhoneInput] = useState('911 223 344');
  const [emailInput, setEmailInput] = useState('player@natilotto.et');
  const [locationInput, setLocationInput] = useState('Addis Ababa (Bole)');
  const [passwordInput, setPasswordInput] = useState('Player123!');
  const [firstNameInput, setFirstNameInput] = useState('Dawit');
  const [lastNameInput, setLastNameInput] = useState('Mekonnen');
  const [otpInput, setOtpInput] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Forgot password form states
  const [forgotCredential, setForgotCredential] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [maskedResetEmail, setMaskedResetEmail] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  useEffect(() => {
    if (currentPage === 'draw-detail' && selectedDrawId) {
      localStorage.setItem('nati_lotto_selected_draw_id', selectedDrawId);
      const expectedHash = `#draw-detail?id=${encodeURIComponent(selectedDrawId)}`;
      if (window.location.hash !== expectedHash) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${expectedHash}`);
      }
    }
  }, [currentPage, selectedDrawId]);

  const handleNavigate = (page: string, params?: { drawId?: string; id?: string; [key: string]: any }) => {
    const targetDrawId = params?.drawId || params?.id;
    if (targetDrawId) {
      setSelectedDrawId(targetDrawId);
      localStorage.setItem('nati_lotto_selected_draw_id', targetDrawId);
    }
    // RBAC: If user attempts to navigate to admin and is not admin, show warning
    if (page === 'admin' && !isAdmin) {
      setCurrentPage('admin');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Standard user cannot access verify ticket
    if (page === 'verify' && !isAdmin) {
      setCurrentPage('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (page === 'draw-detail') {
      const activeId = targetDrawId || selectedDrawId || localStorage.getItem('nati_lotto_selected_draw_id');
      window.location.hash = activeId ? `draw-detail?id=${encodeURIComponent(activeId)}` : 'draw-detail';
    } else {
      window.location.hash = page;
    }
    setCurrentPage(page as PageRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks: { id: PageRoute; label: string; isLive?: boolean }[] = [
    { id: 'home', label: 'Home' },
    { id: 'draws', label: 'Draws' },
    { id: 'live', label: 'Live', isLive: true },
    { id: 'winners', label: 'Winners' },
    { id: 'how-it-works', label: 'How It Works' },
  ];

  // Only public players have "My Tickets"! Administrative accounts do not hold tickets.
  if (!isAdmin) {
    navLinks.push({ id: 'my-tickets', label: 'My Tickets' });
  } else {
    navLinks.push({ id: 'admin', label: 'Admin Dashboard' });
  }

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authStep === 'verify_otp') {
        const res = await verifyEmailCode(pendingEmail || emailInput, otpInput);
        if (res.success) {
          setShowAuthModal(false);
          setAuthStep('form');
          setOtpInput('');
        } else {
          setAuthError(res.error || 'Invalid verification code');
        }
        return;
      }

      if (authMode === 'signin') {
        const res = await login(phoneInput, passwordInput);
        if (res.success) {
          setShowAuthModal(false);
          if (res.isAdmin) {
            handleNavigate('admin');
          }
        } else {
          setAuthError(res.error || 'Failed to sign in');
        }
      } else {
        const res = await register({
          phone: phoneInput,
          email: emailInput,
          location: locationInput,
          password: passwordInput,
          firstName: firstNameInput,
          lastName: lastNameInput,
        });
        if (res.requireVerification) {
          setPendingEmail(res.email || emailInput);
          if (res.devOtp) setDispatchedOtp(res.devOtp);
          setAuthStep('verify_otp');
          setAuthError('');
        } else if (res.success) {
          setShowAuthModal(false);
        } else {
          setAuthError(res.error || 'Failed to register');
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendStatus('Sending code...');
    const res = await resendCode(pendingEmail || emailInput);
    if (res.success) {
      if (res.devOtp) setDispatchedOtp(res.devOtp);
      setResendStatus('New code sent to your email!');
    } else {
      setResendStatus(res.error || 'Failed to resend');
    }
    setTimeout(() => setResendStatus(''), 4000);
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetSuccessMessage('');
    if (!forgotCredential.trim()) {
      setAuthError('Please enter your email or phone number');
      return;
    }
    setAuthLoading(true);
    try {
      const res = await forgotPassword(forgotCredential);
      if (res.success) {
        setPendingEmail(res.email || forgotCredential);
        setMaskedResetEmail(res.maskedEmail || res.email || forgotCredential);
        if (res.devOtp) setDispatchedOtp(res.devOtp);
        setAuthStep('forgot_reset');
        setOtpInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setResetSuccessMessage(res.message || 'Recovery code sent!');
      } else {
        setAuthError(res.error || 'Failed to send recovery code');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setResetSuccessMessage('');

    if (otpInput.length < 6) {
      setAuthError('Please enter the 6-digit recovery code');
      return;
    }
    if (newPasswordInput.length < 6) {
      setAuthError('New password must be at least 6 characters long');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match. Please re-enter.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await resetPassword({
        emailOrPhone: forgotCredential || pendingEmail,
        code: otpInput,
        newPassword: newPasswordInput,
      });
      if (res.success) {
        setResetSuccessMessage('Your password has been successfully reset! Signing you in...');
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthMode('signin');
          setAuthStep('form');
          setResetSuccessMessage('');
          setOtpInput('');
          setNewPasswordInput('');
          setConfirmPasswordInput('');
        }, 1500);
      } else {
        setAuthError(res.error || 'Password reset failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    setResendStatus('Sending new reset code...');
    const res = await forgotPassword(forgotCredential || pendingEmail);
    if (res.success) {
      if (res.devOtp) setDispatchedOtp(res.devOtp);
      setResendStatus('New recovery code sent to your email!');
    } else {
      setResendStatus(res.error || 'Failed to resend recovery code');
    }
    setTimeout(() => setResendStatus(''), 4000);
  };

  const handleQuickLoginPlayer = async () => {
    setAuthLoading(true);
    await login('+251911223344', 'Player123!');
    setAuthLoading(false);
    setShowAuthModal(false);
  };

  const handleQuickLoginAdmin = async () => {
    setAuthLoading(true);
    await login('+251911000001', 'Admin123!');
    setAuthLoading(false);
    setShowAuthModal(false);
    setCurrentPage('admin');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
      {/* Top Navigation Bar (Hidden when in Admin Console) */}
      {currentPage !== 'admin' && (
      <header style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        backdropFilter: 'blur(16px)', 
        backgroundColor: 'var(--color-header-bg)', 
        borderBottom: '1px solid var(--color-header-border)',
        boxShadow: theme === 'light' ? '0 1px 4px rgba(15, 23, 42, 0.05)' : 'none',
        transition: 'background-color 0.25s ease, border-color 0.25s ease'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '4.5rem' }}>
          {/* Logo */}
          <div 
            onClick={() => handleNavigate('home')} 
            style={{ cursor: 'pointer' }}
          >
            <NatiLogo size={36} textColor={theme === 'dark' ? '#FFFFFF' : '#0F172A'} />
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {navLinks.map(item => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  style={{
                    background: 'transparent',
                    color: isActive ? 'var(--color-purple)' : (theme === 'dark' ? '#94A3B8' : '#475569'),
                    border: 'none',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0',
                    borderBottom: isActive ? '2px solid var(--color-purple)' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.label}
                  {item.isLive && (
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: '#EF4444', 
                      display: 'inline-block',
                      boxShadow: '0 0 8px #EF4444'
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools: Theme Switcher, Authentication & Gated Admin Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--color-surface-border)',
                color: theme === 'light' ? '#0F172A' : '#F1F5F9',
                padding: '0.45rem 0.8rem',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
                transition: 'all 0.2s ease',
                boxShadow: theme === 'light' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? (
                <>
                  <Sun size={15} color="#D97706" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#A78BFA" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => { setAuthMode('signin'); setAuthError(''); setShowAuthModal(true); }}
                  className="btn-ghost"
                  style={{ fontSize: '0.9rem', color: theme === 'dark' ? '#CBD5E1' : '#334155' }}
                >
                  Sign In
                </button>

                <button
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setShowAuthModal(true); }}
                  className="btn-purple"
                  style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* User Info Capsule */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '24px',
                  padding: '0.35rem 0.85rem 0.35rem 0.5rem',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isAdmin ? 'var(--color-primary)' : 'var(--color-purple)',
                    color: isAdmin ? '#000' : '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.75rem'
                  }}>
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-main)', lineHeight: 1.1 }}>
                      {user?.displayName || user?.firstName}
                    </span>
                    {isAdmin ? (
                      <span style={{ fontSize: '0.70rem', color: '#D97706', fontWeight: 800 }}>
                        Staff / Operator (NLA)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-primary-dark)', fontWeight: 700 }}>
                        {user?.walletBalanceEtb?.toLocaleString()} ETB
                      </span>
                    )}
                  </div>
                </div>

                {/* CRITICAL RBAC: Only show Admin button if user is verified ADMIN! Regular users CANNOT see admin things! */}
                {isAdmin && (
                  <button
                    onClick={() => handleNavigate('admin')}
                    style={{
                      background: 'rgba(255, 193, 7, 0.15)',
                      border: '1px solid rgba(255, 193, 7, 0.4)',
                      color: theme === 'light' ? '#B45309' : 'var(--color-primary)',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 0 12px rgba(255, 193, 7, 0.15)'
                    }}
                    title="Administrator Dashboard & Operator Controls"
                  >
                    <Lock size={13} />
                    <span>Admin Portal</span>
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={() => { logout(); handleNavigate('home'); }}
                  className="btn-ghost"
                  style={{ padding: '0.45rem', color: '#94A3B8' }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
        {currentPage === 'draws' && <DrawsPage onNavigate={handleNavigate} />}
        {currentPage === 'draw-detail' && <DrawDetailPage drawId={selectedDrawId} onNavigate={handleNavigate} onRequireAuth={() => { setAuthMode('signin'); setShowAuthModal(true); }} />}
        {currentPage === 'live' && <LiveDrawPage drawId={selectedDrawId} onNavigate={handleNavigate} />}
        {currentPage === 'verify' && <VerifyPage onNavigate={handleNavigate} />}
        {currentPage === 'winners' && <WinnersPage onNavigate={handleNavigate} />}
        {currentPage === 'how-it-works' && <HowItWorksPage onNavigate={handleNavigate} />}
        {currentPage === 'my-tickets' && <MyTicketsPage onNavigate={handleNavigate} />}
        {currentPage === 'responsible-play' && <ResponsiblePlayPage onNavigate={handleNavigate} />}
        {currentPage === 'admin' && <AdminDashboardPage onNavigate={handleNavigate} />}
      </main>

      {/* Global Footer (Hidden when in Admin Console) */}
      {currentPage !== 'admin' && (
      <footer style={{ 
        background: theme === 'light' ? '#FFFFFF' : '#080B14', 
        borderTop: `1px solid ${theme === 'light' ? '#E2E8F0' : 'rgba(255, 255, 255, 0.06)'}`, 
        paddingTop: '3.5rem', 
        paddingBottom: '2.5rem',
        transition: 'background-color 0.25s ease'
      }}>
        <div className="container">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '2.5rem', 
            marginBottom: '2.5rem' 
          }}>
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <NatiLogo size={30} textColor={theme === 'dark' ? '#FFFFFF' : '#0F172A'} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Ethiopia's premier prize-draw platform. Legally licensed draws with verified Telebirr & CBE payments and cryptographic CSPRNG winner selection.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="badge-gold" style={{ fontSize: '0.72rem' }}>
                  <ShieldCheck size={12} /> NLA Permit #NL-ET-2026-0892
                </span>
                <span style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#EF4444', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '999px', 
                  fontSize: '0.72rem', 
                  fontWeight: 800 
                }}>
                  18+ ONLY
                </span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--color-text-main)' }}>
                QUICK LINKS
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <li><a href="#draws" onClick={(e) => { e.preventDefault(); handleNavigate('draws'); }}>Active Draws</a></li>
                <li><a href="#live" onClick={(e) => { e.preventDefault(); handleNavigate('live'); }}>Live Draw Arena</a></li>
                <li><a href="#winners" onClick={(e) => { e.preventDefault(); handleNavigate('winners'); }}>Winners Hall of Fame</a></li>
                <li><a href="#my-tickets" onClick={(e) => { e.preventDefault(); handleNavigate('my-tickets'); }}>My Tickets</a></li>
                <li><a href="#how" onClick={(e) => { e.preventDefault(); handleNavigate('how-it-works'); }}>How It Works</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--color-text-main)' }}>
                TRUST & COMPLIANCE
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                <li><a href="#how" onClick={(e) => { e.preventDefault(); handleNavigate('how-it-works'); }}>10-Step Commit-Reveal Protocol</a></li>
                <li><a href="#draws" onClick={(e) => { e.preventDefault(); handleNavigate('draws'); }}>NLA Government Certification</a></li>
                <li><a href="#responsible" onClick={(e) => { e.preventDefault(); handleNavigate('responsible-play'); }}>18+ Responsible Gaming Limits</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.2rem', color: 'var(--color-text-main)' }}>
                PAYMENT PARTNERS
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                Official Ethiopian fintech partners:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ 
                  background: theme === 'light' ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)', 
                  border: `1px solid ${theme === 'light' ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`, 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  color: 'var(--color-text-main)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
                  Telebirr (Ethio Telecom)
                </div>
                <div style={{ 
                  background: theme === 'light' ? '#F8FAFC' : 'rgba(255, 255, 255, 0.04)', 
                  border: `1px solid ${theme === 'light' ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)'}`, 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '8px', 
                  fontSize: '0.8rem', 
                  color: 'var(--color-text-main)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8B5CF6' }} />
                  CBE Birr (Commercial Bank of Ethiopia)
                </div>
              </div>
            </div>
          </div>

          <div style={{ 
            borderTop: `1px solid ${theme === 'light' ? '#E2E8F0' : 'rgba(255, 255, 255, 0.05)'}`, 
            paddingTop: '1.5rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '1rem',
            fontSize: '0.78rem',
            color: 'var(--color-text-muted)'
          }}>
            <div>
              © 2026 Nati Lotto Technologies PLC. All rights reserved. Strictly 18+.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <span>Helpline: 994 / 011-551-8888</span>
              <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>
        </div>
      </footer>
      )}

      {/* Authentication Modal with Real & Demo Logins */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="modal-dialog" style={{ maxWidth: '440px', padding: '2rem', position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <NatiLogo size={36} textColor={theme === 'dark' ? '#FFFFFF' : '#0F172A'} />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                {authMode === 'signin' 
                  ? 'Sign In to Nati Lotto' 
                  : authMode === 'signup' 
                    ? 'Create Your Account' 
                    : authStep === 'forgot_reset' 
                      ? 'Set New Password' 
                      : 'Reset Your Password'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                {authMode === 'signin' 
                  ? 'Sign in to buy tickets, view active entries, and claim prizes' 
                  : authMode === 'signup' 
                    ? 'Join thousands of lottery players across Ethiopia' 
                    : authStep === 'forgot_reset'
                      ? 'Enter your 6-digit recovery code and choose your new password'
                      : 'Enter your registered email address or phone number to recover your account'}
              </p>
            </div>

            {resetSuccessMessage && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem 0.95rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '8px',
                color: '#10B981',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={16} />
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {authError && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.65rem 0.85rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#EF4444',
                fontSize: '0.82rem'
              }}>
                {authError}
              </div>
            )}

            {authStep === 'verify_otp' ? (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(108, 93, 211, 0.12)',
                    color: 'var(--color-purple)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <Mail size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--color-text-main)', marginBottom: '0.4rem' }}>
                    Verify Your Email
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 0.5rem' }}>
                    A 6-digit verification code has been dispatched via Gmail SMTP to:
                  </p>
                  <div style={{
                    display: 'inline-block',
                    background: 'var(--color-surface-elevated)',
                    border: '1px solid var(--color-surface-border)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: 'var(--color-text-main)',
                    marginBottom: '0.75rem'
                  }}>
                    {pendingEmail || emailInput}
                  </div>

                  {/* SPAM / JUNK FOLDER NOTICE & INSTANT CODE AUTO-FILL */}
                  <div style={{
                    background: 'rgba(255, 193, 7, 0.08)',
                    border: '1px solid rgba(255, 193, 7, 0.35)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    margin: '0.5rem auto 1rem',
                    maxWidth: '400px',
                    fontSize: '0.82rem',
                    color: theme === 'light' ? '#92400E' : '#FCD34D',
                    lineHeight: 1.45,
                    textAlign: 'center'
                  }}>
                    <div>
                      ⚠️ <strong>Can't find the email in your Inbox?</strong>
                    </div>
                    <div style={{ marginTop: '0.25rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                      Please check your <strong>Spam</strong>, <strong>Junk</strong>, or <strong>Promotions</strong> folder.
                    </div>
                    {dispatchedOtp && (
                      <div style={{ marginTop: '0.6rem', borderTop: '1px dashed rgba(255,193,7,0.35)', paddingTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>Backup Verification Code: </span>
                        <button
                          type="button"
                          onClick={() => setOtpInput(dispatchedOtp)}
                          style={{
                            background: 'var(--color-purple)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.25rem 0.65rem',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            marginLeft: '0.35rem'
                          }}
                        >
                          Auto-fill {dispatchedOtp}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleAuthSubmit}>
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="• • • • • •"
                      className="input-field"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      style={{
                        textAlign: 'center',
                        fontSize: '1.75rem',
                        letterSpacing: '10px',
                        fontWeight: 900,
                        padding: '0.75rem',
                        color: 'var(--color-purple)',
                        maxWidth: '280px',
                        margin: '0 auto',
                        display: 'block'
                      }}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading || otpInput.length < 6}
                    className="btn-purple"
                    style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 800, marginBottom: '1rem' }}
                  >
                    {authLoading ? 'Verifying...' : 'Verify & Complete Sign Up'}
                  </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.82rem' }}>
                  <button
                    type="button"
                    onClick={() => { setAuthStep('form'); setAuthError(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    ← Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    style={{ background: 'none', border: 'none', color: 'var(--color-purple)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    {resendStatus || 'Resend Code'}
                  </button>
                </div>
              </div>
            ) : authMode === 'forgot' ? (
              authStep === 'forgot_reset' ? (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#EF4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem'
                    }}>
                      <Lock size={26} />
                    </div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      A 6-digit recovery code was sent to:
                    </p>
                    <div style={{
                      display: 'inline-block',
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-surface-border)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: 'var(--color-text-main)',
                      marginTop: '0.35rem'
                    }}>
                      {maskedResetEmail || forgotCredential}
                    </div>

                    {/* SPAM / JUNK FOLDER NOTICE & INSTANT CODE AUTO-FILL */}
                    <div style={{
                      background: 'rgba(255, 193, 7, 0.08)',
                      border: '1px solid rgba(255, 193, 7, 0.35)',
                      borderRadius: '10px',
                      padding: '0.65rem 0.85rem',
                      margin: '0.75rem auto 0.5rem',
                      fontSize: '0.8rem',
                      color: theme === 'light' ? '#92400E' : '#FCD34D',
                      lineHeight: 1.45,
                      textAlign: 'center'
                    }}>
                      <div>
                        ⚠️ <strong>Check your Spam or Junk folder</strong> if not in Inbox.
                      </div>
                      {dispatchedOtp && (
                        <div style={{ marginTop: '0.45rem', borderTop: '1px dashed rgba(255,193,7,0.35)', paddingTop: '0.45rem' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Backup Reset Code: </span>
                          <button
                            type="button"
                            onClick={() => setOtpInput(dispatchedOtp)}
                            style={{
                              background: '#EF4444',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.2rem 0.55rem',
                              fontWeight: 800,
                              fontSize: '0.76rem',
                              cursor: 'pointer',
                              marginLeft: '0.35rem'
                            }}
                          >
                            Auto-fill {dispatchedOtp}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleResetSubmit}>
                    <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                        6-Digit Recovery Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        autoFocus
                        placeholder="• • • • • •"
                        className="input-field"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        style={{
                          textAlign: 'center',
                          fontSize: '1.6rem',
                          letterSpacing: '8px',
                          fontWeight: 900,
                          padding: '0.6rem',
                          color: '#DC2626',
                          maxWidth: '260px',
                          margin: '0 auto',
                          display: 'block'
                        }}
                        required
                      />
                    </div>

                    <div style={{ marginBottom: '0.85rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                        New Password * (Min. 6 chars)
                      </label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="••••••••"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="••••••••"
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authLoading || otpInput.length < 6 || !newPasswordInput}
                      className="btn-purple"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', marginBottom: '1rem' }}
                    >
                      {authLoading ? 'Resetting Password...' : 'Reset Password & Sign In'}
                    </button>
                  </form>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.82rem' }}>
                    <button
                      type="button"
                      onClick={() => { setAuthStep('forgot_request'); setAuthError(''); setResetSuccessMessage(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}
                    >
                      ← Change Credential
                    </button>
                    <button
                      type="button"
                      onClick={handleResendResetCode}
                      style={{ background: 'none', border: 'none', color: 'var(--color-purple)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      {resendStatus || 'Resend Code'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotRequest}>
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(108, 93, 211, 0.12)',
                      color: 'var(--color-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 0.75rem'
                    }}>
                      <Key size={26} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      Lost your password? Enter your registered email or mobile number below to receive an official recovery PIN.
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                      Email Address or Phone Number *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                      <input
                        type="text"
                        className="input-field"
                        value={forgotCredential}
                        onChange={(e) => setForgotCredential(e.target.value)}
                        placeholder="e.g. player@natilotto.et or 911223344"
                        style={{ paddingLeft: '2.2rem' }}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading || !forgotCredential.trim()}
                    className="btn-purple"
                    style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', marginBottom: '1rem' }}
                  >
                    {authLoading ? 'Sending Recovery Code...' : 'Send Recovery Code'}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleAuthSubmit}>
                {authMode === 'signup' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                          First Name
                        </label>
                        <input 
                          type="text" 
                          className="input-field"
                          value={firstNameInput}
                          onChange={(e) => setFirstNameInput(e.target.value)}
                          placeholder="e.g. Dawit"
                          required
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                          Last Name
                        </label>
                        <input 
                          type="text" 
                          className="input-field"
                          value={lastNameInput}
                          onChange={(e) => setLastNameInput(e.target.value)}
                          placeholder="e.g. Mekonnen"
                          required
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                        Email Address * (For Verification Code)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input 
                          type="email" 
                          className="input-field"
                          placeholder="e.g. player@gmail.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          style={{ paddingLeft: '2.2rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                        Location / City *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input 
                          type="text" 
                          className="input-field"
                          placeholder="e.g. Addis Ababa (Bole), Hawassa, Adama"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          style={{ paddingLeft: '2.2rem' }}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.3rem' }}>
                    Phone Number
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ 
                      background: theme === 'light' ? '#F1F5F9' : 'rgba(255, 255, 255, 0.05)', 
                      border: '1px solid var(--color-surface-border)', 
                      borderRadius: '8px', 
                      padding: '0.65rem 0.85rem', 
                      fontSize: '0.85rem', 
                      fontWeight: 700,
                      color: 'var(--color-text-secondary)'
                    }}>
                      +251
                    </div>
                    <input 
                      type="tel" 
                      className="input-field"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="911 234 567" 
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                      Password
                    </label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setAuthStep('forgot_request');
                          setAuthError('');
                          setResetSuccessMessage('');
                          setForgotCredential(emailInput || phoneInput || '');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.75rem',
                          color: 'var(--color-purple)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <input 
                    type="password" 
                    className="input-field"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••" 
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={authLoading}
                  className="btn-purple" 
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', marginBottom: '1rem' }}
                >
                  {authLoading ? 'Please wait...' : authMode === 'signin' ? 'Sign In to Account' : 'Send Verification Code'}
                </button>
              </form>
            )}

            {/* Quick 1-Click Demo Accounts (Only shown on Sign In) */}
            {authMode === 'signin' && (
              <div style={{
                background: theme === 'light' ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--color-surface-border)',
                borderRadius: '10px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Instant Demo Access
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleQuickLoginPlayer}
                    style={{
                      flex: 1,
                      background: 'rgba(108, 93, 211, 0.15)',
                      border: '1px solid rgba(108, 93, 211, 0.4)',
                      color: 'var(--color-purple)',
                      borderRadius: '6px',
                      padding: '0.45rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ Player (Dawit M.)
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickLoginAdmin}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 193, 7, 0.15)',
                      border: '1px solid rgba(255, 193, 7, 0.4)',
                      color: theme === 'light' ? '#B45309' : 'var(--color-primary)',
                      borderRadius: '6px',
                      padding: '0.45rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ⚡ SuperAdmin (Natnael)
                  </button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              {authMode === 'forgot' ? (
                <span>
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthStep('form'); setAuthError(''); setResetSuccessMessage(''); }}
                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-purple)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Back to Sign In
                  </button>
                </span>
              ) : authMode === 'signin' ? (
                <span>
                  Don't have an account?{' '}
                  <a href="#signup" onClick={(e) => { e.preventDefault(); setAuthMode('signup'); setAuthError(''); setResetSuccessMessage(''); }} style={{ color: 'var(--color-purple)', fontWeight: 700 }}>
                    Sign Up
                  </a>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <a href="#signin" onClick={(e) => { e.preventDefault(); setAuthMode('signin'); setAuthError(''); setResetSuccessMessage(''); }} style={{ color: 'var(--color-purple)', fontWeight: 700 }}>
                    Sign In
                  </a>
                </span>
              )}
            </div>

            <button 
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                fontSize: '1.25rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
