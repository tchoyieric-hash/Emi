"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type SharedListing = { id: string; titre: string; prix: number; timestamp: string; receivedAt: string };
type PeerWithChannel = RTCPeerConnection & { __emiChannel?: RTCDataChannel };

export default function MeshPage() {
  const [offerText, setOfferText] = useState("");
  const [remoteText, setRemoteText] = useState("");
  const [status, setStatus] = useState("Non connecté");
  const [statusKind, setStatusKind] = useState<"idle" | "busy" | "ok" | "error">("idle");
  const [titre, setTitre] = useState("");
  const [prix, setPrix] = useState("");
  const [received, setReceived] = useState<SharedListing[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const peerRef = useRef<PeerWithChannel | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const receivedRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    channelRef.current?.close();
    peerRef.current?.close();
  }, []);

  function setConnectionStatus(text: string, kind: "idle" | "busy" | "ok" | "error" = "idle") {
    setStatus(text);
    setStatusKind(kind);
  }

  function attachChannel(channel: RTCDataChannel) {
    channelRef.current = channel;
    channel.onopen = () => { setConnectionStatus("Connecté en direct", "ok"); setNotice("Canal P2P ouvert. Tu peux envoyer une annonce."); };
    channel.onclose = () => setConnectionStatus("Connexion fermée", "idle");
    channel.onerror = () => { setConnectionStatus("Erreur de canal", "error"); setNotice("Le canal a rencontré une erreur. Recommence l'échange des clés."); };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data));
        if (data?.type !== "emi-listing" || typeof data.titre !== "string" || !Number.isFinite(Number(data.prix))) return;
        setReceived(prev => [{ id: crypto.randomUUID(), titre: data.titre.slice(0, 160), prix: Math.max(0, Number(data.prix)), timestamp: String(data.timestamp || ""), receivedAt: new Date().toLocaleTimeString("fr-FR") }, ...prev].slice(0, 30));
      } catch {
        setNotice("Une donnée reçue n'a pas pu être lue.");
      }
    };
  }

  function newPeer() {
    channelRef.current?.close();
    peerRef.current?.close();
    channelRef.current = null;
    // No STUN/TURN servers: this may work on the same local network, but isn't guaranteed across networks.
    const pc = new RTCPeerConnection({ iceServers: [] }) as PeerWithChannel;
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") { setConnectionStatus("Connexion impossible", "error"); setNotice("Le réseau ne permet pas cette connexion directe. Essaie les deux téléphones sur le même Wi-Fi."); }
      if (pc.connectionState === "disconnected") setConnectionStatus("Connexion interrompue", "idle");
    };
    peerRef.current = pc;
    return pc;
  }

  async function waitForIce(pc: RTCPeerConnection) {
    if (pc.iceGatheringState === "complete") return;
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Délai dépassé pendant la préparation de la clé réseau.")); }, 15000);
      const onChange = () => { if (pc.iceGatheringState === "complete") { cleanup(); resolve(); } };
      const cleanup = () => { window.clearTimeout(timeout); pc.removeEventListener("icegatheringstatechange", onChange); };
      pc.addEventListener("icegatheringstatechange", onChange);
    });
  }

  async function createOffer() {
    setBusy(true); setNotice("");
    try {
      const pc = newPeer();
      attachChannel(pc.createDataChannel("emiMeshChannel"));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForIce(pc);
      setOfferText(JSON.stringify(pc.localDescription));
      setConnectionStatus("Offre prête — en attente du téléphone 2", "busy");
      setNotice("Copie l'offre complète et transfère-la au téléphone 2. Aucun serveur de signalisation n'est utilisé.");
    } catch (e) { setConnectionStatus("Erreur de préparation", "error"); setNotice(e instanceof Error ? e.message : "Impossible de créer l'offre."); }
    finally { setBusy(false); }
  }

  async function acceptOffer() {
    setBusy(true); setNotice("");
    try {
      const remote = JSON.parse(remoteText);
      if (remote?.type !== "offer" || typeof remote.sdp !== "string") throw new Error("Colle d'abord l'offre complète du téléphone 1.");
      const pc = newPeer();
      pc.ondatachannel = event => attachChannel(event.channel);
      await pc.setRemoteDescription(remote);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForIce(pc);
      setOfferText(JSON.stringify(pc.localDescription));
      setConnectionStatus("Réponse prête — à renvoyer au téléphone 1", "busy");
      setNotice("Copie cette réponse et renvoie-la au téléphone 1. Sur le téléphone 1, colle-la dans le champ de clé distante puis appuie sur « Appliquer la réponse ».");
    } catch (e) { setConnectionStatus("Clé invalide", "error"); setNotice(e instanceof Error ? e.message : "Impossible d'accepter l'offre."); }
    finally { setBusy(false); }
  }

  async function applyAnswer() {
    setBusy(true); setNotice("");
    try {
      const remote = JSON.parse(remoteText);
      if (remote?.type !== "answer" || typeof remote.sdp !== "string") throw new Error("Colle la réponse générée par le téléphone 2.");
      const pc = peerRef.current;
      if (!pc || pc.signalingState !== "have-local-offer") throw new Error("Génère d'abord une offre sur ce téléphone.");
      await pc.setRemoteDescription(remote);
      setConnectionStatus("Réponse appliquée — connexion en cours", "busy");
      setNotice("Réponse appliquée. Attends quelques secondes que le canal s'ouvre.");
    } catch (e) { setConnectionStatus("Réponse invalide", "error"); setNotice(e instanceof Error ? e.message : "Impossible d'appliquer la réponse."); }
    finally { setBusy(false); }
  }

  async function copyOffer() {
    if (!offerText) return;
    try { await navigator.clipboard.writeText(offerText); setNotice("Clé copiée. Transfère-la à l'autre téléphone."); }
    catch { setNotice("La copie automatique est indisponible : sélectionne et copie le texte de la clé."); }
  }

  function sendListing() {
    const title = titre.trim();
    const amount = Number(prix);
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") { setNotice("Connecte d'abord les deux téléphones."); return; }
    if (!title || title.length > 160 || !Number.isFinite(amount) || amount < 0) { setNotice("Saisis un titre (160 caractères maximum) et un prix valide."); return; }
    channel.send(JSON.stringify({ type: "emi-listing", titre: title, prix: amount, timestamp: new Date().toLocaleString("fr-FR") }));
    setNotice("Annonce envoyée directement à l'autre appareil.");
    setTitre(""); setPrix("");
  }

  const badgeClass = statusKind === "ok" ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : statusKind === "error" ? "border-rose-300/30 bg-rose-300/10 text-rose-200" : statusKind === "busy" ? "border-amber-200/30 bg-amber-200/10 text-amber-100" : "border-white/15 bg-white/5 text-white/70";

  return <main className="min-h-screen overflow-x-hidden bg-[#09090d] px-3 py-5 text-white sm:px-6">
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <Link href="/annonces" className="text-sm text-amber-200">← Retour au marché</Link>
        <span className="text-xs font-semibold tracking-[.2em] text-amber-200">EMi · P2P DIRECT</span>
      </header>
      <section className="mb-5 rounded-3xl border border-emerald-300/15 bg-gradient-to-br from-emerald-300/10 to-transparent p-5 sm:p-7">
        <p className="text-xs uppercase tracking-[.25em] text-emerald-200">Network Mesh</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-3xl">Échange direct entre téléphones</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">Transfère une annonce entre deux appareils avec WebRTC DataChannel, en échangeant les clés manuellement.</p>
        <span className={"mt-4 inline-flex rounded-full border px-3 py-2 text-xs font-medium " + badgeClass}>{status}</span>
      </section>
      <div className="mb-5 rounded-2xl border border-amber-200/20 bg-amber-100/5 p-4 text-sm leading-6 text-amber-100/90">
        <strong>À savoir :</strong> « sans Internet » n'est pas garanti. Sans serveur STUN/TURN, le mode direct peut fonctionner sur le même réseau local, mais certains téléphones ou réseaux bloqueront la connexion. Les clés doivent être échangées par un autre moyen.
      </div>
      {notice && <div role="status" className="mb-5 break-words rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/80">{notice}</div>}
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-emerald-200">1. Initialiser le canal</h2>
        <p className="mt-2 text-sm text-white/55">Téléphone 1 — crée l'offre et partage-la.</p>
        <button disabled={busy} onClick={() => void createOffer()} className="mt-4 min-h-11 w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white disabled:opacity-50">📱 Générer une clé d'offre</button>
        <label className="mt-4 block text-sm text-white/60">Clé locale (offre ou réponse)</label>
        <textarea readOnly rows={4} value={offerText} className="mt-2 block w-full min-w-0 rounded-xl border border-white/15 bg-[#101019] p-3 font-mono text-xs text-white outline-none focus:border-emerald-200" placeholder="La clé générée apparaîtra ici…"/>
        <button disabled={!offerText || busy} onClick={() => void copyOffer()} className="mt-3 min-h-11 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-black disabled:opacity-40">Copier la clé locale</button>
        <label className="mt-5 block text-sm text-white/60">Clé distante (offre ou réponse)</label>
        <textarea rows={5} value={remoteText} onChange={e=>setRemoteText(e.target.value)} className="mt-2 block w-full min-w-0 rounded-xl border border-white/15 bg-[#101019] p-3 font-mono text-xs text-white outline-none focus:border-emerald-200" placeholder="Colle ici l'offre ou la réponse de l'autre téléphone…"/>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button disabled={busy} onClick={() => void acceptOffer()} className="min-h-11 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-black disabled:opacity-50">Téléphone 2 : accepter l'offre</button>
          <button disabled={busy} onClick={() => void applyAnswer()} className="min-h-11 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white disabled:opacity-50">Téléphone 1 : appliquer la réponse</button>
        </div>
      </section>
      <section className="mb-5 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-emerald-200">2. Partager une annonce</h2>
        <p className="mt-2 text-sm text-white/55">Les annonces sont envoyées à l'autre téléphone uniquement. Elles ne sont pas automatiquement publiées sur le marché EMi.</p>
        <label className="mt-4 block text-sm text-white/60">Titre du produit</label>
        <input value={titre} onChange={e=>setTitre(e.target.value)} maxLength={160} placeholder="Ex. Sac en cuir" className="mt-2 block w-full min-w-0 rounded-xl border border-white/15 bg-[#101019] px-3 py-3 text-base text-white outline-none focus:border-emerald-200"/>
        <label className="mt-2 block text-sm text-white/60">Prix (FCFA)</label>
        <input type="number" min="0" step="1" value={prix} onChange={e=>setPrix(e.target.value)} placeholder="Ex. 15000" className="mt-2 block w-full min-w-0 rounded-xl border border-white/15 bg-[#101019] px-3 py-3 text-base text-white outline-none focus:border-emerald-200"/>
        <button onClick={sendListing} className="mt-4 min-h-11 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-black">⚡ Envoyer au téléphone voisin</button>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-emerald-200">3. Annonces reçues ({received.length})</h2>
        {received.length === 0 ? <p className="mt-3 rounded-xl bg-black/20 p-4 text-sm text-white/50">Aucune annonce reçue pour le moment.</p> : <div ref={receivedRef} className="mt-3 space-y-3">{received.map(item=><article key={item.id} className="rounded-xl border border-emerald-300/20 bg-black/20 p-4"><h3 className="break-words font-semibold">{item.titre}</h3><p className="mt-1 text-lg text-emerald-200">{item.prix.toLocaleString("fr-FR")} FCFA</p><p className="mt-1 text-xs text-white/40">Reçue à {item.receivedAt} · envoyée {item.timestamp}</p></article>)}</div>}
      </section>
      <p className="mt-6 text-center text-xs text-white/35">EMi · Les données échangées en P2P ne sont pas enregistrées dans Supabase.</p>
    </div>
  </main>;
}
