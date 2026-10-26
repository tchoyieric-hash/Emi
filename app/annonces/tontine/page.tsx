"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Users, HandCoins, PlusCircle, RefreshCw, ShieldCheck, Search, Camera, Home, Heart, LayoutGrid, Compass, Target, Sprout } from "lucide-react";
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
  return <main className="min-h-screen w-full overflow-x-hidden bg-white px-0 pb-12 text-[#171717]">
    <header className="sticky top-0 z-30 mx-auto flex w-full max-w-5xl items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-3 text-[#171717] backdrop-blur sm:py-4">
      <Link href="/annonces" className="inline-flex min-w-0 items-center gap-2 text-xs text-stone-700 hover:text-emerald-800 sm:text-sm"><ArrowLeft size={17} className="shrink-0"/> <span>Marché EMi</span></Link>
      <span className="font-semibold tracking-[.15em] text-emerald-900">EMi DJANGUI FLOW</span>
      <button onClick={() => { setLoading(true); void charger(); }} aria-label="Actualiser" className="rounded-full border border-stone-300 p-2"><RefreshCw size={17}/></button>
    </header>
    <section className="mx-auto w-full max-w-5xl pt-0 sm:pt-4"><div className="px-4 py-3"><label className="flex h-14 items-center gap-3 rounded-full border border-stone-300 bg-white px-4 shadow-sm"><Search size={24}/><input aria-label="Rechercher un cercle" placeholder="Rechercher un cercle, un membre..." className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-500"/><Camera size={23}/></label></div>
      <div className="relative mb-6 flex min-h-[390px] items-end overflow-hidden rounded-none bg-[#063b2a] p-5 text-white shadow-sm sm:min-h-[500px] sm:rounded-3xl sm:p-9"><img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1800&q=90" alt="Une communauté réunie" className="absolute inset-0 h-full w-full object-cover opacity-65"/><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10"/><div className="relative z-10 max-w-3xl">
        <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-amber-200"><Users size={21}/></div><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-amber-200 sm:text-xs">EMi · Communauté</p><p className="mt-1 text-xs text-white/85">Achat groupé solidaire</p></div></div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Tontine<span className="text-amber-200"> Flow</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">Réunissez votre communauté pour financer ensemble un achat utile. Créez un cercle, invitez des membres et suivez les engagements en toute transparence.</p>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-white/25 bg-black/25 p-3 text-xs leading-5 text-white/95 sm:p-4 sm:text-sm sm:leading-6"><ShieldCheck className="mt-0.5 shrink-0" size={19}/><p>Pour le moment, rejoindre un cercle enregistre une intention de participation uniquement. Aucun argent n’est encaissé et aucun paiement Mobile Money n’est lancé automatiquement.</p></div>
      </div></div>
      {notice && <div role="status" className="mt-5 rounded-2xl border border-emerald-900/10 bg-emerald-50 p-4 text-sm text-emerald-950">{notice}</div>}
      <form onSubmit={creer} className="mt-5 grid min-w-0 grid-cols-1 gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:mt-6 sm:grid-cols-3 sm:p-6">
        <div className="sm:col-span-3"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-800">Commencer</p><h2 className="mt-1 text-xl font-semibold sm:text-2xl">Créer un cercle</h2><p className="mt-2 text-sm leading-5 text-stone-500">Définissez l’objectif et le nombre de participants. La cotisation estimée se calcule automatiquement.</p></div>
        <label className="flex min-w-0 flex-col gap-2 text-sm sm:col-span-3">Article ou achat prévu<input value={nom} onChange={e=>setNom(e.target.value)} required minLength={3} maxLength={120} placeholder="Ex. Pack stock marchand - Bastos" className="block min-h-12 w-full min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-emerald-950 outline-none transition placeholder:text-stone-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/30"/></label>
        <label className="flex min-w-0 flex-col gap-2 text-sm">Objectif (FCFA)<input value={prix} onChange={e=>setPrix(e.target.value)} type="number" min="1" step="1" required className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-amber-200"/></label>
        <label className="grid gap-2 text-sm">Nombre de membres<input value={max} onChange={e=>setMax(e.target.value)} type="number" min="2" max="50" step="1" required className="rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none focus:border-amber-200"/></label>
        <div className="flex min-w-0 items-end"><div className="w-full rounded-xl border border-amber-200/15 bg-amber-200/[.07] p-3"><p className="text-xs text-stone-500">Cotisation indicative / membre</p><p className="mt-1 text-lg font-semibold text-emerald-950">{fmt(Math.ceil((Number(prix)||0)/Math.max(2,Number(max)||5)))}</p></div></div>
        <button disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-200 to-yellow-500 px-4 py-3 font-semibold text-[#171020] shadow-lg shadow-emerald-950/20 transition hover:brightness-110 disabled:opacity-50 sm:col-span-3"><PlusCircle size={18}/>{saving ? "Création…" : "Créer le cercle"}</button>
      </form>
      <div id="cercles" className="mb-4 mt-8 flex items-end justify-between gap-3 sm:mt-9"><div><h2 className="text-xl font-semibold sm:text-2xl">Cercles ouverts</h2><p className="mt-1 text-sm text-stone-500">Rejoins un groupe existant.</p></div><span className="text-sm text-stone-500">{cercles.length} cercle(s)</span></div>
      {loading ? <p className="py-10 text-center text-stone-500">Chargement des cercles…</p> : cercles.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">Aucun cercle pour le moment. Crée le premier cercle d’achat.</div> : <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">{cercles.map(c => {
        const parts = participants.filter(p => p.cercle_id === c.id);
        const amount = parts.reduce((sum,p) => sum + Number(p.montant_promis),0);
        const progress = Math.min(100, Math.round(amount / Number(c.prix_cible) * 100));
        const full = parts.length >= c.membres_max;
        return <article key={c.id} className="min-w-0 overflow-hidden rounded-3xl border border-stone-200 bg-white p-0 shadow-sm sm:p-0">
          <div className="relative h-36 overflow-hidden bg-emerald-950 sm:h-44"><img src={"https://images.unsplash.com/photo-" + (["1529156069898-49953e39b3ac","1511632765486-a01980e01a18","1527528484897-7e9f6e7c3b2f"][cercles.indexOf(c)%3]) + "?auto=format&fit=crop&w=900&q=85"} alt="Communauté réunie pour un cercle Djangui" loading="lazy" className="h-full w-full object-cover"/><span className="absolute bottom-3 left-3 rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-amber-200">Djangui</span></div><div className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><h3 className="min-w-0 break-words text-base font-semibold sm:text-lg">{c.nom_article}</h3><span className={"shrink-0 rounded-full px-3 py-1 text-xs " + (full || c.statut === "complet" ? "bg-emerald-400/15 text-emerald-800" : "bg-amber-400/15 text-amber-200")}>{full ? "Complet" : c.statut === "annule" ? "Annulé" : "Ouvert"}</span></div>
          <p className="mt-3 text-xl font-semibold text-emerald-800 sm:text-2xl">{fmt(Number(c.prix_cible))}</p>
          <div className="mt-4 flex justify-between text-xs text-stone-500"><span className="inline-flex items-center gap-1"><Users size={14}/>{parts.length}/{c.membres_max} membres</span><span>{progress}% des engagements</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all" style={{width: progress + "%"}}/></div>
          <div className="mt-4 flex items-center justify-between gap-3"><span className="text-sm text-stone-600"><HandCoins className="mr-1 inline" size={16}/>{fmt(Math.ceil(Number(c.prix_cible)/c.membres_max))} / personne</span><button onClick={() => void rejoindre(c)} disabled={full || c.statut !== "ouvert" || parts.some(p=>p.user_id===userId)} className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold hover:bg-amber-200 text-[#09251a] disabled:cursor-not-allowed disabled:opacity-40">{parts.some(p=>p.user_id===userId) ? "Déjà inscrit" : full ? "Cercle complet" : "Rejoindre"}</button></div>
          <p className="mt-3 text-xs text-stone-500">Les montants représentent des engagements déclarés, pas des paiements vérifiés.</p></div>
        </article>;
      })}</div>}
    <section className="px-4 pb-8 pt-8"><h2 className="text-xl font-bold">Pourquoi Djangui Flow ?</h2><div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs"><div className="rounded-2xl bg-emerald-50 p-3"><HandCoins size={25} className="mx-auto text-emerald-900"/><p className="mt-2">Épargner ensemble</p></div><div className="rounded-2xl bg-emerald-50 p-3"><Target size={25} className="mx-auto text-emerald-900"/><p className="mt-2">Réaliser vos projets</p></div><div className="rounded-2xl bg-emerald-50 p-3"><Users size={25} className="mx-auto text-emerald-900"/><p className="mt-2">Plus de solidarité</p></div><div className="rounded-2xl bg-emerald-50 p-3"><Sprout size={25} className="mx-auto text-emerald-900"/><p className="mt-2">Un avenir meilleur</p></div></div><div className="mt-5 rounded-2xl bg-emerald-950 p-4 text-white"><p className="font-bold text-amber-200">Vous souhaitez créer un cercle ?</p><p className="mt-1 text-sm text-white/80">Rassemblez vos proches et commencez dès aujourd’hui.</p><a href="#top" onClick={e=>{e.preventDefault();document.querySelector("form")?.scrollIntoView({behavior:"smooth"});}} className="mt-3 inline-flex rounded-full bg-amber-300 px-4 py-2 font-semibold text-emerald-950">Créer un cercle →</a></div></section>
    </section><nav aria-label="Navigation Djangui Flow" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-3 py-2 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-around"><Link href="/annonces" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><Home size={23}/>Accueil</Link><a href="#cercles" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><Search size={23}/>Explorer</a><a href="#top" onClick={e=>{e.preventDefault();document.querySelector("form")?.scrollIntoView({behavior:"smooth"});}} className="grid h-12 w-12 place-items-center rounded-full bg-amber-300 text-emerald-950"><PlusCircle size={25}/></a><a href="#cercles" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><Heart size={23}/>Cercles</a><Link href="/annonces" className="flex flex-col items-center gap-1 text-xs text-emerald-950"><LayoutGrid size={23}/>Espaces</Link></div></nav>
  </main>;
}
