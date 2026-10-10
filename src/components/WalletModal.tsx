import React, { useState, useEffect, useCallback } from 'react';
import { X, Wallet as WalletIcon, ArrowDownCircle, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Wallet, WithdrawalRequest, TransactionLedger } from '../types/index.ts';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onWalletUpdated?: (wallet: Wallet) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  token,
  onWalletUpdated,
}) => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<TransactionLedger[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Withdrawal form fields
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
  const [beneficiaryIban, setBeneficiaryIban] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWalletData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setTransactions(data.transactions || []);
        setWithdrawals(data.withdrawals || []);
        if (onWalletUpdated && data.wallet) {
          onWalletUpdated(data.wallet);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [token, onWalletUpdated]);

  useEffect(() => {
    if (isOpen) {
      fetchWalletData();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, fetchWalletData]);

  if (!isOpen) return null;

  const availableBalance = wallet?.availableBalance || 0;
  const canWithdraw = availableBalance >= 10000;

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!canWithdraw) {
      setErrorMsg(
        'Para solicitar um saque, precisas de ter pelo menos 10.000 Kz de saldo disponível. Cada levantamento é de exatamente 10.000 Kz.'
      );
      return;
    }

    if (!beneficiaryName.trim() || !beneficiaryPhone.trim()) {
      setErrorMsg('Preenche o nome do titular e número para transferência Multicaixa Express.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          beneficiaryName,
          beneficiaryPhone,
          beneficiaryIban,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar levantamento');
      }

      setSuccessMsg('Pedido de saque de 10.000 Kz registado com sucesso! Saldo reservado para processamento.');
      setBeneficiaryName('');
      setBeneficiaryPhone('');
      setBeneficiaryIban('');
      fetchWalletData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao submeter pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <WalletIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              Carteira & Gestão de Prémios
            </h3>
            <p className="text-xs text-slate-400">
              Controlo rigoroso de saldos, vitórias conquistadas e pedidos de levantamento
            </p>
          </div>
        </div>

        {/* Wallet Balances Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {/* Disponível para Saque */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disponível para Saque
            </span>
            <div className="mt-2">
              <span data-tabular="true" className="text-xl sm:text-2xl font-mono font-bold text-white">
                {(wallet?.availableBalance || 0).toLocaleString('pt-AO')} Kz
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Prémios validados prontos</span>
          </div>

          {/* Pendente de Validação */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pendente de Validação
            </span>
            <div className="mt-2">
              <span data-tabular="true" className="text-xl sm:text-2xl font-mono font-bold text-amber-300">
                {(wallet?.pendingValidationBalance || 0).toLocaleString('pt-AO')} Kz
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Vitórias em auditoria</span>
          </div>

          {/* Saques Pendentes */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <ArrowDownCircle className="w-3.5 h-3.5" />
              Saques Pendentes
            </span>
            <div className="mt-2">
              <span data-tabular="true" className="text-xl sm:text-2xl font-mono font-bold text-sky-300">
                {(wallet?.pendingWithdrawals || 0).toLocaleString('pt-AO')} Kz
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Saldo reservado p/ envio</span>
          </div>

          {/* Total Conquistado */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Conquistado</span>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">
              {(wallet?.totalEarned || 0).toLocaleString('pt-AO')} Kz
            </div>
          </div>

          {/* Total Pago Efetivamente */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Efetivamente Pago</span>
            <div className="text-sm font-mono font-bold text-emerald-300 mt-1">
              {(wallet?.totalPaid || 0).toLocaleString('pt-AO')} Kz
            </div>
          </div>

          {/* Regra Fixa de Saque */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col justify-center">
            <span className="text-[10px] text-amber-400/90 uppercase font-semibold">Regra de Levantamento</span>
            <span className="text-xs font-mono font-medium text-slate-300 mt-0.5">Exatamente 10.000 Kz / Saque</span>
          </div>
        </div>

        {/* Withdrawal Section */}
        <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-amber-400" />
              Solicitar Levantamento de Prémio
            </h4>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/30">
              Valor Fixo: 10.000 Kz
            </span>
          </div>

          {!canWithdraw && (
            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 mb-4 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Aviso de Levantamento:</strong> Para solicitar um saque, precisas de ter pelo menos 10.000 Kz de saldo disponível. Cada levantamento é de exatamente 10.000 Kz.
                <div className="text-[11px] text-slate-400 mt-1">
                  Saldo disponível atual: {(wallet?.availableBalance || 0).toLocaleString('pt-AO')} Kz. Resolve mais sessões para acumular 10.000 Kz!
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs mb-4">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs mb-4">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleRequestWithdrawal} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor do Saque (Bloqueado)
                </label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value="10.000 Kz (Fixo)"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-sm font-mono font-bold text-amber-400 cursor-not-allowed opacity-90"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Titular da Conta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo titular Multicaixa"
                  value={beneficiaryName}
                  onChange={e => setBeneficiaryName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número de Telefone Multicaixa Express *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 923 000 000"
                  value={beneficiaryPhone}
                  onChange={e => setBeneficiaryPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  IBAN Bancário Angolano (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="AO06 0000 0000 0000 0000 0"
                  value={beneficiaryIban}
                  onChange={e => setBeneficiaryIban(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canWithdraw || isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {isSubmitting ? 'A processar pedido...' : 'SOLICITAR SAQUE (10.000 Kz)'}
            </button>
          </form>
        </div>

        {/* Withdrawal Requests History */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Histórico dos Teus Pedidos de Saque
          </h4>

          {withdrawals.length === 0 ? (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
              Nenhum pedido de saque solicitado até ao momento.
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map(w => {
                const isPaid = w.status === 'Pago';
                const isRejected = w.status === 'Rejeitado';
                const isProcessing = w.status === 'Em processamento';

                return (
                  <div
                    key={w.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">10.000 Kz</span>
                        <span className="text-slate-400">· {w.beneficiaryName} ({w.beneficiaryPhone})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(w.createdAt).toLocaleDateString('pt-AO')} às{' '}
                        {new Date(w.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                        {w.proofRef && <span className="ml-1 text-slate-400 font-mono">· Ref: {w.proofRef}</span>}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          isPaid
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isRejected
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : isProcessing
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transactions ledger */}
        <div className="space-y-3 mt-6 pt-6 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Movimentos Financeiros da Conta
          </h4>

          {transactions.length === 0 ? (
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
              Nenhuma movimentação financeira registada.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {transactions.map(tx => (
                <div
                  key={tx.id}
                  className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="text-slate-300 font-medium">{tx.description}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(tx.createdAt).toLocaleDateString('pt-AO')}
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold ${
                      tx.type === 'prize_won' || tx.type === 'prize_validated' || tx.type === 'withdrawal_refunded'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {tx.amount.toLocaleString('pt-AO')} Kz
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
