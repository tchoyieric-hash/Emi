"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Languages, Mic, MicOff, Volume2, LoaderCircle, Sparkles } from "lucide-react";

type Recognition = {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export default function NeuralVoicePage() {
  const [target, setTarget] = useState<"pidgin" | "fr">("pidgin");
  const [listening, setListening] = useState(false);
  const [working, setWorking] = useState(false);
  const [heard, setHeard] = useState("");
  const [translated, setTranslated] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("En attente de parole");
  const [speechLang, setSpeechLang] = useState("fr-FR");

  function speak(text: string, lang: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  }

  function start() {
    setError(""); setHeard(""); setTranslated("");
    const win = window as SpeechWindow;
    const Speech = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Speech) {
      setError("La reconnaissance vocale n'est pas prise en charge par ce navigateur. Essaie Chrome ou saisis la phrase manuellement.");
      setStatus("Micro non pris en charge"); return;
    }
    const rec = new Speech();
    rec.lang = speechLang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true); setStatus("Écoute en cours… parle clairement");
    rec.onresult = event => {
      const text = Array.from(event.results).map(r => r[0]?.transcript || "").join(" ").trim();
      setHeard(text);
      setStatus("Transcription terminée");
      setWorking(true);
      // This first version translates French ↔ English with browser-native speech recognition.
      // Pidgin/Camfranglais translation needs a dedicated translation service or curated phrase model.
      if (target === "fr") {
        setTranslated("Traduction automatique du français vers le pidgin non disponible hors connexion dans cette version. Vérifie la transcription ci-dessus et utilise la lecture vocale pour la faire entendre.");
        setWorking(false);
      } else {
        setTranslated("La traduction automatique du pidgin/camfranglais vers le français nécessite un moteur linguistique dédié. Cette version ne fabriquera pas une traduction à partir d'une phrase d'exemple.");
        setWorking(false);
      }
    };
    rec.onerror = event => {
      setError(event.error === "not-allowed" ? "Autorise le microphone dans les paramètres du navigateur." : "La reconnaissance vocale a échoué. Vérifie le microphone et réessaie.");
      setListening(false); setWorking(false); setStatus("Erreur microphone");
    };
    rec.onend = () => { setListening(false); };
    try { rec.start(); } catch { setListening(false); setStatus("Impossible de démarrer le microphone"); }
  }

  function readAloud() {
    if (!translated.trim()) { setError("Aucun texte traduit à lire pour le moment."); return; }
    speak(translated, target === "fr" ? "fr-FR" : "en");
  }

  return <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50 sm:py-10"><div className="mx-auto max-w-3xl">
    <header className="mb-6 flex items-center justify-between"><Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-300"><ArrowLeft size={17}/> Marché EMi</Link><Link href="/" className="font-semibold tracking-[.22em] text-amber-200">EMi</Link></header>
    <section className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-2xl shadow-emerald-950/20 sm:p-8">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-emerald-300"><Sparkles size={15}/> Communication vocale</p>
      <h1 className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl"><Languages size={28} className="text-emerald-300"/> EMI Neural-Voice P2P</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Dicte une phrase, vérifie la transcription et prépare un échange avec ton interlocuteur. Le vrai Pidgin/Camfranglais vers le français nécessite encore un moteur de traduction spécialisé.</p>
      <label className="mt-5 grid gap-2 text-sm text-slate-300">Langue de l'interlocuteur<select value={target} onChange={e=>setTarget(e.target.value as "pidgin" | "fr")} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"><option value="pidgin">Pidgin / Camfranglais</option><option value="fr">Français standard</option></select></label>
      <label className="mt-4 grid gap-2 text-sm text-slate-300">Langue parlée dans le micro<select value={speechLang} onChange={e=>setSpeechLang(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white"><option value="fr-FR">Français</option><option value="en-US">Anglais</option></select></label>
      <button type="button" onClick={listening ? () => { setListening(false); setStatus("Écoute arrêtée"); } : start} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300">{listening ? <MicOff size={18}/> : <Mic size={18}/>} {listening ? "Écoute en cours…" : "Parler et transcrire"}</button>
      <p aria-live="polite" className="mt-3 text-center text-sm text-emerald-200">{status}</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p>}
      <div className="mt-5 rounded-xl border-l-4 border-emerald-400 bg-slate-950 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Phrase reconnue</p><p className="mt-2 whitespace-pre-wrap text-sm">{heard || "La transcription apparaîtra ici après la reconnaissance vocale."}</p></div>
      <div className="mt-4 rounded-xl border-l-4 border-violet-400 bg-slate-950 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Traduction</p><p className="mt-2 whitespace-pre-wrap text-sm">{translated || "Aucune traduction disponible pour le moment."}</p><button type="button" onClick={readAloud} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300/30 px-3 py-2 text-sm text-emerald-200"><Volume2 size={16}/> Lire à voix haute</button></div>
      {working && <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400"><LoaderCircle className="animate-spin" size={16}/> Traitement…</p>}
    </section>
    <p className="mt-5 text-center text-xs leading-5 text-slate-500">Cette version utilise la reconnaissance vocale du navigateur et la synthèse vocale disponible sur l'appareil. La traduction réelle du Pidgin/Camfranglais, l'échange direct entre deux appareils et le fonctionnement sans Internet ne sont pas encore implémentés. Aucune négociation n'est transmise automatiquement au vendeur.</p>
  </div></main>;
}
