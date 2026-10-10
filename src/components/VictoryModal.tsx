import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { sfx } from '../utils/audio.ts';

interface VictoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWallet: () => void;
  prizeAmount: number;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  onClose,
  onOpenWallet,
  prizeAmount = 2000,
}) => {
  useEffect(() => {
    if (isOpen) {
      sfx.playVictory();
      // Confetti burst
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444'],
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] p-6 sm:p-8 text-center text-slate-100">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-2xl border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
          <Trophy className="w-9 h-9" />
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          PARABÉNS! RESOLVESTE O CUBO MÁGICO!
        </h3>

        <div className="my-4 py-3 px-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <span className="text-xs uppercase font-semibold text-amber-400 tracking-wider block">
            Recompensa Conquistada
          </span>
          <span data-tabular="true" className="text-3xl font-mono font-black text-amber-300">
            {prizeAmount.toLocaleString('pt-AO')} Kz
          </span>
        </div>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 text-left space-y-1.5 mb-6">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Adicionado ao Saldo Pendente de Validação
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            O prémio de {prizeAmount.toLocaleString('pt-AO')} Kz foi registado na tua carteira. Conforme as regras da plataforma, o valor passará para o teu saldo disponível para saque assim que a auditoria da sessão for concluída pelo administrador.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenWallet();
            }}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            Ver Minha Carteira
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
