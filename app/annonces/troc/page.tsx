"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, ArrowUpRight, Camera, LoaderCircle, RefreshCw, Search, Sparkles } from "lucide-react";
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
  const [query, setQuery] = useState("");

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

  const visibles = offres.filter(o => !query.trim() || [o.bien_offert,o.bien_recherche,o.description].some(v => v.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))));
  const cartes = [
    {title:"Téléphones & technologie",tag:"TECHNOLOGIE",image:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=85",term:"téléphone"},
    {title:"Mode & accessoires",tag:"STYLE",image:"https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85",term:"vêtement"},
    {title:"Maison & mobilier",tag:"MAISON",image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85",term:"meuble"},
    {title:"Objets du quotidien",tag:"SECONDE VIE",image:"https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1000&q=85",term:"objet"},
  ];
  return <main className="min-h-screen bg-white text-[#171717]">
    <div className="mx-auto w-full max-w-6xl">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/annonces" aria-label="Retour au Marché EMi" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neutral-200 text-neutral-800"><ArrowLeft size={19}/></Link>
        <form onSubmit={e=>{e.preventDefault();document.getElementById("troc-offres")?.scrollIntoView({behavior:"smooth"});}} className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-neutral-300 bg-white px-4 py-3 shadow-sm">
          <Search size={20} className="shrink-0 text-neutral-700"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher des échanges" aria-label="Rechercher des échanges" className="w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-neutral-500"/><Camera size={21} className="shrink-0 text-neutral-700"/>
        </form>
        <span className="hidden font-bold tracking-[.2em] text-[#0b4936] sm:block">EMi</span>
      </header>
      <section className="relative mx-3 mt-1 flex min-h-[440px] items-end overflow-hidden rounded-[26px] bg-[#123b2d] sm:mx-6 sm:min-h-[500px]">
        <img src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1800&q=88" alt="Objets du quotidien prêts à trouver une nouvelle vie" className="absolute inset-0 h-full w-full object-cover object-center"/>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5"/>
        <div className="relative z-10 max-w-2xl p-6 pb-8 text-white sm:p-10 sm:pb-12">
          <p className="mb-3 text-sm font-semibold tracking-wide">EMi TROC · ÉCONOMIE CIRCULAIRE</p>
          <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">Échangez autrement</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/95 sm:text-lg">Donnez une seconde vie à vos objets et trouvez ce dont vous avez besoin, grâce aux échanges entre membres de la communauté.</p>
          <button onClick={()=>document.getElementById("troc-offres")?.scrollIntoView({behavior:"smooth"})} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-[#153e30] shadow-lg">Découvrir les échanges <ArrowUpRight size={19}/></button>
        </div>
      </section>
      <div className="flex justify-center gap-3 py-4" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-black"/><span className="h-2.5 w-2.5 rounded-full bg-neutral-400"/><span className="h-2.5 w-2.5 rounded-full bg-neutral-400"/><span className="h-2.5 w-2.5 rounded-full bg-neutral-400"/><span className="h-2.5 w-2.5 rounded-full bg-neutral-400"/></div>
      <section className="mt-2 px-4 pb-5 sm:px-6">
        <p className="text-sm text-neutral-600">Explorer les catégories de troc</p><h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">Des idées pour échanger</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {cartes.map((carte,i)=><button key={carte.tag} onClick={()=>setQuery(carte.term)} className="group overflow-hidden rounded-2xl text-left focus:outline-none focus:ring-2 focus:ring-[#0b4936]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100"><img src={carte.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"/><span className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white sm:text-base">{carte.title}</span></div>
          </button>)}
        </div>
      </section>
      <section id="troc-offres" className="scroll-mt-24 px-4 pb-10 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#17664b]">La communauté EMi</p><h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">Offres qui pourraient vous plaire</h2><p className="mt-2 text-sm text-neutral-600">Parcourez les propositions et trouvez une correspondance.</p></div><button onClick={()=>{setLoading(true);void load();}} className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-semibold"><RefreshCw size={15}/> Actualiser</button></div>
        <form onSubmit={publier} className="mb-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6">
          <h3 className="text-xl font-bold">Proposer un échange</h3><p className="mt-1 text-sm text-neutral-600">Indique ce que tu offres et ce que tu recherches.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold">Ce que tu proposes<input required maxLength={160} value={offert} onChange={e=>setOffert(e.target.value)} className="min-h-12 rounded-xl border border-neutral-300 bg-white px-3 font-normal outline-none focus:border-[#17664b]" placeholder="Ex. ordinateur portable"/></label>
            <label className="grid gap-1.5 text-sm font-semibold">Ce que tu recherches<input required maxLength={160} value={recherche} onChange={e=>setRecherche(e.target.value)} className="min-h-12 rounded-xl border border-neutral-300 bg-white px-3 font-normal outline-none focus:border-[#17664b]" placeholder="Ex. smartphone récent"/></label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Détails facultatifs<textarea maxLength={1500} rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl border border-neutral-300 bg-white px-3 py-3 font-normal outline-none focus:border-[#17664b]" placeholder="État, lieu de remise, détails…"/></label>
          </div>
          {notice && <p role="status" className="mt-3 rounded-xl bg-[#eaf5ef] p-3 text-sm text-[#14543c]">{notice}</p>}
          <button disabled={saving} className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0b4936] px-5 py-3 font-bold text-white disabled:opacity-60">{saving?<LoaderCircle size={18} className="animate-spin"/>:<ArrowLeftRight size={18}/>} {saving?"Publication…":"Publier mon offre"}</button>
        </form>
        {loading ? <p className="py-8 text-neutral-500">Recherche des offres…</p> : visibles.length===0 ? <div className="rounded-2xl border border-neutral-200 p-6 text-sm text-neutral-600">Aucune offre ne correspond pour l’instant. Essaie un autre mot-clé ou publie la première offre.</div> : <div className="grid gap-3 sm:grid-cols-2">{visibles.map(o=><article key={o.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eaf5ef] px-3 py-1.5 text-sm font-semibold text-[#14543c]">Propose : {o.bien_offert}</span><span className="text-neutral-400">↔</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">Recherche : {o.bien_recherche}</span></div>{o.description&&<p className="mt-3 text-sm leading-6 text-neutral-600">{o.description}</p>}<p className="mt-3 text-xs text-neutral-500">Offre publiée le {new Date(o.created_at).toLocaleDateString("fr-FR")}</p></article>)}</div>}
        <p className="mt-6 text-xs leading-5 text-neutral-500">Les correspondances sont indicatives. Vérifie les biens et l’identité des membres avant toute remise.</p>
      </section>
    </div>
  </main>;
}
