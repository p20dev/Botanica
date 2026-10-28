import {
  pgTable,
  text,
  integer,
  boolean,
  uuid,
  jsonb,
  timestamp,
  index,
  unique,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
export const species = pgTable("species", {
  id: text().primaryKey(),
  name: text().notNull(),
  compatibilityGroup: text("compatibility_group").notNull(),
  catalogVersion: integer("catalog_version").notNull(),
  config: jsonb("config_jsonb").notNull(),
});
export const players = pgTable("players", {
  id: uuid().primaryKey(),
  displayName: text("display_name").notNull(),
  normalizedUsername: text("normalized_username").unique(),
  passwordHash: text("password_hash"),
  coinBalance: integer("coin_balance").notNull().default(0),
  xp: integer("xp").notNull().default(0),
  gameStats: jsonb("game_stats").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const plants = pgTable(
  "plants",
  {
    id: uuid().primaryKey(),
    name: text().notNull().default("Velvetleaf"),
    creationSource: text("creation_source").notNull().default("designed"),
    rarityReasons: jsonb("rarity_reasons").notNull().default([]),
    gameEligible: boolean("game_eligible").notNull().default(false),
    isFavorite: boolean("is_favorite").notNull().default(false),
    isProtected: boolean("is_protected").notNull().default(false),
    firstDiscovery: boolean("first_discovery").notNull().default(false),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => players.id),
    speciesId: text("species_id")
      .notNull()
      .references(() => species.id),
    genomeVersion: integer("genome_version").notNull(),
    genome: jsonb().notNull(),
    mutations: jsonb().notNull(),
    visualSeed: integer("visual_seed").notNull(),
    rendererVersion: integer("renderer_version").notNull(),
    rarityPolicyVersion: integer("rarity_policy_version").notNull(),
    rarityScore: integer("rarity_score").notNull(),
    rarityTier: text("rarity_tier").notNull(),
    generation: integer().notNull(),
    parentAId: uuid("parent_a_id").references((): AnyPgColumn => plants.id),
    parentBId: uuid("parent_b_id").references((): AnyPgColumn => plants.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("plants_owner_created").on(t.ownerId, t.createdAt.desc()),
    index("plants_species_rarity").on(t.speciesId, t.rarityTier),
  ],
);
export const breedingEvents = pgTable(
  "breeding_events",
  {
    id: uuid().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => players.id),
    parentAId: uuid("parent_a_id")
      .notNull()
      .references(() => plants.id),
    parentBId: uuid("parent_b_id")
      .notNull()
      .references(() => plants.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => plants.id),
    rngSeed: integer("rng_seed").notNull(),
    engineVersion: integer("engine_version").notNull(),
    mutationEvents: jsonb("mutation_events").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique().on(t.childId),
    unique("breeding_owner_request").on(t.ownerId, t.idempotencyKey),
    index("breeding_owner_created").on(t.ownerId, t.createdAt.desc()),
  ],
);
