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
    <main className="min-h-screen bg-[#030712] px-4 py-8 text-slate-50">
      <div className="mx-auto max-w-xl">
        <Link href="/annonces" className="mb-5 inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">← Retour au marché EMi</Link>
        <section className="rounded-2xl border border-amber-400 bg-gradient-to-br from-slate-900 to-indigo-950 p-5 shadow-2xl shadow-amber-500/10 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-2xl">👑</span>
            <h1 className="text-xl font-bold text-amber-300">EMi Philanthropy &amp; Elite Impact</h1>
            <span className="rounded-full bg-amber-400 px-2 py-1 text-xs font-bold uppercase text-slate-950">Club privé</span>
          </div>
          <p className="text-sm leading-6 text-slate-300">Découvrez des initiatives locales et préparez une intention de parrainage. Les projets et indicateurs affichés ici sont des exemples de démonstration, non des résultats vérifiés.</p>
          <div className="my-5 rounded-xl border border-slate-700 bg-[#030712] p-4">
            <p className="text-xs text-slate-400">Projet exemple à parrainer</p>
            <h2 className="mt-1 font-semibold">Fonds de soutien aux femmes commerçantes — Mokolo</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div><p className="text-2xl font-bold text-emerald-400">50</p><p className="text-xs text-slate-400">Entreprises ciblées (objectif indicatif)</p></div>
              <div><p className="text-2xl font-bold text-amber-300">À confirmer</p><p className="text-xs text-slate-400">Traçabilité des fonds</p></div>
            </div>
          </div>
          <label htmlFor="amount" className="mb-2 block text-sm font-medium">Montant envisagé (FCFA)</label>
          <input id="amount" inputMode="numeric" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ex. 10000" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400" />
          <button type="button" onClick={prepareSponsorship} className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-3 font-bold text-slate-950 transition active:scale-[.99]">💎 Préparer une demande de parrainage</button>
          {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-100">{notice}</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">Prototype uniquement : ne verse aucun argent sur la base de cette page. Les bénéficiaires, l’organisme responsable, les justificatifs, le suivi des fonds et les paiements doivent être vérifiés et intégrés avant tout parrainage réel.</p>
        </section>
      </div>
    </main>
  );
}
