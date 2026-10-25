"use client";

import Link from "next/link";
import { useState } from "react";
import { Handshake, ShieldCheck, UsersRound, Scale, AlertTriangle, FileText } from "lucide-react";

export default function SovereignGovernancePage() {
  const [accepted, setAccepted] = useState(false);
  const [notice, setNotice] = useState("");
  const [acceptedAt, setAcceptedAt] = useState("");
  function validatePact() {
    setAcceptedAt(new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }));
    setAccepted(true);
    setNotice("Accord de démonstration enregistré uniquement dans cette session. Aucun fonds de garantie ni statut juridique n’est activé par cette action.");
  }
  return <main className="min-h-screen bg-[#030712] px-4 py-8 text-slate-50">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center justify-between"><Link href="/annonces" className="text-sm text-white/60 hover:text-white">← Retour au marché EMi</Link><Link href="/" className="font-semibold tracking-[.22em] text-violet-300">EMi</Link></header>
      <section className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-slate-900 via-[#111827] to-indigo-950 p-5 shadow-2xl shadow-violet-950/30 sm:p-8">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-2xl border border-violet-300/20 bg-violet-300/10 p-3 text-violet-300"><Handshake size={28}/></span><div><p className="text-xs uppercase tracking-[.25em] text-violet-200/70">Confiance · Transparence · Responsabilité</p><h1 className="mt-1 text-2xl font-semibold text-violet-300 sm:text-3xl">Sovereign Trust & Governance</h1></div></div>
        <p className="mb-6 text-sm leading-6 text-slate-300">Un espace pour consulter les principes proposés de confiance, de protection mutuelle et de gouvernance communautaire d’EMi.</p>
        <div className="my-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#030712] p-4"><div className="flex items-center gap-2 text-sm text-slate-300"><ShieldCheck size={18} className="text-emerald-300"/> Fonds Safe-Net</div><p className="mt-2 font-semibold text-amber-200">Non activé / non vérifié</p><p className="mt-1 text-xs leading-5 text-slate-500">Aucun fonds mutualisé réel n’est attesté par cette interface.</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#030712] p-4"><div className="flex items-center gap-2 text-sm text-slate-300"><UsersRound size={18} className="text-violet-300"/> Gouvernance</div><p className="mt-2 font-semibold text-white">Proposition à définir</p><p className="mt-1 text-xs leading-5 text-slate-500">Les rôles, les membres et les règles du conseil doivent être formellement établis.</p></div>
        </div>
        <div className="mb-5 rounded-xl border border-violet-300/20 border-l-4 bg-[#030712] p-4 text-sm leading-6 text-violet-100/90"><div className="mb-2 flex items-center gap-2 font-semibold"><Scale size={18}/> Principes proposés</div><ul className="list-inside list-disc space-y-1 text-slate-300"><li>Règles claires et accessibles à la communauté.</li><li>Protection des utilisateurs et traitement équitable des réclamations.</li><li>Traçabilité des décisions et transparence des frais.</li><li>Gestion des conflits d’intérêts et procédure de recours.</li></ul></div>
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100/90"><AlertTriangle size={19} className="mt-0.5 shrink-0"/><p>La validation ci-dessous est une simulation d’interface. Elle ne crée pas de contrat juridiquement validé, n’active aucune garantie financière et n’affilie pas réellement l’utilisateur à un dispositif de protection.</p></div>
        <button type="button" onClick={validatePact} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-4 font-bold text-white transition hover:brightness-110"><FileText size={19}/> Consulter et valider le pacte de démonstration</button>
        {accepted && <div role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100"><p className="font-semibold">Pacte consulté — {acceptedAt}</p><p className="mt-2">{notice}</p><button onClick={() => window.print()} className="mt-3 rounded-lg border border-emerald-200/30 px-3 py-2 font-semibold">Imprimer / enregistrer en PDF</button></div>}
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Prototype de gouvernance · Aucun fonds, organisme de certification ou conseil officiel n’est déclaré actif.</p>
      </section>
    </div>
  </main>;
}
