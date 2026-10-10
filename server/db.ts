import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Wallet,
  EntryPayment,
  GameSession,
  WithdrawalRequest,
  TransactionLedger,
  AuditLog,
  AdminMetrics,
} from '../src/types/index.ts';
import { generateScramble, applyMove, applyMoves, isCubeSolved, SOLVED_STATE } from '../src/utils/cubeLogic.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_cubo_salt_2026').digest('hex');
}

interface DBData {
  users: User[];
  passwords: Record<string, string>; // userId -> hash
  wallets: Record<string, Wallet>;    // userId -> Wallet
  payments: EntryPayment[];
  sessions: GameSession[];
  withdrawals: WithdrawalRequest[];
  transactions: TransactionLedger[];
  auditLogs: AuditLog[];
}

const DEFAULT_ADMIN_ID = 'usr_admin_057';
const ADMIN_PHONE = '944636057';

const initialData: DBData = {
  users: [
    {
      id: DEFAULT_ADMIN_ID,
      fullName: 'Administrador Oficial (Multicaixa)',
      phone: ADMIN_PHONE,
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ],
  passwords: {
    [DEFAULT_ADMIN_ID]: hashPassword('admin123'),
  },
  wallets: {
    [DEFAULT_ADMIN_ID]: {
      userId: DEFAULT_ADMIN_ID,
      pendingValidationBalance: 0,
      availableBalance: 0,
      totalEarned: 0,
      totalPaid: 0,
      pendingWithdrawals: 0,
      updatedAt: new Date().toISOString(),
    },
  },
  payments: [],
  sessions: [],
  withdrawals: [],
  transactions: [],
  auditLogs: [],
};

class Database {
  private data: DBData;

  constructor() {
    this.data = this.load();
  }

  private load(): DBData {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure admin exists
        if (!parsed.users.some((u: User) => u.phone === ADMIN_PHONE)) {
          parsed.users.push(initialData.users[0]);
          parsed.passwords[DEFAULT_ADMIN_ID] = initialData.passwords[DEFAULT_ADMIN_ID];
          parsed.wallets[DEFAULT_ADMIN_ID] = initialData.wallets[DEFAULT_ADMIN_ID];
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading DB, initializing fallback:', err);
    }
    return { ...initialData };
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving DB:', err);
    }
  }

  // --- USERS ---
  findUserByPhone(phone: string): User | undefined {
    const cleanPhone = phone.replace(/\s+/g, '');
    return this.data.users.find(u => u.phone.replace(/\s+/g, '') === cleanPhone);
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getAllUsers(): User[] {
    return [...this.data.users];
  }

  verifyPassword(userId: string, pass: string): boolean {
    const hashed = hashPassword(pass);
    return this.data.passwords[userId] === hashed;
  }

  createUser(fullName: string, phone: string, passwordPlain: string, role: 'player' | 'admin' = 'player'): User {
    const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const user: User = {
      id,
      fullName: fullName.trim(),
      phone: phone.replace(/\s+/g, ''),
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.data.passwords[id] = hashPassword(passwordPlain);
    this.data.wallets[id] = {
      userId: id,
      pendingValidationBalance: 0,
      availableBalance: 0,
      totalEarned: 0,
      totalPaid: 0,
      pendingWithdrawals: 0,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return user;
  }

  updateUserStatus(userId: string, status: 'active' | 'suspended', adminId: string, adminName: string): User | null {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.status = status;
    this.addAuditLog(adminId, adminName, 'UPDATE_USER_STATUS', 'USER', userId, `Status alterado para ${status}`);
    this.save();
    return user;
  }

  // --- WALLET ---
  getWallet(userId: string): Wallet {
    if (!this.data.wallets[userId]) {
      this.data.wallets[userId] = {
        userId,
        pendingValidationBalance: 0,
        availableBalance: 0,
        totalEarned: 0,
        totalPaid: 0,
        pendingWithdrawals: 0,
        updatedAt: new Date().toISOString(),
      };
      this.save();
    }
    return this.data.wallets[userId];
  }

  // --- PAYMENTS ---
  createPayment(userId: string, referenceCode: string, proofNote?: string): EntryPayment {
    const user = this.getUserById(userId);
    if (!user) throw new Error('Utilizador não encontrado');

    const cleanRef = referenceCode.trim();
    // Anti-fraud: Check for duplicate reference code
    const duplicate = this.data.payments.find(
      p => p.referenceCode.toLowerCase() === cleanRef.toLowerCase() && p.status !== 'rejected'
    );
    if (duplicate) {
      throw new Error('Este código de referência / comprovativo já foi submetido na plataforma.');
    }

    const payment: EntryPayment = {
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      userId,
      userFullName: user.fullName,
      userPhone: user.phone,
      amount: 100, // Fixed 100 Kz
      method: 'Multicaixa Express',
      destinationPhone: '944 636 057',
      referenceCode: cleanRef,
      proofNote: proofNote?.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.data.payments.push(payment);
    this.save();
    return payment;
  }

  listPayments(): EntryPayment[] {
    return [...this.data.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  approvePayment(paymentId: string, adminId: string, adminName: string): { payment: EntryPayment; session: GameSession } {
    const payment = this.data.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error('Pagamento não encontrado');
    if (payment.status === 'approved') throw new Error('Pagamento já foi aprovado anteriormente');

    payment.status = 'approved';
    payment.approvedAt = new Date().toISOString();
    payment.approvedBy = adminName;

    // Create single authoritative 30-min game session
    const session = this.createSession(payment.userId, payment.id);
    payment.sessionId = session.id;

    // Record ledger
    this.data.transactions.push({
      id: 'tx_' + Date.now(),
      userId: payment.userId,
      type: 'payment_entry',
      amount: 100,
      description: 'Pagamento de entrada da sessão (100 Kz - Multicaixa Express)',
      referenceId: payment.id,
      createdAt: new Date().toISOString(),
    });

    this.addAuditLog(adminId, adminName, 'APPROVE_PAYMENT', 'PAYMENT', paymentId, `Pagamento 100 Kz aprovado para ${payment.userFullName}`);
    this.save();
    return { payment, session };
  }

  rejectPayment(paymentId: string, adminId: string, adminName: string, reason?: string): EntryPayment {
    const payment = this.data.payments.find(p => p.id === paymentId);
    if (!payment) throw new Error('Pagamento não encontrado');
    payment.status = 'rejected';
    this.addAuditLog(adminId, adminName, 'REJECT_PAYMENT', 'PAYMENT', paymentId, `Rejeitado: ${reason || 'Comprovativo inválido'}`);
    this.save();
    return payment;
  }

  // --- SESSIONS ---
  createSession(userId: string, paymentId: string): GameSession {
    const user = this.getUserById(userId);
    if (!user) throw new Error('Utilizador não encontrado');

    // Generate valid random scramble (20 moves)
    const scramble = generateScramble(20);
    const scrambledState = applyMoves(SOLVED_STATE, scramble);

    const now = Date.now();
    const durationSeconds = 1800; // 30 minutes
    const expiresAt = new Date(now + durationSeconds * 1000).toISOString();

    const session: GameSession = {
      id: 'ses_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      userId,
      userFullName: user.fullName,
      userPhone: user.phone,
      paymentId,
      status: 'active',
      initialScramble: scramble,
      currentCubeState: scrambledState,
      moves: [],
      durationSeconds,
      startedAt: new Date(now).toISOString(),
      expiresAt,
      remainingSeconds: durationSeconds,
      prizeAmount: 2000,
      prizeStatus: 'pending_validation',
    };

    this.data.sessions.push(session);
    this.save();
    return session;
  }

  getSession(sessionId: string): GameSession | undefined {
    this.checkSessionExpirations();
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (session) {
      session.remainingSeconds = this.calculateRemainingSeconds(session);
    }
    return session;
  }

  getActiveSessionForUser(userId: string): GameSession | undefined {
    this.checkSessionExpirations();
    const session = this.data.sessions.find(s => s.userId === userId && s.status === 'active');
    if (session) {
      session.remainingSeconds = this.calculateRemainingSeconds(session);
    }
    return session;
  }

  getUserSessions(userId: string): GameSession[] {
    this.checkSessionExpirations();
    return this.data.sessions
      .filter(s => s.userId === userId)
      .map(s => ({ ...s, remainingSeconds: this.calculateRemainingSeconds(s) }))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  listAllSessions(): GameSession[] {
    this.checkSessionExpirations();
    return this.data.sessions
      .map(s => ({ ...s, remainingSeconds: this.calculateRemainingSeconds(s) }))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  private calculateRemainingSeconds(session: GameSession): number {
    if (session.status !== 'active') return 0;
    const expiry = new Date(session.expiresAt).getTime();
    const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    return remaining;
  }

  checkSessionExpirations(): void {
    const now = Date.now();
    let updated = false;
    for (const session of this.data.sessions) {
      if (session.status === 'active') {
        const expiry = new Date(session.expiresAt).getTime();
        if (now >= expiry) {
          session.status = 'expired';
          session.remainingSeconds = 0;
          updated = true;
        }
      }
    }
    if (updated) this.save();
  }

  applyMoveToSession(sessionId: string, move: string): GameSession {
    this.checkSessionExpirations();
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.status !== 'active') throw new Error('Esta sessão já não está ativa');

    // Calculate remaining time
    const remaining = this.calculateRemainingSeconds(session);
    if (remaining <= 0) {
      session.status = 'expired';
      session.remainingSeconds = 0;
      this.save();
      throw new Error('O tempo terminou! Sessão encerrada.');
    }

    // Apply move to state
    session.currentCubeState = applyMove(session.currentCubeState, move);
    session.moves.push({ move, timestamp: Date.now() });
    session.remainingSeconds = remaining;

    this.save();
    return session;
  }

  claimVictory(sessionId: string): { success: boolean; session: GameSession; message: string } {
    this.checkSessionExpirations();
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.status !== 'active') throw new Error('Sessão não está ativa para reivindicação');

    const remaining = this.calculateRemainingSeconds(session);
    if (remaining <= 0) {
      session.status = 'expired';
      this.save();
      throw new Error('O tempo terminou antes da resolução do cubo');
    }

    // Verify on server whether cube is solved!
    const isSolved = isCubeSolved(session.currentCubeState);
    if (!isSolved) {
      throw new Error('O cubo ainda não está resolvido corretamente!');
    }

    session.status = 'won';
    session.solvedAt = new Date().toISOString();
    session.prizeStatus = 'pending_validation';

    // Credit to wallet as pending validation
    const wallet = this.getWallet(session.userId);
    wallet.pendingValidationBalance += session.prizeAmount; // 2.000 Kz
    wallet.totalEarned += session.prizeAmount;
    wallet.updatedAt = new Date().toISOString();

    // Transaction ledger entry
    this.data.transactions.push({
      id: 'tx_' + Date.now(),
      userId: session.userId,
      type: 'prize_won',
      amount: session.prizeAmount,
      description: `Prémio de vitória de ${session.prizeAmount} Kz (Pendente de Validação Administrativa)`,
      referenceId: session.id,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return {
      success: true,
      session,
      message: 'PARABÉNS! RESOLVESTE O CUBO MÁGICO! Prémio conquistado: 2.000 Kz (Pendente de Validação).',
    };
  }

  demoSolveSession(sessionId: string): { success: boolean; session: GameSession; message: string } {
    this.checkSessionExpirations();
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.status !== 'active') throw new Error('Sessão não está ativa');

    session.currentCubeState = SOLVED_STATE;
    return this.claimVictory(sessionId);
  }

  validateVictory(sessionId: string, adminId: string, adminName: string, approve: boolean, notes?: string): GameSession {
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sessão não encontrada');
    if (session.status !== 'won') throw new Error('Sessão não possui vitória registada');
    if (session.prizeStatus !== 'pending_validation') throw new Error('Prémio já foi auditado');

    const wallet = this.getWallet(session.userId);

    if (approve) {
      session.prizeStatus = 'validated';
      session.validatedAt = new Date().toISOString();
      session.validatedBy = adminName;

      // Transfer from pending to available
      wallet.pendingValidationBalance = Math.max(0, wallet.pendingValidationBalance - session.prizeAmount);
      wallet.availableBalance += session.prizeAmount;
      wallet.updatedAt = new Date().toISOString();

      this.data.transactions.push({
        id: 'tx_' + Date.now(),
        userId: session.userId,
        type: 'prize_validated',
        amount: session.prizeAmount,
        description: `Prémio de vitória validado pelo administrador: ${session.prizeAmount} Kz creditados no saldo disponível`,
        referenceId: session.id,
        createdAt: new Date().toISOString(),
      });

      this.addAuditLog(adminId, adminName, 'VALIDATE_VICTORY', 'SESSION', session.id, `Vitória aprovada. 2.000 Kz transferidos para saldo disponível de ${session.userFullName}`);
    } else {
      session.prizeStatus = 'rejected';
      session.validatedAt = new Date().toISOString();
      session.validatedBy = adminName;

      // Deduct from pending and total earned
      wallet.pendingValidationBalance = Math.max(0, wallet.pendingValidationBalance - session.prizeAmount);
      wallet.totalEarned = Math.max(0, wallet.totalEarned - session.prizeAmount);
      wallet.updatedAt = new Date().toISOString();

      this.addAuditLog(adminId, adminName, 'REJECT_VICTORY', 'SESSION', session.id, `Vitória rejeitada: ${notes || 'Irregularidade nos movimentos'}`);
    }

    this.save();
    return session;
  }

  // --- WITHDRAWALS (SAQUES) ---
  // Mandatory rule: Minimum and Maximum is EXACTLY 10.000 Kz!
  requestWithdrawal(userId: string, beneficiaryName: string, beneficiaryPhone: string, beneficiaryIban?: string): WithdrawalRequest {
    const wallet = this.getWallet(userId);
    const user = this.getUserById(userId);
    if (!user) throw new Error('Utilizador não encontrado');

    const FIXED_AMOUNT = 10000;

    if (wallet.availableBalance < FIXED_AMOUNT) {
      throw new Error(
        'Para solicitar um saque, precisas de ter pelo menos 10.000 Kz de saldo disponível. Cada levantamento é de exatamente 10.000 Kz.'
      );
    }

    // Reserve balance atomically: deduct from available, add to pendingWithdrawals
    wallet.availableBalance -= FIXED_AMOUNT;
    wallet.pendingWithdrawals += FIXED_AMOUNT;
    wallet.updatedAt = new Date().toISOString();

    const withdrawal: WithdrawalRequest = {
      id: 'wd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      userId,
      userFullName: user.fullName,
      userPhone: user.phone,
      amount: FIXED_AMOUNT,
      beneficiaryName: beneficiaryName.trim(),
      beneficiaryPhone: beneficiaryPhone.trim(),
      beneficiaryIban: beneficiaryIban?.trim(),
      status: 'Pendente',
      createdAt: new Date().toISOString(),
    };

    this.data.withdrawals.push(withdrawal);

    this.data.transactions.push({
      id: 'tx_' + Date.now(),
      userId,
      type: 'withdrawal_reserved',
      amount: FIXED_AMOUNT,
      description: `Pedido de saque de 10.000 Kz registado (Saldo reservado para transferência)`,
      referenceId: withdrawal.id,
      createdAt: new Date().toISOString(),
    });

    this.save();
    return withdrawal;
  }

  listWithdrawals(): WithdrawalRequest[] {
    return [...this.data.withdrawals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUserWithdrawals(userId: string): WithdrawalRequest[] {
    return this.data.withdrawals
      .filter(w => w.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateWithdrawalStatus(
    withdrawalId: string,
    newStatus: 'Em processamento' | 'Pago' | 'Rejeitado',
    adminId: string,
    adminName: string,
    proofRef?: string,
    rejectedReason?: string
  ): WithdrawalRequest {
    const withdrawal = this.data.withdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) throw new Error('Pedido de saque não encontrado');
    if (withdrawal.status === 'Pago' || withdrawal.status === 'Rejeitado') {
      throw new Error(`Este saque já se encontra no estado final: ${withdrawal.status}`);
    }

    const wallet = this.getWallet(withdrawal.userId);

    if (newStatus === 'Em processamento') {
      withdrawal.status = 'Em processamento';
      withdrawal.processedAt = new Date().toISOString();
      this.addAuditLog(adminId, adminName, 'PROCESS_WITHDRAWAL', 'WITHDRAWAL', withdrawal.id, 'Saque colocado em processamento bancário');
    } else if (newStatus === 'Pago') {
      withdrawal.status = 'Pago';
      withdrawal.paidAt = new Date().toISOString();
      withdrawal.proofRef = proofRef || `MCX-${Date.now()}`;

      // Finalize wallet accounting
      wallet.pendingWithdrawals = Math.max(0, wallet.pendingWithdrawals - withdrawal.amount);
      wallet.totalPaid += withdrawal.amount;
      wallet.updatedAt = new Date().toISOString();

      this.data.transactions.push({
        id: 'tx_' + Date.now(),
        userId: withdrawal.userId,
        type: 'withdrawal_paid',
        amount: withdrawal.amount,
        description: `Saque de 10.000 Kz pago via Multicaixa Express (Ref: ${withdrawal.proofRef})`,
        referenceId: withdrawal.id,
        createdAt: new Date().toISOString(),
      });

      this.addAuditLog(adminId, adminName, 'PAY_WITHDRAWAL', 'WITHDRAWAL', withdrawal.id, `Saque pago de 10.000 Kz a ${withdrawal.beneficiaryName}`);
    } else if (newStatus === 'Rejeitado') {
      withdrawal.status = 'Rejeitado';
      withdrawal.rejectedReason = rejectedReason || 'Dados bancários ou de contacto incorretos';

      // Refund reserved balance back to available balance!
      wallet.pendingWithdrawals = Math.max(0, wallet.pendingWithdrawals - withdrawal.amount);
      wallet.availableBalance += withdrawal.amount;
      wallet.updatedAt = new Date().toISOString();

      this.data.transactions.push({
        id: 'tx_' + Date.now(),
        userId: withdrawal.userId,
        type: 'withdrawal_refunded',
        amount: withdrawal.amount,
        description: `Devolução de 10.000 Kz ao saldo disponível por rejeição do pedido de saque`,
        referenceId: withdrawal.id,
        createdAt: new Date().toISOString(),
      });

      this.addAuditLog(adminId, adminName, 'REJECT_WITHDRAWAL', 'WITHDRAWAL', withdrawal.id, `Saque rejeitado e saldo devolvido: ${withdrawal.rejectedReason}`);
    }

    this.save();
    return withdrawal;
  }

  // --- AUDIT & METRICS ---
  addAuditLog(adminId: string, adminName: string, action: string, targetType: string, targetId: string, details: string): void {
    this.data.auditLogs.unshift({
      id: 'aud_' + Date.now(),
      adminId,
      adminName,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    // Keep max 500 audit logs
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.length = 500;
    }
  }

  getAuditLogs(): AuditLog[] {
    return [...this.data.auditLogs];
  }

  getUserTransactions(userId: string): TransactionLedger[] {
    return this.data.transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAllTransactions(): TransactionLedger[] {
    return [...this.data.transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getAdminMetrics(): AdminMetrics {
    this.checkSessionExpirations();

    const approvedPayments = this.data.payments.filter(p => p.status === 'approved');
    const totalRevenueEntry = approvedPayments.reduce((acc, p) => acc + p.amount, 0);

    const wonSessions = this.data.sessions.filter(s => s.status === 'won');
    const totalPrizesWon = wonSessions.reduce((acc, s) => acc + s.prizeAmount, 0);

    const pendingValidationPrizes = wonSessions
      .filter(s => s.prizeStatus === 'pending_validation')
      .reduce((acc, s) => acc + s.prizeAmount, 0);

    // Sum of all wallets available
    const availablePrizes = Object.values(this.data.wallets).reduce((acc, w) => acc + w.availableBalance, 0);

    // Pending withdrawals
    const requestedWithdrawals = this.data.withdrawals
      .filter(w => w.status === 'Pendente' || w.status === 'Em processamento')
      .reduce((acc, w) => acc + w.amount, 0);

    // Paid withdrawals
    const effectivelyPaidPrizes = this.data.withdrawals
      .filter(w => w.status === 'Pago')
      .reduce((acc, w) => acc + w.amount, 0);

    const totalSessions = this.data.sessions.length;
    const activeSessions = this.data.sessions.filter(s => s.status === 'active').length;
    const expiredSessions = this.data.sessions.filter(s => s.status === 'expired').length;
    const totalPlayers = this.data.users.filter(u => u.role === 'player').length;

    // Net accounting: Revenue collected minus money paid out and liabilities
    const netAccountingBalance = totalRevenueEntry - effectivelyPaidPrizes - requestedWithdrawals - availablePrizes;

    return {
      totalRevenueEntry,
      totalPrizesWon,
      pendingValidationPrizes,
      availablePrizes,
      requestedWithdrawals,
      effectivelyPaidPrizes,
      totalSessions,
      activeSessions,
      wonSessions: wonSessions.length,
      expiredSessions,
      totalPlayers,
      netAccountingBalance,
    };
  }
}

export const db = new Database();
