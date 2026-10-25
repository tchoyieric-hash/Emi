"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, ScanSearch, AlertTriangle, ClipboardCheck, LockKeyhole } from "lucide-react";

export default function RiskGuardPage() {
  const [scanned, setScanned] = useState(false);
  const [time, setTime] = useState("");
  function runScan() {
    setTime(new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }));
    setScanned(true);
  }
  return <main className="min-h-screen bg-[#030712] px-4 py-8 text-slate-50">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/annonces" className="text-sm text-white/60 hover:text-white">← Retour au marché EMi</Link>
        <Link href="/" className="font-semibold tracking-[.22em] text-emerald-300">EMi</Link>
      </header>
      <section className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-slate-900 via-[#111827] to-indigo-950 p-5 shadow-2xl shadow-amber-950/20 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-300"><ShieldCheck size={28}/></span>
          <div><p className="text-xs uppercase tracking-[.25em] text-amber-200/70">Sécurité · Risques · Gouvernance</p><h1 className="mt-1 text-2xl font-semibold text-amber-300 sm:text-3xl">EMi Risk-Guard & AML Shield</h1></div>
        </div>
        <p className="mb-6 text-sm leading-6 text-slate-300">Espace de préparation des contrôles de risque et de conformité anti-blanchiment (AML). Les vérifications réelles nécessitent des données transactionnelles, des règles documentées et une validation spécialisée.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#030712] p-4"><div className="flex items-center gap-2 text-sm text-slate-300"><LockKeyhole size={18} className="text-emerald-300"/> État de l’interface</div><p className="mt-2 text-lg font-semibold text-emerald-300">Prête à préparer un contrôle</p><p className="mt-1 text-xs text-slate-500">Aucune surveillance automatique active n’est attestée.</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#030712] p-4"><div className="flex items-center gap-2 text-sm text-slate-300"><AlertTriangle size={18} className="text-amber-300"/> Indice de risque réseau</div><p className="mt-2 text-lg font-semibold text-amber-300">Non calculé</p><p className="mt-1 text-xs text-slate-500">Aucun score de risque réel n’est disponible ici.</p></div>
        </div>
        <div className="my-5 flex items-start gap-3 rounded-xl border border-amber-300/20 border-l-4 bg-[#030712] p-4 text-sm leading-6 text-amber-100/90"><AlertTriangle className="mt-0.5 shrink-0" size={19}/><p>Important : ce bouton ne réalise pas d’audit AML réel et ne consulte pas les transactions. Ne considère pas l’absence d’alertes comme une preuve de conformité.</p></div>
        <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4"><h2 className="mb-3 font-semibold">Contrôles à examiner</h2><ul className="space-y-3 text-sm text-slate-300"><li className="flex gap-2"><ClipboardCheck size={18} className="shrink-0 text-emerald-300"/> Identification des clients et vérification KYC selon les règles applicables.</li><li className="flex gap-2"><ScanSearch size={18} className="shrink-0 text-emerald-300"/> Revue des transactions inhabituelles et seuils d’alerte documentés.</li><li className="flex gap-2"><ShieldCheck size={18} className="shrink-0 text-emerald-300"/> Journalisation, gestion des accès et procédure d’escalade des alertes.</li><li className="flex gap-2"><AlertTriangle size={18} className="shrink-0 text-amber-300"/> Vérification des obligations applicables avec un professionnel qualifié.</li></ul></div>
        <button type="button" onClick={runScan} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 px-4 py-4 font-bold text-slate-950 transition hover:brightness-110"><ScanSearch size={19}/> Préparer une checklist AML</button>
        {scanned && <div role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100"><p className="font-semibold">Checklist préparée — {time}</p><p className="mt-2">Aucune transaction n’a été scannée. Aucun résultat de surveillance ou certificat de conformité n’a été produit. Utilise cette checklist pour organiser une revue réelle.</p><button onClick={() => window.print()} className="mt-3 rounded-lg border border-emerald-200/30 px-3 py-2 font-semibold">Imprimer / enregistrer en PDF</button></div>}
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Outil de préparation uniquement · Pas un service de surveillance AML certifié.</p>
      </section>
    </div>
  </main>;
}
