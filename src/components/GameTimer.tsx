import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { sfx } from '../utils/audio.ts';

interface GameTimerProps {
  expiresAt: string; // ISO string from server
  onExpire: () => void;
  syncServerTime?: number;
}

export const GameTimer: React.FC<GameTimerProps> = ({ expiresAt, onExpire }) => {
  const calculateRemaining = () => {
    const expiry = new Date(expiresAt).getTime();
    const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    return diff;
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemaining);
  const [hasWarned60s, setHasWarned60s] = useState(false);

  useEffect(() => {
    const tick = () => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);

      // Audio & visual alert at 60 seconds
      if (remaining <= 60 && remaining > 0 && !hasWarned60s) {
        setHasWarned60s(true);
        sfx.playWarning();
      }

      if (remaining <= 0) {
        onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire, hasWarned60s]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Color determination:
  // > 5 minutes (> 300s): Normal (emerald/cyan/gold)
  // <= 5 minutes (<= 300s): Yellow / Amber
  // <= 1 minute (<= 60s): Red with visual flashing warning
  const isYellow = secondsLeft <= 300 && secondsLeft > 60;
  const isRed = secondsLeft <= 60;

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl border backdrop-blur-md transition-all ${
        isRed
          ? 'bg-red-950/70 border-red-500/80 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse'
          : isYellow
          ? 'bg-amber-950/60 border-amber-500/70 text-amber-300'
          : 'bg-slate-900/80 border-slate-700/80 text-emerald-400'
      }`}
    >
      <div className="flex items-center gap-2">
        {isRed ? (
          <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
        ) : (
          <Clock className={`w-5 h-5 ${isYellow ? 'text-amber-400' : 'text-emerald-400'}`} />
        )}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
            {isRed ? 'Último Minuto!' : isYellow ? 'Atenção aos 5 Min' : 'Tempo Restante'}
          </span>
          <span
            data-tabular="true"
            className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight"
          >
            {formatted}
          </span>
        </div>
      </div>

      {isRed && (
        <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
          Aviso 60s
        </span>
      )}
    </div>
  );
};
