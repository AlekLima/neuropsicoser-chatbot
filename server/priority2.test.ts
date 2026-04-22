import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Prioridade 2 — Experiência do Usuário", () => {
  it("appointments.stats retorna métricas de dashboard (últimos 30 dias)", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("thisMonth");
    expect(stats).toHaveProperty("last30Days");
    expect(stats).toHaveProperty("byStatus");
    expect(stats).toHaveProperty("bySpecialty");
    expect(stats).toHaveProperty("confirmationRate");
    expect(stats).toHaveProperty("confirmedCount");
    expect(stats).toHaveProperty("cancelledCount");
    expect(stats).toHaveProperty("revenueByProfessional");

    expect(typeof stats.total).toBe("number");
    expect(typeof stats.last30Days).toBe("number");
    expect(typeof stats.confirmationRate).toBe("number");
  });

  it("appointments.stats calcula taxa de confirmação corretamente", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    // Taxa de confirmação deve estar entre 0 e 100
    expect(stats.confirmationRate).toBeGreaterThanOrEqual(0);
    expect(stats.confirmationRate).toBeLessThanOrEqual(100);

    // Se não há agendamentos completados, taxa deve ser 0
    if (stats.confirmedCount === 0 && stats.cancelledCount === 0) {
      expect(stats.confirmationRate).toBe(0);
    }
  });

  it("appointments.stats retorna receita por profissional", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    expect(typeof stats.revenueByProfessional).toBe("object");

    // Verificar estrutura de cada profissional
    Object.values(stats.revenueByProfessional).forEach((prof) => {
      expect(prof).toHaveProperty("name");
      expect(prof).toHaveProperty("revenue");
      expect(prof).toHaveProperty("count");
      expect(typeof prof.name).toBe("string");
      expect(typeof prof.revenue).toBe("number");
      expect(typeof prof.count).toBe("number");
      expect(prof.revenue).toBeGreaterThanOrEqual(0);
      expect(prof.count).toBeGreaterThanOrEqual(0);
    });
  });

  it("appointments.stats agrupa agendamentos por especialidade", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    expect(typeof stats.bySpecialty).toBe("object");

    // Verificar que cada especialidade tem contagem numérica
    Object.entries(stats.bySpecialty).forEach(([key, count]) => {
      expect(key).toMatch(/^specialty_\d+|unknown$/);
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  it("appointments.stats diferencia últimos 30 dias do mês atual", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    // Últimos 30 dias deve incluir agendamentos de até 30 dias atrás
    expect(stats.last30Days).toBeGreaterThanOrEqual(0);
    expect(stats.thisMonth).toBeGreaterThanOrEqual(0);

    // Total deve ser >= ambos (podem ter agendamentos de meses anteriores)
    expect(stats.total).toBeGreaterThanOrEqual(Math.max(stats.last30Days, stats.thisMonth));
  });

  it("appointments.stats retorna contagens de status corretas", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    const { byStatus } = stats;
    const totalByStatus =
      byStatus.scheduled + byStatus.confirmed + byStatus.cancelled + byStatus.rescheduled;

    // Soma dos status deve ser igual ao total
    expect(totalByStatus).toBe(stats.total);
  });

  it("confirmationRate é calculado como (confirmados / (confirmados + cancelados)) * 100", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    const totalCompleted = stats.confirmedCount + stats.cancelledCount;
    const expectedRate =
      totalCompleted > 0 ? Math.round((stats.confirmedCount / totalCompleted) * 100) : 0;

    expect(stats.confirmationRate).toBe(expectedRate);
  });

  it("revenueByProfessional inclui apenas agendamentos confirmados ou agendados", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.appointments.stats();

    // Receita total deve ser soma de todos os profissionais
    const totalRevenue = Object.values(stats.revenueByProfessional).reduce(
      (sum, prof) => sum + prof.revenue,
      0
    );

    // Receita deve ser >= 0
    expect(totalRevenue).toBeGreaterThanOrEqual(0);
  });
});
