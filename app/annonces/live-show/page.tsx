"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Flame, Gift, Heart, RotateCw, Star, Trophy } from "lucide-react";

const sellers = [
  { id: "Akwa", name: "Boutique Akwa", category: "Chaussures & mode", emoji: "👨🏾‍💼" },
  { id: "Bastos", name: "Sape Bastos", category: "Sacs & accessoires", emoji: "👩🏾‍💼" },
];
const rewards = [
  "🎁 Démo : remise de 500 FCFA (non utilisable en caisse)",
  "⭐ Démo : badge Vendeur Star pendant 24 h",
  "🔥 Démo : 100 points de fidélité de démonstration",
  "😅 Pas de gain cette fois. Réessaie demain !",
];

export default function LiveShowPage() {
  const [votes, setVotes] = useState({ Akwa: 0, Bastos: 0 });
  const [voted, setVoted] = useState("");
  const [wheelResult, setWheelResult] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("emi-live-show-demo");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.votes) setVotes(data.votes);
        if (data.voted) setVoted(data.voted);
        if (data.playedAt === new Date().toISOString().slice(0, 10)) {
          setAlreadyPlayed(true);
          setWheelResult(data.result || "Tu as déjà joué aujourd’hui sur cet appareil.");
        }
      }
    } catch {}
  }, []);

  function vote(id: "Akwa" | "Bastos") {
    if (voted) {
      setNotice("Tu as déjà voté dans cette démonstration. Les votes ne sont pas synchronisés entre utilisateurs.");
      return;
    }
    const next = { ...votes, [id]: (votes[id] || 0) + 1 };
    setVotes(next);
    setVoted(id);
    setNotice("Vote de démonstration enregistré. Aucun coupon réel n’a été créé.");
    try { localStorage.setItem("emi-live-show-demo", JSON.stringify({ votes: next, voted: id })); } catch {}
  }

  function spin() {
    if (alreadyPlayed || spinning) return;
    setSpinning(true);
    setWheelResult("");
    window.setTimeout(() => {
      const result = rewards[Math.floor(Math.random() * rewards.length)];
      setWheelResult(result);
      setSpinning(false);
      setAlreadyPlayed(true);
      try {
        const saved = JSON.parse(localStorage.getItem("emi-live-show-demo") || "{}");
        localStorage.setItem("emi-live-show-demo", JSON.stringify({ ...saved, votes, voted, playedAt: new Date().toISOString().slice(0, 10), result }));
      } catch {}
    }, 1400);
  }

  return (
    <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-xl space-y-5">
        <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={18}/> Retour au marché EMi</Link>
        <header className="rounded-3xl border border-rose-400/20 bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-xl shadow-rose-950/20 sm:p-6">
          <div className="flex items-center gap-3"><div className="rounded-2xl bg-rose-500/10 p-3 text-rose-300"><Flame size={28}/></div><div><p className="text-xs uppercase tracking-[.22em] text-rose-300">EMi Entertainment</p><h1 className="text-2xl font-bold">Live Show & Mini-Jeux</h1></div></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">Découvre les vendeurs, vote pour ton favori et teste la roue quotidienne.</p>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-800/80 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-rose-300"><Flame size={20}/> Live Battle : meilleures affaires</h2>
          <p className="mt-2 text-sm text-slate-400">Vote pour ton vendeur préféré. Les votes sont locaux à cet appareil.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {sellers.map(seller => <article key={seller.id} className={"rounded-2xl border bg-slate-950/70 p-3 text-center " + (voted === seller.id ? "border-rose-400/60" : "border-white/10")}>
              <div className="text-4xl">{seller.emoji}</div><h3 className="mt-2 text-sm font-semibold">{seller.name}</h3><p className="mt-1 min-h-10 text-xs text-slate-400">{seller.category}</p><p className="mt-2 text-xl font-bold">{votes[seller.id]}</p><p className="text-xs text-slate-500">votes de démonstration</p>
              <button onClick={() => vote(seller.id as "Akwa" | "Bastos")} disabled={!!voted} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-rose-500 px-2 py-2 text-sm font-semibold hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"><Heart size={15}/> {voted === seller.id ? "Ton vote" : "Voter"}</button>
            </article>)}
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300/20 bg-slate-800/80 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-amber-300"><Gift size={20}/> Roue de la chance EMi</h2>
          <p className="mt-2 text-sm text-slate-400">Une tentative par jour sur cet appareil. Les lots sont fictifs et ne donnent pas droit à une remise réelle.</p>
          <div className="mt-4 rounded-2xl border border-dashed border-amber-300/40 bg-slate-950/70 p-5 text-center">
            <div className={"text-6xl " + (spinning ? "animate-spin" : "")} aria-label="Roue de la chance">🎡</div>
            <p className="mt-4 font-semibold" role="status">{spinning ? "La roue tourne…" : wheelResult || "Tente ta chance aujourd’hui !"}</p>
            <button onClick={spin} disabled={spinning || alreadyPlayed} className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-5 py-3 font-bold text-slate-950 hover:brightness-110 disabled:opacity-50"><RotateCw size={18}/>{spinning ? "En cours…" : alreadyPlayed ? "Déjà joué aujourd’hui" : "Tourner la roue"}</button>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-amber-100/70"><Star size={16} className="mt-0.5 shrink-0"/> Aucun coupon, badge ou point réel n’est attribué. La limite quotidienne est stockée localement et ne constitue pas une protection anti-fraude serveur.</div>
        </section>
        {notice && <p role="status" className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-slate-200">{notice}</p>}
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm text-slate-400"><Trophy size={18} className="shrink-0 text-amber-300"/> Les lives vidéo et les votes partagés en temps réel seront ajoutés séparément.</div>
      </div>
    </main>
  );
}
