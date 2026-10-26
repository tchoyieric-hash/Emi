"use client";

import { useState } from "react";
import Link from "next/link";

export default function PhilanthropyPage() {
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");

  function prepareSponsorship() {
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setNotice("Entre un montant valide en FCFA pour préparer une demande de parrainage.");
      return;
    }
    setNotice(`Demande préparée pour ${new Intl.NumberFormat("fr-FR").format(value)} FCFA. Aucun paiement n’a été effectué, aucun certificat officiel n’a été délivré et aucun badge n’a été attribué. Une validation et un système de paiement devront être connectés.`);
  }

  return (
    <main className="emi-space-page min-h-screen overflow-hidden bg-[#061b14] text-white">
      <div className="mx-auto max-w-5xl px-3 pb-12 sm:px-6">
        <header className="flex items-center justify-between gap-3 border-b border-amber-200/20 py-4">
          <Link href="/annonces" className="flex min-w-0 items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200/70 bg-emerald-950 text-2xl font-serif font-bold text-amber-200">M</span>
            <span className="min-w-0"><strong className="block truncate font-serif text-lg tracking-[.12em] text-amber-200">EMi FONDATION</strong><small className="block text-xs text-emerald-100/70">Ensemble, créons un impact durable</small></span>
          </Link>
          <Link href="/annonces" className="shrink-0 rounded-full border border-amber-200/35 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-200/10">← Marché EMi</Link>
        </header>

        <section className="relative mt-5 overflow-hidden rounded-[28px] border border-amber-200/30 bg-[radial-gradient(ellipse_at_top_right,rgba(224,190,74,.25),transparent_48%),linear-gradient(135deg,#075039,#06271d_60%,#041710)] p-5 shadow-2xl shadow-emerald-950/50 sm:p-8">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full border border-amber-200/15 sm:h-56 sm:w-56" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-black/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-amber-100">✦ Solidarité · Impact · Avenir</span>
            <h1 className="mt-5 max-w-2xl font-serif text-3xl font-bold leading-tight text-white sm:text-5xl">Chaque geste peut <span className="text-amber-200">changer une vie.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-base">Découvrez les initiatives de la communauté, explorez les projets et préparez une intention de parrainage en toute transparence.</p>
            <a href="#projets" className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-200 to-yellow-500 px-5 py-3 text-sm font-bold text-[#09251a] shadow-lg shadow-black/20">Découvrir les projets <span className="ml-2">↓</span></a>
          </div>
          <div className="relative mt-7 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/15 p-3"><span className="text-xl">🤝</span><strong className="mt-2 block text-xs text-white sm:text-sm">Entraide</strong><small className="mt-1 block text-[10px] text-emerald-100/65">Agir ensemble</small></div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-3"><span className="text-xl">🌱</span><strong className="mt-2 block text-xs text-white sm:text-sm">Initiatives</strong><small className="mt-1 block text-[10px] text-emerald-100/65">Faire grandir</small></div>
            <div className="rounded-2xl border border-white/10 bg-black/15 p-3"><span className="text-xl">🛡️</span><strong className="mt-2 block text-xs text-white sm:text-sm">Transparence</strong><small className="mt-1 block text-[10px] text-emerald-100/65">Vérifier avant d'agir</small></div>
          </div>
        </section>

        <section id="projets" className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-amber-200">À découvrir</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Projets solidaires</h2><p className="mt-1 text-sm text-white/55">Des idées qui méritent de grandir.</p></div>
            <span className="rounded-full border border-amber-200/20 px-3 py-1.5 text-xs text-amber-100">Fondation EMi</span>
          </div>
          <article className="overflow-hidden rounded-3xl border border-amber-200/25 bg-gradient-to-br from-[#0c3326] to-[#081b14] shadow-xl shadow-black/20">
            <div className="relative flex min-h-36 items-end bg-[radial-gradient(ellipse_at_20%_10%,rgba(225,190,74,.30),transparent_45%),linear-gradient(120deg,#0c6044,#082b20_65%,#05150f)] p-5 sm:min-h-48 sm:p-7">
              <span className="absolute right-5 top-4 text-5xl opacity-80 sm:text-7xl">🌍</span>
              <div className="relative"><span className="rounded-full border border-amber-200/30 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100">Projet à découvrir</span><h3 className="mt-3 max-w-xl text-xl font-bold sm:text-2xl">Soutenir les femmes commerçantes de Mokolo</h3><p className="mt-1 text-xs text-emerald-50/65">Autonomie économique · Initiative communautaire</p></div>
            </div>
            <div className="p-4 sm:p-6">
              <p className="text-sm leading-6 text-white/70">Une initiative exemple visant à accompagner les femmes entrepreneures dans le développement de leurs activités. Les objectifs et les bénéficiaires restent à confirmer avant tout soutien réel.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><small className="text-xs text-white/50">Objectif indicatif</small><strong className="mt-1 block text-2xl text-amber-200">50</strong><span className="text-xs text-white/55">commerçantes à accompagner</span></div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4"><small className="text-xs text-white/50">Suivi des fonds</small><strong className="mt-2 block text-sm text-amber-100">À confirmer</strong><span className="mt-1 block text-xs text-white/55">Vérification requise</span></div>
              </div>
              <div className="mt-5 rounded-2xl border border-amber-200/20 bg-[#041a12] p-4">
                <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-white">Montant envisagé <span className="text-white/50">(FCFA)</span></label>
                <input id="amount" inputMode="numeric" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex. 10 000" className="w-full rounded-xl border border-amber-200/30 bg-[#03170f] px-4 py-3 text-white outline-none focus:border-amber-300" />
                <button type="button" onClick={prepareSponsorship} className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-200 to-yellow-500 px-4 py-3 font-bold text-[#09251a] transition hover:brightness-105 active:scale-[.99]">✦ Préparer une demande de parrainage</button>
                {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-700 bg-emerald-950/60 p-3 text-sm text-emerald-100">{notice}</p>}
              </div>
            </div>
          </article>
        </section>
        <aside className="mt-5 rounded-2xl border border-amber-200/15 bg-white/[.03] p-4 text-xs leading-5 text-white/50">Transparence : ce projet et ses indicateurs sont des exemples de démonstration. Aucun paiement n’est effectué depuis cette page. L’identité des bénéficiaires, l’organisme responsable, les justificatifs, le suivi des fonds et les paiements doivent être vérifiés avant tout parrainage réel.</aside>
      </div>
    </main>
  );
}
