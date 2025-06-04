import { pgTable, text, serial, integer, decimal, boolean, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Main card table
export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  manaCost: text("mana_cost"),
  cmc: text("cmc"),
  colors: text("colors").array(),
  colorIdentity: text("color_identity").array(),
  type: text("type").notNull(),
  supertypes: text("supertypes").array(),
  types: text("types").array(),
  subtypes: text("subtypes").array(),
  rarity: text("rarity"),
  set: text("set"),
  setName: text("set_name"),
  text: text("text"),
  flavor: text("flavor"),
  artist: text("artist"),
  number: text("number"),
  power: text("power"),
  toughness: text("toughness"),
  loyalty: text("loyalty"),
  layout: text("layout"),
  multiverseid: text("multiverseid"),
  imageUrl: text("image_url"),
  rulings: jsonb("rulings"),
  foreignNames: jsonb("foreign_names"),
  printings: text("printings").array(),
  originalText: text("original_text"),
  originalType: text("original_type"),
  legalities: jsonb("legalities"),
  variations: text("variations").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ruling storage - for AI generated rulings
export const rulings = pgTable("rulings", {
  id: serial("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => cards.id),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversation storage
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MTG Rules storage
export const rules = pgTable("rules", {
  id: serial("id").primaryKey(),
  chapter: text("chapter"),
  section: text("section"),
  subsection: text("subsection"),
  rule_number: text("rule_number").notNull(),
  text: text("text").notNull(),
  examples: text("examples").array(),
  keywords: text("keywords").array(),
  related_rules: text("related_rules").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const cardsRelations = relations(cards, ({ many }) => ({
  rulings: many(rulings),
}));

export const rulingsRelations = relations(rulings, ({ one }) => ({
  card: one(cards, {
    fields: [rulings.cardId],
    references: [cards.id],
  }),
}));

// Zod schemas
export const insertCardSchema = createInsertSchema(cards);
export const insertRulingSchema = createInsertSchema(rulings);
export const insertConversationSchema = createInsertSchema(conversations);
export const insertRuleSchema = createInsertSchema(rules);

// Types
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;

export type Ruling = typeof rulings.$inferSelect;
export type InsertRuling = z.infer<typeof insertRulingSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Rule = typeof rules.$inferSelect;
export type InsertRule = z.infer<typeof insertRuleSchema>;

// Database metadata table to track database updates
export const dbMetadata = pgTable("db_metadata", {
  id: text("id").primaryKey(),
  last_updated: timestamp("last_updated").defaultNow(),
  total_cards: integer("total_cards").default(0),
  description: text("description"),
});

// User accounts table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").default(false),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saved decks table
export const savedDecks = pgTable("saved_decks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  format: text("format").notNull(),
  commander: text("commander"), // Commander card name for Commander format
  deckData: jsonb("deck_data").notNull(), // Stores card IDs and quantities
  sideboardData: jsonb("sideboard_data"), // Stores sideboard card IDs and quantities
  isPublic: boolean("is_public").default(false),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User sessions table for secure session management
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  savedDecks: many(savedDecks),
  sessions: many(userSessions),
  passwordResetTokens: many(passwordResetTokens),
}));

export const savedDecksRelations = relations(savedDecks, ({ one }) => ({
  user: one(users, {
    fields: [savedDecks.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertSavedDeckSchema = createInsertSchema(savedDecks);
export const insertUserSessionSchema = createInsertSchema(userSessions);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SavedDeck = typeof savedDecks.$inferSelect & {
  deckData?: any[];
  sideboardData?: any[];
};
export type InsertSavedDeck = z.infer<typeof insertSavedDeckSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

export const insertDbMetadataSchema = createInsertSchema(dbMetadata);
export type DbMetadata = typeof dbMetadata.$inferSelect;
export type InsertDbMetadata = z.infer<typeof insertDbMetadataSchema>;
