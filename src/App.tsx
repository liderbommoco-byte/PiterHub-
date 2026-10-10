import React, { useState, useEffect, useCallback } from 'react';
import { User, Wallet, GameSession, EntryPayment } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { Hero } from './components/Hero.tsx';
import { InfoSections } from './components/InfoSections.tsx';
import { PlaySessionView } from './components/PlaySessionView.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';
import { WalletModal } from './components/WalletModal.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { VictoryModal } from './components/VictoryModal.tsx';
import { TimeoutModal } from './components/TimeoutModal.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [isTimeoutOpen, setIsTimeoutOpen] = useState(false);
  const [victoryPrize, setVictoryPrize] = useState(2000);

  // Restore session from localStorage on load
  const loadUser = useCallback(async (savedToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWallet(data.wallet);
        setToken(savedToken);
        if (data.activeSession) {
          setActiveSession(data.activeSession);
        }
      } else {
        localStorage.removeItem('cubo_token');
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('cubo_token');
    if (savedToken) {
      loadUser(savedToken);
    }
  }, [loadUser]);

  // Auth Handlers
  const handleAuthSuccess = (loggedUser: User, authToken: string, userWallet: Wallet) => {
    setUser(loggedUser);
    setToken(authToken);
    setWallet(userWallet);
    localStorage.setItem('cubo_token', authToken);
    // Check if user has an active session
    fetch('/api/sessions/active', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.session) {
          setActiveSession(d.session);
        }
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setWallet(null);
    setActiveSession(null);
    setIsPlaying(false);
    localStorage.removeItem('cubo_token');
  };

  // Play Now Flow
  const handlePlayClick = async () => {
    if (!user || !token) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }

    // Check if already has an active session
    try {
      const res = await fetch('/api/sessions/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.session && data.session.remainingSeconds > 0) {
        setActiveSession(data.session);
        setIsPlaying(true);
        return;
      }
    } catch {
      // ignore
    }

    // Otherwise, show 100 Kz payment instructions
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (payment: EntryPayment, autoStarted?: boolean) => {
    if (autoStarted) {
      // Refresh active session and jump right into the game!
      fetch('/api/sessions/active', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          if (d.session) {
            setActiveSession(d.session);
            setIsPlaying(true);
          }
        });
    }
  };

  // Victory Handler
  const handleVictory = (wonSession: GameSession) => {
    setActiveSession(wonSession);
    setVictoryPrize(wonSession.prizeAmount || 2000);
    setIsVictoryOpen(true);
    // Refresh wallet
    if (token) {
      fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.wallet) setWallet(d.wallet);
        });
    }
  };

  // Timeout Handler
  const handleTimeout = () => {
    setIsPlaying(false);
    setIsTimeoutOpen(true);
    setActiveSession(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* If actively in game session view */}
      {isPlaying && activeSession ? (
        <PlaySessionView
          session={activeSession}
          token={token}
          onExit={() => setIsPlaying(false)}
          onVictory={handleVictory}
          onTimeout={handleTimeout}
        />
      ) : (
        <>
          {/* Top Navbar */}
          <Navbar
            user={user}
            onOpenAuth={mode => {
              setAuthMode(mode);
              setIsAuthOpen(true);
            }}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onLogout={handleLogout}
            onPlayClick={handlePlayClick}
          />

          {/* Active Session Sticky Banner if user has ongoing timer */}
          {activeSession && activeSession.status === 'active' && activeSession.remainingSeconds > 0 && (
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-center text-xs flex items-center justify-center gap-3">
              <span className="text-amber-300 font-semibold">
                Tens uma sessão de jogo ativa a decorrer!
              </span>
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
              >
                Voltar ao Jogo 3D
              </button>
            </div>
          )}

          {/* Hero Section */}
          <Hero
            user={user}
            onPlayClick={handlePlayClick}
            onOpenAuth={mode => {
              setAuthMode(mode);
              setIsAuthOpen(true);
            }}
          />

          {/* Informational Sections */}
          <InfoSections onPlayClick={handlePlayClick} />

          {/* Footer */}
          <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-auto">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white">CUBO MÁGICO — COMO SER MILIONÁRIO!</span>
                <span>· Angola</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Multicaixa Express: 944 636 057</span>
                <span>·</span>
                <span>100 Kz / Sessão</span>
                <span>·</span>
                <span>Prémio: 2.000 Kz</span>
                <span>·</span>
                <span>Saques: 10.000 Kz</span>
              </div>
              <div>
                © {new Date().getFullYear()} Todos os direitos reservados.
              </div>
            </div>
          </footer>
        </>
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        token={token}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        token={token}
        onWalletUpdated={w => setWallet(w)}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        token={token}
        onActionCompleted={() => {
          if (token) loadUser(token);
        }}
      />

      <VictoryModal
        isOpen={isVictoryOpen}
        prizeAmount={victoryPrize}
        onClose={() => setIsVictoryOpen(false)}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      <TimeoutModal
        isOpen={isTimeoutOpen}
        onClose={() => setIsTimeoutOpen(false)}
        onPayAgain={() => setIsPaymentOpen(true)}
      />
    </div>
  );
}
