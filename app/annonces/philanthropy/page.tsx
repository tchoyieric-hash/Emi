"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const initiatives = [
  { tag: "Éducation", title: "Un avenir pour chaque enfant", detail: "Soutenir l’accès aux fournitures scolaires", icon: "📚", art: "from-amber-100 via-orange-100 to-rose-200", ink: "text-emerald-950" },
  { tag: "Entraide", title: "Un repas partagé, un sourire", detail: "Initiatives locales de solidarité", icon: "🥘", art: "from-orange-200 via-amber-100 to-yellow-200", ink: "text-emerald-950" },
  { tag: "Autonomie", title: "Faire grandir les petits commerces", detail: "Accompagner les initiatives des femmes", icon: "🧺", art: "from-emerald-800 via-emerald-700 to-lime-700", ink: "text-white" },
  { tag: "Communauté", title: "Ensemble, plus loin", detail: "Des voisins qui s’entraident", icon: "🤝", art: "from-yellow-200 via-lime-100 to-emerald-100", ink: "text-emerald-950" },
  { tag: "Santé", title: "La prévention au cœur du quartier", detail: "Faire connaître les actions de proximité", icon: "🌿", art: "from-teal-100 via-emerald-100 to-cyan-200", ink: "text-emerald-950" },
];

export default function PhilanthropyPage() {
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => initiatives.filter((item) => `${item.tag} ${item.title} ${item.detail}`.toLowerCase().includes(search.toLowerCase())), [search]);

  function prepareSponsorship() {
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setNotice("Entre un montant valide en FCFA pour préparer une intention de soutien.");
      return;
    }
    setNotice(`Intention de soutien préparée pour ${new Intl.NumberFormat("fr-FR").format(value)} FCFA. Aucun paiement n’a été effectué : les projets et bénéficiaires doivent être vérifiés avant toute contribution.`);
  }

  return (
    <main className="min-h-screen bg-[#fbfaf7] pb-24 text-[#17211b]">
      <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-[#fbfaf7]/95 px-4 pb-3 pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/annonces" aria-label="Retour au Marché EMi" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-emerald-900/15 bg-white text-xl text-emerald-950">←</Link>
          <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-stone-300 bg-white px-4 shadow-sm">
            <span className="text-xl">⌕</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une initiative" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-500" aria-label="Rechercher une initiative solidaire" />
            <span aria-hidden="true" className="text-xl">♡</span>
          </label>
        </div>
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3">
          <div><p className="text-[11px] font-bold uppercase tracking-[.2em] text-emerald-800">Communauté & solidarité</p><h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">EMi Fondation</h1></div>
          <a href="#soutenir" className="shrink-0 rounded-full bg-[#e8c94f] px-4 py-2.5 text-sm font-bold text-emerald-950 shadow-sm">+ Soutenir</a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <section className="relative mx-3 mt-3 flex min-h-[390px] items-end overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0a5a40] via-[#0b392a] to-[#061d15] p-6 text-white shadow-sm sm:mx-5 sm:min-h-[470px] sm:p-10">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 72% 22%, rgba(232,201,79,.75), transparent 22%), radial-gradient(circle at 25% 70%, rgba(52,148,103,.7), transparent 35%), linear-gradient(135deg, transparent 35%, rgba(0,0,0,.5))" }} />
          <div className="absolute right-[-10px] top-5 rotate-6 text-[150px] opacity-30 sm:right-8 sm:text-[210px]" aria-hidden="true">🌱</div>
          <div className="relative max-w-xl">
            <span className="inline-flex rounded-full border border-amber-200/50 bg-black/15 px-3 py-1.5 text-xs font-semibold tracking-wide text-amber-100">✦ La solidarité en mouvement</span>
            <p className="mt-5 text-sm font-medium text-emerald-50/80">Des idées pour prendre soin les uns des autres</p>
            <h2 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Ensemble, faisons <span className="text-[#f0d76b]">grandir l’espoir.</span></h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/80 sm:text-base">Découvrez des initiatives solidaires, explorez des idées et préparez votre intention de soutien à la communauté.</p>
            <a href="#decouvrir" className="mt-5 inline-flex rounded-full bg-[#f0d76b] px-5 py-3 font-bold text-emerald-950">Explorer les initiatives ↓</a>
          </div>
        </section>

        <section id="decouvrir" className="px-3 pt-7 sm:px-5">
          <p className="text-xs font-medium text-stone-600">Explorer les initiatives à la une</p>
          <div className="mb-4 mt-1 flex items-end justify-between gap-2"><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Des idées qui pourraient vous inspirer</h2><span className="shrink-0 rounded-full bg-emerald-950/5 px-3 py-1.5 text-xs text-emerald-950">{filtered.length} idées</span></div>
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4">
            {filtered.map((item, index) => (
              <article key={item.title} className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${index % 3 === 1 ? "mt-7" : ""}`}>
                <div className={`relative flex min-h-[180px] items-end overflow-hidden bg-gradient-to-br p-4 sm:min-h-[240px] sm:p-5 ${item.art} ${item.ink}`}>
                  <span className="absolute right-2 top-1 text-7xl opacity-80 sm:right-4 sm:text-8xl" aria-hidden="true">{item.icon}</span>
                  <div className="relative"><span className="rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-950">{item.tag}</span><h3 className="mt-3 text-lg font-extrabold leading-tight sm:text-xl">{item.title}</h3></div>
                </div>
                <div className="p-3 sm:p-4"><p className="text-sm leading-5 text-stone-700">{item.detail}</p><p className="mt-3 text-[11px] font-medium text-stone-500">Initiative exemple · à vérifier</p></div>
              </article>
            ))}
          </div>
          {filtered.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-stone-600">Aucune initiative ne correspond à cette recherche.</p>}
        </section>

        <section id="soutenir" className="mx-3 mt-8 rounded-3xl bg-[#073d2b] p-5 text-white sm:mx-5 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#f0d76b]">Votre geste compte</p>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Préparer une intention de soutien</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/75">Indiquez un montant envisagé. Cette étape ne déclenche aucun paiement et ne confirme pas encore de don.</p>
          <label htmlFor="amount" className="mb-2 mt-5 block text-sm font-semibold">Montant envisagé (FCFA)</label>
          <input id="amount" inputMode="numeric" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex. 10 000" className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-emerald-950 outline-none focus:border-[#f0d76b] sm:max-w-sm" />
          <button type="button" onClick={prepareSponsorship} className="mt-3 w-full rounded-xl bg-[#f0d76b] px-4 py-3 font-bold text-emerald-950 transition active:scale-[.99] sm:w-auto">Préparer mon intention →</button>
          {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-200/20 bg-black/15 p-3 text-sm text-emerald-50">{notice}</p>}
        </section>
        <p className="mx-4 mt-4 text-xs leading-5 text-stone-500 sm:mx-5">Transparence : les cartes présentées sont des exemples de démonstration, pas des collectes validées. Les bénéficiaires, les objectifs, les justificatifs et le suivi des fonds doivent être vérifiés avant toute contribution.</p>
      </div>

      <nav aria-label="Navigation Fondation" className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 px-5 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <a href="#top" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><span className="text-2xl">⌂</span>Accueil</a>
          <a href="#decouvrir" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><span className="text-2xl">⌕</span>Explorer</a>
          <a href="#soutenir" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><span className="text-2xl">♡</span>Soutenir</a>
          <Link href="/annonces" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><span className="text-2xl">▦</span>Espaces</Link>
        </div>
      </nav>
    </main>
  );
}
