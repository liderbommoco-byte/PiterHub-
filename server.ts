import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { User } from './src/types/index.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple Auth Middleware
interface AuthRequest extends Request {
  user?: User;
}

function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Inicie sessão para continuar.' });
  }

  const token = authHeader.split(' ')[1];
  // Simple token format: userId
  const user = db.getUserById(token);
  if (!user) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Conta suspensa. Contacte a administração.' });
  }

  req.user = user;
  next();
}

function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores da plataforma.' });
    }
    next();
  });
}

// ==========================================
// AUTH ROUTES
// ==========================================

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { fullName, phone, password } = req.body;
    if (!fullName || !phone || !password) {
      return res.status(400).json({ error: 'Preencha nome completo, telefone e palavra-passe.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
    }

    const cleanPhone = phone.replace(/\s+/g, '');
    const existing = db.findUserByPhone(cleanPhone);
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma conta associada a este número de telefone.' });
    }

    const user = db.createUser(fullName, cleanPhone, password, 'player');
    const token = user.id;
    const wallet = db.getWallet(user.id);

    return res.json({ user, token, wallet });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar conta';
    return res.status(500).json({ error: msg });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Forneça o número de telefone e palavra-passe.' });
    }

    const user = db.findUserByPhone(phone);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o telefone.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Conta suspensa. Contacte a administração.' });
    }

    const isValid = db.verifyPassword(user.id, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Palavra-passe incorreta.' });
    }

    const token = user.id;
    const wallet = db.getWallet(user.id);
    return res.json({ user, token, wallet });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao iniciar sessão';
    return res.status(500).json({ error: msg });
  }
});

app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const wallet = db.getWallet(user.id);
  const activeSession = db.getActiveSessionForUser(user.id);
  return res.json({ user, wallet, activeSession });
});

// ==========================================
// PAYMENTS (100 Kz MULTICAIXA EXPRESS)
// ==========================================

app.post('/api/payments/create', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { referenceCode, proofNote } = req.body;

    if (!referenceCode || !referenceCode.trim()) {
      return res.status(400).json({ error: 'Indique o código de transação ou número do envio Multicaixa Express.' });
    }

    const payment = db.createPayment(user.id, referenceCode, proofNote);
    return res.json({
      success: true,
      payment,
      message: 'Comprovativo registado com sucesso! A tua sessão será ativada assim que o pagamento for validado.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao registar pagamento';
    return res.status(400).json({ error: msg });
  }
});

// Quick testing / verification toggle for demo evaluation
app.post('/api/payments/instant-demo-confirm', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const refCode = 'MCX-DEMO-' + Math.floor(100000 + Math.random() * 900000);
    const payment = db.createPayment(user.id, refCode, 'Pagamento instantâneo via Multicaixa Express (Ambiente de Demonstração)');
    const result = db.approvePayment(payment.id, 'usr_admin_057', 'Sistema Multicaixa Express Automático');

    return res.json({
      success: true,
      payment: result.payment,
      session: result.session,
      message: 'Pagamento de 100 Kz confirmado! Sessão de 30 minutos iniciada.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar pagamento de teste';
    return res.status(400).json({ error: msg });
  }
});

app.get('/api/payments/my', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const payments = db.listPayments().filter(p => p.userId === user.id);
  return res.json({ payments });
});

// ==========================================
// GAME SESSIONS & 30-MIN TIMER & MOVES
// ==========================================

app.get('/api/sessions/active', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const session = db.getActiveSessionForUser(user.id);
  return res.json({ session: session || null, serverTime: Date.now() });
});

app.get('/api/sessions/my', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const sessions = db.getUserSessions(user.id);
  return res.json({ sessions });
});

app.get('/api/sessions/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const session = db.getSession(id);
  if (!session) {
    return res.status(404).json({ error: 'Sessão não encontrada.' });
  }
  // Players can only view their own session
  if (req.user?.role !== 'admin' && session.userId !== req.user?.id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  return res.json({ session, serverTime: Date.now() });
});

app.post('/api/sessions/:id/move', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { move } = req.body;
    if (!move) return res.status(400).json({ error: 'Movimento inválido.' });

    const session = db.getSession(id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.userId !== req.user?.id) return res.status(403).json({ error: 'Acesso negado.' });

    const updated = db.applyMoveToSession(id, move);
    return res.json({
      success: true,
      currentCubeState: updated.currentCubeState,
      remainingSeconds: updated.remainingSeconds,
      status: updated.status,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao aplicar movimento';
    return res.status(400).json({ error: msg });
  }
});

app.post('/api/sessions/:id/claim-victory', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.getSession(id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.userId !== req.user?.id) return res.status(403).json({ error: 'Acesso negado.' });

    const result = db.claimVictory(id);
    const wallet = db.getWallet(req.user!.id);
    return res.json({
      success: result.success,
      session: result.session,
      message: result.message,
      wallet,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao validar vitória';
    return res.status(400).json({ error: msg });
  }
});

app.post('/api/sessions/:id/demo-solve', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.getSession(id);
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (session.userId !== req.user?.id) return res.status(403).json({ error: 'Acesso negado.' });

    const result = db.demoSolveSession(id);
    const wallet = db.getWallet(req.user!.id);
    return res.json({
      success: result.success,
      session: result.session,
      message: result.message,
      wallet,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao processar resolução de teste';
    return res.status(400).json({ error: msg });
  }
});

// ==========================================
// WALLET & STRICT 10.000 Kz WITHDRAWAL
// ==========================================

app.get('/api/wallet', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const wallet = db.getWallet(user.id);
  const transactions = db.getUserTransactions(user.id);
  const withdrawals = db.getUserWithdrawals(user.id);
  return res.json({ wallet, transactions, withdrawals });
});

app.post('/api/wallet/withdraw', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { beneficiaryName, beneficiaryPhone, beneficiaryIban } = req.body;

    if (!beneficiaryName || !beneficiaryPhone) {
      return res.status(400).json({ error: 'Forneça o nome do titular e número para transferência Multicaixa Express.' });
    }

    const withdrawal = db.requestWithdrawal(user.id, beneficiaryName, beneficiaryPhone, beneficiaryIban);
    const wallet = db.getWallet(user.id);

    return res.json({
      success: true,
      withdrawal,
      wallet,
      message: 'Pedido de saque de 10.000 Kz registado com sucesso! Saldo reservado para processamento bancário.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao solicitar saque';
    return res.status(400).json({ error: msg });
  }
});

// ==========================================
// ADMIN PANEL ENDPOINTS
// ==========================================

app.get('/api/admin/metrics', adminMiddleware, (req: AuthRequest, res: Response) => {
  const metrics = db.getAdminMetrics();
  return res.json({ metrics });
});

app.get('/api/admin/payments', adminMiddleware, (req: AuthRequest, res: Response) => {
  const payments = db.listPayments();
  return res.json({ payments });
});

app.post('/api/admin/payments/:id/approve', adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const admin = req.user!;
    const result = db.approvePayment(id, admin.id, admin.fullName);
    return res.json({
      success: true,
      payment: result.payment,
      session: result.session,
      message: 'Pagamento aprovado e sessão de jogo ativada.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao aprovar pagamento';
    return res.status(400).json({ error: msg });
  }
});

app.post('/api/admin/payments/:id/reject', adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const admin = req.user!;
    const payment = db.rejectPayment(id, admin.id, admin.fullName, reason);
    return res.json({ success: true, payment, message: 'Pagamento rejeitado.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao rejeitar pagamento';
    return res.status(400).json({ error: msg });
  }
});

app.get('/api/admin/sessions', adminMiddleware, (req: AuthRequest, res: Response) => {
  const sessions = db.listAllSessions();
  return res.json({ sessions });
});

app.post('/api/admin/sessions/:id/validate-victory', adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { approve, notes } = req.body;
    const admin = req.user!;
    const session = db.validateVictory(id, admin.id, admin.fullName, Boolean(approve), notes);
    return res.json({
      success: true,
      session,
      message: approve ? 'Vitória validada e 2.000 Kz transferidos para saldo disponível.' : 'Vitória rejeitada.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao validar vitória';
    return res.status(400).json({ error: msg });
  }
});

app.get('/api/admin/withdrawals', adminMiddleware, (req: AuthRequest, res: Response) => {
  const withdrawals = db.listWithdrawals();
  return res.json({ withdrawals });
});

app.post('/api/admin/withdrawals/:id/status', adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, proofRef, reason } = req.body;
    const admin = req.user!;

    if (!['Em processamento', 'Pago', 'Rejeitado'].includes(status)) {
      return res.status(400).json({ error: 'Estado de saque inválido.' });
    }

    const withdrawal = db.updateWithdrawalStatus(id, status, admin.id, admin.fullName, proofRef, reason);
    return res.json({
      success: true,
      withdrawal,
      message: `Saque atualizado para "${status}".`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar saque';
    return res.status(400).json({ error: msg });
  }
});

app.get('/api/admin/users', adminMiddleware, (req: AuthRequest, res: Response) => {
  const users = db.getAllUsers().map(u => ({
    ...u,
    wallet: db.getWallet(u.id),
  }));
  return res.json({ users });
});

app.post('/api/admin/users/:id/status', adminMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const admin = req.user!;
    const user = db.updateUserStatus(id, status, admin.id, admin.fullName);
    return res.json({ success: true, user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao atualizar utilizador';
    return res.status(400).json({ error: msg });
  }
});

app.get('/api/admin/audit-logs', adminMiddleware, (req: AuthRequest, res: Response) => {
  const auditLogs = db.getAuditLogs();
  return res.json({ auditLogs });
});

app.get('/api/admin/export-csv', adminMiddleware, (req: AuthRequest, res: Response) => {
  const txs = db.getAllTransactions();
  const csvRows = [
    'ID,Data,Utilizador ID,Tipo,Valor (Kz),Descrição,Referência',
    ...txs.map(t => `"${t.id}","${t.createdAt}","${t.userId}","${t.type}","${t.amount}","${t.description.replace(/"/g, '""')}","${t.referenceId || ''}"`),
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="relatorio_financeiro_cubo_magico.csv"');
  return res.send(csvRows.join('\n'));
});

// ==========================================
// VITE SETUP & STATIC SERVER
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CUBO MÁGICO Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
