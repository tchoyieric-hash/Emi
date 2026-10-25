"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Users, HandCoins, PlusCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Cercle = { id: string; createur_id: string; nom_article: string; prix_cible: number; devise: string; membres_max: number; statut: string; created_at: string };
type Participant = { id: string; cercle_id: string; user_id: string; montant_promis: number; statut: string };
const supabase = createSupabaseBrowserClient();

export default function TontineFlowPage() {
  const [cercles, setCercles] = useState<Cercle[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userId, setUserId] = useState("");
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("150000");
  const [max, setMax] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const charger = useCallback(async () => {
    if (!supabase) { setNotice("La connexion Supabase n'est pas configurée."); setLoading(false); return; }
    const [{ data: auth }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("tontine_cercles").select("id,createur_id,nom_article,prix_cible,devise,membres_max,statut,created_at").order("created_at", { ascending: false }).limit(50)
    ]);
    setUserId(auth.user?.id ?? "");
    if (error) setNotice("Impossible de charger les cercles : " + error.message);
    const rows = (data || []) as Cercle[];
    setCercles(rows);
    if (rows.length) {
      const { data: parts, error: partError } = await supabase.from("tontine_participants").select("id,cercle_id,user_id,montant_promis,statut").in("cercle_id", rows.map(x => x.id)).neq("statut", "annule");
      if (partError) setNotice("Impossible de charger les participants : " + partError.message);
      setParticipants((parts || []) as Participant[]);
    } else setParticipants([]);
    setLoading(false);
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  async function creer(e: FormEvent) {
    e.preventDefault(); setNotice("");
    if (!supabase) return setNotice("Supabase n'est pas configuré.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setNotice("Connecte-toi à EMi pour créer un cercle.");
    const amount = Number(prix), count = Number(max);
    if (nom.trim().length < 3 || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isInteger(count) || count < 2 || count > 50)
      return setNotice("Vérifie le nom, le prix et le nombre de membres (2 à 50).");
    setSaving(true);
    const { data, error } = await supabase.from("tontine_cercles").insert({
      createur_id: auth.user.id, nom_article: nom.trim(), prix_cible: amount, devise: "XAF", membres_max: count, statut: "ouvert"
    }).select("id").single();
    if (error) { setNotice("Création impossible : " + error.message); setSaving(false); return; }
    const part = Math.ceil(amount / count);
    const { error: joinError } = await supabase.from("tontine_participants").insert({ cercle_id: data.id, user_id: auth.user.id, montant_promis: part, statut: "inscrit" });
    if (joinError) setNotice("Cercle créé, mais inscription du créateur impossible : " + joinError.message);
    else { setNotice("Cercle créé. Ta participation est enregistrée comme intention, aucun paiement n'a été effectué."); setNom(""); }
    await charger(); setSaving(false);
  }

  async function rejoindre(c: Cercle) {
    setNotice("");
    if (!supabase) return setNotice("Supabase n'est pas configuré.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setNotice("Connecte-toi à EMi pour rejoindre un cercle.");
    const current = participants.filter(p => p.cercle_id === c.id);
    if (c.statut !== "ouvert" || current.length >= c.membres_max) return setNotice("Ce cercle est complet ou fermé.");
    if (current.some(p => p.user_id === auth.user!.id)) return setNotice("Tu es déjà inscrit à ce cercle.");
    const contribution = Math.ceil(Number(c.prix_cible) / c.membres_max);
    const { error } = await supabase.from("tontine_participants").insert({ cercle_id: c.id, user_id: auth.user.id, montant_promis: contribution, statut: "inscrit" });
    if (error) { setNotice("Inscription impossible : " + error.message); return; }
    setNotice("Inscription enregistrée comme engagement. Aucun paiement Mobile Money n'a été déclenché.");
    await charger();
  }

  const fmt = (n: number) => Number(n).toLocaleString("fr-FR") + " FCFA";
  return <main className="min-h-screen bg-[#09090d] px-4 pb-12 text-white">
    <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 py-5">
      <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-amber-200"><ArrowLeft size={17}/> Marché EMi</Link>
      <span className="font-semibold tracking-[.2em] text-amber-200">EMi</span>
      <button onClick={() => { setLoading(true); void charger(); }} aria-label="Actualiser" className="rounded-full border border-white/15 p-2"><RefreshCw size={17}/></button>
    </header>
    <section className="mx-auto max-w-5xl pt-8">
      <div className="rounded-3xl border border-violet-300/20 bg-gradient-to-br from-violet-500/15 via-white/[.03] to-emerald-400/5 p-6 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[.28em] text-violet-200">Achat groupé solidaire</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-5xl">Tontine<span className="text-violet-300">-Flow</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">Réunissez un groupe pour planifier l’achat d’un article ensemble. Les inscriptions sont stockées dans Supabase et restent visibles après reconnexion.</p>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/20 bg-black/20 p-4 text-sm text-amber-100/90"><ShieldCheck className="mt-0.5 shrink-0" size={19}/><p>Pour le moment, rejoindre un cercle enregistre une intention de participation uniquement. Aucun argent n’est encaissé et aucun paiement Mobile Money n’est lancé automatiquement.</p></div>
      </div>
      {notice && <div role="status" className="mt-5 rounded-2xl border border-white/10 bg-white/[.05] p-4 text-sm text-emerald-100">{notice}</div>}
      <form onSubmit={creer} className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:grid-cols-3 sm:p-6">
        <div className="sm:col-span-3"><h2 className="text-xl font-semibold">Créer un cercle</h2><p className="mt-1 text-sm text-white/50">La cotisation indicative est calculée en divisant le prix par le nombre de membres.</p></div>
        <label className="grid gap-2 text-sm sm:col-span-3">Article ou achat prévu<input value={nom} onChange={e=>setNom(e.target.value)} required minLength={3} maxLength={120} placeholder="Ex. Pack stock marchand - Bastos" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-violet-300"/></label>
        <label className="grid gap-2 text-sm">Objectif (FCFA)<input value={prix} onChange={e=>setPrix(e.target.value)} type="number" min="1" step="1" required className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-violet-300"/></label>
        <label className="grid gap-2 text-sm">Nombre de membres<input value={max} onChange={e=>setMax(e.target.value)} type="number" min="2" max="50" step="1" required className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-violet-300"/></label>
        <div className="flex items-end"><div className="w-full rounded-xl bg-violet-300/10 p-3"><p className="text-xs text-white/50">Cotisation indicative</p><p className="mt-1 font-semibold text-violet-200">{fmt(Math.ceil((Number(prix)||0)/Math.max(2,Number(max)||5)))}</p></div></div>
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-semibold transition hover:bg-violet-400 disabled:opacity-50 sm:col-span-3"><PlusCircle size={18}/>{saving ? "Création…" : "Créer le cercle"}</button>
      </form>
      <div className="mb-4 mt-9 flex items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold">Cercles ouverts</h2><p className="mt-1 text-sm text-white/50">Rejoins un groupe existant.</p></div><span className="text-sm text-white/50">{cercles.length} cercle(s)</span></div>
      {loading ? <p className="py-10 text-center text-white/50">Chargement des cercles…</p> : cercles.length === 0 ? <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">Aucun cercle pour le moment. Crée le premier cercle d’achat.</div> : <div className="grid gap-4 md:grid-cols-2">{cercles.map(c => {
        const parts = participants.filter(p => p.cercle_id === c.id);
        const amount = parts.reduce((sum,p) => sum + Number(p.montant_promis),0);
        const progress = Math.min(100, Math.round(amount / Number(c.prix_cible) * 100));
        const full = parts.length >= c.membres_max;
        return <article key={c.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
          <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold">{c.nom_article}</h3><span className={"shrink-0 rounded-full px-3 py-1 text-xs " + (full || c.statut === "complet" ? "bg-emerald-400/15 text-emerald-200" : "bg-violet-400/15 text-violet-200")}>{full ? "Complet" : c.statut === "annule" ? "Annulé" : "Ouvert"}</span></div>
          <p className="mt-3 text-2xl font-semibold text-emerald-200">{fmt(Number(c.prix_cible))}</p>
          <div className="mt-4 flex justify-between text-xs text-white/55"><span className="inline-flex items-center gap-1"><Users size={14}/>{parts.length}/{c.membres_max} membres</span><span>{progress}% des engagements</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-400 transition-all" style={{width: progress + "%"}}/></div>
          <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-white/65"><HandCoins className="mr-1 inline" size={16}/>{fmt(Math.ceil(Number(c.prix_cible)/c.membres_max))} / personne</span><button onClick={() => void rejoindre(c)} disabled={full || c.statut !== "ouvert" || parts.some(p=>p.user_id===userId)} className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40">{parts.some(p=>p.user_id===userId) ? "Déjà inscrit" : full ? "Cercle complet" : "Rejoindre"}</button></div>
          <p className="mt-3 text-xs text-white/35">Les montants représentent des engagements déclarés, pas des paiements vérifiés.</p>
        </article>;
      })}</div>}
    </section>
  </main>;
}
