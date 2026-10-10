import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Shield,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  AlertCircle,
  Eye,
  FileText,
  UserX,
  UserCheck,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import {
  AdminMetrics,
  EntryPayment,
  GameSession,
  WithdrawalRequest,
  User,
  AuditLog,
} from '../types/index.ts';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onActionCompleted?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  token,
  onActionCompleted,
}) => {
  const [activeTab, setActiveTab] = useState<'kpis' | 'payments' | 'sessions' | 'withdrawals' | 'users' | 'audit'>('kpis');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [payments, setPayments] = useState<EntryPayment[]>([]);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<Array<User & { wallet: { availableBalance: number; pendingValidationBalance: number } }>>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Inspection modal for moves
  const [inspectingSession, setInspectingSession] = useState<GameSession | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, pRes, sRes, wRes, uRes, aRes] = await Promise.all([
        fetch('/api/admin/metrics', { headers }),
        fetch('/api/admin/payments', { headers }),
        fetch('/api/admin/sessions', { headers }),
        fetch('/api/admin/withdrawals', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
      ]);

      if (mRes.ok) setMetrics((await mRes.json()).metrics);
      if (pRes.ok) setPayments((await pRes.json()).payments);
      if (sRes.ok) setSessions((await sRes.json()).sessions);
      if (wRes.ok) setWithdrawals((await wRes.json()).withdrawals);
      if (uRes.ok) setUsers((await uRes.json()).users);
      if (aRes.ok) setAuditLogs((await aRes.json()).auditLogs);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
      setActionMsg(null);
    }
  }, [isOpen, fetchAllData]);

  if (!isOpen) return null;

  const showSuccess = (text: string) => {
    setActionMsg({ text, type: 'success' });
    fetchAllData();
    if (onActionCompleted) onActionCompleted();
    setTimeout(() => setActionMsg(null), 4000);
  };

  const showError = (text: string) => {
    setActionMsg({ text, type: 'error' });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // Payment actions
  const handleApprovePayment = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Pagamento aprovado com sucesso! Sessão de 30 minutos ativada.');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao aprovar');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt('Motivo da rejeição:', 'Comprovativo não identificado no extrato');
    if (reason === null) return;
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess('Pagamento rejeitado.');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao rejeitar');
    }
  };

  // Session victory audit
  const handleValidateVictory = async (sessionId: string, approve: boolean) => {
    const notes = approve ? undefined : prompt('Motivo da rejeição da vitória:', 'Sequência de movimentos inválida');
    if (!approve && notes === null) return;

    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/validate-victory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ approve, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(approve ? 'Vitória validada! 2.000 Kz transferidos para saldo disponível.' : 'Vitória rejeitada.');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao validar vitória');
    }
  };

  // Withdrawal actions
  const handleUpdateWithdrawal = async (id: string, status: 'Em processamento' | 'Pago' | 'Rejeitado') => {
    let proofRef: string | undefined;
    let reason: string | undefined;

    if (status === 'Pago') {
      const inputRef = prompt('Referência de Transferência Multicaixa Express:', `MCX-${Date.now().toString().slice(-6)}`);
      if (inputRef === null) return;
      proofRef = inputRef;
    } else if (status === 'Rejeitado') {
      const inputReason = prompt('Motivo da rejeição (o saldo de 10.000 Kz será devolvido à carteira):', 'Telefone de destino incorreto');
      if (inputReason === null) return;
      reason = inputReason;
    }

    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, proofRef, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(`Saque atualizado para "${status}".`);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro ao atualizar saque');
    }
  };

  // User suspension
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showSuccess(`Conta ${nextStatus === 'suspended' ? 'suspensa' : 'reativada'}.`);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Erro');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.location.href = '/api/admin/export-csv';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-7 text-slate-100 max-h-[94vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Painel Administrativo Oficial
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Multicaixa Control
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria de sessões, validação de pagamentos, prémios e liquidação de saques de 10.000 Kz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              title="Atualizar dados"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action feedback toast */}
        {actionMsg && (
          <div
            className={`my-3 p-3 rounded-xl text-xs flex items-center gap-2 shrink-0 ${
              actionMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                : 'bg-red-950/80 border border-red-700 text-red-300'
            }`}
          >
            {actionMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{actionMsg.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 py-3 border-b border-slate-800 shrink-0 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'kpis' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Balanço Contabilístico
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'payments' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Pagamentos (100 Kz)
            {payments.filter(p => p.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'sessions' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Sessões & Vitórias (2.000 Kz)
            {sessions.filter(s => s.status === 'won' && s.prizeStatus === 'pending_validation').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'withdrawals' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Saques (10.000 Kz)
            {withdrawals.filter(w => w.status === 'Pendente').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'users' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Jogadores Registados
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'audit' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Auditoria & Logs
          </button>
        </div>

        {/* Tab Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          {/* TAB 1: KPIS & ACCOUNTING */}
          {activeTab === 'kpis' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Quadro Contabilístico Oficial</h3>
                  <p className="text-xs text-slate-400">
                    Discriminação financeira rigorosa entre receitas de entrada, passivos e prémios liquidados
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar Relatório CSV
                </button>
              </div>

              {/* Strict Financial Ledger distinctions */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* 1. Receita de Entradas */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-emerald-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    1. Receitas de Entrada (100 Kz)
                  </span>
                  <div data-tabular="true" className="text-2xl font-mono font-bold text-white mt-1">
                    {(metrics?.totalRevenueEntry || 0).toLocaleString('pt-AO')} Kz
                  </div>
                  <span className="text-[10px] text-slate-400">Total arrecadado em sessões</span>
                </div>

                {/* 2. Prémios Conquistados */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-amber-400 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" />
                    2. Prémios Conquistados (2.000 Kz)
                  </span>
                  <div data-tabular="true" className="text-2xl font-mono font-bold text-amber-300 mt-1">
                    {(metrics?.totalPrizesWon || 0).toLocaleString('pt-AO')} Kz
                  </div>
                  <span className="text-[10px] text-slate-400">Total ganho por jogadores</span>
                </div>

                {/* 3. Prémios Pendentes de Validação */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-yellow-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    3. Pendentes de Validação
                  </span>
                  <div data-tabular="true" className="text-2xl font-mono font-bold text-yellow-300 mt-1">
                    {(metrics?.pendingValidationPrizes || 0).toLocaleString('pt-AO')} Kz
                  </div>
                  <span className="text-[10px] text-slate-400">Aguardando auditoria do admin</span>
                </div>

                {/* 4. Prémios Disponíveis p/ Saque */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-sky-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    4. Saldo Disponível p/ Saque
                  </span>
                  <div data-tabular="true" className="text-2xl font-mono font-bold text-sky-300 mt-1">
                    {(metrics?.availablePrizes || 0).toLocaleString('pt-AO')} Kz
                  </div>
                  <span className="text-[10px] text-slate-400">Passivo acumulado nas carteiras</span>
                </div>

                {/* 5. Saques Solicitados */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-purple-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    5. Saques Solicitados
                  </span>
                  <div data-tabular="true" className="text-2xl font-mono font-bold text-purple-300 mt-1">
                    {(metrics?.requestedWithdrawals || 0).toLocaleString('pt-AO')} Kz
                  </div>
                  <span className="text-[10px] text-slate-400">Pedidos de 10.000 Kz em fila</span>
                </div>

                {/* 6. Prémios Efetivamente Pagos */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    6. Efetivamente Pagos
                  </span>
                  <div data-tabular="true" className="text-2xl font-mono font-bold text-emerald-300 mt-1">
                    {(metrics?.effectivelyPaidPrizes || 0).toLocaleString('pt-AO')} Kz
                  </div>
                  <span className="text-[10px] text-slate-400">Transferências confirmadas</span>
                </div>
              </div>

              {/* Platform Accounting Note */}
              <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-200">Aviso Contabilístico:</span> O saldo contabilístico da plataforma distingue estritamente receitas recolhidas de obrigações de prémios e pedidos de levantamento pendentes. Nenhuma entrada é considerada lucro antes do fecho de obrigações de jogo.
              </div>

              {/* Operational KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Sessões Totais</span>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">{metrics?.totalSessions || 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-emerald-400">Vitórias Registadas</span>
                  <div className="text-lg font-mono font-bold text-emerald-300 mt-0.5">{metrics?.wonSessions || 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Sessões Expiradas</span>
                  <div className="text-lg font-mono font-bold text-slate-300 mt-0.5">{metrics?.expiredSessions || 0}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Jogadores Registados</span>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">{metrics?.totalPlayers || 0}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS APPROVAL */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Comprovativos de Entrada de 100 Kz (Multicaixa Express)</h3>
                <span className="text-xs text-slate-400">Número da Plataforma: 944 636 057</span>
              </div>

              {payments.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  Nenhum pagamento registado ainda.
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.map(p => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">100 Kz</span>
                          <span className="text-white font-semibold">{p.userFullName}</span>
                          <span className="text-slate-400 font-mono">({p.userPhone})</span>
                        </div>
                        <div className="text-slate-400 mt-1">
                          Ref / Código: <span className="font-mono font-bold text-slate-200">{p.referenceCode}</span>
                          {p.proofNote && <span className="text-slate-500 ml-2">Nota: {p.proofNote}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(p.createdAt).toLocaleDateString('pt-AO')} às{' '}
                          {new Date(p.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                          {p.approvedBy && <span className="ml-2 text-emerald-400">Aprovado por: {p.approvedBy}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {p.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprovePayment(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Aprovar & Iniciar (30m)
                            </button>
                            <button
                              onClick={() => handleRejectPayment(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-semibold flex items-center gap-1 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Rejeitar
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold ${
                              p.status === 'approved'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {p.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SESSIONS & VICTORY AUDITING */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Sessões de Jogo e Auditoria de Vitórias (2.000 Kz)</h3>

              {sessions.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  Nenhuma sessão criada até ao momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map(s => {
                    const isWon = s.status === 'won';
                    const isPendingAudit = isWon && s.prizeStatus === 'pending_validation';
                    const isValidated = isWon && s.prizeStatus === 'validated';

                    return (
                      <div
                        key={s.id}
                        className={`p-3.5 bg-slate-950 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isPendingAudit ? 'border-amber-500/60' : 'border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{s.userFullName}</span>
                            <span className="text-slate-400 font-mono">({s.userPhone})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isWon
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : s.status === 'active'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-slate-900 text-slate-400 border border-slate-800'
                              }`}
                            >
                              {s.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-slate-400 mt-1 flex items-center gap-3">
                            <span>Movimentos efetuados: <strong className="text-white">{s.moves.length}</strong></span>
                            <span>Tempo configurado: 30:00</span>
                            {s.solvedAt && (
                              <span className="text-amber-300 font-semibold">
                                Resolvido em: {new Date(s.solvedAt).toLocaleTimeString('pt-AO')}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Início: {new Date(s.startedAt).toLocaleString('pt-AO')} · Expira: {new Date(s.expiresAt).toLocaleString('pt-AO')}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => setInspectingSession(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Movimentos ({s.moves.length})
                          </button>

                          {isPendingAudit && (
                            <>
                              <button
                                onClick={() => handleValidateVictory(s.id, true)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Validar Prémio (2.000 Kz)
                              </button>
                              <button
                                onClick={() => handleValidateVictory(s.id, false)}
                                className="px-2.5 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 font-semibold flex items-center gap-1 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Rejeitar
                              </button>
                            </>
                          )}

                          {isValidated && (
                            <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold text-[11px]">
                              Validado: 2.000 Kz Creditados
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WITHDRAWALS (10.000 Kz) */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Pedidos de Levantamento de 10.000 Kz</h3>
                <span className="text-xs font-mono font-semibold text-amber-400">
                  Regra Absoluta: Mínimo e Máximo = 10.000 Kz
                </span>
              </div>

              {withdrawals.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  Nenhum pedido de saque solicitado.
                </div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.map(w => {
                    const isPending = w.status === 'Pendente';
                    const isProcessing = w.status === 'Em processamento';

                    return (
                      <div
                        key={w.id}
                        className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400 text-sm">
                              {w.amount.toLocaleString('pt-AO')} Kz
                            </span>
                            <span className="font-semibold text-white">{w.beneficiaryName}</span>
                            <span className="text-slate-400 font-mono">({w.beneficiaryPhone})</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                w.status === 'Pago'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : w.status === 'Rejeitado'
                                  ? 'bg-red-950 text-red-400 border border-red-800'
                                  : w.status === 'Em processamento'
                                  ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {w.status}
                            </span>
                          </div>

                          <div className="text-slate-400 mt-1">
                            Utilizador: <span className="text-slate-200">{w.userFullName}</span> ({w.userPhone})
                            {w.beneficiaryIban && (
                              <span className="ml-2 font-mono text-slate-300">IBAN: {w.beneficiaryIban}</span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Pedido em: {new Date(w.createdAt).toLocaleString('pt-AO')}
                            {w.proofRef && <span className="ml-2 text-emerald-400 font-mono">Ref: {w.proofRef}</span>}
                            {w.rejectedReason && <span className="ml-2 text-red-400">Motivo: {w.rejectedReason}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isPending && (
                            <button
                              onClick={() => handleUpdateWithdrawal(w.id, 'Em processamento')}
                              className="px-3 py-1.5 rounded-lg bg-sky-900 hover:bg-sky-800 text-sky-200 font-semibold transition-colors"
                            >
                              Em Processamento
                            </button>
                          )}

                          {(isPending || isProcessing) && (
                            <>
                              <button
                                onClick={() => handleUpdateWithdrawal(w.id, 'Pago')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Confirmar Pagamento (Pago)
                              </button>
                              <button
                                onClick={() => handleUpdateWithdrawal(w.id, 'Rejeitado')}
                                className="px-2.5 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-semibold flex items-center gap-1 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Rejeitar & Devolver
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PLAYERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Utilizadores e Saldos Individuais</h3>

              <div className="space-y-2">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{u.fullName}</span>
                        <span className="text-slate-400 font-mono">({u.phone})</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-purple-950 text-purple-400 border border-purple-800'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-red-950 text-red-400'
                          }`}
                        >
                          {u.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </div>

                      <div className="text-slate-400 mt-1 flex items-center gap-3">
                        <span>
                          Saldo Disponível:{' '}
                          <strong className="text-emerald-400 font-mono">
                            {(u.wallet?.availableBalance || 0).toLocaleString('pt-AO')} Kz
                          </strong>
                        </span>
                        <span>
                          Pendente:{' '}
                          <strong className="text-amber-400 font-mono">
                            {(u.wallet?.pendingValidationBalance || 0).toLocaleString('pt-AO')} Kz
                          </strong>
                        </span>
                      </div>
                    </div>

                    {u.role !== 'admin' && (
                      <div className="self-end sm:self-center">
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            u.status === 'active'
                              ? 'bg-red-950 hover:bg-red-900 text-red-300 border border-red-800'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {u.status === 'active' ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              Suspender Conta
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Reativar Conta
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Livro de Auditoria do Sistema</h3>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-500">
                  Nenhum registo de auditoria criado.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {auditLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400">{log.action}</span>
                          <span className="text-slate-400">por {log.adminName}</span>
                          <span className="text-slate-500 font-mono text-[10px]">[{log.targetType}:{log.targetId}]</span>
                        </div>
                        <div className="text-slate-300 mt-1">{log.details}</div>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {new Date(log.createdAt).toLocaleString('pt-AO')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Move inspection dialog */}
        {inspectingSession && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">
                  Auditoria de Movimentos: {inspectingSession.userFullName}
                </h4>
                <button
                  onClick={() => setInspectingSession(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Mistura Inicial (Scramble):</span>
                <div className="mt-1 p-2 bg-slate-950 rounded font-mono text-[11px] text-amber-400 break-words">
                  {inspectingSession.initialScramble.join(' ')}
                </div>
              </div>

              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">
                  Sequência de Movimentos ({inspectingSession.moves.length}):
                </span>
                <div className="mt-1 p-2 bg-slate-950 rounded font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto break-words">
                  {inspectingSession.moves.length > 0
                    ? inspectingSession.moves.map(m => m.move).join(' ')
                    : 'Nenhum movimento realizado ainda nesta sessão.'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingSession(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
