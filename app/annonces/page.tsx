"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Plus, ShoppingBag, LoaderCircle, ImagePlus, Menu, X, ArrowUpRight, Search } from "lucide-react";
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
  const [search,setSearch] = useState("");
  const [titre,setTitre] = useState("");
  const [description,setDescription] = useState("");
  const [prix,setPrix] = useState("");
  const [telephone,setTelephone] = useState("");
  const [photos,setPhotos] = useState<File[]>([]);

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
      if(photos.length>10) throw new Error("Tu peux ajouter jusqu'à 10 photos par annonce.");
      for(const photo of photos) {
        if(!photo.type.startsWith("image/")) throw new Error("Chaque fichier doit être une image.");
        if(photo.size>12*1024*1024) throw new Error("Chaque image doit faire moins de 12 Mo.");
        const ext=photo.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"")||"jpg";
        const path=current.id+"/annonces/"+crypto.randomUUID()+"."+ext;
        const {error:upErr}=await supabase.storage.from("post-media").upload(path,photo,{contentType:photo.type,upsert:false});
        if(upErr) throw new Error("Envoi d'une photo impossible : "+upErr.message);
        const {data:urlData}=supabase.storage.from("post-media").getPublicUrl(path);
        image_urls.push(urlData.publicUrl);
      }
      const {error}=await supabase.from("annonces").insert({seller_id:current.id,titre:titre.trim(),description:description.trim(),prix:Number(prix),devise:"XAF",image_urls,numero_whatsapp:digits,statut:"active"});
      if(error) throw error;
      setTitre("");setDescription("");setPrix("");setTelephone("");setPhotos([]);setOpen(false);
      setNotice("Annonce publiée avec succès.");
      await load();
    } catch(err) { setNotice(err instanceof Error?err.message:"Publication impossible."); }
    finally { setSaving(false); }
  }

  const annoncesFiltrees = annonces.filter(a => `${a.titre} ${a.description}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")));

  return <main className="min-h-screen w-full overflow-x-hidden bg-[#09090d] text-white">
    <section className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-4 sm:py-9">
      <section className="emi-shop-shell">
        <div className="emi-shop-brandbar"><button className="emi-shop-menu" onClick={()=>setSpacesOpen(!spacesOpen)} aria-label="Explorer les espaces"><Menu size={21}/></button><div className="emi-shop-brand"><span className="emi-shop-monogram">M</span><span><strong>EMi MARKET</strong><small>Le marché de la communauté</small></span></div><button className="emi-shop-notice" onClick={()=>setNotice("Tu es à jour.")} aria-label="Notifications">♧</button></div>
        <div className="emi-shop-profile"><div className="emi-shop-avatar">EM<span>✦</span></div><div className="emi-shop-profile-copy"><h1>Le Marché EMi</h1><p>Mode, technologie, maison & découvertes</p><div className="emi-shop-trust">✦ La boutique de la communauté</div></div><button className="emi-shop-sell" onClick={()=>setOpen(!open)}><Plus size={15}/> Vendre</button></div>
        <label htmlFor="annonces-search" className="emi-shop-search"><Search size={18}/><input id="annonces-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit…"/><span>⌕</span></label>
        <div className="emi-shop-categories">{["Tout","Mode","Électronique","Sacs","Chaussures","Maison","Immobilier"].map((cat,i)=><button key={cat} className={i===0&&!search?"selected":""} onClick={()=>{setSearch(i===0?"":cat);document.getElementById("annonces-list")?.scrollIntoView({behavior:"smooth",block:"start"});}}>{cat}</button>)}</div>
        <Link href="/annonces/tontine" className="emi-flow-feature" aria-label="Découvrir EMi Djangui Flow">
          <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85" alt="Une communauté réunie" />
          <span className="emi-flow-feature-shade" />
          <span className="emi-flow-feature-copy">
            <span className="emi-flow-feature-kicker">NOUVEAU · SOLIDARITÉ COMMUNAUTAIRE</span>
            <strong>EMi Djangui Flow</strong>
            <span>Réunissez-vous, créez un cercle et avancez ensemble vers un objectif commun.</span>
            <span className="emi-flow-feature-cta">Découvrir les cercles <ArrowUpRight size={16}/></span>
          </span>
        </Link>
      </section>
      <style jsx>{`
        .emi-flow-feature{position:relative;display:flex;align-items:flex-end;min-height:190px;margin:14px 0 0;overflow:hidden;border:1px solid rgba(231,205,101,.65);border-radius:22px;color:#fff;text-decoration:none;background:#063b2a}
        .emi-flow-feature>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%}
        .emi-flow-feature-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,29,21,.94),rgba(2,29,21,.62) 60%,rgba(2,29,21,.12))}
        .emi-flow-feature-copy{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:7px;max-width:560px;padding:18px}
        .emi-flow-feature-kicker{font-size:10px;font-weight:800;letter-spacing:.14em;color:#f2d86a}
        .emi-flow-feature-copy strong{font-size:clamp(21px,5vw,30px);line-height:1.1}
        .emi-flow-feature-copy>span:nth-child(3){max-width:420px;font-size:13px;line-height:1.5;color:rgba(255,255,255,.9)}
        .emi-flow-feature-cta{display:inline-flex;align-items:center;gap:6px;margin-top:4px;border-radius:999px;background:#f0d45f;color:#12392c;padding:9px 13px;font-size:12px;font-weight:800}
        @media(min-width:640px){.emi-flow-feature{min-height:220px;margin-top:18px}.emi-flow-feature-copy{padding:25px}.emi-flow-feature-copy>span:nth-child(3){font-size:14px}}
      `}</style>
      {spacesOpen&&<section className="emi-shop-spaces"><strong>Explorer les espaces EMi</strong><div className="grid grid-cols-2 gap-2 mt-3">{[["Flow · Djangui","/annonces/tontine"],["Fondation EMi","/annonces/philanthropy"],["Help EMi","/annonces/master-health-check"],["Espace vendeur","/annonces/espace-vendeur"]].map(([label,href])=><Link key={href} href={href} onClick={()=>setSpacesOpen(false)} className="emi-shop-space-link">{label}<ArrowUpRight size={15}/></Link>)}</div></section>}
      {notice&&<div role="status" className="mb-5 rounded-2xl border border-amber-200/20 bg-amber-100/10 p-4 text-sm text-amber-100">{notice}</div>}
      {open&&<form onSubmit={publier} className="mb-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2 sm:p-7">
        <h2 className="sm:col-span-2 text-xl font-semibold">Publier une annonce</h2>
        <label className="grid gap-2 text-sm">Nom de l'article<input required minLength={3} maxLength={120} value={titre} onChange={e=>setTitre(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="Ex. Smartphone en bon état"/></label>
        <label className="grid gap-2 text-sm">Prix (FCFA)<input required type="number" min="0" step="1" value={prix} onChange={e=>setPrix(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="Ex. 75000"/></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Description<textarea maxLength={5000} rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="État, détails, lieu…"/></label>
        <label className="grid gap-2 text-sm">WhatsApp du vendeur (indicatif pays inclus)<input required inputMode="tel" value={telephone} onChange={e=>setTelephone(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="2376XXXXXXXX"/><span className="text-xs text-white/45">Ce numéro sera visible sur l'annonce via le bouton WhatsApp.</span></label>
        <label className="grid cursor-pointer gap-2 text-sm sm:col-span-2">Photos de l'article <span className="flex items-center gap-2 rounded-xl border border-dashed border-amber-200/35 bg-emerald-950/30 px-4 py-4 text-white/75"><ImagePlus size={20}/><span><strong className="block text-sm text-amber-100">Sélectionner plusieurs photos</strong><small className="mt-1 block text-xs text-white/50">Jusqu'à 10 images · sélectionne plusieurs photos dans ta galerie</small></span></span><input type="file" accept="image/*" multiple className="hidden" onChange={e=>setPhotos(Array.from(e.target.files||[]).slice(0,10))}/></label>
        {photos.length>0&&<div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:grid-cols-5">{photos.map((file,i)=><div key={file.name+i} className="relative overflow-hidden rounded-xl border border-amber-200/25 bg-black/20"><img src={URL.createObjectURL(file)} alt={"Photo "+(i+1)} className="h-24 w-full object-cover"/><span className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">{i+1}</span><button type="button" onClick={()=>setPhotos(old=>old.filter((_,j)=>j!==i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-white" aria-label={"Retirer la photo "+(i+1)}><X size={13}/></button></div>)}</div>}
        <div className="flex gap-3 sm:col-span-2"><button disabled={saving} className="flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 font-semibold text-black disabled:opacity-60">{saving&&<LoaderCircle className="animate-spin" size={17}/>} {saving?"Publication…":"Publier l'annonce"}</button><button type="button" onClick={()=>setOpen(false)} className="rounded-full border border-white/15 px-5 py-3 text-white/70">Annuler</button></div>
      </form>}
      <div id="annonces-list" className="emi-shop-list-heading"><div><p>À DÉCOUVRIR</p><h2>Produits pour toi</h2></div><span>{annoncesFiltrees.length} offre{annoncesFiltrees.length===1?"":"s"}</span></div>
      {loading?<div className="flex items-center gap-3 py-12 text-white/60"><LoaderCircle className="animate-spin"/> Chargement des annonces…</div>:annoncesFiltrees.length===0?<div className="rounded-3xl border border-dashed border-white/15 bg-white/[.02] px-5 py-10 text-center sm:px-10"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/[.07]"><ShoppingBag className="text-amber-200" size={27}/></div><h3 className="text-lg font-semibold">{search ? "Aucun résultat pour cette recherche" : "Les premières offres arrivent bientôt"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">{search ? "Essaie un autre mot-clé." : "Aucune annonce n’est encore publiée. Tu peux lancer le marché en partageant la première offre."}</p><button onClick={()=>setOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-100"><Plus size={16}/> Publier la première annonce</button></div>:<div className="emi-shop-products">{annoncesFiltrees.map(a=><article key={a.id} className="emi-shop-product">
        {a.image_urls?.length>0?<Link href={"/annonce/"+a.id} className="emi-shop-product-gallery">{a.image_urls.slice(0,4).map((url,i)=><img key={url+i} src={url} alt={a.titre+" — photo "+(i+1)} className="emi-shop-product-image" loading="lazy"/>)}{a.image_urls.length>1&&<span className="emi-shop-photo-count">▧ {a.image_urls.length}</span>}</Link>:<div className="flex h-40 items-center justify-center bg-white/[.04]"><ShoppingBag size={36} className="text-white/20"/></div>}
        <div className="emi-shop-product-copy"><Link href={"/annonce/"+a.id} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-amber-200 sm:text-base">{a.titre}</Link><p className="emi-shop-price">{new Intl.NumberFormat("fr-FR").format(Number(a.prix))} FCFA</p><p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-white/60 sm:mt-3 sm:line-clamp-3 sm:text-sm">{a.description||"Contacte le vendeur pour plus d'informations."}</p>
          <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row"><a href={genererLienWhatsApp(a.titre,Number(a.prix),a.id,a.numero_whatsapp)} onClick={()=>{ if(supabase) void supabase.from("annonce_events").insert({annonce_id:a.id,event_type:"whatsapp_click"}); }} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-2 py-2.5 text-xs font-semibold text-black sm:flex-1 sm:gap-2 sm:px-3 sm:py-3 sm:text-sm"><MessageCircle size={17}/> Contacter sur WhatsApp</a><Link href={"/annonce/"+a.id} className="rounded-full border border-white/15 px-3 py-2.5 text-center text-xs sm:px-4 sm:py-3 sm:text-sm">Voir</Link></div>
        </div></article>)}</div>}
      <p className="mt-10 text-center text-xs text-white/35">Prudence : vérifie l'article et le vendeur avant tout paiement. EMi ne traite pas le paiement.</p>
    </section>
  </main>;
}
