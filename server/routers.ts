import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getProfessionals,
  getProfessionalById,
  createProfessional,
  updateProfessional,
  deleteProfessional,
  getSpecialties,
  getInsurancePlans,
  createInsurancePlan,
  updateInsurancePlan,
  getProfessionalInsurances,
  setProfessionalInsurances,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  getAllSettings,
  setSetting,
  getConversation,
  getDb,
} from "./db";
import { TRPCError } from "@trpc/server";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Specialties ───────────────────────────────────────────────────────────
  specialties: router({
    list: publicProcedure.query(() => getSpecialties()),
  }),

  // ─── Professionals ─────────────────────────────────────────────────────────
  professionals: router({
    list: adminProcedure.query(() => getProfessionals()),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getProfessionalById(input.id)),

    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          crp: z.string().optional(),
          specialtyId: z.number(),
          price: z.string().optional(),
          googleCalendarId: z.string().optional(),
          insuranceIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { insuranceIds, ...data } = input;
        await createProfessional(data);
        // Get the last inserted professional
        const all = await getProfessionals();
        const created = all[all.length - 1];
        if (created && insuranceIds && insuranceIds.length > 0) {
          await setProfessionalInsurances(created.id, insuranceIds);
        }
        return { success: true };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          crp: z.string().optional(),
          specialtyId: z.number().optional(),
          price: z.string().optional(),
          googleCalendarId: z.string().optional(),
          active: z.boolean().optional(),
          insuranceIds: z.array(z.number()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, insuranceIds, ...data } = input;
        await updateProfessional(id, data);
        if (insuranceIds !== undefined) {
          await setProfessionalInsurances(id, insuranceIds);
        }
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteProfessional(input.id);
        return { success: true };
      }),

    getInsurances: adminProcedure
      .input(z.object({ professionalId: z.number() }))
      .query(({ input }) => getProfessionalInsurances(input.professionalId)),
  }),

  // ─── Insurance Plans ───────────────────────────────────────────────────────
  insurancePlans: router({
    list: adminProcedure.query(() => getInsurancePlans()),

    create: adminProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await createInsurancePlan({ name: input.name });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), active: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateInsurancePlan(id, data);
        return { success: true };
      }),
  }),

  // ─── Appointments ──────────────────────────────────────────────────────────
  appointments: router({
    list: adminProcedure
      .input(
        z.object({
          status: z.string().optional(),
          from: z.date().optional(),
          to: z.date().optional(),
        }).optional()
      )
      .query(({ input }) => getAppointments(input)),

    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getAppointmentById(input.id)),

    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const appt = await getAppointmentById(input.id);
        if (!appt) throw new TRPCError({ code: "NOT_FOUND" });

        // Cancelar evento no Google Calendar se existir
        if (appt.googleEventId) {
          const professional = await getProfessionalById(appt.professionalId);
          if (professional?.googleCalendarId) {
            try {
              const { deleteCalendarEvent } = await import("./googleCalendar");
              await deleteCalendarEvent(professional.googleCalendarId, appt.googleEventId);
            } catch (e) {
              console.error("[Calendar] Erro ao cancelar evento:", e);
            }
          }
        }

        await updateAppointment(input.id, { status: "cancelled" });
        return { success: true };
      }),

    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["scheduled", "confirmed", "cancelled", "rescheduled"]),
        })
      )
      .mutation(async ({ input }) => {
        await updateAppointment(input.id, { status: input.status });
        return { success: true };
      }),

    // Verificar se há novos agendamentos
    hasNew: adminProcedure.query(async () => {
      const all = await getAppointments();
      return all.some((a) => a.status === "scheduled");
    }),

    // Métricas para dashboard
    stats: adminProcedure.query(async () => {
      const all = await getAppointments();
      const professionals = await getProfessionals();
      const now = new Date();
      
      // Últimos 30 dias
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const last30Days = all.filter((a) => {
        const d = new Date(a.dateTime);
        return d >= thirtyDaysAgo && d <= now;
      });
      
      const thisMonth = all.filter((a) => {
        const d = new Date(a.dateTime);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const byStatus = {
        scheduled: all.filter((a) => a.status === "scheduled").length,
        confirmed: all.filter((a) => a.status === "confirmed").length,
        cancelled: all.filter((a) => a.status === "cancelled").length,
        rescheduled: all.filter((a) => a.status === "rescheduled").length,
      };

      // Agendamentos por especialidade (últimos 30 dias)
      const bySpecialty: Record<string, number> = {};
      last30Days.forEach((a) => {
        const specialty = a.specialtyId ? `specialty_${a.specialtyId}` : "unknown";
        bySpecialty[specialty] = (bySpecialty[specialty] ?? 0) + 1;
      });

      // Taxa de confirmação vs cancelamento
      const confirmedCount = all.filter((a) => a.status === "confirmed").length;
      const cancelledCount = all.filter((a) => a.status === "cancelled").length;
      const totalCompleted = confirmedCount + cancelledCount;
      const confirmationRate = totalCompleted > 0 ? Math.round((confirmedCount / totalCompleted) * 100) : 0;

      // Receita estimada por profissional
      const revenueByProfessional: Record<string, { name: string; revenue: number; count: number }> = {};
      all.forEach((a) => {
        if (a.status === "confirmed" || a.status === "scheduled") {
          const prof = professionals.find((p) => p.id === a.professionalId);
          if (prof) {
            const key = `prof_${prof.id}`;
            const price = prof.price ? parseFloat(prof.price) : 0;
            if (!revenueByProfessional[key]) {
              revenueByProfessional[key] = { name: prof.name, revenue: 0, count: 0 };
            }
            revenueByProfessional[key].revenue += price;
            revenueByProfessional[key].count += 1;
          }
        }
      });

      return {
        total: all.length,
        thisMonth: thisMonth.length,
        last30Days: last30Days.length,
        byStatus,
        bySpecialty,
        confirmationRate,
        confirmedCount,
        cancelledCount,
        revenueByProfessional,
      };
    }),
  }),

  // ─── Settings ──────────────────────────────────────────────────────────────
  settings: router({
    getAll: adminProcedure.query(() => getAllSettings()),

    update: adminProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await setSetting(input.key, input.value);
        return { success: true };
      }),

    updateMany: adminProcedure
      .input(z.array(z.object({ key: z.string(), value: z.string() })))
      .mutation(async ({ input }) => {
        for (const { key, value } of input) {
          await setSetting(key, value);
        }
        return { success: true };
      }),
  }),

  // ─── Conversations ────────────────────────────────────────────────────────────
  conversations: router({
    // Simular uma mensagem do usuário (para testes no painel)
    simulate: adminProcedure
      .input(z.object({ phone: z.string(), message: z.string() }))
      .mutation(async ({ input }) => {
        const { handleIncomingMessage } = await import("./chatbot");
        await handleIncomingMessage(input.phone, input.message);
        const conv = await getConversation(input.phone);
        return {
          success: true,
          phone: input.phone,
          step: conv?.step,
          data: conv?.data,
        };
      }),

    getByPhone: adminProcedure
      .input(z.object({ phone: z.string() }))
      .query(async ({ input }) => {
        const conv = await getConversation(input.phone);
        return conv ? {
          phone: conv.phone,
          step: conv.step,
          data: conv.data,
          updatedAt: conv.updatedAt,
        } : null;
      }),

    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { conversations } = await import("../drizzle/schema");
      const result = await db.select().from(conversations).orderBy((c) => c.updatedAt).limit(50);
      return result.map((c) => ({
        phone: c.phone,
        step: c.step,
        updatedAt: c.updatedAt,
        data: c.data,
      }));
    }),
  }),
});

export type AppRouter = typeof appRouter;
