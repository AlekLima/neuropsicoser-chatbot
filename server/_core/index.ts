import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getSetting } from "../db";
import { handleIncomingMessage } from "../chatbot";
import { startReminderJob } from "../reminderJob";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ─── WhatsApp Webhook ───────────────────────────────────────────────────────
  // GET: verificação de token pelo Meta
  app.get("/api/webhook", async (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = await getSetting("whatsapp_verify_token");

    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Webhook] Verificação de token bem-sucedida.");
      res.status(200).send(challenge);
    } else {
      console.warn("[Webhook] Token de verificação inválido:", token);
      res.status(403).send("Forbidden");
    }
  });

  // POST: receber mensagens
  app.post("/api/webhook", async (req, res) => {
    try {
      const body = req.body;

      if (body.object !== "whatsapp_business_account") {
        res.status(404).send("Not found");
        return;
      }

      const entries = body.entry ?? [];
      for (const entry of entries) {
        const changes = entry.changes ?? [];
        for (const change of changes) {
          const value = change.value;
          if (!value || change.field !== "messages") continue;

          const messages = value.messages ?? [];
          for (const message of messages) {
            if (message.type !== "text" && message.type !== "interactive") continue;

            const phone = message.from as string;
            let text = "";

            if (message.type === "text") {
              text = message.text?.body ?? "";
            } else if (message.type === "interactive") {
              // Botões interativos
              text = message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? "";
            }

            if (phone && text) {
              // Processar de forma assíncrona para responder 200 rapidamente
              handleIncomingMessage(phone, text).catch((e) =>
                console.error("[Webhook] Erro ao processar mensagem:", e)
              );
            }
          }
        }
      }

      res.status(200).send("EVENT_RECEIVED");
    } catch (e) {
      console.error("[Webhook] Erro:", e);
      res.status(500).send("Internal error");
    }
  });

  // ─── tRPC API ───────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ─── Static / Vite ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Iniciar job de lembretes
    startReminderJob();
  });
}

startServer().catch(console.error);
