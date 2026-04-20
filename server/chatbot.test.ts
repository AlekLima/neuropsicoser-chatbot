import { describe, it, expect } from "vitest";

// ─── Testes do motor de fluxo conversacional ──────────────────────────────────

describe("Fluxo conversacional — normalização de texto", () => {
  function normalize(text: string): string {
    return text.trim().toUpperCase();
  }

  it("deve normalizar texto para maiúsculas e remover espaços", () => {
    expect(normalize("  atendente  ")).toBe("ATENDENTE");
    expect(normalize("confirmar")).toBe("CONFIRMAR");
    expect(normalize("cancelar")).toBe("CANCELAR");
    expect(normalize("remarcar")).toBe("REMARCAR");
  });

  it("deve detectar o comando ATENDENTE corretamente", () => {
    const isAttendant = (text: string) => normalize(text) === "ATENDENTE";
    expect(isAttendant("ATENDENTE")).toBe(true);
    expect(isAttendant("atendente")).toBe(true);
    expect(isAttendant("Atendente")).toBe(true);
    expect(isAttendant("  ATENDENTE  ")).toBe(true);
    expect(isAttendant("outro texto")).toBe(false);
  });
});

describe("Fluxo conversacional — seleção por número", () => {
  function selectByIndex<T>(items: T[], input: string): T | null {
    const num = parseInt(input.trim());
    if (isNaN(num) || num < 1 || num > items.length) return null;
    return items[num - 1] ?? null;
  }

  it("deve selecionar item correto pelo número", () => {
    const items = ["Psicologia", "Neuropsicologia", "Fisioterapia"];
    expect(selectByIndex(items, "1")).toBe("Psicologia");
    expect(selectByIndex(items, "2")).toBe("Neuropsicologia");
    expect(selectByIndex(items, "3")).toBe("Fisioterapia");
  });

  it("deve retornar null para seleção inválida", () => {
    const items = ["A", "B"];
    expect(selectByIndex(items, "0")).toBeNull();
    expect(selectByIndex(items, "3")).toBeNull();
    expect(selectByIndex(items, "abc")).toBeNull();
    expect(selectByIndex(items, "-1")).toBeNull();
  });
});

describe("Fluxo conversacional — pagamento", () => {
  function parsePaymentChoice(input: string): "particular" | "convenio" | null {
    const n = input.trim();
    if (n === "1") return "particular";
    if (n === "2") return "convenio";
    return null;
  }

  it("deve identificar pagamento particular (opção 1)", () => {
    expect(parsePaymentChoice("1")).toBe("particular");
  });

  it("deve identificar convênio (opção 2)", () => {
    expect(parsePaymentChoice("2")).toBe("convenio");
  });

  it("deve retornar null para opção inválida", () => {
    expect(parsePaymentChoice("3")).toBeNull();
    expect(parsePaymentChoice("abc")).toBeNull();
    expect(parsePaymentChoice("")).toBeNull();
  });
});

describe("Fluxo conversacional — resposta ao lembrete", () => {
  function parseReminderResponse(text: string): "confirm" | "reschedule" | "cancel" | null {
    const normalized = text.trim().toUpperCase();
    if (normalized === "CONFIRMAR") return "confirm";
    if (normalized === "REMARCAR") return "reschedule";
    if (normalized === "CANCELAR") return "cancel";
    return null;
  }

  it("deve reconhecer CONFIRMAR", () => {
    expect(parseReminderResponse("CONFIRMAR")).toBe("confirm");
    expect(parseReminderResponse("confirmar")).toBe("confirm");
  });

  it("deve reconhecer REMARCAR", () => {
    expect(parseReminderResponse("REMARCAR")).toBe("reschedule");
    expect(parseReminderResponse("remarcar")).toBe("reschedule");
  });

  it("deve reconhecer CANCELAR", () => {
    expect(parseReminderResponse("CANCELAR")).toBe("cancel");
    expect(parseReminderResponse("cancelar")).toBe("cancel");
  });

  it("deve retornar null para texto não reconhecido", () => {
    expect(parseReminderResponse("oi")).toBeNull();
    expect(parseReminderResponse("sim")).toBeNull();
  });
});

// ─── Testes de formatação de mensagens ────────────────────────────────────────

describe("Formatação de data/hora", () => {
  function formatDateTime(date: Date): string {
    const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const day = days[date.getDay()];
    const dd = date.getDate().toString().padStart(2, "0");
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const hh = date.getHours().toString().padStart(2, "0");
    const min = date.getMinutes().toString().padStart(2, "0");
    return `${day}, ${dd}/${mm} às ${hh}h${min}`;
  }

  it("deve formatar data corretamente", () => {
    // Segunda-feira, 21 de abril de 2025, 14h30
    const date = new Date(2025, 3, 21, 14, 30); // mês 3 = abril
    const result = formatDateTime(date);
    expect(result).toContain("21/04");
    expect(result).toContain("14h30");
  });

  it("deve incluir o nome do dia da semana", () => {
    const monday = new Date(2025, 3, 21); // segunda-feira
    const result = formatDateTime(monday);
    expect(result).toContain("Segunda-feira");
  });

  it("deve preencher zeros à esquerda", () => {
    const date = new Date(2025, 0, 5, 9, 5); // 05/01, 09h05
    const result = formatDateTime(date);
    expect(result).toContain("05/01");
    expect(result).toContain("09h05");
  });
});
