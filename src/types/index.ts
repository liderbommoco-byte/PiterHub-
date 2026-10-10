export type UserRole = 'player' | 'admin';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface Wallet {
  userId: string;
  pendingValidationBalance: number; // 2.000 Kz prizes waiting admin check
  availableBalance: number;         // validated prizes ready for withdrawal
  totalEarned: number;              // total prizes won
  totalPaid: number;                // total amount paid out
  pendingWithdrawals: number;       // reserved for 10.000 Kz withdrawals
  updatedAt: string;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface EntryPayment {
  id: string;
  userId: string;
  userFullName: string;
  userPhone: string;
  amount: number;                   // 100 Kz
  method: string;                   // 'Multicaixa Express'
  destinationPhone: string;         // '944 636 057'
  referenceCode: string;            // Reference or confirmation code
  proofNote?: string;
  status: PaymentStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  sessionId?: string;
}

export type SessionStatus = 'active' | 'won' | 'expired' | 'abandoned';
export type PrizeValidationStatus = 'pending_validation' | 'validated' | 'rejected';

export interface GameSession {
  id: string;
  userId: string;
  userFullName: string;
  userPhone: string;
  paymentId: string;
  status: SessionStatus;
  initialScramble: string[];
  currentCubeState: string;         // 54 character facelet string
  moves: Array<{ move: string; timestamp: number }>;
  durationSeconds: number;          // 1800 (30 minutes)
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  solvedAt?: string;
  prizeAmount: number;              // 2000 Kz
  prizeStatus: PrizeValidationStatus;
  validatedAt?: string;
  validatedBy?: string;
}

export type WithdrawalStatus = 'Pendente' | 'Em processamento' | 'Pago' | 'Rejeitado';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userFullName: string;
  userPhone: string;
  amount: number;                   // Exactly 10000 Kz
  beneficiaryName: string;
  beneficiaryPhone: string;
  beneficiaryIban?: string;
  status: WithdrawalStatus;
  notes?: string;
  proofRef?: string;
  createdAt: string;
  processedAt?: string;
  paidAt?: string;
  rejectedReason?: string;
}

export interface TransactionLedger {
  id: string;
  userId: string;
  type: 'payment_entry' | 'prize_won' | 'prize_validated' | 'withdrawal_reserved' | 'withdrawal_paid' | 'withdrawal_refunded';
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface AdminMetrics {
  totalRevenueEntry: number;        // Total 100 Kz payments
  totalPrizesWon: number;           // Total 2000 Kz won
  pendingValidationPrizes: number;  // 2000 Kz prizes waiting verification
  availablePrizes: number;          // Validated prizes ready for withdrawal
  requestedWithdrawals: number;     // Active 10000 Kz withdrawal requests
  effectivelyPaidPrizes: number;    // Confirmed paid withdrawals
  totalSessions: number;
  activeSessions: number;
  wonSessions: number;
  expiredSessions: number;
  totalPlayers: number;
  netAccountingBalance: number;     // Revenue - Paid prizes - Reserved liabilities
}
