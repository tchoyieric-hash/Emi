"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Activity, AlertTriangle, RefreshCw } from "lucide-react";

const modules = [
  ["Autonomous-Trade & Neural Core", "Analyse de données limitée aux fonctions intégrées", "Partiel"],
  ["Flash-Barter & Swap-Hub", "Troc-Chain propose un rapprochement textuel, sans séquestre", "Partiel"],
  ["Tontine-Flow & Njangi-Trust", "Paiements réels non connectés aux opérateurs", "À vérifier"],
  ["Neuro-Inventory Pro", "Interface de démonstration, sans prédictions IA actives", "Démo"],
  ["Black-Diamond & Philanthropy Vault", "Présentation seulement ; accès privé et versements non activés", "Démo"],
  ["Hope-Bridge", "Fonctionnalités et intégrations à contrôler", "À vérifier"],
  ["Sovereign Compliance, AML & Trust", "Checklist de préparation, aucune certification garantie", "À vérifier"],
];
export default function MasterHealthCheckPage() {
  const [ran, setRan] = useState(false);
  const [time, setTime] = useState("");
  return <main className="min-h-screen bg-[#030712] px-4 py-7 text-slate-50"><div className="mx-auto max-w-2xl space-y-5">
    <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300"><ArrowLeft size={18}/> Retour au marché EMi</Link>
    <header className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-slate-900 to-blue-950/60 p-6 sm:p-8"><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-300"><Activity size={28}/></span><div><p className="text-xs uppercase tracking-[.24em] text-emerald-300">EMi · Centre de contrôle</p><h1 className="text-2xl font-bold sm:text-3xl">Master Integration & Health-Check</h1></div></div><p className="mt-4 text-sm leading-6 text-slate-300">Vue d’ensemble des modules et de leur niveau d’intégration déclaré. Le bouton réalise une checklist locale, pas un test automatique de Supabase, des services ou du déploiement.</p></header>
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-6"><h2 className="mb-4 text-lg font-bold">État indicatif des 7 piliers</h2><div className="space-y-3">{modules.map(([name, detail, status]) => <article key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold">{name}</h3><span className={"shrink-0 rounded-full px-2.5 py-1 text-xs " + (status === "Partiel" ? "bg-amber-400/10 text-amber-200" : status === "Démo" ? "bg-blue-400/10 text-blue-200" : "bg-rose-400/10 text-rose-200")}>{status}</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></article>)}</div>
    <button onClick={() => { setRan(true); setTime(new Date().toLocaleString("fr-FR")); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-4 py-3.5 font-bold text-slate-950"><RefreshCw size={18}/> Lancer le contrôle de checklist</button>
    {ran && <div role="status" className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><div className="flex items-center gap-2 font-semibold text-amber-200"><AlertTriangle size={18}/> Vérification technique requise</div><p className="mt-2 text-sm leading-5 text-slate-300">Cette action n’a pas testé les services en direct. Vérifie les builds Vercel, les requêtes Supabase, les politiques RLS, le stockage média et les fournisseurs de paiement avant de déclarer EMi prêt.</p><p className="mt-2 text-xs text-slate-500">Checklist locale lancée : {time}</p></div>}
    </section><aside className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-sm leading-6 text-slate-400">Transparence : aucun module n’est déclaré opérationnel sans test technique vérifiable. Cette page ne certifie ni conformité institutionnelle, ni synchronisation globale, ni disponibilité en production.</aside>
  </div></main>;
}
