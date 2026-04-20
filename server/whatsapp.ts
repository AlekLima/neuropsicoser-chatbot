import axios from "axios";
import { getSetting } from "./db";

const WA_API_VERSION = "v20.0";

async function getConfig() {
  const token = await getSetting("whatsapp_token");
  const phoneId = await getSetting("whatsapp_phone_id");
  return { token, phoneId };
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  const { token, phoneId } = await getConfig();
  if (!token || !phoneId) {
    console.warn("[WhatsApp] Token ou Phone ID não configurados.");
    return;
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${phoneId}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("[WhatsApp] Erro ao enviar mensagem:", error.response?.data ?? error.message);
    } else {
      console.error("[WhatsApp] Erro desconhecido:", error);
    }
  }
}

export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  const { token, phoneId } = await getConfig();
  if (!token || !phoneId) return;

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${phoneId}/messages`;

  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: {
            buttons: buttons.map((b) => ({
              type: "reply",
              reply: { id: b.id, title: b.title },
            })),
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("[WhatsApp] Erro ao enviar botões:", error.response?.data ?? error.message);
    } else {
      console.error("[WhatsApp] Erro desconhecido:", error);
    }
  }
}
