import {
  getConversation,
  upsertConversation,
  resetConversation,
  getSpecialties,
  getProfessionalsBySpecialty,
  getProfessionalById,
  getActiveInsurancePlans,
  getProfessionalInsurances,
  createAppointment,
  getSetting,
  logMessage,
} from "./db";
import { sendTextMessage } from "./whatsapp";
import { getAvailableSlots, createCalendarEvent } from "./googleCalendar";

// ─── Step constants ───────────────────────────────────────────────────────────
const STEPS = {
  START: "start",
  CHOOSE_SPECIALTY: "choose_specialty",
  CHOOSE_PROFESSIONAL: "choose_professional",
  CHOOSE_PAYMENT: "choose_payment",
  CONFIRM_PARTICULAR: "confirm_particular",
  CHOOSE_INSURANCE: "choose_insurance",
  CHOOSE_SLOT: "choose_slot",
  CONFIRM_APPOINTMENT: "confirm_appointment",
  DONE: "done",
  REMINDER_RESPONSE: "reminder_response",
} as const;

function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeInput(text: string): string {
  return text.trim().toUpperCase();
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function handleIncomingMessage(phone: string, messageText: string): Promise<string> {
  const cleanPhone = formatPhone(phone);
  const input = normalizeInput(messageText);

  // Log mensagem de entrada
  await logMessage(cleanPhone, "inbound", messageText);

  // Global escape: ATENDENTE
  if (input === "ATENDENTE") {
    await handleAttendantRedirect(cleanPhone);
    return "Você será redirecionado para nosso atendimento humano.";
  }

  const conv = await getConversation(cleanPhone);
  const step = conv?.step ?? STEPS.START;
  const data = (conv?.data as Record<string, unknown>) ?? {};

  switch (step) {
    case STEPS.START:
    case STEPS.DONE:
      await handleStart(cleanPhone);
      break;
    case STEPS.CHOOSE_SPECIALTY:
      await handleChooseSpecialty(cleanPhone, input, data);
      break;
    case STEPS.CHOOSE_PROFESSIONAL:
      await handleChooseProfessional(cleanPhone, input, data);
      break;
    case STEPS.CHOOSE_PAYMENT:
      await handleChoosePayment(cleanPhone, input, data);
      break;
    case STEPS.CONFIRM_PARTICULAR:
      await handleConfirmParticular(cleanPhone, input, data);
      break;
    case STEPS.CHOOSE_INSURANCE:
      await handleChooseInsurance(cleanPhone, input, data);
      break;
    case STEPS.CHOOSE_SLOT:
      await handleChooseSlot(cleanPhone, input, data);
      break;
    case STEPS.CONFIRM_APPOINTMENT:
      await handleConfirmAppointment(cleanPhone, input, data);
      break;
    case STEPS.REMINDER_RESPONSE:
      await handleReminderResponse(cleanPhone, input, data);
      break;
    default:
      await handleStart(cleanPhone);
  }
  return "Mensagem processada com sucesso.";
}

// ─── Step handlers ────────────────────────────────────────────────────────────

async function handleStart(phone: string): Promise<void> {
  const specialties = await getSpecialties();
  const clinicName = (await getSetting("clinic_name")) ?? "Neuropsicoser";

  let msg = `🌿 Olá! Seja bem-vindo(a) à ${clinicName} — Saúde Mental e Desenvolvimento.\n\n`;
  msg += `Estamos aqui para te ajudar a agendar sua consulta de forma rápida e fácil. 😊\n\n`;
  msg += `Em qual especialidade você deseja ser atendido(a)?\n\n`;

  specialties.forEach((s, i) => {
    msg += `${i + 1} — ${s.name}\n`;
  });

  msg += `\n${specialties.length + 1} — Para cancelar ou remarcar consulta (será encaminhado para um atendente)\n`;
  msg += `${specialties.length + 2} — Fale com um de nossos atendentes\n\n`;
  msg += `Digite o número da opção desejada.`;

  await upsertConversation(phone, STEPS.CHOOSE_SPECIALTY, {
    specialties: specialties.map((s) => ({ id: s.id, name: s.name })),
  });
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await logMessage(phone, "outbound", msg);
  await sendTextMessage(phone, msg);
}

async function handleChooseSpecialty(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  const specialties = (data.specialties as { id: number; name: string }[]) ?? [];
  const num = parseInt(input);

  // Opção de atendente direto
  if (num === specialties.length + 1 || num === specialties.length + 2) {
    await handleAttendantRedirect(phone);
    return;
  }

  if (isNaN(num) || num < 1 || num > specialties.length) {
    await sendTextMessage(
      phone,
      `Por favor, digite um número válido entre 1 e ${specialties.length + 2}.\n\nOu digite ATENDENTE para falar com nossa equipe.`
    );
    return;
  }

  const specialty = specialties[num - 1];
  const professionals = await getProfessionalsBySpecialty(specialty.id);

  if (professionals.length === 0) {
    await sendTextMessage(
      phone,
      `Desculpe, não há profissionais disponíveis para ${specialty.name} no momento.\n\nDigite ATENDENTE para falar com nossa equipe ou 0 para voltar ao início.`
    );
    return;
  }

  let msg = `Ótima escolha! 💙 Temos os seguintes profissionais disponíveis em *${specialty.name}*:\n\n`;
  professionals.forEach((p, i) => {
    const crp = p.crp ? ` — CRP ${p.crp}` : "";
    msg += `${i + 1} — ${p.name}${crp}\n`;
  });
  msg += `\n0 — Sem preferência (escolheremos o primeiro disponível)\n\nQual profissional você prefere? Digite o número.`;

  await upsertConversation(phone, STEPS.CHOOSE_PROFESSIONAL, {
    specialtyId: specialty.id,
    specialtyName: specialty.name,
    professionals: professionals.map((p) => ({ id: p.id, name: p.name, price: p.price, crp: p.crp })),
  });
  await sendTextMessage(phone, msg);
}

async function handleChooseProfessional(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  const professionals = (data.professionals as { id: number; name: string; price: string | null; crp: string | null }[]) ?? [];
  const num = parseInt(input);

  let selectedProfessional: { id: number; name: string; price: string | null; crp: string | null };

  if (num === 0) {
    selectedProfessional = professionals[0];
  } else if (isNaN(num) || num < 1 || num > professionals.length) {
    await logMessage(phone, "outbound", `Por favor, digite um número entre 0 e ${professionals.length}.`);
  await sendTextMessage(phone, `Por favor, digite um número entre 0 e ${professionals.length}.`);
    return;
  } else {
    selectedProfessional = professionals[num - 1];
  }

  let msg = `Perfeito! 👍 Sua consulta será com *${selectedProfessional.name}*.\n\n`;
  msg += `Como você vai realizar o pagamento?\n\n`;
  msg += `1 — Particular (pagamento direto)\n`;
  msg += `2 — Convênio / Plano de saúde`;

  await upsertConversation(phone, STEPS.CHOOSE_PAYMENT, {
    ...data,
    professionalId: selectedProfessional.id,
    professionalName: selectedProfessional.name,
    professionalPrice: selectedProfessional.price,
  });
  await sendTextMessage(phone, msg);
}

async function handleChoosePayment(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  if (input === "1") {
    const price = data.professionalPrice ? `R$ ${Number(data.professionalPrice).toFixed(2).replace(".", ",")}` : "a consultar";
    let msg = `💵 Valor da consulta com *${data.professionalName}*: *${price}*\n\n`;
    msg += `Formas de pagamento aceitas: PIX, cartão de crédito/débito ou dinheiro.\n\n`;
    msg += `Deseja continuar e ver os horários disponíveis?\n\n`;
    msg += `*SIM* — prosseguir\n*NÃO* — encerrar atendimento\n*0* — falar com atendente`;

    await upsertConversation(phone, STEPS.CONFIRM_PARTICULAR, { ...data, paymentType: "particular" });
    await sendTextMessage(phone, msg);
  } else if (input === "2") {
    const profId = data.professionalId as number;
    const insuranceIds = await getProfessionalInsurances(profId);
    const allPlans = await getActiveInsurancePlans();
    const plans = allPlans.filter((p) => insuranceIds.includes(p.id));

    if (plans.length === 0) {
      await sendTextMessage(
        phone,
        `Este profissional não aceita convênios no momento.\n\nDeseja continuar como particular? Digite *SIM* para ver os valores ou *NÃO* para encerrar.\n\nOu digite ATENDENTE para falar com nossa equipe.`
      );
      return;
    }

    let msg = `📋 Os convênios aceitos por *${data.professionalName}* são:\n\n`;
    plans.forEach((p) => { msg += `✅ ${p.name}\n`; });
    msg += `\nSeu plano está na lista?\n\n`;
    plans.forEach((p, i) => { msg += `${i + 1} — ${p.name}\n`; });
    msg += `\n0 — Ver opções particulares\n\n`;
    msg += `_(Em caso de convênio, traga sua carteirinha e um documento com foto.)_`;

    await upsertConversation(phone, STEPS.CHOOSE_INSURANCE, {
      ...data,
      paymentType: "convenio",
      availablePlans: plans.map((p) => ({ id: p.id, name: p.name })),
    });
    await sendTextMessage(phone, msg);
  } else {
    await logMessage(phone, "outbound", `Por favor, digite *1* para Particular ou *2* para Convênio.`);
  await sendTextMessage(phone, `Por favor, digite *1* para Particular ou *2* para Convênio.`);
  }
}

async function handleConfirmParticular(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  if (input === "SIM" || input === "S") {
    await showAvailableSlots(phone, data);
  } else if (input === "NÃO" || input === "NAO" || input === "N") {
    await resetConversation(phone);
    await logMessage(phone, "outbound", `Tudo bem! Se precisar de nós, é só chamar. Até logo! 🌿`);
  await sendTextMessage(phone, `Tudo bem! Se precisar de nós, é só chamar. Até logo! 🌿`);
  } else if (input === "0") {
    await handleAttendantRedirect(phone);
  } else {
    await logMessage(phone, "outbound", `Por favor, responda *SIM*, *NÃO* ou *0* para atendente.`);
  await sendTextMessage(phone, `Por favor, responda *SIM*, *NÃO* ou *0* para atendente.`);
  }
}

async function handleChooseInsurance(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  const plans = (data.availablePlans as { id: number; name: string }[]) ?? [];

  if (input === "0") {
    const price = data.professionalPrice ? `R$ ${Number(data.professionalPrice).toFixed(2).replace(".", ",")}` : "a consultar";
    let msg = `💵 Valor da consulta com *${data.professionalName}*: *${price}*\n\n`;
    msg += `Formas de pagamento aceitas: PIX, cartão de crédito/débito ou dinheiro.\n\n`;
    msg += `Deseja continuar e ver os horários disponíveis?\n\n*SIM* — prosseguir\n*NÃO* — encerrar`;
    await upsertConversation(phone, STEPS.CONFIRM_PARTICULAR, { ...data, paymentType: "particular", insuranceId: null });
    await sendTextMessage(phone, msg);
    return;
  }

  const num = parseInt(input);
  if (isNaN(num) || num < 1 || num > plans.length) {
    await logMessage(phone, "outbound", `Por favor, digite um número entre 1 e ${plans.length} ou 0 para opção particular.`);
  await sendTextMessage(phone, `Por favor, digite um número entre 1 e ${plans.length} ou 0 para opção particular.`);
    return;
  }

  const plan = plans[num - 1];
  await upsertConversation(phone, STEPS.CHOOSE_SLOT, {
    ...data,
    paymentType: "convenio",
    insuranceId: plan.id,
    insuranceName: plan.name,
  });
  await showAvailableSlots(phone, { ...data, paymentType: "convenio", insuranceId: plan.id, insuranceName: plan.name });
}

async function showAvailableSlots(phone: string, data: Record<string, unknown>): Promise<void> {
  const profId = data.professionalId as number;
  const professional = await getProfessionalById(profId);

  let slots: { label: string; dateTime: string }[] = [];

  if (professional?.googleCalendarId) {
    try {
      const rawSlots = await getAvailableSlots(professional.googleCalendarId, 7);
      slots = rawSlots;
    } catch (e) {
      console.error("[Calendar] Erro ao buscar slots:", e);
    }
  }

  if (slots.length === 0) {
    await sendTextMessage(
      phone,
      `Não encontrei horários disponíveis no momento.\n\nDigite ATENDENTE para que nossa equipe verifique a agenda manualmente.`
    );
    return;
  }

  let msg = `📅 Horários disponíveis com *${data.professionalName}*:\n\n`;
  slots.slice(0, 10).forEach((s, i) => {
    msg += `${i + 1} — ${s.label}\n`;
  });
  msg += `\nDigite o número do horário desejado.`;

  await upsertConversation(phone, STEPS.CHOOSE_SLOT, {
    ...data,
    availableSlots: slots.slice(0, 10),
  });
  await sendTextMessage(phone, msg);
}

async function handleChooseSlot(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  const slots = (data.availableSlots as { label: string; dateTime: string }[]) ?? [];
  const num = parseInt(input);

  if (isNaN(num) || num < 1 || num > slots.length) {
    await logMessage(phone, "outbound", `Por favor, digite um número entre 1 e ${slots.length}.`);
  await sendTextMessage(phone, `Por favor, digite um número entre 1 e ${slots.length}.`);
    return;
  }

  const slot = slots[num - 1];
  const paymentType = data.paymentType as string;
  const insuranceName = data.insuranceName as string | undefined;

  let msg = `✅ Confirme seu agendamento:\n\n`;
  msg += `📌 Especialidade: ${data.specialtyName}\n`;
  msg += `👨‍⚕️ Profissional: ${data.professionalName}\n`;
  msg += `📅 Data/Horário: ${slot.label}\n`;
  if (paymentType === "particular") {
    const price = data.professionalPrice ? `R$ ${Number(data.professionalPrice).toFixed(2).replace(".", ",")}` : "a consultar";
    msg += `💳 Pagamento: Particular — ${price}\n`;
  } else {
    msg += `💳 Convênio: ${insuranceName}\n`;
  }
  msg += `\nDigite *CONFIRMAR* para agendar ou *CANCELAR* para desistir.`;

  await upsertConversation(phone, STEPS.CONFIRM_APPOINTMENT, {
    ...data,
    selectedSlot: slot,
  });
  await sendTextMessage(phone, msg);
}

async function handleConfirmAppointment(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  if (input === "CONFIRMAR") {
    const slot = data.selectedSlot as { label: string; dateTime: string };
    const profId = data.professionalId as number;
    const professional = await getProfessionalById(profId);
    const address = (await getSetting("clinic_address")) ?? "Rua Maria Tomásia, 1355 - Aldeota, Fortaleza - CE";
    const clinicName = (await getSetting("clinic_name")) ?? "Neuropsicoser";
    const isRescheduling = data.isRescheduling as boolean | undefined;
    const previousAppointmentId = data.previousAppointmentId as number | undefined;

    let googleEventId: string | undefined;

    // Se for reagendamento, cancelar evento anterior
    if (isRescheduling && previousAppointmentId) {
      const { getAppointmentById, updateAppointment } = await import("./db");
      const { deleteCalendarEvent } = await import("./googleCalendar");
      const oldAppt = await getAppointmentById(previousAppointmentId);
      if (oldAppt?.googleEventId && professional?.googleCalendarId) {
        try {
          await deleteCalendarEvent(professional.googleCalendarId, oldAppt.googleEventId);
        } catch (e) {
          console.error("[Calendar] Erro ao deletar evento anterior:", e);
        }
      }
      // Marcar agendamento anterior como remarcado
      await updateAppointment(previousAppointmentId, { status: "rescheduled" });
    }

    // Criar novo evento no Google Calendar
    if (professional?.googleCalendarId) {
      try {
        const eventId = await createCalendarEvent({
          calendarId: professional.googleCalendarId,
          title: `Consulta — ${data.specialtyName} — ${phone}`,
          dateTime: new Date(slot.dateTime),
          durationMinutes: 60,
          description: `Paciente: ${phone}\nEspecialidade: ${data.specialtyName}\nPagamento: ${data.paymentType}`,
        });
        googleEventId = eventId;
      } catch (e) {
        console.error("[Calendar] Erro ao criar evento:", e);
      }
    }

    // Salvar novo agendamento ou atualizar o anterior
    if (isRescheduling && previousAppointmentId) {
      const { updateAppointment } = await import("./db");
      await updateAppointment(previousAppointmentId, {
        dateTime: new Date(slot.dateTime),
        status: "scheduled",
        googleEventId,
      });
    } else {
      await createAppointment({
        phone,
        professionalId: profId,
        specialtyId: data.specialtyId as number,
        dateTime: new Date(slot.dateTime),
        paymentType: data.paymentType as "particular" | "convenio",
        insuranceId: data.insuranceId ? (data.insuranceId as number) : undefined,
        status: "scheduled",
        googleEventId,
      });
    }

    await resetConversation(phone);

    // Notificar profissional via WhatsApp
    if (professional?.phone) {
      try {
        const patientPhone = phone;
        const notifMsg = `📢 *Novo Agendamento!*\n\n👤 Paciente: ${patientPhone}\n📌 Especialidade: ${data.specialtyName}\n📅 Data/Hora: ${slot.label}\n💳 Pagamento: ${data.paymentType === "particular" ? "Particular" : "Convênio"}\n\nAcesse o painel para mais detalhes.`;
        await sendTextMessage(professional.phone, notifMsg);
        console.log(`[Notification] Profissional ${professional.name} notificado`);
      } catch (e) {
        console.error("[Notification] Erro ao notificar profissional:", e);
      }
    }

    // Formatar data/hora para Google Calendar
    const appointmentDate = new Date(slot.dateTime);
    const startTime = appointmentDate.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const endTime = new Date(appointmentDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Consulta%20${encodeURIComponent(String(data.specialtyName))}%20-%20${encodeURIComponent(String(data.professionalName))}&dates=${startTime}/${endTime}&location=${encodeURIComponent(address)}&details=${encodeURIComponent(`Consulta com ${data.professionalName} em ${data.specialtyName}`)}`;

    let msg = `✅ *Consulta agendada com sucesso!*\n\n`;
    msg += `📌 Especialidade: ${data.specialtyName}\n`;
    msg += `👨‍⚕️ Profissional: ${data.professionalName}\n`;
    msg += `📅 Data/Horário: ${slot.label}\n`;
    if (data.paymentType === "particular") {
      const price = data.professionalPrice ? `R$ ${Number(data.professionalPrice).toFixed(2).replace(".", ",")}` : "a consultar";
      msg += `💳 Pagamento: Particular — ${price}\n`;
    } else {
      msg += `💳 Convênio: ${data.insuranceName}\n`;
      msg += `\n_Lembre-se de trazer sua carteirinha do plano e um documento com foto._\n`;
    }
    msg += `\n📍 Endereço: ${address}\n`;
    msg += `\n🔗 Adicionar à sua agenda: ${calendarLink}\n`;
    msg += `\nChegue com 20 minutos de antecedência e traga um documento com foto.\n`;
    msg += `Caso precise cancelar ou remarcar, entre em contato com pelo menos 24 horas de antecedência.\n\n`;
    msg += `🌿 Agradecemos a sua confiança na ${clinicName}! Até breve! 😊\n\n`;
    msg += `_(Digite ATENDENTE a qualquer momento para falar com nossa equipe.)_`;

    await sendTextMessage(phone, msg);
  } else if (input === "CANCELAR") {
    await resetConversation(phone);
    await sendTextMessage(
      phone,
      `Tudo bem! Seu agendamento foi cancelado.\n\nSe precisar de nós, é só chamar. Até logo! 🌿`
    );
  } else {
    await logMessage(phone, "outbound", `Por favor, responda *CONFIRMAR* para agendar ou *CANCELAR* para desistir.`);
  await sendTextMessage(phone, `Por favor, responda *CONFIRMAR* para agendar ou *CANCELAR* para desistir.`);
  }
}

async function handleReminderResponse(
  phone: string,
  input: string,
  data: Record<string, unknown>
): Promise<void> {
  const appointmentId = data.appointmentId as number;

  if (input === "CONFIRMAR") {
    if (appointmentId) {
      const { updateAppointment } = await import("./db");
      await updateAppointment(appointmentId, { status: "confirmed" });
    }
    await resetConversation(phone);
    await sendTextMessage(
      phone,
      `✅ Presença confirmada! Te esperamos amanhã. Não esqueça de chegar 20 minutos antes. 😊`
    );
  } else if (input === "CANCELAR") {
    if (appointmentId) {
      const { updateAppointment } = await import("./db");
      await updateAppointment(appointmentId, { status: "cancelled" });
    }
    await resetConversation(phone);
    await sendTextMessage(
      phone,
      `Consulta cancelada. Se quiser reagendar, é só nos chamar novamente. Até logo! 🌿`
    );
  } else if (input === "REMARCAR") {
    const appointmentId = data.appointmentId as number;
    // Manter o ID do agendamento anterior para atualização depois
    await upsertConversation(phone, STEPS.CHOOSE_SLOT, {
      ...data,
      isRescheduling: true,
      previousAppointmentId: appointmentId,
    });
    await sendTextMessage(
      phone,
      `Certo! Vamos encontrar um novo horário para você. 😊\n\nEscolha um dos horários disponíveis abaixo.`
    );
    // Recarregar os horários disponíveis
    const professional = await getProfessionalById(data.professionalId as number);
    if (professional?.googleCalendarId) {
      const slots = await getAvailableSlots(professional.googleCalendarId);
      if (slots.length > 0) {
        let msg = `📅 Novos horários disponíveis:\n\n`;
        slots.slice(0, 10).forEach((s, i) => {
          msg += `${i + 1} — ${s.label}\n`;
        });
        msg += `\nDigite o número do horário desejado.`;
        await upsertConversation(phone, STEPS.CHOOSE_SLOT, {
          ...data,
          isRescheduling: true,
          previousAppointmentId: appointmentId,
          availableSlots: slots.slice(0, 10),
        });
        await sendTextMessage(phone, msg);
      }
    }
  } else {
    await sendTextMessage(
      phone,
      `Por favor, responda:\n*CONFIRMAR* — confirmar presença\n*CANCELAR* — cancelar consulta\n*REMARCAR* — ver novos horários`
    );
  }
}

async function handleAttendantRedirect(phone: string): Promise<void> {
  const attendantPhone = await getSetting("attendant_phone");
  await resetConversation(phone);

  let msg = `Vou te conectar com um de nossos atendentes agora. 😊\n\n`;
  if (attendantPhone) {
    msg += `Por favor, entre em contato pelo número: *+${attendantPhone}*\n\n`;
    msg += `Ou aguarde, nossa equipe entrará em contato em breve.`;
  } else {
    msg += `Nossa equipe entrará em contato em breve. Obrigado pela paciência!`;
  }

  await sendTextMessage(phone, msg);
}
