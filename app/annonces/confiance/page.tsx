"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, LoaderCircle, ShieldAlert } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Tx = { id: string; status: "succeeded" | "disputed" | "refunded"; verified_at: string };
const supabase = createSupabaseBrowserClient();

export default function ProofOfTrustPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [verification, setVerification] = useState<string>("unknown");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { setNotice("La connexion Supabase n'est pas configurée."); setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setNotice("Connecte-toi à EMi pour consulter ton registre de confiance."); setLoading(false); return; }
      setUserId(user.id);
      const [{ data: tx, error: txError }, { data: kyc, error: kycError }] = await Promise.all([
        supabase.from("trust_transactions").select("id,status,verified_at").eq("user_id", user.id),
        supabase.from("seller_verifications").select("status").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle()
      ]);
      if (txError) setNotice("Impossible de charger le registre : " + txError.message);
      else setTransactions((tx ?? []) as Tx[]);
      if (!kycError) setVerification(kyc?.status ?? "unverified");
      setLoading(false);
    }
    void load();
  }, []);

  const successful = transactions.filter(t => t.status === "succeeded").length;
  const disputes = transactions.filter(t => t.status === "disputed").length;
  const refunded = transactions.filter(t => t.status === "refunded").length;
  const score = transactions.length ? Math.round(successful / transactions.length * 1000) / 10 : null;
  const badge = verification === "approved" ? "Identité vérifiée" : "Identité non vérifiée";
  const level = score === null ? "Pas encore assez de données vérifiées" : score >= 98 ? "Réputation excellente" : score >= 90 ? "Bonne réputation" : score >= 70 ? "Réputation à consolider" : "Historique à examiner";

  return <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50 sm:py-10"><div className="mx-auto max-w-3xl">
    <header className="mb-7 flex items-center justify-between"><Link href="/annonces/espace-vendeur" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300"><ArrowLeft size={17}/> Espace vendeur</Link><Link href="/" className="font-semibold tracking-[.22em] text-amber-200">EMi</Link></header>
    <section className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-2xl shadow-cyan-950/20 sm:p-8">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-cyan-300"><ShieldCheck size={16}/> Sécurité et réputation</p>
      <h1 className="text-2xl font-semibold sm:text-3xl">Proof-of-Trust</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Un aperçu transparent de la réputation basée sur les événements de transaction vérifiés et l'état du dossier vendeur.</p>
      {notice && <div role="status" className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm text-cyan-100">{notice}</div>}
      {loading ? <p className="mt-8 flex items-center gap-2 text-slate-300"><LoaderCircle className="animate-spin"/> Chargement des données vérifiées…</p> : !userId ? null : <>
        <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
          <div className="text-4xl font-bold text-emerald-300">{score === null ? "—" : score.toFixed(1) + "%"}</div>
          <div className="mt-2 text-sm font-medium text-cyan-200">{level}</div>
          <div className="mt-3 text-xs text-slate-400">Aucun score n'est inventé : il apparaît lorsque des transactions sont ajoutées au registre par un processus de vérification autorisé.</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm text-slate-400">Transactions réussies</p><p className="mt-2 text-2xl font-semibold">{successful}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm text-slate-400">Litiges enregistrés</p><p className="mt-2 text-2xl font-semibold text-amber-300">{disputes}</p></div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm text-slate-400">Remboursements</p><p className="mt-2 text-2xl font-semibold">{refunded}</p></div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4"><ShieldAlert className="mt-0.5 shrink-0 text-cyan-300" size={20}/><div><p className="font-medium">{badge}</p><p className="mt-1 text-sm text-slate-400">{verification === "approved" ? "Le dossier vendeur est marqué comme approuvé." : "Le badge de vérification exige un contrôle réel du dossier vendeur."}</p></div></div>
        {transactions.length > 0 && <div className="mt-5"><h2 className="mb-3 font-semibold">Historique vérifié</h2><div className="space-y-2">{transactions.slice().sort((a,b)=>b.verified_at.localeCompare(a.verified_at)).map(t=><div key={t.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-black/20 p-3 text-sm"><span>{t.status === "succeeded" ? "✓ Transaction réussie" : t.status === "disputed" ? "⚠ Litige" : "↩ Remboursement"}</span><span className="text-slate-400">{new Date(t.verified_at).toLocaleDateString("fr-FR")}</span></div>)}</div></div>}
      </>}
      <p className="mt-7 text-xs leading-5 text-slate-500">Limite actuelle : EMi ne dispose pas encore d'un flux complet de confirmation de transaction connecté aux paiements. Ce registre n'est donc pas un registre décentralisé ni un contrat intelligent. Ne te fie pas à un score seul pour conclure un échange.</p>
    </section>
  </div></main>;
}