import React from 'react';
import { User } from '../types/index.ts';

interface NavbarProps {
  user: User | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenWallet: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  onPlayClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onOpenWallet,
  onOpenAdmin,
  onLogout,
  onPlayClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single text element, no badges) */}
        <a
          href="/"
          className="text-lg sm:text-xl font-extrabold tracking-tight text-white hover:text-amber-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="text-amber-400 font-mono text-xl">✦</span>
          <span>CUBO MÁGICO</span>
        </a>

        {/* Zone 2: 4-5 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <a href="#como-funciona" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
            Como Funciona
          </a>
          <a href="#regras" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
            Regras Oficiais
          </a>
          <a href="#faq" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
            Perguntas Frequentes
          </a>
          <a href="#termos" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">
            Termos em Angola
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-2">
              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Painel Admin
                </button>
              )}
              <button
                type="button"
                onClick={onOpenWallet}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Minha Carteira
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors whitespace-nowrap shrink-0"
                title="Terminar sessão"
              >
                Sair
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Iniciar Sessão
              </button>
              <button
                type="button"
                onClick={onPlayClick}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors shadow-sm shadow-amber-500/30 whitespace-nowrap shrink-0"
              >
                JOGAR AGORA
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
