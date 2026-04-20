import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── Users (admin auth) ───────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Specialties ──────────────────────────────────────────────────────────────
export const specialties = mysqlTable("specialties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Specialty = typeof specialties.$inferSelect;

// ─── Professionals ────────────────────────────────────────────────────────────
export const professionals = mysqlTable("professionals", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  crp: varchar("crp", { length: 32 }),
  specialtyId: int("specialtyId").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  googleCalendarId: varchar("googleCalendarId", { length: 256 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = typeof professionals.$inferInsert;

// ─── Insurance Plans ──────────────────────────────────────────────────────────
export const insurancePlans = mysqlTable("insurance_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsurancePlan = typeof insurancePlans.$inferSelect;
export type InsertInsurancePlan = typeof insurancePlans.$inferInsert;

// ─── Professional ↔ Insurance (many-to-many) ──────────────────────────────────
export const professionalInsurance = mysqlTable("professional_insurance", {
  id: int("id").autoincrement().primaryKey(),
  professionalId: int("professionalId").notNull(),
  insuranceId: int("insuranceId").notNull(),
});

// ─── Conversations (session state) ───────────────────────────────────────────
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  step: varchar("step", { length: 64 }).default("start").notNull(),
  data: json("data").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

// ─── Appointments ─────────────────────────────────────────────────────────────
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  patientName: varchar("patientName", { length: 128 }),
  professionalId: int("professionalId").notNull(),
  specialtyId: int("specialtyId").notNull(),
  dateTime: timestamp("dateTime").notNull(),
  paymentType: mysqlEnum("paymentType", ["particular", "convenio"]).notNull(),
  insuranceId: int("insuranceId"),
  status: mysqlEnum("status", ["scheduled", "confirmed", "cancelled", "rescheduled"])
    .default("scheduled")
    .notNull(),
  googleEventId: varchar("googleEventId", { length: 256 }),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
