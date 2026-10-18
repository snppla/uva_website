import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

// One-time links for setting up an admin account. Only a hash of the token
// is stored. An empty email means the person chooses it (first-admin setup).
export const adminInvites = pgTable("admin_invites", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull().default(""),
  name: text("name").notNull().default(""),
  invitedBy: integer("invited_by").references(() => admins.id, {
    onDelete: "set null",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const albums = pgTable("albums", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  // When the photos were taken (the event date); shown in the gallery.
  date: date("date"),
  createdAt: createdAt(),
});

// Uploaded photos. Each image is stored as two files on disk:
// `<key>.webp` (max 2000px) and `<key>_thumb.webp` (max 600px).
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  albumId: integer("album_id").references(() => albums.id, {
    onDelete: "set null",
  }),
  key: text("key").notNull().unique(),
  // Where an imported photo came from (e.g. "fb:1234"), so re-imports skip it.
  sourceRef: text("source_ref").unique(),
  caption: text("caption").notNull().default(""),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: createdAt(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""), // markdown
  coverImageId: integer("cover_image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""), // markdown
  location: text("location").notNull().default(""),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  createdAt: createdAt(),
});

// Downloadable documents (bylaws, rules, forms...).
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("General"),
  key: text("key").notNull().unique(), // file name on disk
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
});

// Membership options shown on the Membership page, each with its own PayPal link.
export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: text("price").notNull(), // display text, e.g. "$60 / year"
  description: text("description").notNull().default(""),
  paypalUrl: text("paypal_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  amaNumber: text("ama_number").notNull().default(""),
  membershipType: text("membership_type").notNull().default(""),
  expiresOn: date("expires_on"),
  notes: text("notes").notNull().default(""),
  createdAt: createdAt(),
});

// Editable page content and small settings, keyed by name (see src/lib/settings.ts).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Post = typeof posts.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Member = typeof members.$inferSelect;
export type MembershipPlan = typeof membershipPlans.$inferSelect;
