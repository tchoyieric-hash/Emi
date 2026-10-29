import makeWASocket, { DisconnectReason, useMultiFileAuthState, downloadMediaMessage } from "@whiskeysockets/baileys";
import { createClient } from "@supabase/supabase-js";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedSenders = new Set((process.env.EMI_WHATSAPP_ALLOWED_SENDERS || "")
  .split(",").map(value => value.trim().replace(/[^0-9]/g, "")).filter(Boolean));
const authDir = path.resolve(process.env.WHATSAPP_AUTH_DIR || "whatsapp-emi-auth");
const bucket = "emi_media";

if (!supabaseUrl || !serviceRoleKey) throw new Error("Configure SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.");
if (!allowedSenders.size) throw new Error("Configure EMI_WHATSAPP_ALLOWED_SENDERS avec les numéros autorisés.");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
await mkdir(authDir, { recursive: true });
const { state, saveCreds } = await useMultiFileAuthState(authDir);
let reconnectTimer;
let reconnectDelay = 3000;
let stopping = false;

function unwrap(message) {
  let m = message?.message;
  for (let i = 0; i < 5 && m; i++) {
    const next = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message;
    if (!next) break;
    m = next;
  }
  return m || {};
}
function getText(message) {
  const m = unwrap(message);
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || m.documentMessage?.caption || "";
}
function getKind(message) {
  const m = unwrap(message);
  return m.imageMessage ? "image" : m.videoMessage ? "video" : "text";
}
function objectPathFromUrl(url) {
  const marker = "/storage/v1/object/public/" + bucket + "/";
  const i = (url || "").indexOf(marker);
  return i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}
async function cleanupExpired() {
  const cutoff = new Date(Date.now() - 86400000).toISOString();
  const { data, error } = await supabase.from("publications_emi").select("id,media_url").lt("created_at", cutoff).limit(500);
  if (error) { console.error("Lecture du nettoyage impossible :", error.message); return; }
  const paths = (data || []).map(row => objectPathFromUrl(row.media_url)).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
    if (storageError) console.error("Suppression des médias expirés :", storageError.message);
  }
  if (data?.length) {
    const { error: deleteError } = await supabase.from("publications_emi").delete().in("id", data.map(row => row.id));
    if (deleteError) console.error("Suppression des publications expirées :", deleteError.message);
    else console.log(`Nettoyage : ${data.length} publication(s) EMI expirée(s).`);
  }
}
async function relay(message) {
  const jid = message?.key?.remoteJid || "";
  if (!jid || message.key.fromMe || jid === "status@broadcast" || jid.endsWith("@g.us") || !jid.endsWith("@s.whatsapp.net")) return;
  const sender = jid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  if (!allowedSenders.has(sender)) return;
  const id = message.key.id;
  const text = getText(message).trim();
  if (!id || !/#emi\b/i.test(text)) return;

  const kind = getKind(message);
  let mediaUrl = null;
  if (kind !== "text") {
    const content = unwrap(message);
    const buffer = await downloadMediaMessage({ ...message, message: content }, "buffer", {}, { logger: console });
    const media = kind === "image" ? content.imageMessage : content.videoMessage;
    const mime = media?.mimetype || (kind === "image" ? "image/jpeg" : "video/mp4");
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : kind === "video" ? "mp4" : "jpg";
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, "");
    const objectPath = `whatsapp/messages/${safeId}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, { contentType: mime, upsert: true });
    if (error) throw error;
    mediaUrl = supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  }

  const caption = text.replace(/#emi\b/ig, "").trim();
  const row = { texte: caption || null, media_url: mediaUrl, media_type: kind, source_type: "whatsapp_message", source_message_id: id };
  const { error } = await supabase.from("publications_emi").insert(row);
  if (error?.code === "23505") { console.log("Message déjà relayé :", id); return; }
  if (error) throw error;
  console.log(`Publication EMI relayée (${kind}).`);
}
async function connect() {
  if (stopping) return;
  const sock = makeWASocket({ auth: state, printQRInTerminal: true, markOnlineOnConnect: false, syncFullHistory: false, getMessage: async () => undefined });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) console.log("Scanne ce QR dans WhatsApp > Appareils connectés. Conserve le dossier d'authentification.");
    if (connection === "open") { reconnectDelay = 3000; console.log("Relais WhatsApp EMI connecté."); }
    if (connection !== "close") return;
    if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
      console.error("Session déconnectée. Supprime le dossier d'authentification puis relance pour associer de nouveau WhatsApp.");
      return;
    }
    if (!stopping && !reconnectTimer) {
      const delay = reconnectDelay;
      reconnectDelay = Math.min(reconnectDelay * 2, 60000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        void connect().catch(err => console.error("Reconnexion échouée :", err?.message || err));
      }, delay);
    }
  });
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify" && type !== "append") return;
    for (const message of messages || []) {
      try { await relay(message); }
      catch (err) { console.error("Échec du relais EMI :", err?.message || err); }
    }
  });
}
await cleanupExpired();
setInterval(() => void cleanupExpired(), 15 * 60 * 1000);
process.on("SIGTERM", () => { stopping = true; if (reconnectTimer) clearTimeout(reconnectTimer); process.exit(0); });
process.on("SIGINT", () => { stopping = true; if (reconnectTimer) clearTimeout(reconnectTimer); process.exit(0); });
await connect();
