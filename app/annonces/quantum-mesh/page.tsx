"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Network, RefreshCw, ShieldCheck, Smartphone, Wifi, AlertTriangle } from "lucide-react";

function makeNodeId() {
  return "NODE_" + Array.from(crypto.getRandomValues(new Uint8Array(4)), n => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}

export default function QuantumMeshPage() {
  const [nodeId, setNodeId] = useState("");
  const [status, setStatus] = useState("Aucune recherche de nœuds n’a encore été lancée.");
  const [busy, setBusy] = useState(false);

  async function syncCluster() {
    setBusy(true);
    setNodeId("");
    setStatus("Vérification des capacités réseau du navigateur…");
    await new Promise(resolve => setTimeout(resolve, 250));
    setNodeId(makeNodeId());
    const rtc = typeof window !== "undefined" && "RTCPeerConnection" in window;
    const online = typeof navigator !== "undefined" ? navigator.onLine : false;
    setStatus(
      rtc
        ? `Ce navigateur prend en charge WebRTC. Aucun autre appareil n’a été détecté ou connecté automatiquement. État Internet : ${online ? "connecté" : "hors ligne"}.`
        : "WebRTC n’est pas pris en charge par ce navigateur. Aucun nœud distant n’a été connecté."
    );
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-xl">
        <Link href="/annonces" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={18}/> Retour au marché EMi</Link>
        <section className="rounded-3xl border border-indigo-400/20 bg-gradient-to-b from-slate-800 to-slate-950 p-6 shadow-2xl shadow-indigo-950/30 sm:p-8">
          <div className="flex items-center gap-3"><div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-3 text-indigo-300"><Network size={30}/></div><div><p className="text-xs font-semibold uppercase tracking-[.22em] text-indigo-300">EMi • Résilience distribuée</p><h1 className="text-2xl font-bold">Quantum-Mesh Core</h1></div></div>
          <p className="mt-4 text-sm leading-6 text-slate-300">Tableau de bord expérimental pour vérifier les capacités réseau de cet appareil et préparer une connexion maillée.</p>
          <div className="my-6 rounded-2xl border border-indigo-400/20 bg-slate-950/80 p-4">
            <div className="flex items-center gap-2 font-semibold text-indigo-300"><Wifi size={18}/> État du nœud local</div>
            <p className="mt-2 text-sm leading-6 text-white" role="status">{status}</p>
            {nodeId && <p className="mt-3 break-all text-sm text-slate-300">ID local de session : <code className="text-emerald-300">{nodeId}</code></p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><Smartphone className="mb-2 text-indigo-300" size={20}/><p className="font-medium">Appareils voisins</p><p className="mt-1 text-sm text-slate-400">Pas de détection automatique de terminaux à proximité.</p></div>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><ShieldCheck className="mb-2 text-emerald-300" size={20}/><p className="font-medium">État honnête</p><p className="mt-1 text-sm text-slate-400">Aucun cluster ni intégrité à 100 % ne sont déclarés sans preuve réelle.</p></div>
          </div>
          <button onClick={syncCluster} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3.5 font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"><RefreshCw size={18} className={busy ? "animate-spin" : ""}/>{busy ? "Vérification…" : "Vérifier ce nœud"}</button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-amber-200/80"><AlertTriangle size={16} className="mt-0.5 shrink-0"/>« Quantum » désigne ici le nom du module : cette page ne réalise pas de calcul quantique et n’établit pas de réseau P2P réel. Une connexion WebRTC exige une signalisation et un échange explicite entre appareils.</p>
        </section>
      </div>
    </main>
  );
}
