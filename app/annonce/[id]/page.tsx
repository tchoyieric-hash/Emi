"use client";

import { useEffect,useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft,LoaderCircle,MessageCircle,ShoppingBag } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { genererLienWhatsApp } from "@/lib/whatsapp";

type Annonce={id:string;titre:string;description:string;prix:number;devise:string;image_urls:string[];numero_whatsapp:string;created_at:string};
const supabase=createSupabaseBrowserClient();
export default function AnnonceDetailPage(){
 const params=useParams<{id:string}>(); const id=String(params.id||"");
 const [item,setItem]=useState<Annonce|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{let alive=true;(async()=>{if(!supabase){setError("Connexion Supabase indisponible.");setLoading(false);return;}const {data,error}=await supabase.from("annonces").select("id,titre,description,prix,devise,image_urls,numero_whatsapp,created_at").eq("id",id).maybeSingle();if(!alive)return;if(error)setError("Impossible de charger cette annonce : "+error.message);else if(!data)setError("Cette annonce n'existe pas ou n'est plus disponible.");else {setItem(data as Annonce); void supabase.from("annonce_events").insert({annonce_id:id,event_type:"view"});}setLoading(false);})();return()=>{alive=false;};},[id]);
 return <main className="min-h-screen bg-[#09090d] px-4 py-6 text-white"><div className="mx-auto max-w-4xl"><Link href="/annonces" className="mb-7 inline-flex items-center gap-2 text-sm text-white/65 hover:text-amber-200"><ChevronLeft size={18}/> Retour au marché</Link>{loading?<div className="flex items-center gap-3 py-16 text-white/60"><LoaderCircle className="animate-spin"/> Chargement…</div>:error?<div role="alert" className="rounded-2xl border border-white/10 p-6">{error}<div className="mt-4"><Link href="/annonces" className="text-amber-200 underline">Voir les annonces</Link></div></div>:item&&<article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[.035]">{item.image_urls?.[0]?<img src={item.image_urls[0]} alt={item.titre} className="max-h-[560px] w-full object-contain bg-black/30"/>:<div className="flex h-64 items-center justify-center bg-white/[.04]"><ShoppingBag size={48} className="text-white/20"/></div>}<div className="p-6 sm:p-9"><p className="text-xs uppercase tracking-[.25em] text-amber-200">Annonce EMi</p><h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{item.titre}</h1><p className="mt-4 text-3xl font-semibold text-amber-200">{new Intl.NumberFormat("fr-FR").format(Number(item.prix))} FCFA</p><p className="mt-6 whitespace-pre-wrap leading-7 text-white/70">{item.description||"Aucune description fournie."}</p><a href={genererLienWhatsApp(item.titre,Number(item.prix),item.id,item.numero_whatsapp)} onClick={()=>{if(supabase) void supabase.from("annonce_events").insert({annonce_id:item.id,event_type:"whatsapp_click"});}} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-4 font-semibold text-black sm:w-auto"><MessageCircle size={19}/> Contacter le vendeur sur WhatsApp</a></div></article>}</div></main>;
}
