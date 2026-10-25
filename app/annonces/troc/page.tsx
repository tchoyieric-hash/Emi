"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Offre = { id: string; user_id: string; bien_offert: string; bien_recherche: string; description: string; statut: string; created_at: string };
const supabase = createSupabaseBrowserClient();

function correspond(a: string, b: string) {
  const clean = (s: string) => s.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const x = clean(a), y = clean(b);
  return x === y || x.includes(y) || y.includes(x);
}

export default function TrocChainPage() {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [userId, setUserId] = useState("");
  const [offert, setOffert] = useState("");
  const [recherche, setRecherche] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    if (!supabase) { setNotice("La connexion Supabase n'est pas configurée."); setLoading(false); return; }
    const [{ data: auth }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("troc_offres").select("id,user_id,bien_offert,bien_recherche,description,statut,created_at").eq("statut", "active").order("created_at", { ascending: false }).limit(100)
    ]);
    setUserId(auth.user?.id ?? "");
    if (error) setNotice("Chargement des offres impossible : " + error.message);
    else setOffres((data ?? []) as Offre[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function publier(e: FormEvent) {
    e.preventDefault(); setNotice("");
    if (!supabase) { setNotice("Supabase n'est pas configuré."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setNotice("Connecte-toi à EMi pour publier une offre de troc."); return; }
    if (offert.trim().length < 2 || recherche.trim().length < 2) { setNotice("Renseigne le bien offert et celui recherché."); return; }
    setSaving(true);
    const { error } = await supabase.from("troc_offres").insert({ user_id: user.id, bien_offert: offert.trim(), bien_recherche: recherche.trim(), description: description.trim() });
    if (error) setNotice("Publication impossible : " + error.message);
    else { setOffert(""); setRecherche(""); setDescription(""); setNotice("Offre publiée. Les correspondances disponibles ont été actualisées."); await load(); }
    setSaving(false);
  }

  const mesCorrespondances = offres.filter(o => o.user_id !== userId && correspond(o.bien_offert, recherche) && correspond(o.bien_recherche, offert));
  const autres = offres.filter(o => o.user_id !== userId && !mesCorrespondances.some(m => m.id === o.id));

  return <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50 sm:py-10">
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-amber-200"><ArrowLeft size={17}/> Marché EMi</Link>
        <Link href="/" className="font-semibold tracking-[.22em] text-amber-200">EMi</Link>
      </header>
      <section className="mx-auto max-w-2xl rounded-3xl border border-amber-400/20 bg-gradient-to-br from-slate-800 to-slate-950 p-5 shadow-2xl shadow-amber-950/20 sm:p-8">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-amber-300"><Sparkles size={15}/> Échange circulaire P2P</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">🔄 Troc-Chain</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Propose un bien et indique ce que tu recherches. EMi repère les offres publiées qui semblent correspondre, sans exiger de paiement en espèces.</p>
        {notice && <div role="status" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</div>}
        <form onSubmit={publier} className="mt-6 grid gap-3">
          <label className="grid gap-2 text-sm text-slate-300">Ce que tu proposes<input required maxLength={160} value={offert} onChange={e=>setOffert(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-300" placeholder="Ex. ordinateur portable"/></label>
          <label className="grid gap-2 text-sm text-slate-300">Ce que tu recherches en échange<input required maxLength={160} value={recherche} onChange={e=>setRecherche(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-300" placeholder="Ex. smartphone récent"/></label>
          <label className="grid gap-2 text-sm text-slate-300">Détails facultatifs<textarea maxLength={1500} rows={2} value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-300" placeholder="État, lieu de remise, détails…"/></label>
          <button disabled={saving} className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{saving ? <LoaderCircle size={18} className="animate-spin"/> : <ArrowLeftRight size={18}/>} {saving ? "Publication…" : "Publier et chercher des échanges"}</button>
        </form>
      </section>
      <section className="mx-auto mt-8 max-w-2xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Offres et correspondances</h2><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"><RefreshCw size={15}/> Actualiser</button></div>
        {loading ? <p className="flex items-center gap-2 py-8 text-slate-400"><LoaderCircle className="animate-spin"/> Recherche des offres…</p> : offres.length === 0 ? <div className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">Aucune offre active pour l'instant. Publie la première offre de troc.</div> : <>
          {mesCorrespondances.length > 0 && <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"><h3 className="font-semibold text-emerald-300">🎯 Correspondance possible</h3><p className="mt-1 text-sm text-slate-300">Une autre offre semble rechercher ce que tu proposes et proposer ce que tu recherches. Vérifie les détails avec l'autre membre avant de conclure.</p></div>}
          <div className="grid gap-3">{(mesCorrespondances.length ? mesCorrespondances : autres).map(o=><article key={o.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Propose : {o.bien_offert}</span><span className="text-slate-500">↔</span><span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">Recherche : {o.bien_recherche}</span></div>{o.description && <p className="mt-3 text-sm text-slate-400">{o.description}</p>}<p className="mt-3 text-xs text-slate-500">Offre publiée le {new Date(o.created_at).toLocaleDateString("fr-FR")}</p></article>)}</div>
        </>}
      </section>
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-5 text-slate-500">Important : le matching est indicatif et compare les textes des offres actives. Aucun contrat intelligent ni échange automatique n'est exécuté. Vérifie les biens et l'identité des membres avant toute remise.</p>
    </div>
  </main>;
}