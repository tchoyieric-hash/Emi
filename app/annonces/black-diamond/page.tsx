"use client";

import { useState } from "react";
import Link from "next/link";

export default function BlackDiamondPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [notice, setNotice] = useState("");

  function requestAccess() {
    if (!inviteCode.trim()) {
      setNotice("Saisis un code d’invitation pour préparer ta demande d’accès.");
      return;
    }
    setNotice("Demande d’accès préparée. Le code n’a pas été authentifié : la vérification réelle des invitations et des autorisations doit être connectée côté serveur.");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-xl">
        <Link href="/annonces" className="mb-5 inline-flex rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900">← Retour au marché EMi</Link>
        <section className="rounded-2xl border border-amber-400/80 bg-gradient-to-br from-zinc-950 to-zinc-900 p-5 shadow-2xl shadow-amber-500/10 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-amber-300">🖤 EMi Black-Diamond</h1>
            <span className="rounded-full bg-gradient-to-r from-amber-300 to-violet-100 px-3 py-1 text-[10px] font-black tracking-widest text-black">PRIVATE CLUB</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Espace conceptuel de mise en relation privée et de conciergerie premium. L’accès réel est soumis à vérification et autorisation.</p>
          <div className="my-5 rounded-xl border border-zinc-800 bg-black p-4">
            <p className="mb-2 text-xs font-bold tracking-wide text-amber-300">OPPORTUNITÉ DE DÉMONSTRATION</p>
            <h2 className="font-semibold text-slate-100">💎 Tour de table Seed : expansion Deep-Tech EMi</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Présentation indicative uniquement. Les conditions, la structure juridique, les risques et toute information financière doivent être vérifiés avant toute proposition d’investissement.</p>
            <p className="mt-3 text-sm font-semibold text-emerald-400">Statut : maquette — aucune offre d’investissement active confirmée</p>
          </div>
          <label htmlFor="invite" className="mb-2 block text-sm font-medium">Code d’invitation / clé VIP</label>
          <input id="invite" type="password" autoComplete="off" value={inviteCode} onChange={(e) => { setInviteCode(e.target.value); setNotice(""); }} placeholder="Saisir le code d’invitation" className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-amber-400" />
          <button type="button" onClick={requestAccess} className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-300 to-amber-600 px-4 py-3 font-bold text-black transition hover:opacity-90 active:scale-[.99]">🔒 Demander l’accès au syndicat privé</button>
          {notice && <p role="status" className="mt-3 rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200">{notice}</p>}
          <p className="mt-4 text-xs leading-5 text-zinc-500">Prototype : aucun code n’est validé, aucun dossier confidentiel n’est déverrouillé et aucun investissement n’est exécuté depuis cette page. La gestion des invitations et la sécurité devront être implémentées côté serveur.</p>
        </section>
      </div>
    </main>
  );
}
