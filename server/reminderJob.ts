import {
  getAppointmentsDueForReminder,
  updateAppointment,
  getProfessionalById,
  getSetting,
  upsertConversation,
} from "./db";
import { sendTextMessage } from "./whatsapp";

function formatDateTime(date: Date): string {
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const day = days[date.getDay()];
  const dd = date.getDate().toString().padStart(2, "0");
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const hh = date.getHours().toString().padStart(2, "0");
  const min = date.getMinutes().toString().padStart(2, "0");
  return `${day}, ${dd}/${mm} às ${hh}h${min}`;
}

export async function sendReminders(): Promise<void> {
  const appointments = await getAppointmentsDueForReminder();

  if (appointments.length === 0) return;

  console.log(`[Reminder] Enviando ${appointments.length} lembrete(s)...`);

  const address = (await getSetting("clinic_address")) ?? "Rua Maria Tomásia, 1355 - Aldeota, Fortaleza - CE";

  for (const appt of appointments) {
    try {
      const professional = await getProfessionalById(appt.professionalId);
      const dateLabel = formatDateTime(appt.dateTime);

      let msg = `🔔 Olá! Tudo bem?\n\n`;
      msg += `Passando para te lembrar que você tem uma consulta agendada *amanhã* na Neuropsicoser!\n\n`;
      msg += `📋 *Resumo do seu agendamento:*\n`;
      msg += `👨‍⚕️ Profissional: ${professional?.name ?? "A confirmar"}\n`;
      msg += `📅 Data: ${dateLabel}\n`;
      msg += `📍 Endereço: ${address}\n\n`;
      msg += `*Lembretes importantes:*\n`;
      msg += `• Chegue com 20 minutos de antecedência\n`;
      msg += `• Traga um documento com foto\n`;
      if (appt.paymentType === "convenio") {
        msg += `• Traga sua carteirinha do plano\n`;
      }
      msg += `\n*Precisa cancelar ou remarcar?*\n`;
      msg += `Digite *REMARCAR* para ver novos horários\n`;
      msg += `Digite *CANCELAR* para cancelar sua consulta\n`;
      msg += `Digite *CONFIRMAR* para confirmar sua presença`;

      await sendTextMessage(appt.phone, msg);

      // Marcar lembrete como enviado
      await updateAppointment(appt.id, { reminderSent: true });

      // Colocar conversa no estado de resposta ao lembrete
      await upsertConversation(appt.phone, "reminder_response", {
        appointmentId: appt.id,
      });

      console.log(`[Reminder] Lembrete enviado para ${appt.phone} (agendamento #${appt.id})`);
    } catch (e) {
      console.error(`[Reminder] Erro ao enviar lembrete para agendamento #${appt.id}:`, e);
    }
  }
}

// Iniciar job de verificação a cada 30 minutos
export function startReminderJob(): void {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

  console.log("[Reminder] Job de lembretes iniciado (intervalo: 30 min)");

  // Executar imediatamente ao iniciar
  sendReminders().catch((e) => console.error("[Reminder] Erro na execução inicial:", e));

  // Executar periodicamente
  setInterval(() => {
    sendReminders().catch((e) => console.error("[Reminder] Erro na execução periódica:", e));
  }, INTERVAL_MS);
}
