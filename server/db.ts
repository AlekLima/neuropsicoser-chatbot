import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  professionals,
  specialties,
  insurancePlans,
  professionalInsurance,
  conversations,
  appointments,
  settings,
  InsertProfessional,
  InsertInsurancePlan,
  InsertAppointment,
  Conversation,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(settings);
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(settings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } });
}

// ─── Specialties ──────────────────────────────────────────────────────────────
export async function getSpecialties() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(specialties).where(eq(specialties.active, true));
}

// ─── Professionals ────────────────────────────────────────────────────────────
export async function getProfessionals() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(professionals).where(eq(professionals.active, true));
}

export async function getProfessionalsBySpecialty(specialtyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(professionals)
    .where(and(eq(professionals.specialtyId, specialtyId), eq(professionals.active, true)));
}

export async function getProfessionalById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(professionals).where(eq(professionals.id, id)).limit(1);
  return result[0];
}

export async function createProfessional(data: InsertProfessional) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(professionals).values(data);
  return result;
}

export async function updateProfessional(id: number, data: Partial<InsertProfessional>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(professionals).set(data).where(eq(professionals.id, id));
}

export async function deleteProfessional(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(professionals).set({ active: false }).where(eq(professionals.id, id));
}

// ─── Insurance Plans ──────────────────────────────────────────────────────────
export async function getInsurancePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(insurancePlans);
}

export async function getActiveInsurancePlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(insurancePlans).where(eq(insurancePlans.active, true));
}

export async function createInsurancePlan(data: InsertInsurancePlan) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(insurancePlans).values(data);
}

export async function updateInsurancePlan(id: number, data: Partial<InsertInsurancePlan>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(insurancePlans).set(data).where(eq(insurancePlans.id, id));
}

export async function getProfessionalInsurances(professionalId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ insuranceId: professionalInsurance.insuranceId })
    .from(professionalInsurance)
    .where(eq(professionalInsurance.professionalId, professionalId));
  return rows.map((r) => r.insuranceId);
}

export async function setProfessionalInsurances(professionalId: number, insuranceIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db
    .delete(professionalInsurance)
    .where(eq(professionalInsurance.professionalId, professionalId));
  if (insuranceIds.length > 0) {
    await db.insert(professionalInsurance).values(
      insuranceIds.map((insuranceId) => ({ professionalId, insuranceId }))
    );
  }
}

// ─── Conversations ────────────────────────────────────────────────────────────
export async function getConversation(phone: string): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.phone, phone))
    .limit(1);
  return result[0];
}

export async function upsertConversation(
  phone: string,
  step: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(conversations)
    .values({ phone, step, data })
    .onDuplicateKeyUpdate({ set: { step, data } });
}

export async function resetConversation(phone: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(conversations)
    .values({ phone, step: "start", data: {} })
    .onDuplicateKeyUpdate({ set: { step: "start", data: {} } });
}

// ─── Appointments ─────────────────────────────────────────────────────────────
export async function createAppointment(data: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(appointments).values(data);
  return result;
}

export async function getAppointments(filters?: { status?: string; from?: Date; to?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(appointments.status, filters.status as "scheduled" | "confirmed" | "cancelled" | "rescheduled"));
  }
  if (filters?.from) conditions.push(gte(appointments.dateTime, filters.from));
  if (filters?.to) conditions.push(lte(appointments.dateTime, filters.to));

  const query = db
    .select()
    .from(appointments)
    .orderBy(desc(appointments.dateTime));

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result[0];
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(appointments).set(data).where(eq(appointments.id, id));
}

export async function getAppointmentsDueForReminder() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.reminderSent, false),
        eq(appointments.status, "scheduled"),
        gte(appointments.dateTime, from),
        lte(appointments.dateTime, to)
      )
    );
}
