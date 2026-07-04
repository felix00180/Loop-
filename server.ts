import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './src/db/index.ts';
import { profiles, rifas, cotas, siteSettings } from './src/db/schema.ts';
import { eq, and, sql, desc, asc } from 'drizzle-orm';

const app = express();
app.use(express.json());

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_rifa_app';

// Types
export interface AuthRequest extends Request {
  user?: { id: number; telefone: string; isAdmin: boolean };
}

// Middleware
const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
};

// API: Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { telefone, nome, senha } = req.body;
    if (!telefone || !nome || !senha) {
      return res.status(400).json({ error: 'Preencha todos os campos' });
    }

    const existing = await db.select().from(profiles).where(eq(profiles.telefone, telefone));
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Telefone já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    // Primeiro usuário vira admin
    const isFirst = (await db.select().from(profiles)).length === 0;

    const [user] = await db.insert(profiles).values({
      telefone,
      nome,
      senhaHash,
      isAdmin: isFirst,
    }).returning();

    const token = jwt.sign({ id: user.id, telefone: user.telefone, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, telefone: user.telefone, nome: user.nome, isAdmin: user.isAdmin } });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { telefone, senha } = req.body;
    const [user] = await db.select().from(profiles).where(eq(profiles.telefone, telefone));
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const valid = await bcrypt.compare(senha, user.senhaHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, telefone: user.telefone, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, telefone: user.telefone, nome: user.nome, isAdmin: user.isAdmin } });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// API: Rifas (Public)
app.get('/api/rifas', async (req, res) => {
  try {
    const allRifas = await db.select().from(rifas).orderBy(desc(rifas.createdAt));
    res.json(allRifas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar rifas' });
  }
});

app.get('/api/rifas/:id', async (req, res) => {
  try {
    const [rifa] = await db.select().from(rifas).where(eq(rifas.id, parseInt(req.params.id)));
    if (!rifa) return res.status(404).json({ error: 'Rifa não encontrada' });
    
    // Status
    const allCotas = await db.select().from(cotas).where(eq(cotas.rifaId, rifa.id));
    const vendidas = allCotas.filter(c => c.status !== 'disponivel').length;
    
    res.json({ ...rifa, vendidas });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar rifa' });
  }
});

// API: Settings (Public)
app.get('/api/settings', async (req, res) => {
  try {
    let [settings] = await db.select().from(siteSettings).limit(1);
    if (!settings) {
      [settings] = await db.insert(siteSettings).values({ siteName: 'SorteRápida' }).returning();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/api/admin/settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { siteName, logoUrl, adminWhatsapp } = req.body;
    let [settings] = await db.select().from(siteSettings).limit(1);
    if (!settings) {
      [settings] = await db.insert(siteSettings).values({ siteName: siteName || 'SorteRápida', logoUrl, adminWhatsapp }).returning();
    } else {
      [settings] = await db.update(siteSettings)
        .set({ siteName, logoUrl, adminWhatsapp, updatedAt: new Date() })
        .where(eq(siteSettings.id, settings.id))
        .returning();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// API: Checkout (Auth)
app.post('/api/rifas/:id/reservar', requireAuth, async (req: AuthRequest, res) => {
  try {
    const rifaId = parseInt(req.params.id);
    const { quantidade } = req.body;
    const userId = req.user!.id;

    if (!quantidade || quantidade <= 0) return res.status(400).json({ error: 'Quantidade inválida' });

    // Atomically find available and update in one query
    const [rifa] = await db.select().from(rifas).where(eq(rifas.id, rifaId));
    if (!rifa) return res.status(404).json({ error: 'Rifa não encontrada' });

    const reservadas = await db.execute(sql`
      UPDATE cotas
      SET status = 'reservado', user_id = ${userId}, preco_pago = ${rifa.valorPorCota}, updated_at = now()
      WHERE id IN (
        SELECT id FROM cotas
        WHERE rifa_id = ${rifaId} AND status = 'disponivel'
        LIMIT ${quantidade}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);

    if (reservadas.rows.length < quantidade) {
      // Rollback? No, it's a single update, but we reserved what we could. 
      // If none, return error.
      if (reservadas.rows.length === 0) {
        return res.status(400).json({ error: 'Não há cotas suficientes disponíveis' });
      }
    }

    res.json({ message: 'Reservado com sucesso', cotas: reservadas.rows, valorTotal: reservadas.rows.length * Number(rifa.valorPorCota), rifa });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reservar cotas' });
  }
});

app.get('/api/meus-pedidos', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const minhasCotas = await db.select({
      cota: cotas,
      rifa: rifas
    }).from(cotas)
      .innerJoin(rifas, eq(cotas.rifaId, rifas.id))
      .where(eq(cotas.userId, userId))
      .orderBy(desc(cotas.updatedAt));
    
    res.json(minhasCotas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

// API: Admin
app.post('/api/admin/rifas', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { titulo, descricao, imagemUrl, valorPorCota, totalCotas, pixKey } = req.body;
    
    // 1. Inserir Rifa
    const [rifa] = await db.insert(rifas).values({
      titulo,
      descricao,
      imagemUrl,
      valorPorCota: valorPorCota.toString(),
      totalCotas,
      pixKey,
    }).returning();

    // 2. Criar Cotas
    const cotasToInsert = Array.from({ length: totalCotas }, (_, i) => ({
      rifaId: rifa.id,
      numero: i + 1,
      status: 'disponivel' as const,
    }));

    // Insert in batches if too large
    const batchSize = 1000;
    for (let i = 0; i < cotasToInsert.length; i += batchSize) {
      const batch = cotasToInsert.slice(i, i + batchSize);
      await db.insert(cotas).values(batch);
    }

    res.json(rifa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar rifa' });
  }
});

app.put('/api/admin/rifas/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { titulo, descricao, imagemUrl, valorPorCota, pixKey } = req.body;
    const [rifa] = await db.update(rifas).set({
      titulo,
      descricao,
      imagemUrl,
      valorPorCota: valorPorCota?.toString(),
      pixKey,
    }).where(eq(rifas.id, parseInt(req.params.id))).returning();
    res.json(rifa);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar rifa' });
  }
});

app.get('/api/admin/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allUsers = await db.select().from(profiles).orderBy(desc(profiles.createdAt));
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

app.get('/api/admin/rifas/:id/cotas', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allCotas = await db.select({
      cota: cotas,
      user: profiles
    }).from(cotas)
      .leftJoin(profiles, eq(cotas.userId, profiles.id))
      .where(eq(cotas.rifaId, parseInt(req.params.id)))
      .orderBy(asc(cotas.numero));
    res.json(allCotas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar cotas' });
  }
});

app.post('/api/admin/cotas/:id/aprovar', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [cota] = await db.update(cotas)
      .set({ status: 'pago' })
      .where(eq(cotas.id, parseInt(req.params.id)))
      .returning();
    res.json(cota);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar cota' });
  }
});

app.post('/api/admin/rifas/:rifaId/usuarios/:userId/aprovar', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rifaId, userId } = req.params;
    const aprovadas = await db.update(cotas)
      .set({ status: 'pago' })
      .where(
        and(
          eq(cotas.rifaId, parseInt(rifaId)),
          eq(cotas.userId, parseInt(userId)),
          eq(cotas.status, 'reservado')
        )
      )
      .returning();
    res.json(aprovadas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar cotas do usuário' });
  }
});

app.post('/api/admin/cotas/:id/cancelar', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [cota] = await db.update(cotas)
      .set({ status: 'disponivel', userId: null, precoPago: null })
      .where(eq(cotas.id, parseInt(req.params.id)))
      .returning();
    res.json(cota);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar cota' });
  }
});

app.post('/api/admin/rifas/:rifaId/usuarios/:userId/cancelar', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rifaId, userId } = req.params;
    const canceladas = await db.update(cotas)
      .set({ status: 'disponivel', userId: null, precoPago: null })
      .where(
        and(
          eq(cotas.rifaId, parseInt(rifaId)),
          eq(cotas.userId, parseInt(userId)),
          eq(cotas.status, 'reservado')
        )
      )
      .returning();
    res.json(canceladas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar cotas do usuário' });
  }
});


// Vite / Frontend
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
