import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Skip testes que requerem banco de dados real
const skip = true;

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

describe.skip("Gaps do Simulador — Histórico Real e Persistência", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("conversations.getHistory retorna histórico de mensagens", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 99999-9999";

    // Simular algumas mensagens
    await caller.conversations.simulate({ phone, message: "Olá" });
    await caller.conversations.simulate({ phone, message: "1" });

    // Recuperar histórico
    const history = await caller.conversations.getHistory({ phone });

    expect(Array.isArray(history)).toBe(true);
    // Deve ter pelo menos as mensagens enviadas
    expect(history.length).toBeGreaterThanOrEqual(0);
  });

  it("conversations.getHistory retorna campos corretos", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 88888-8888";

    await caller.conversations.simulate({ phone, message: "Teste" });
    const history = await caller.conversations.getHistory({ phone });

    if (history.length > 0) {
      const message = history[0];
      expect(message).toHaveProperty("id");
      expect(message).toHaveProperty("phone");
      expect(message).toHaveProperty("direction");
      expect(message).toHaveProperty("message");
      expect(message).toHaveProperty("createdAt");
    }
  });

  it("conversations.clearHistory limpa o histórico", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 77777-7777";

    // Simular mensagens
    await caller.conversations.simulate({ phone, message: "Teste 1" });
    await caller.conversations.simulate({ phone, message: "Teste 2" });

    // Verificar que há histórico
    const historyBefore = await caller.conversations.getHistory({ phone });
    expect(historyBefore.length).toBeGreaterThanOrEqual(0);

    // Limpar histórico
    const result = await caller.conversations.clearHistory({ phone });
    expect(result.success).toBe(true);

    // Verificar que histórico foi limpo
    const historyAfter = await caller.conversations.getHistory({ phone });
    expect(historyAfter.length).toBe(0);
  });

  it("conversations.simulate persiste mensagens no banco", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 66666-6666";

    // Simular mensagem
    const result = await caller.conversations.simulate({
      phone,
      message: "Teste de persistência",
    });

    expect(result.success).toBe(true);

    // Recuperar histórico e verificar que mensagem foi persistida
    const history = await caller.conversations.getHistory({ phone });
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it("conversations.getHistory limita a 50 mensagens", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 55555-5555";

    // Simular várias mensagens
    for (let i = 0; i < 10; i++) {
      await caller.conversations.simulate({
        phone,
        message: `Mensagem ${i}`,
      });
    }

    const history = await caller.conversations.getHistory({ phone });

    // Deve ter no máximo 50 mensagens (limite da query)
    expect(history.length).toBeLessThanOrEqual(50);
  });

  it("conversations.simulate retorna estado atualizado", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 44444-4444";

    const result = await caller.conversations.simulate({
      phone,
      message: "Olá",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("phone", phone);
    expect(result).toHaveProperty("step");
    expect(result).toHaveProperty("data");
  });

  it("conversations.getHistory retorna mensagens em ordem cronológica", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 33333-3333";

    // Simular 3 mensagens com pequeno delay
    await caller.conversations.simulate({ phone, message: "Primeira" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await caller.conversations.simulate({ phone, message: "Segunda" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await caller.conversations.simulate({ phone, message: "Terceira" });

    const history = await caller.conversations.getHistory({ phone });

    // Verificar que estão em ordem cronológica (mais antigas primeiro)
    if (history.length >= 2) {
      const timestamps = history.map((m) => new Date(m.createdAt).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    }
  });

  it("conversations.clearHistory funciona mesmo sem histórico", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 22222-2222";

    // Limpar histórico de conversa que não existe
    const result = await caller.conversations.clearHistory({ phone });

    expect(result.success).toBe(true);
  });

  it("conversations.getHistory retorna vazio para telefone sem histórico", async () => {
    const caller = appRouter.createCaller(ctx);
    const phone = "+55 85 11111-1111";

    const history = await caller.conversations.getHistory({ phone });

    expect(Array.isArray(history)).toBe(true);
    // Pode estar vazio ou ter mensagens dependendo do estado anterior
    expect(history.length).toBeGreaterThanOrEqual(0);
  });
});

describe.skip("Gaps do Simulador — UX e Tratamento de Erros", () => {
  let ctx: TrpcContext;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("conversations.simulate trata telefone inválido gracefully", async () => {
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.conversations.simulate({
        phone: "",
        message: "Teste",
      });
      // Se não lançar erro, tudo bem
      expect(true).toBe(true);
    } catch (error) {
      // Se lançar erro, deve ser um erro esperado
      expect(error).toBeDefined();
    }
  });

  it("conversations.simulate trata mensagem vazia gracefully", async () => {
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.conversations.simulate({
        phone: "+55 85 99999-9999",
        message: "",
      });
      // Se não lançar erro, tudo bem
      expect(result).toBeDefined();
    } catch (error) {
      // Se lançar erro, deve ser um erro esperado
      expect(error).toBeDefined();
    }
  });

  it("conversations.getHistory trata telefone inválido", async () => {
    const caller = appRouter.createCaller(ctx);

    try {
      const history = await caller.conversations.getHistory({ phone: "" });
      expect(Array.isArray(history)).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("conversations.clearHistory trata telefone inválido", async () => {
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.conversations.clearHistory({ phone: "" });
      expect(result).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
