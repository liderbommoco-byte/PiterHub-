import React, { useState } from 'react';
import { X, Smartphone, Copy, Check, Clock, AlertCircle, ShieldCheck, Zap } from 'lucide-react';
import { EntryPayment } from '../types/index.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onPaymentSuccess: (payment: EntryPayment, autoStarted?: boolean) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  token,
  onPaymentSuccess,
}) => {
  const [referenceCode, setReferenceCode] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedPayment, setSubmittedPayment] = useState<EntryPayment | null>(null);

  if (!isOpen) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText('944636057');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!referenceCode.trim()) {
      setErrorMsg('Indique o código de transação ou número de telefone de envio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ referenceCode, proofNote }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao submeter comprovativo');
      }

      setSubmittedPayment(data.payment);
      onPaymentSuccess(data.payment, false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantDemoConfirm = async () => {
    setErrorMsg('');
    setIsDemoSubmitting(true);
    try {
      const res = await fetch('/api/payments/instant-demo-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar ativação de teste');
      }

      onPaymentSuccess(data.payment, true);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro no modo teste');
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Pagamento da Sessão (100 Kz)
            </h3>
            <p className="text-xs text-slate-400">
              Instruções oficiais de Multicaixa Express para desbloquear 30 minutos de jogo
            </p>
          </div>
        </div>

        {submittedPayment ? (
          /* Payment submitted state - pending manual verification */
          <div className="space-y-4 py-2">
            <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl flex items-start gap-3">
              <Clock className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-300 text-sm">
                  Comprovativo Submetido com Sucesso!
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  O teu pagamento de 100 Kz com a referência{' '}
                  <span className="font-mono font-bold text-amber-400">{submittedPayment.referenceCode}</span> está
                  pendente de validação pela administração.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Assim que o administrador confirmar o recebimento no Multicaixa Express, a tua sessão oficial de 30 minutos
                  será ativada automaticamente!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Fechar e Aguardar Validação
              </button>
            </div>
          </div>
        ) : (
          /* Instructions and Proof form */
          <div className="space-y-5">
            {/* Multicaixa Details Box */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs text-slate-400">Método Oficial</span>
                <span className="text-xs font-bold text-white bg-blue-950 px-2.5 py-0.5 rounded border border-blue-800/50">
                  Multicaixa Express
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs text-slate-400">Valor da Sessão</span>
                <span className="text-base font-bold font-mono text-amber-400">
                  100 Kz
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs text-slate-400">Número para Pagamento</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-white tracking-wider">
                    944 636 057
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                    title="Copiar número"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Descrição / Nota</span>
                <span className="text-xs font-mono font-medium text-slate-300">
                  CUBO MÁGICO — SESSÃO DE JOGO
                </span>
              </div>
            </div>

            {/* Step-by-Step Info */}
            <div className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
              <span className="font-semibold text-slate-300">Como pagar no Multicaixa Express:</span>
              <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-400">
                <li>Abre o teu aplicativo Multicaixa Express no telemóvel.</li>
                <li>Faz uma transferência de 100 Kz para o número <strong className="text-slate-200">944 636 057</strong>.</li>
                <li>Na descrição insere: <strong className="text-slate-200">CUBO MÁGICO — SESSÃO DE JOGO</strong>.</li>
                <li>Copia o ID da transação ou número e submete no campo abaixo.</li>
              </ol>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Proof Submission Form */}
            <form onSubmit={handleSubmitProof} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ID da Transação / Referência Multicaixa Express *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: MCX-9823471 ou teu nº de telefone"
                  value={referenceCode}
                  onChange={e => setReferenceCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nota Adicional (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nome do titular da conta de envio"
                  value={proofNote}
                  onChange={e => setProofNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmitting ? 'A submeter comprovativo...' : 'Submeter Comprovativo (Aguardar Validação)'}
              </button>
            </form>

            {/* Demo / Tester Instant Activation Button */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400">Modo de Teste / Avaliação Rápida</span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase">Ambiente de Demonstração</span>
              </div>
              <button
                type="button"
                onClick={handleInstantDemoConfirm}
                disabled={isDemoSubmitting}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                {isDemoSubmitting ? 'A validar pagamento de teste...' : 'Simular Confirmação Instantânea (Iniciar 30 min)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
