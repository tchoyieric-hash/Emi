"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, MicOff, Sparkles, Search, ShoppingBag } from "lucide-react";

type SpeechResult = { transcript: string };
type SpeechRecognitionEventLike = { results: ArrayLike<ArrayLike<SpeechResult>> };
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

let activeRecognition: SpeechRecognitionLike | null = null;

function VoiceMarketContent() {
  const [status, setStatus] = useState("Prêt à écouter");
  const [transcript, setTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<"vente" | "recherche">("vente");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [details, setDetails] = useState("");

  function startListening() {
    setError("");
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("La reconnaissance vocale n'est pas disponible dans ce navigateur. Essaie un navigateur compatible ou saisis ton annonce ci-dessous.");
      setStatus("Micro non pris en charge");
      return;
    }
    const recognition = new Recognition();
    activeRecognition = recognition;
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    setBusy(true);
    setStatus("Écoute en cours… parle maintenant");
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map(r => r[0]?.transcript ?? "").join(" ").trim();
      setTranscript(text); setTitle(text);
      setStatus("Transcription prête — vérifie le texte avant publication");
    };
    recognition.onerror = (event) => {
      setError(event.error === "not-allowed" ? "Autorise l'accès au microphone dans les paramètres du navigateur." : "La capture vocale a échoué. Réessaie ou saisis ton texte manuellement.");
      setStatus("Erreur du microphone"); setBusy(false);
    };
    recognition.onend = () => { setBusy(false); activeRecognition = null; };
    try { recognition.start(); } catch { setBusy(false); setStatus("Impossible de démarrer le microphone"); activeRecognition = null; }
  }
  function stopListening() { activeRecognition?.stop(); setBusy(false); setStatus("Écoute arrêtée"); }

  function extractPrice(text: string) {
    const match = text.match(/(?:à|pour|prix(?: de)?|coûte)s*([0-9][0-9\s.,]*)\s*(?:francs?|fcfa|xaf)?/i);
    if (match) setPrice(match[1].replace(/[\s.,]/g, ""));
  }
  function useTranscript() {
    const text = transcript.trim();
    if (!text) { setError("Enregistre d'abord une phrase ou saisis ton texte."); return; }
    setTitle(text);
    extractPrice(text);
    setStatus("Texte repris dans le formulaire. Vérifie les champs avant de continuer.");
  }

  return <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50 sm:py-10"><div className="mx-auto max-w-3xl">
    <header className="mb-6 flex items-center justify-between"><Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-pink-300"><ArrowLeft size={17}/> Marché EMi</Link><Link href="/" className="font-semibold tracking-[.22em] text-amber-200">EMi</Link></header>
    <section className="rounded-3xl border border-pink-400/20 bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-2xl shadow-pink-950/20 sm:p-8">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-pink-300"><Sparkles size={15}/> Assistant vocal du marché</p>
      <h1 className="text-2xl font-semibold sm:text-3xl">🎙️ Voice-Market</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Dicte ton annonce ou ce que tu recherches. EMi prépare le texte et détecte éventuellement un prix, que tu peux corriger avant de continuer.</p>
      <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={()=>setKind("vente")} className={`rounded-xl border p-3 text-sm ${kind==="vente"?"border-pink-300 bg-pink-400/10 text-pink-200":"border-white/10 text-slate-400"}`}><ShoppingBag className="mx-auto mb-1" size={18}/>Je propose un article</button><button type="button" onClick={()=>setKind("recherche")} className={`rounded-xl border p-3 text-sm ${kind==="recherche"?"border-pink-300 bg-pink-400/10 text-pink-200":"border-white/10 text-slate-400"}`}><Search className="mx-auto mb-1" size={18}/>Je recherche un article</button></div>
      <div className="mt-5 flex flex-col items-center rounded-2xl border border-white/10 bg-black/20 p-5"><button type="button" onClick={busy?stopListening:startListening} aria-label={busy?"Arrêter le microphone":"Démarrer la reconnaissance vocale"} className={`flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${busy?"animate-pulse bg-rose-600":"bg-pink-500 hover:bg-pink-400"}`}>{busy?<MicOff size={30}/>:<Mic size={30}/>}</button><p aria-live="polite" className="mt-3 text-sm text-pink-200">{status}</p><p className="mt-1 text-center text-xs text-slate-500">Le navigateur peut demander l'autorisation du microphone.</p></div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-5 rounded-xl border-l-4 border-pink-400 bg-slate-950 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transcription</p><p className="mt-2 text-sm text-white">{transcript || "Exemple : « Je vends un téléphone portable à 45 000 francs »"}</p><button type="button" onClick={useTranscript} className="mt-3 rounded-lg border border-pink-300/30 px-3 py-2 text-sm text-pink-200">Utiliser cette transcription</button></div>
      <form onSubmit={e=>{e.preventDefault();setError("Le formulaire est prêt, mais la publication automatique depuis Voice-Market n'est pas encore reliée au flux de création d'annonces. Tu peux copier le texte et continuer depuis le marché.");}} className="mt-6 grid gap-3">
        <label className="grid gap-2 text-sm text-slate-300">{kind==="vente"?"Description de l'article proposé":"Article recherché"}<textarea required minLength={2} value={title} onChange={e=>setTitle(e.target.value)} rows={3} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-pink-300" placeholder={kind==="vente"?"Ex. téléphone portable en bon état":"Ex. Je recherche un ordinateur portable"}/></label>
        {kind==="vente" && <label className="grid gap-2 text-sm text-slate-300">Prix indicatif en FCFA (facultatif)<input inputMode="numeric" value={price} onChange={e=>setPrice(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-pink-300" placeholder="45000"/></label>}
        <label className="grid gap-2 text-sm text-slate-300">Informations supplémentaires (facultatif)<textarea value={details} onChange={e=>setDetails(e.target.value)} rows={2} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-pink-300" placeholder="État, quartier, disponibilité…"/></label>
        <button className="flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-3 font-semibold text-white"><Mic size={18}/> Préparer mon annonce</button>
      </form>
    </section>
    <p className="mt-5 text-center text-xs leading-5 text-slate-500">La reconnaissance vocale dépend du navigateur et peut nécessiter une connexion Internet. Vérifie toujours la transcription et le prix avant publication. Le bouton prépare le texte ; il ne publie pas encore automatiquement une annonce.</p>
  </div></main>;
}