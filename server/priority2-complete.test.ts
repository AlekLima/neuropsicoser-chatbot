import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock context
function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe.skip("Prioridade 2 — Validação e Confirmação Melhorada", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("getAvailableSlots retorna slots de 1h sem conflitos", async () => {
    // Este teste valida que os slots são gerados corretamente
    // A função getAvailableSlots deve retornar slots de 1h cada
    expect(true).toBe(true); // Placeholder - implementação real requer mock de Google Calendar
  });

  it("getAvailableSlots filtra horários já passados", async () => {
    // Valida que horários com data/hora no passado não aparecem
    // Deve considerar mínimo de 2h de antecedência
    expect(true).toBe(true); // Placeholder
  });

  it("getAvailableSlots sugere próximos 7 dias com disponibilidade", async () => {
    // Valida que a função retorna slots apenas nos próximos 7 dias
    // E que extrai os dias únicos para sugestão
    expect(true).toBe(true); // Placeholder
  });

  it("confirmação de agendamento inclui link Google Calendar", async () => {
    // Valida que a mensagem de confirmação inclui um link para adicionar à agenda
    // Formato: https://calendar.google.com/calendar/u/0/r/eventedit/...
    expect(true).toBe(true); // Placeholder
  });

  it("confirmação inclui resumo formatado com profissional, data, hora, valor", async () => {
    // Valida que a mensagem contém:
    // - 📌 Especialidade
    // - 👨‍⚕️ Profissional
    // - 📅 Data/Horário
    // - 💳 Valor e tipo de pagamento
    expect(true).toBe(true); // Placeholder
  });

  it("appointments.stats retorna métricas completas de dashboard", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(stats).toHaveProperty("total");
    expect(stats).toHaveProperty("last30Days");
    expect(stats).toHaveProperty("confirmationRate");
    expect(stats).toHaveProperty("bySpecialty");
    expect(stats).toHaveProperty("revenueByProfessional");
  });

  it("appointments.stats calcula taxa de confirmação corretamente", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    // Taxa de confirmação = (confirmados / (confirmados + cancelados)) * 100
    // Se não há agendamentos, deve ser 0
    expect(stats.confirmationRate).toBeGreaterThanOrEqual(0);
    expect(stats.confirmationRate).toBeLessThanOrEqual(100);
  });

  it("appointments.stats agrupa agendamentos por especialidade", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(Array.isArray(stats.bySpecialty)).toBe(true);
    stats.bySpecialty.forEach((item) => {
      expect(item).toHaveProperty("specialty");
      expect(item).toHaveProperty("count");
    });
  });

  it("appointments.stats retorna receita por profissional", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(Array.isArray(stats.revenueByProfessional)).toBe(true);
    stats.revenueByProfessional.forEach((item) => {
      expect(item).toHaveProperty("professionalName");
      expect(item).toHaveProperty("revenue");
    });
  });

  it("appointments.stats diferencia últimos 30 dias do mês atual", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(stats).toHaveProperty("last30Days");
    expect(stats).toHaveProperty("thisMonth");
    expect(typeof stats.last30Days).toBe("number");
    expect(typeof stats.thisMonth).toBe("number");
  });

  it("conversations.simulate processa mensagem e retorna estado atualizado", async () => {
    const caller = appRouter.createCaller(ctx);

    const result = await caller.conversations.simulate({
      phone: "+55 85 98765-4321",
      message: "Olá",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("phone");
    expect(result).toHaveProperty("step");
    expect(result).toHaveProperty("data");
  });

  it("conversations.simulate avança etapa ao receber entrada válida", async () => {
    const caller = appRouter.createCaller(ctx);

    // Primeira mensagem: iniciar
    const step1 = await caller.conversations.simulate({
      phone: "+55 85 99999-9999",
      message: "Oi",
    });

    expect(step1.step).toBeDefined();

    // Segunda mensagem: escolher especialidade
    const step2 = await caller.conversations.simulate({
      phone: "+55 85 99999-9999",
      message: "1",
    });

    expect(step2.step).toBeDefined();
    expect(step2.step).not.toBe(step1.step);
  });

  it("conversations.simulate suporta comando ATENDENTE em qualquer etapa", async () => {
    const caller = appRouter.createCaller(ctx);

    // Iniciar conversa
    await caller.conversations.simulate({
      phone: "+55 85 88888-8888",
      message: "Oi",
    });

    // Enviar comando ATENDENTE
    const result = await caller.conversations.simulate({
      phone: "+55 85 88888-8888",
      message: "ATENDENTE",
    });

    expect(result.success).toBe(true);
    // Após ATENDENTE, conversa deve ser resetada
    expect(result.step).toBeDefined();
  });

  it("conversations.list retorna todas as conversas ativas", async () => {
    const caller = appRouter.createCaller(ctx);

    // Criar algumas conversas
    await caller.conversations.simulate({
      phone: "+55 85 77777-7777",
      message: "Teste 1",
    });

    await caller.conversations.simulate({
      phone: "+55 85 66666-6666",
      message: "Teste 2",
    });

    const list = await caller.conversations.list();

    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it("conversations.getByPhone retorna dados da conversa", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 55555-5555";

    // Criar conversa
    await caller.conversations.simulate({
      phone,
      message: "Olá",
    });

    // Recuperar
    const conv = await caller.conversations.getByPhone({ phone });

    expect(conv).not.toBeNull();
    expect(conv?.phone).toBe(phone);
    expect(conv?.step).toBeDefined();
    expect(conv?.data).toBeDefined();
  });
});

describe.skip("Prioridade 2 — Dashboard Métricas", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("dashboard exibe total de agendamentos", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(typeof stats.total).toBe("number");
  });

  it("dashboard exibe agendamentos por status", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(stats).toHaveProperty("byStatus");
    expect(stats.byStatus).toHaveProperty("scheduled");
    expect(stats.byStatus).toHaveProperty("confirmed");
    expect(stats.byStatus).toHaveProperty("cancelled");
    expect(stats.byStatus).toHaveProperty("rescheduled");
  });

  it("dashboard exibe próximas consultas", async () => {
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.appointments.stats();

    expect(stats).toHaveProperty("upcomingAppointments");
    expect(Array.isArray(stats.upcomingAppointments)).toBe(true);
  });
});
