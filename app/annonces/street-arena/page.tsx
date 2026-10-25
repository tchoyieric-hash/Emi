"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Play, Swords, Trophy, Sparkles, RotateCw } from "lucide-react";

const clips = [
  { shop: "Boutique Akwa", title: "Nouvel arrivage de sapes à Akwa", badge: "LIVE", emoji: "👕", color: "from-fuchsia-500/35 to-amber-400/10" },
  { shop: "Marché Bastos", title: "Matériel de cuisine pro", badge: "PROMO", emoji: "🍳", color: "from-cyan-500/30 to-blue-500/10" },
  { shop: "Artisan Mokolo", title: "Démonstration sur-mesure", badge: "SHOW", emoji: "🛠️", color: "from-emerald-500/30 to-teal-500/10" },
];

export default function StreetArenaPage() {
  const [votes, setVotes] = useState([142, 189]);
  const [voted, setVoted] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [gameMessage, setGameMessage] = useState("La roue est un aperçu de démonstration : aucun coupon réel n'est émis.");
  const [selectedClip, setSelectedClip] = useState<string | null>(null);

  function vote() {
    if (voted) return;
    setVotes(([a, b]) => [a, b + 1]);
    setVoted(true);
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setGameMessage("La roue tourne…");
    window.setTimeout(() => {
      setSpinning(false);
      setGameMessage("Démo terminée : aucun avantage financier ou code promo réel n'a été attribué.");
    }, 1200);
  }

  return <main className="min-h-screen bg-[#090d16] px-4 pb-12 text-slate-50">
    <header className="mx-auto flex max-w-5xl items-center justify-between py-5">
      <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-amber-200"><ArrowLeft size={17}/> Retour au marché</Link>
      <span className="font-semibold tracking-[.22em] text-amber-200">EMi</span>
    </header>
    <section className="mx-auto max-w-5xl">
      <div className="mb-7 rounded-3xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/15 via-slate-900 to-amber-500/10 p-6 sm:p-9">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.28em] text-fuchsia-200">Street culture · Commerce · Jeux</p>
        <h1 className="text-3xl font-bold sm:text-5xl">Street-Arena <span className="text-amber-200">& Entertainment</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Découvre les vitrines des quartiers, soutiens tes boutiques favorites et explore les animations EMi.</p>
      </div>

      <section className="mb-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Play className="text-fuchsia-300" size={20}/> EMI Street-Tok <span className="text-sm font-normal text-slate-400">· Le show des quartiers</span></h2>
        <p className="mb-5 text-sm text-slate-400">Vitrines de démonstration. La lecture vidéo en direct n'est pas encore connectée.</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {clips.map((clip) => <button key={clip.shop} onClick={() => setSelectedClip(clip.shop)} className={`relative flex h-56 min-w-40 flex-1 flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-1 hover:border-fuchsia-300/50 sm:min-w-48 bg-gradient-to-br ${clip.color} ${selectedClip === clip.shop ? "border-fuchsia-300" : "border-white/10"}`}>
            <span className="self-start rounded-full bg-black/40 px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-200">{clip.badge}</span>
            <span className="text-4xl">{clip.emoji}</span>
            <span><span className="block text-xs text-slate-300">{clip.shop}</span><strong className="mt-1 block text-sm">{clip.title}</strong></span>
          </button>)}
        </div>
        {selectedClip && <p role="status" className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">Vitrine sélectionnée : <strong>{selectedClip}</strong>. Le flux vidéo sera disponible quand le marchand aura publié un média.</p>}
      </section>

      <section className="mb-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Swords className="text-amber-200" size={20}/> Battle Clash <span className="text-sm font-normal text-slate-400">· Match du jour</span></h2>
        <p className="mb-5 text-sm text-slate-400">Vote de démonstration sur cet appareil. Les scores ne sont pas encore partagés entre utilisateurs.</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-slate-950/70 p-4">
          <div className="text-center"><div className="text-4xl">👕</div><strong className="mt-2 block text-sm">Style Bastos</strong><span className="mt-1 block text-sm text-emerald-300">{votes[0]} votes</span></div>
          <span className="font-black text-amber-300">VS</span>
          <div className="text-center"><div className="text-4xl">👟</div><strong className="mt-2 block text-sm">Kicks Akwa</strong><span className="mt-1 block text-sm text-emerald-300">{votes[1]} votes</span></div>
        </div>
        <button onClick={vote} disabled={voted} className="mt-4 w-full rounded-xl bg-fuchsia-500 px-4 py-3 font-semibold transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60">{voted ? "✓ Vote de démonstration enregistré" : "❤️ Voter pour Kicks Akwa"}</button>
      </section>

      <section className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-400/10 to-white/[.025] p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Trophy className="text-amber-300" size={20}/> La Roue quotidienne EMi</h2>
        <div className="rounded-2xl border border-dashed border-amber-300/40 bg-slate-950/70 p-6 text-center">
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-300/60 bg-gradient-to-br from-amber-300/20 to-fuchsia-500/20 text-5xl ${spinning ? "animate-spin" : ""}`}>🎡</div>
          <p className="mx-auto mt-4 max-w-md text-sm text-slate-300">{gameMessage}</p>
          <button onClick={spin} disabled={spinning} className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"><RotateCw size={17}/>{spinning ? "La roue tourne…" : "Lancer la roue"}</button>
          <p className="mt-3 flex items-center justify-center gap-1 text-xs text-slate-500"><Sparkles size={13}/> Aucun paiement, coupon ou gain réel n'est proposé dans cette démo.</p>
        </div>
      </section>
    </section>
  </main>;
}
