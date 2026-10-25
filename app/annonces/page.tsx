"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Plus, ShoppingBag, LoaderCircle, ImagePlus, Menu, X, ArrowUpRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { genererLienWhatsApp } from "@/lib/whatsapp";

type Annonce = { id:string; seller_id:string; titre:string; description:string; prix:number; devise:string; image_urls:string[]; numero_whatsapp:string; created_at:string };
const supabase = createSupabaseBrowserClient();

export default function AnnoncesPage() {
  const [annonces,setAnnonces] = useState<Annonce[]>([]);
  const [user,setUser] = useState<any>(null);
  const [open,setOpen] = useState(false);
  const [spacesOpen,setSpacesOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [titre,setTitre] = useState("");
  const [description,setDescription] = useState("");
  const [prix,setPrix] = useState("");
  const [telephone,setTelephone] = useState("");
  const [photo,setPhoto] = useState<File|null>(null);

  async function load() {
    if (!supabase) { setNotice("La connexion Supabase n'est pas configurée."); setLoading(false); return; }
    const [{data:auth},{data,error}] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("annonces").select("id,seller_id,titre,description,prix,devise,image_urls,numero_whatsapp,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(60)
    ]);
    setUser(auth.user ?? null);
    if(error) setNotice("Chargement impossible : "+error.message);
    else setAnnonces((data||[]) as Annonce[]);
    setLoading(false);
  }
  useEffect(()=>{ void load(); },[]);

  async function publier(e:FormEvent) {
    e.preventDefault(); setNotice("");
    if(!supabase) { setNotice("Supabase n'est pas configuré."); return; }
    const {data:{user:current}} = await supabase.auth.getUser();
    if(!current) { setNotice("Connecte-toi à EMi avant de publier une annonce."); return; }
    const digits=telephone.replace(/[^0-9]/g,"");
    if(digits.length<8||digits.length>15) { setNotice("Entre un numéro WhatsApp avec indicatif international (ex. 2376XXXXXXXX)."); return; }
    if(!titre.trim()||Number(prix)<0||prix.trim()===""||!Number.isFinite(Number(prix))) { setNotice("Vérifie le titre et le prix."); return; }
    setSaving(true);
    try {
      let image_urls:string[]=[];
      if(photo) {
        if(!photo.type.startsWith("image/")) throw new Error("Choisis un fichier image.");
        if(photo.size>12*1024*1024) throw new Error("L'image doit faire moins de 12 Mo.");
        const ext=photo.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"")||"jpg";
        const path=current.id+"/annonces/"+crypto.randomUUID()+"."+ext;
        const {error:upErr}=await supabase.storage.from("post-media").upload(path,photo,{contentType:photo.type,upsert:false});
        if(upErr) throw new Error("Envoi de la photo impossible : "+upErr.message);
        const {data:urlData}=supabase.storage.from("post-media").getPublicUrl(path);
        image_urls=[urlData.publicUrl];
      }
      const {error}=await supabase.from("annonces").insert({seller_id:current.id,titre:titre.trim(),description:description.trim(),prix:Number(prix),devise:"XAF",image_urls,numero_whatsapp:digits,statut:"active"});
      if(error) throw error;
      setTitre("");setDescription("");setPrix("");setTelephone("");setPhoto(null);setOpen(false);
      setNotice("Annonce publiée avec succès.");
      await load();
    } catch(err) { setNotice(err instanceof Error?err.message:"Publication impossible."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#09090d] text-white">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090d]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
        <Link href="/" aria-label="EMi accueil" className="shrink-0 text-xl font-bold tracking-[.2em] text-amber-200">EMi<span className="ml-1 text-[10px] font-medium tracking-[.12em] text-white/45">MARKET</span></Link>
        <div className="hidden items-center gap-5 md:flex">
          <Link href="/annonces" className="text-sm font-medium text-white">Marché</Link>
          <Link href="/annonces/espace-vendeur" className="text-sm text-white/65 transition hover:text-amber-200">Espace vendeur</Link>
          <button onClick={()=>setSpacesOpen(!spacesOpen)} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:border-amber-200/50"><Menu size={16}/> Explorer les espaces</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setOpen(!open)} className="flex items-center gap-2 rounded-full bg-amber-200 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-100"><Plus size={17}/> Vendre</button>
          <button aria-label={spacesOpen?"Fermer le menu des espaces":"Ouvrir le menu des espaces"} aria-expanded={spacesOpen} onClick={()=>setSpacesOpen(!spacesOpen)} className="rounded-full border border-white/15 p-2.5 text-white md:hidden">{spacesOpen?<X size={19}/>:<Menu size={19}/>}</button>
        </div>
      </div>
      {spacesOpen&&<div className="border-t border-white/10 bg-[#0d0d13]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-4 py-4 sm:grid-cols-3 md:grid-cols-4">
          {[
            ["P2P direct","/annonces/mesh"],["Tontine-Flow","/annonces/tontine"],["Troc-Chain","/annonces/troc"],["Confiance","/annonces/confiance"],["Voice-Market","/annonces/voice-market"],["Neural-Trade","/annonces/neural-trade"],["Neural-Voice P2P","/annonces/neural-voice"],["Biometric-Trust","/annonces/biometric-trust"],["Quantum-Mesh","/annonces/quantum-mesh"],["Live Show & Jeux","/annonces/live-show"],["Street-Arena","/annonces/street-arena"],["Neural-Bazaar","/annonces/neural-bazaar"],["Neuro-Inventory","/annonces/neuro-inventory"],["Philanthropy","/annonces/philanthropy"],["Black-Diamond","/annonces/black-diamond"],["Hope-Bridge","/annonces/hope-bridge"],["Immortel-Trace","/annonces/immortel-trace"],["Sovereign Compliance","/annonces/sovereign-compliance"],["Risk-Guard AML","/annonces/risk-guard"],["Sovereign Governance","/annonces/sovereign-governance"],["Master Health-Check","/annonces/master-health-check"],["Elite Hospitality Directory","/annonces/elite-directory"]
          ].map(([label,href])=><Link key={href} href={href} onClick={()=>setSpacesOpen(false)} className="flex items-center justify-between gap-2 rounded-xl border border-white/[.07] bg-white/[.025] px-3 py-3 text-sm text-white/75 transition hover:border-amber-200/30 hover:bg-amber-200/[.06] hover:text-amber-100">{label}<ArrowUpRight size={14} className="shrink-0 text-white/35"/></Link>)}
        </div>
      </div>}
    </header>
    <section className="mx-auto max-w-6xl px-4 py-6 sm:py-9">
      <div className="mb-7 overflow-hidden rounded-3xl border border-amber-100/15 bg-gradient-to-br from-amber-200/[.12] via-white/[.035] to-transparent p-5 sm:p-9">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.3em] text-amber-200">Acheter · Vendre · Échanger</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Le marché <span className="text-amber-200">EMi</span></h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">Achète, vends et échange en toute simplicité. Découvre les offres et contacte directement les vendeurs sur WhatsApp.</p>
      </div>
      <section aria-labelledby="modules-emi" className="mb-8">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-emerald-300">Nouveautés EMi</p>
          <h2 id="modules-emi" className="mt-1 text-2xl font-semibold">Découvrir les nouveaux espaces</h2>
          <p className="mt-2 text-sm text-white/55">Accède directement aux modules récemment ajoutés.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/annonces/master-health-check" className="group rounded-2xl border border-emerald-300/25 bg-emerald-300/[.06] p-5 transition hover:border-emerald-300/60 hover:bg-emerald-300/10">
            <span className="text-2xl">⚡</span><h3 className="mt-3 text-lg font-semibold text-emerald-200">Master Health-Check</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Consulte la liste de contrôle des principaux espaces et services EMi.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-emerald-200">Ouvrir le module →</span>
          </Link>
          <Link href="/annonces/elite-directory" className="group rounded-2xl border border-amber-300/25 bg-amber-300/[.06] p-5 transition hover:border-amber-300/60 hover:bg-amber-300/10">
            <span className="text-2xl">✨</span><h3 className="mt-3 text-lg font-semibold text-amber-200">Elite Hospitality Directory</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">Crée et consulte les profils professionnels des métiers de l’accueil, de l’hôtellerie et de la restauration.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-amber-200">Ouvrir l’annuaire →</span>
          </Link>
        </div>
      </section>
      {notice&&<div role="status" className="mb-5 rounded-2xl border border-amber-200/20 bg-amber-100/10 p-4 text-sm text-amber-100">{notice}</div>}
      {open&&<form onSubmit={publier} className="mb-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2 sm:p-7">
        <h2 className="sm:col-span-2 text-xl font-semibold">Publier une annonce</h2>
        <label className="grid gap-2 text-sm">Nom de l'article<input required minLength={3} maxLength={120} value={titre} onChange={e=>setTitre(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="Ex. Smartphone en bon état"/></label>
        <label className="grid gap-2 text-sm">Prix (FCFA)<input required type="number" min="0" step="1" value={prix} onChange={e=>setPrix(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="Ex. 75000"/></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Description<textarea maxLength={5000} rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="État, détails, lieu…"/></label>
        <label className="grid gap-2 text-sm">WhatsApp du vendeur (indicatif pays inclus)<input required inputMode="tel" value={telephone} onChange={e=>setTelephone(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="2376XXXXXXXX"/><span className="text-xs text-white/45">Ce numéro sera visible sur l'annonce via le bouton WhatsApp.</span></label>
        <label className="grid cursor-pointer gap-2 text-sm">Photo de l'article <span className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-3 text-white/65"><ImagePlus size={18}/>{photo?photo.name:"Ajouter une photo (12 Mo max)"}</span><input type="file" accept="image/*" className="hidden" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
        <div className="flex gap-3 sm:col-span-2"><button disabled={saving} className="flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 font-semibold text-black disabled:opacity-60">{saving&&<LoaderCircle className="animate-spin" size={17}/>} {saving?"Publication…":"Publier l'annonce"}</button><button type="button" onClick={()=>setOpen(false)} className="rounded-full border border-white/15 px-5 py-3 text-white/70">Annuler</button></div>
      </form>}
      <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200/75">À découvrir</p><h2 className="mt-1 text-xl font-semibold sm:text-2xl">Annonces récentes</h2></div><span className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-white/55">{annonces.length} offre{annonces.length===1?"":"s"}</span></div>
      {loading?<div className="flex items-center gap-3 py-12 text-white/60"><LoaderCircle className="animate-spin"/> Chargement des annonces…</div>:annonces.length===0?<div className="rounded-3xl border border-dashed border-white/15 bg-white/[.02] px-5 py-10 text-center sm:px-10"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/[.07]"><ShoppingBag className="text-amber-200" size={27}/></div><h3 className="text-lg font-semibold">Les premières offres arrivent bientôt</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">Aucune annonce n’est encore publiée. Tu peux lancer le marché en partageant la première offre.</p><button onClick={()=>setOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-100"><Plus size={16}/> Publier la première annonce</button></div>:<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{annonces.map(a=><article key={a.id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">
        {a.image_urls?.[0]?<Link href={"/annonce/"+a.id}><img src={a.image_urls[0]} alt={a.titre} className="h-56 w-full object-cover" loading="lazy"/></Link>:<div className="flex h-40 items-center justify-center bg-white/[.04]"><ShoppingBag size={36} className="text-white/20"/></div>}
        <div className="p-5"><Link href={"/annonce/"+a.id} className="text-lg font-semibold hover:text-amber-200">{a.titre}</Link><p className="mt-2 text-2xl font-semibold text-amber-200">{new Intl.NumberFormat("fr-FR").format(Number(a.prix))} FCFA</p><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-white/60">{a.description||"Contacte le vendeur pour plus d'informations."}</p>
          <div className="mt-5 flex gap-2"><a href={genererLienWhatsApp(a.titre,Number(a.prix),a.id,a.numero_whatsapp)} onClick={()=>{ if(supabase) void supabase.from("annonce_events").insert({annonce_id:a.id,event_type:"whatsapp_click"}); }} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-3 text-sm font-semibold text-black"><MessageCircle size={17}/> Contacter sur WhatsApp</a><Link href={"/annonce/"+a.id} className="rounded-full border border-white/15 px-4 py-3 text-sm">Voir</Link></div>
        </div></article>)}</div>}
      <p className="mt-10 text-center text-xs text-white/35">Prudence : vérifie l'article et le vendeur avant tout paiement. EMi ne traite pas le paiement.</p>
    </section>
  </main>;
}
