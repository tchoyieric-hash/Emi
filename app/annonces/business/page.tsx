"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, CheckCircle2, ImagePlus, LoaderCircle, MapPin, Package, Plus, Search, ShoppingBag, Store, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Business = { id:string; owner_id:string; name:string; category:string; description:string; logo_url:string|null; cover_url:string|null; city:string; address:string; phone:string|null; whatsapp:string|null; is_published:boolean; created_at:string };
type Product = { id:string; business_id:string; owner_id:string; name:string; description:string; price:number; currency:string; stock:number; image_urls:string[]; status:string; created_at:string; businesses?:{name:string;city:string}|null };
const supabase = createSupabaseBrowserClient();

const CATEGORIES = ["Commerce","Mode & Beauté","Téléphones & Électronique","Maison & Équipement","Alimentation","Services","Véhicules","Immobilier","Artisanat","Autres"];

export default function EmiBusinessPage() {
  const [businesses,setBusinesses] = useState<Business[]>([]);
  const [products,setProducts] = useState<Product[]>([]);
  const [userId,setUserId] = useState("");
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [search,setSearch] = useState("");
  const [category,setCategory] = useState("Tout");
  const [showBusinessForm,setShowBusinessForm] = useState(false);
  const [showProductForm,setShowProductForm] = useState(false);
  const [businessName,setBusinessName] = useState("");
  const [businessCategory,setBusinessCategory] = useState("Commerce");
  const [businessDescription,setBusinessDescription] = useState("");
  const [city,setCity] = useState("Douala");
  const [phone,setPhone] = useState("");
  const [businessId,setBusinessId] = useState("");
  const [productName,setProductName] = useState("");
  const [productDescription,setProductDescription] = useState("");
  const [price,setPrice] = useState("");
  const [stock,setStock] = useState("1");
  const [productCategory,setProductCategory] = useState("Autres");
  const [photo,setPhoto] = useState<File|null>(null);

  async function load() {
    if(!supabase){setNotice("La connexion Supabase n'est pas configurée.");setLoading(false);return;}
    const [{data:auth},{data:biz,error:bizError},{data:items,error:productError}] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("businesses").select("id,owner_id,name,category,description,logo_url,cover_url,city,address,phone,whatsapp,is_published,created_at").order("created_at",{ascending:false}).limit(100),
      supabase.from("products").select("id,business_id,owner_id,name,description,price,currency,stock,image_urls,status,created_at,businesses(name,city)").eq("status","active").order("created_at",{ascending:false}).limit(100)
    ]);
    setUserId(auth.user?.id||"");
    if(bizError && !/permission|policy/i.test(bizError.message)) setNotice("Chargement des boutiques : "+bizError.message);
    if(productError && !/permission|policy/i.test(productError.message)) setNotice("Chargement des produits : "+productError.message);
    setBusinesses((biz||[]) as Business[]);
    setProducts((items||[]) as unknown as Product[]);
    setLoading(false);
  }
  useEffect(()=>{void load();},[]);

  const visibleProducts = useMemo(()=>products.filter(p=>{
    const business=businesses.find(b=>b.id===p.business_id);
    const q=search.trim().toLocaleLowerCase("fr");
    return (!q || (p.name+" "+p.description+" "+(business?.name||"")).toLocaleLowerCase("fr").includes(q)) && (category==="Tout" || business?.category===category || productCategory===category);
  }),[products,businesses,search,category,productCategory]);
  const ownBusinesses=businesses.filter(b=>b.owner_id===userId);
  const publicBusinesses=businesses.filter(b=>b.is_published || b.owner_id===userId);

  async function createBusiness(e:FormEvent) {
    e.preventDefault();setNotice("");
    if(!supabase)return;
    if(!userId){setNotice("Connecte-toi à EMi pour créer une vitrine professionnelle.");return;}
    if(businessName.trim().length<2){setNotice("Le nom de la boutique doit contenir au moins 2 caractères.");return;}
    setSaving(true);
    try{
      const slugBase=businessName.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
      const {data,error}=await supabase.from("businesses").insert({owner_id:userId,name:businessName.trim(),slug:slugBase+"-"+crypto.randomUUID().slice(0,8),category:businessCategory,description:businessDescription.trim(),city:city.trim(),phone:phone.trim()||null,whatsapp:phone.replace(/[^0-9]/g,"")||null,is_published:true}).select("id").single();
      if(error)throw error;
      setBusinessName("");setBusinessDescription("");setPhone("");setShowBusinessForm(false);setNotice("Ta vitrine EMi Business est créée et publiée.");
      await load();
      if(data?.id){setBusinessId(data.id);setShowProductForm(true);}
    }catch(err){setNotice(err instanceof Error?err.message:"Impossible de créer la vitrine.");}
    finally{setSaving(false);}
  }

  async function createProduct(e:FormEvent) {
    e.preventDefault();setNotice("");
    if(!supabase)return;
    if(!userId){setNotice("Connecte-toi pour publier un produit.");return;}
    if(!businessId){setNotice("Choisis d'abord une boutique.");return;}
    if(productName.trim().length<2 || price==="" || !Number.isFinite(Number(price)) || Number(price)<0){setNotice("Vérifie le nom et le prix du produit.");return;}
    setSaving(true);
    try{
      let image_urls:string[]=[];
      if(photo){
        if(!photo.type.startsWith("image/"))throw new Error("Choisis une image pour illustrer le produit.");
        if(photo.size>12*1024*1024)throw new Error("L'image doit peser moins de 12 Mo.");
        const ext=photo.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"")||"jpg";
        const path=userId+"/business-products/"+crypto.randomUUID()+"."+ext;
        const {error:uploadError}=await supabase.storage.from("post-media").upload(path,photo,{contentType:photo.type,upsert:false});
        if(uploadError)throw new Error("Envoi de l'image impossible : "+uploadError.message);
        image_urls=[supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl];
      }
      const biz=businesses.find(b=>b.id===businessId);
      const {error}=await supabase.from("products").insert({business_id:businessId,owner_id:userId,category_id:null,name:productName.trim(),description:productDescription.trim(),price:Number(price),currency:"XAF",stock:Math.max(0,Number.parseInt(stock||"0",10)||0),image_urls,status:"active"});
      if(error)throw error;
      setProductName("");setProductDescription("");setPrice("");setStock("1");setPhoto(null);setShowProductForm(false);setNotice("Produit publié dans "+(biz?.name||"ta boutique")+".");
      await load();
    }catch(err){setNotice(err instanceof Error?err.message:"Impossible de publier le produit.");}
    finally{setSaving(false);}
  }

  return <main className="min-h-screen bg-[#030906] text-white">
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
      <Link href="/annonces" className="inline-flex items-center gap-2 rounded-full border border-[#d6b45c]/35 bg-white/[.03] px-4 py-2 text-sm font-semibold text-[#f5dfa0]"><ArrowLeft size={16}/> Retour au Marché</Link>
      <section className="relative mt-4 overflow-hidden rounded-[30px] border border-[#d8b85f]/55 bg-[radial-gradient(ellipse_at_80%_0%,rgba(197,151,44,.24),transparent_40%),linear-gradient(130deg,#073b2b,#06160f_55%,#080906)] p-6 shadow-[0_20px_60px_rgba(0,0,0,.4)] sm:p-10">
        <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full border border-[#f2d87b]/20 shadow-[0_0_60px_rgba(228,185,67,.12)]"/>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#e6cb76]/35 bg-black/25 px-3 py-1.5 text-[10px] font-black tracking-[.22em] text-[#f5d875]"><Store size={13}/> EMi BUSINESS · MARCHÉ NATIONAL</span>
        <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">Les entreprises camerounaises, <span className="text-[#f4d777]">à portée de main.</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/75 sm:text-base">Découvre les boutiques, explore leurs produits et développe ton activité dans un espace professionnel connecté à EMi.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={()=>setShowBusinessForm(v=>!v)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#fff0a6] via-[#e2bd55] to-[#bd8b2d] px-5 font-black text-[#102218] shadow-[0_6px_0_#5d4214]"><Building2 size={18}/> Créer ma vitrine <Plus size={16}/></button>
          <button onClick={()=>{if(!userId){setNotice("Connecte-toi à EMi pour publier un produit.");return;}if(!ownBusinesses.length){setNotice("Crée d'abord ta vitrine professionnelle.");setShowBusinessForm(true);return;}setBusinessId(ownBusinesses[0].id);setShowProductForm(v=>!v);}} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#f0d57c]/45 bg-black/25 px-5 font-bold text-[#ffe8a2]"><Package size={18}/> Publier un produit</button>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
          {[{v:String(publicBusinesses.length),l:"vitrines"},{v:String(products.length),l:"produits actifs"},{v:"XAF",l:"prix en FCFA"}].map(x=><div key={x.l} className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4"><strong className="block text-xl font-black text-[#f5dc86] sm:text-2xl">{x.v}</strong><span className="text-[10px] text-white/60 sm:text-xs">{x.l}</span></div>)}
        </div>
      </section>

      {notice&&<div role="status" className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-[#dfc36c]/30 bg-[#d9b44a]/10 p-4 text-sm text-[#ffe9a6]"><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Fermer le message"><X size={17}/></button></div>}

      {showBusinessForm&&<form onSubmit={createBusiness} className="mt-5 grid gap-3 rounded-3xl border border-[#d8b85f]/35 bg-white/[.035] p-5 sm:grid-cols-2 sm:p-7">
        <h2 className="sm:col-span-2 text-xl font-black">Créer une vitrine professionnelle</h2>
        <label className="grid gap-1.5 text-sm">Nom de la boutique<input required minLength={2} maxLength={120} value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Ex. Boutique Eric" className="rounded-xl border border-white/15 bg-black/30 px-4 py-3"/></label>
        <label className="grid gap-1.5 text-sm">Secteur<select value={businessCategory} onChange={e=>setBusinessCategory(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3">{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm">Ville<input value={city} onChange={e=>setCity(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3" placeholder="Douala, Yaoundé, Bafoussam…"/></label>
        <label className="grid gap-1.5 text-sm">Téléphone / WhatsApp<input inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3" placeholder="2376XXXXXXXX"/></label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">Présentation<textarea value={businessDescription} onChange={e=>setBusinessDescription(e.target.value)} maxLength={3000} rows={3} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3" placeholder="Présente ton activité, tes produits et tes engagements…"/></label>
        <div className="sm:col-span-2 flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#f1d575] px-5 py-3 font-black text-[#102218] disabled:opacity-60">{saving&&<LoaderCircle size={17} className="animate-spin"/>}Créer et publier</button><button type="button" onClick={()=>setShowBusinessForm(false)} className="rounded-full border border-white/15 px-5 py-3">Annuler</button></div>
      </form>}

      {showProductForm&&<form onSubmit={createProduct} className="mt-5 grid gap-3 rounded-3xl border border-[#d8b85f]/35 bg-white/[.035] p-5 sm:grid-cols-2 sm:p-7">
        <h2 className="sm:col-span-2 text-xl font-black">Ajouter un produit au catalogue</h2>
        <label className="grid gap-1.5 text-sm">Boutique<select required value={businessId} onChange={e=>setBusinessId(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3">{ownBusinesses.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm">Nom du produit<input required minLength={2} maxLength={160} value={productName} onChange={e=>setProductName(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3" placeholder="Ex. Smartphone Samsung"/></label>
        <label className="grid gap-1.5 text-sm">Prix (FCFA)<input required type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3" placeholder="75000"/></label>
        <label className="grid gap-1.5 text-sm">Stock disponible<input type="number" min="0" step="1" value={stock} onChange={e=>setStock(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3"/></label>
        <label className="grid gap-1.5 text-sm sm:col-span-2">Description<textarea rows={3} maxLength={5000} value={productDescription} onChange={e=>setProductDescription(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3" placeholder="État, taille, couleur, livraison…"/></label>
        <label className="grid gap-2 text-sm sm:col-span-2"><span>Photo du produit</span><span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[#d8b85f]/40 bg-black/20 p-4 text-[#ffe8a2]"><ImagePlus size={19}/> {photo?photo.name:"Choisir une image depuis le téléphone"}</span><input type="file" accept="image/*" className="text-xs text-white/60" onChange={e=>setPhoto(e.target.files?.[0]||null)}/></label>
        <div className="sm:col-span-2 flex flex-wrap gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#f1d575] px-5 py-3 font-black text-[#102218] disabled:opacity-60">{saving&&<LoaderCircle size={17} className="animate-spin"/>}Publier le produit</button><button type="button" onClick={()=>setShowProductForm(false)} className="rounded-full border border-white/15 px-5 py-3">Annuler</button></div>
      </form>}

      <section className="mt-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><span className="text-[10px] font-black tracking-[.2em] text-[#e7c96f]">DÉCOUVERTE NATIONALE</span><h2 className="mt-1 text-2xl font-black sm:text-3xl">Boutiques & produits</h2><p className="mt-1 text-sm text-white/55">Une vitrine, un catalogue, une communauté.</p></div><label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[.04] px-4 py-3 sm:min-w-72"><Search size={17} className="text-[#f3d77b]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Chercher un produit ou commerce…" className="w-full bg-transparent text-sm outline-none"/></label></div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{["Tout",...CATEGORIES].map(c=><button key={c} onClick={()=>setCategory(c)} className={"shrink-0 rounded-full border px-4 py-2 text-xs font-bold "+(category===c?"border-[#f0d575] bg-[#f0d575] text-[#102218]":"border-white/15 bg-white/[.03] text-white/65")}>{c}</button>)}</div>
        {loading?<div className="mt-8 flex items-center justify-center gap-3 py-14 text-white/60"><LoaderCircle className="animate-spin"/>Chargement de l'écosystème…</div>:visibleProducts.length===0?<div className="mt-6 rounded-3xl border border-white/10 bg-white/[.025] p-8 text-center"><ShoppingBag className="mx-auto text-[#f0d575]" size={30}/><h3 className="mt-3 text-lg font-bold">Les premiers produits arrivent ici</h3><p className="mt-1 text-sm text-white/50">Crée une vitrine et publie un produit pour lancer ton catalogue EMi.</p></div>:<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{visibleProducts.map(p=>{const b=businesses.find(x=>x.id===p.business_id);const img=p.image_urls?.[0];return <article key={p.id} className="overflow-hidden rounded-2xl border border-[#d8b85f]/20 bg-[#0a1711]"><div className="relative aspect-square bg-white/[.04]">{img?<img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-[#e8cd78]"><Package size={35}/></div>}<span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-1 text-[9px] font-black tracking-wide text-[#f4d777]">{b?.category||"EMi MARKET"}</span></div><div className="p-3"><h3 className="line-clamp-2 text-sm font-bold">{p.name}</h3><p className="mt-1 line-clamp-2 text-xs text-white/50">{p.description||b?.name}</p><strong className="mt-3 block text-base font-black text-[#f4d777]">{new Intl.NumberFormat("fr-FR").format(Number(p.price))} FCFA</strong><span className="mt-2 flex items-center gap-1 text-[10px] text-white/45"><MapPin size={11}/>{b?.city||"Cameroun"} · {b?.name||"Boutique EMi"}</span></div></article>})}</div>}
      </section>

      <section className="mt-10 rounded-3xl border border-[#d8b85f]/25 bg-gradient-to-r from-[#092d20] to-[#080c09] p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#e4c56a]/40 bg-black/20 text-[#f4d777]"><CheckCircle2 size={22}/></span><div><h2 className="font-black">Un écosystème, des opportunités</h2><p className="mt-1 text-xs text-white/55">Les boutiques et produits sont reliés à Supabase avec des règles d’accès par propriétaire.</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/65 sm:grid-cols-4">{["Vitrines professionnelles","Catalogue de produits","Prix en FCFA","Contrôle d’accès"].map(x=><div key={x} className="rounded-xl border border-white/10 bg-black/15 p-3">{x}</div>)}</div></section>
      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-white/35"><span>EMi · Écosystème Marchand & Innovation</span><Link href="/" className="inline-flex items-center gap-2 text-[#f4d777]">Retour à l’accueil <ArrowUpRight size={14}/></Link></footer>
    </div>
  </main>;
}
