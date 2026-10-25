"use client";

import Link from "next/link";
import { useState } from "react";
import { Landmark, ShieldCheck, FileCheck2, ClipboardList, AlertTriangle } from "lucide-react";

export default function SovereignCompliancePage() {
  const [report,setReport] = useState(false);
  const [generatedAt,setGeneratedAt] = useState("");
  function generateReport() {
    setGeneratedAt(new Date().toLocaleString("fr-FR",{dateStyle:"long",timeStyle:"short"}));
    setReport(true);
  }
  return <main className="min-h-screen bg-[#030712] px-4 py-6 text-slate-50 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center justify-between"><Link href="/annonces" className="text-sm text-white/60 hover:text-white">← Retour au marché EMi</Link><Link href="/" className="font-semibold tracking-[.22em] text-blue-200">EMi</Link></header>
      <section className="rounded-3xl border border-blue-400/25 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 shadow-2xl shadow-blue-950/30 sm:p-8">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-3 text-blue-300"><Landmark size={28}/></span><div><p className="text-xs uppercase tracking-[.25em] text-blue-200/70">Gouvernance · Traçabilité · Contrôles</p><h1 className="mt-1 text-2xl font-semibold text-blue-300 sm:text-3xl">Sovereign Compliance & Trust</h1></div></div>
        <p className="mb-6 text-sm leading-6 text-slate-300">Un espace de préparation documentaire pour organiser les contrôles de conformité et identifier les éléments à vérifier avant tout audit institutionnel.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-[#030712] p-4 text-center"><p className="text-2xl font-bold text-emerald-300">À vérifier</p><p className="mt-2 text-xs text-slate-400">Conformité des flux</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#030712] p-4 text-center"><p className="text-2xl font-bold text-amber-300">Non certifié</p><p className="mt-2 text-xs text-slate-400">Registre d’audit KYC</p></div>
        </div>
        <div className="my-5 flex items-start gap-3 rounded-xl border border-blue-300/20 border-l-4 bg-[#030712] p-4 text-sm leading-6 text-blue-100/90"><ShieldCheck className="mt-0.5 shrink-0" size={19}/><p>État réel : cette interface ne certifie pas la conformité juridique ou réglementaire d’EMi. Aucun audit indépendant, registre KYC certifié ni partenariat institutionnel n’est attesté ici.</p></div>
        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4"><h2 className="mb-3 font-semibold">Points à documenter pour un audit</h2><ul className="space-y-3 text-sm text-slate-300"><li className="flex gap-2"><ClipboardList size={18} className="shrink-0 text-blue-300"/>Inventaire des flux financiers et des prestataires de paiement.</li><li className="flex gap-2"><FileCheck2 size={18} className="shrink-0 text-blue-300"/>Politiques KYC/AML, protection des données et conservation des preuves.</li><li className="flex gap-2"><ShieldCheck size={18} className="shrink-0 text-blue-300"/>Contrôles d’accès, journalisation, gestion des incidents et procédures de suppression.</li><li className="flex gap-2"><AlertTriangle size={18} className="shrink-0 text-amber-300"/>Validation par un juriste et un auditeur indépendant selon les juridictions concernées.</li></ul></div>
        <button type="button" onClick={generateReport} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-4 font-bold text-white transition hover:brightness-110">📋 Préparer un rapport de contrôle</button>
        {report&&<div role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100"><p className="font-semibold">Rapport de préparation généré — {generatedAt}</p><p className="mt-2">Le rapport est une checklist indicative affichée dans cette session. Il ne contient pas de résultats d’audit réels, n’est pas certifié et n’a pas été transmis à un régulateur.</p><button onClick={()=>window.print()} className="mt-3 rounded-lg border border-emerald-200/30 px-3 py-2 font-semibold">Imprimer / enregistrer en PDF</button></div>}
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Cette page est un outil de préparation. Les indicateurs ne sont pas des résultats de conformité vérifiés.</p>
      </section>
    </div>
  </main>;
}
