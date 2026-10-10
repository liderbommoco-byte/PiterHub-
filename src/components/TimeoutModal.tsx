import React from 'react';
import { Clock, RefreshCw, X } from 'lucide-react';

interface TimeoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayAgain: () => void;
}

export const TimeoutModal: React.FC<TimeoutModalProps> = ({
  isOpen,
  onClose,
  onPayAgain,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl p-6 sm:p-7 text-center text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-2xl border border-red-500/30 flex items-center justify-center text-red-400">
          <Clock className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          O TEMPO TERMINOU!
        </h3>

        <p className="text-sm text-slate-300 mt-2 mb-6 leading-relaxed">
          Não conseguiste resolver o cubo nesta sessão. Queres tentar novamente?
        </p>

        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 text-left mb-6">
          <span className="font-semibold text-slate-300 block mb-0.5">Regra Oficial:</span>
          O cronómetro de 30 minutos chegou a 00:00. O histórico da tua sessão foi preservado. Para iniciar um novo desafio com um novo cubo misturado, efetua um novo pagamento.
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onPayAgain();
            }}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            PAGAR NOVAMENTE — 100 KZ
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
