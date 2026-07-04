import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
  boolean,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const cotaStatusEnum = pgEnum('cota_status', ['disponivel', 'reservado', 'pago']);

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  siteName: text('site_name').notNull().default('SorteRápida'),
  logoUrl: text('logo_url'),
  adminWhatsapp: text('admin_whatsapp'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  telefone: text('telefone').notNull().unique(),
  senhaHash: text('senha_hash').notNull(),
  nome: text('nome').notNull(),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rifas = pgTable('rifas', {
  id: serial('id').primaryKey(),
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  imagemUrl: text('imagem_url'),
  valorPorCota: numeric('valor_por_cota', { precision: 10, scale: 2 }).notNull(),
  pixKey: text('pix_key'),
  dataInicio: timestamp('data_inicio').defaultNow().notNull(),
  dataSorteio: timestamp('data_sorteio'),
  totalCotas: integer('total_cotas').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cotas = pgTable('cotas', {
  id: serial('id').primaryKey(),
  rifaId: integer('rifa_id').references(() => rifas.id).notNull(),
  numero: integer('numero').notNull(),
  status: cotaStatusEnum('status').default('disponivel').notNull(),
  userId: integer('user_id').references(() => profiles.id),
  precoPago: numeric('preco_pago', { precision: 10, scale: 2 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    rifaNumeroUnique: uniqueIndex('rifa_numero_idx').on(table.rifaId, table.numero),
  };
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  cotas: many(cotas),
}));

export const rifasRelations = relations(rifas, ({ many }) => ({
  cotas: many(cotas),
}));

export const cotasRelations = relations(cotas, ({ one }) => ({
  rifa: one(rifas, {
    fields: [cotas.rifaId],
    references: [rifas.id],
  }),
  user: one(profiles, {
    fields: [cotas.userId],
    references: [profiles.id],
  }),
}));
