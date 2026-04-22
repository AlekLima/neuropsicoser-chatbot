import { google } from "googleapis";
import { getSetting } from "./db";

const SLOT_DURATION_MINUTES = 60;
const WORKING_HOURS = { start: 8, end: 18 }; // 08:00 - 18:00

async function getCalendarClient() {
  const credentialsJson = await getSetting("google_calendar_credentials");
  if (!credentialsJson) {
    throw new Error("Google Calendar credentials not configured");
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error("Invalid Google Calendar credentials JSON");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  const calendar = google.calendar({ version: "v3", auth });
  return calendar;
}

function formatSlotLabel(date: Date): string {
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  const dayName = days[date.getDay()];
  const day = date.getDate().toString().padStart(2, "0");
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${dayName}, ${day}/${month} — ${hours}h${minutes}`;
}

export async function getAvailableSlots(
  calendarId: string,
  daysAhead: number = 7
): Promise<{ label: string; dateTime: string }[]> {
  const calendar = await getCalendarClient();

  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setHours(timeMin.getHours() + 2); // Mínimo 2h de antecedência
  timeMin.setMinutes(0, 0, 0); // Arredondar para hora cheia

  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + daysAhead);
  timeMax.setHours(23, 59, 59, 999);

  // Buscar eventos existentes no período
  const eventsResponse = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const busySlots = (eventsResponse.data.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      start: new Date(e.start?.dateTime ?? e.start?.date ?? ""),
      end: new Date(e.end?.dateTime ?? e.end?.date ?? ""),
    }));

  // Gerar slots disponíveis com validação rigorosa
  const availableSlots: { label: string; dateTime: string }[] = [];
  const current = new Date(timeMin);
  current.setMinutes(0, 0, 0);
  current.setSeconds(0, 0);

  // Rastrear dias com slots disponíveis para sugestão
  const daysWithSlots = new Set<string>();

  while (current < timeMax && availableSlots.length < 15) {
    const dayOfWeek = current.getDay();

    // Pular domingos (0) e sábados (6)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORKING_HOURS.start, 0, 0, 0);
      continue;
    }

    const hour = current.getHours();

    // Fora do horário de trabalho
    if (hour < WORKING_HOURS.start) {
      current.setHours(WORKING_HOURS.start, 0, 0, 0);
      continue;
    }

    if (hour >= WORKING_HOURS.end) {
      current.setDate(current.getDate() + 1);
      current.setHours(WORKING_HOURS.start, 0, 0, 0);
      continue;
    }

    // Garantir que o slot é exatamente 1h
    const slotEnd = new Date(current.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    // Verificar se o slot conflita com algum evento existente
    const isBusy = busySlots.some(
      (busy) => current < busy.end && slotEnd > busy.start
    );

    if (!isBusy) {
      availableSlots.push({
        label: formatSlotLabel(new Date(current)),
        dateTime: current.toISOString(),
      });
      // Rastrear dia com slot disponível
      const dayKey = current.toISOString().split('T')[0];
      daysWithSlots.add(dayKey);
    }

    current.setHours(current.getHours() + 1);
  }

  // Se não houver slots, retornar lista vazia com mensagem de contexto
  if (availableSlots.length === 0) {
    console.warn(`[Calendar] Nenhum slot disponível para ${calendarId} nos próximos ${daysAhead} dias`);
  }

  return availableSlots;
}

export async function createCalendarEvent(params: {
  calendarId: string;
  title: string;
  dateTime: Date;
  durationMinutes: number;
  description?: string;
}): Promise<string> {
  const calendar = await getCalendarClient();

  const endTime = new Date(params.dateTime.getTime() + params.durationMinutes * 60 * 1000);

  const event = await calendar.events.insert({
    calendarId: params.calendarId,
    requestBody: {
      summary: params.title,
      description: params.description,
      start: {
        dateTime: params.dateTime.toISOString(),
        timeZone: "America/Fortaleza",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "America/Fortaleza",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    },
  });

  return event.data.id ?? "";
}

export async function deleteCalendarEvent(calendarId: string, eventId: string): Promise<void> {
  try {
    const calendar = await getCalendarClient();
    await calendar.events.delete({ calendarId, eventId });
  } catch (e) {
    console.error("[Calendar] Erro ao deletar evento:", e);
  }
}
