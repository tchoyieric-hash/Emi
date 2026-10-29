import makeWASocket, { DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys";
import { createClient } from "@supabase/supabase-js";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedSenders = new Set((process.env.EMI_WHATSAPP_ALLOWED_SENDERS || "")
  .split(",").map(value => value.trim().replace(/[^0-9]/g, "")).filter(Boolean));

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Configure SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans l'environnement du worker.");
}
if (allowedSenders.size === 0) {
  throw new Error("Sécurité : définis EMI_WHATSAPP_ALLOWED_SENDERS avec les numéros autorisés, indicatif pays sans +, séparés par des virgules.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const authDir = path.resolve("whatsapp-emi-auth");
await mkdir(authDir, { recursive: true });
const { state, saveCreds } = await useMultiFileAuthState(authDir);
const seen = new Set();

function extractText(message) {
  const m = message?.message;
  return m?.conversation
    || m?.extendedTextMessage?.text
    || m?.imageMessage?.caption
    || m?.videoMessage?.caption
    || m?.documentMessage?.caption
    || "";
}

function mediaKind(message) {
  const m = message?.message;
  if (m?.imageMessage) return "image";
  if (m?.videoMessage) return "video";
  return "text";
}

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: true,
  markOnlineOnConnect: false,
  syncFullHistory: false,
  getMessage: async () => undefined
});

sock.ev.on("creds.update", saveCreds);
sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
  if (qr) console.log("Scanne ce QR avec WhatsApp > Appareils connectés.");
  if (connection === "open") console.log("Relais WhatsApp EMI connecté.");
  if (connection === "close") {
    const code = lastDisconnect?.error?.output?.statusCode;
    if (code !== DisconnectReason.loggedOut) {
      console.log("Connexion interrompue; Baileys tentera une reconnexion selon son état.");
    } else {
      console.error("Session WhatsApp déconnectée. Supprime le dossier whatsapp-emi-auth puis relance pour scanner un nouveau QR.");
    }
  }
});

sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") return;
  for (const message of messages) {
    try {
      if (!message?.key?.remoteJid || message.key.fromMe || message.key.remoteJid.endsWith("@g.us") || message.key.remoteJid.endsWith("@status")) continue;
      const sender = (message.key.participant || message.key.remoteJid).split("@")[0].replace(/[^0-9]/g, "");
      if (!allowedSenders.has(sender)) continue;

      const id = message.key.id;
      if (!id || seen.has(id)) continue;
      const text = extractText(message).trim();
      if (!/#emi\b/i.test(text)) continue;
      seen.add(id);
      if (seen.size > 5000) seen.clear();

      const kind = mediaKind(message);
      let mediaUrl = null;
      if (kind === "image" || kind === "video") {
        const buffer = await downloadMediaMessage(message, "buffer", {}, { logger: console });
        const mime = kind === "image" ? (message.message?.imageMessage?.mimetype || "image/jpeg") : (message.message?.videoMessage?.mimetype || "video/mp4");
        const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : kind === "video" ? "mp4" : "jpg";
        const objectPath = `whatsapp/${Date.now()}-${String(id).replace(/[^a-zA-Z0-9_-]/g, "")}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("emi_media").upload(objectPath, buffer, {
          contentType: mime, upsert: false
        });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("emi_media").getPublicUrl(objectPath);
        mediaUrl = data.publicUrl;
      }

      const caption = text.replace(/#emi\b/ig, "").trim();
      const { error: insertError } = await supabase.from("publications_emi").insert({
        texte: caption || null,
        media_url: mediaUrl,
        media_type: kind,
      });
      if (insertError) throw insertError;
      console.log(`Publication EMI ajoutée (${kind}) depuis WhatsApp; message ${id}.`);
    } catch (error) {
      console.error("Échec du relais WhatsApp EMI :", error?.message || error);
    }
  }
});
