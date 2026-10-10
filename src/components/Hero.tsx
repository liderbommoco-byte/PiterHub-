import React from 'react';
import { RubiksCube3D } from './RubiksCube3D.tsx';
import { SOLVED_STATE } from '../utils/cubeLogic.ts';
import { Play, UserPlus, LogIn, Sparkles, Shield, Clock, Trophy } from 'lucide-react';
import { User } from '../types/index.ts';

interface HeroProps {
  user: User | null;
  onPlayClick: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const Hero: React.FC<HeroProps> = ({ user, onPlayClick, onOpenAuth }) => {
  return (
    <div className="relative overflow-hidden pt-8 pb-16 lg:py-20">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Headline, Slogan and Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Kicker */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Desafio Oficial em Angola · Multicaixa Express</span>
            </div>

            {/* Main Brand Title & Slogan */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08] text-balance">
              CUBO MÁGICO
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-yellow-500">
                COMO SER MILIONÁRIO!
              </span>
            </h1>

            {/* Official Slogan */}
            <p className="text-lg sm:text-xl font-bold text-slate-200 tracking-tight">
              “Paga 100 Kz. Resolve o cubo. Ganha 2.000 Kz!”
            </p>

            <p className="text-sm text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Entra na arena digital oficial com um cubo 3D interactivo real. Tens exatamente 30 minutos cronometrados no servidor para ordenar todas as 6 cores e conquistar o teu prémio.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                type="button"
                onClick={onPlayClick}
                className="py-3.5 px-7 rounded-xl font-extrabold text-sm bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 transition-all shadow-xl shadow-amber-500/25 flex items-center gap-2.5 transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                JOGAR AGORA
              </button>

              {!user && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="py-3.5 px-5 rounded-xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    CRIAR CONTA
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="py-3.5 px-5 rounded-xl font-semibold text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    INICIAR SESSÃO
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: 3D Rubik's Cube Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm">
              <RubiksCube3D
                cubeState={SOLVED_STATE}
                onMove={() => {}}
                interactive={false}
                size="hero"
              />
            </div>
          </div>
        </div>

        {/* 4-Item Parameter Strip (No fake stats, only factual game terms) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 pt-8 border-t border-slate-800/80">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <span className="font-mono font-bold text-sm">100</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Preço por Sessão</span>
              <span className="text-sm font-bold text-white">100 Kz</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tempo Disponível</span>
              <span className="text-sm font-bold text-white">30 Minutos</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Prémio por Vitória</span>
              <span className="text-sm font-bold text-white">2.000 Kz</span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Regra de Levantamento</span>
              <span className="text-sm font-bold text-white">10.000 Kz / Saque</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
