"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Trash2, LoaderCircle, ShoppingBag } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Favorite = { id:string; annonce_id:string; annonce?:{id:string;titre:string;description:string;prix:number;devise:string;image_urls:string[];statut:string}|null };
const supabase=createSupabaseBrowserClient();
export default function FavorisMarketPage(){
 const [items,setItems]=useState<Favorite[]>([]);
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const [busy,setBusy]=useState("");
 const load=useCallback(async()=>{
  if(!supabase){setNotice("Connexion Supabase indisponible : vérifie la configuration de l’application.");setLoading(false);return;}
  setLoading(true);
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setNotice("Connecte-toi pour retrouver tes produits favoris.");setItems([]);setLoading(false);return;}
  const {data,error}=await supabase.from("marketplace_favorites").select("id,annonce_id,annonce:annonces(id,titre,description,prix,devise,image_urls,statut)").order("created_at",{ascending:false});
  if(error){setNotice("Impossible de charger les favoris. Réessaie dans un instant.");setItems([]);}else{setItems((data||[]) as unknown as Favorite[]);setNotice("");}
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 const remove=async(id:string)=>{if(!supabase)return;setBusy(id);const {error}=await supabase.from("marketplace_favorites").delete().eq("id",id);if(error)setNotice("Suppression impossible. Réessaie.");else{setItems(v=>v.filter(x=>x.id!==id));setNotice("Produit retiré de tes favoris.");}setBusy("");};
 return <main style={{minHeight:"100vh",background:"#041b14",color:"#f7f6ee",padding:"20px 16px 100px",maxWidth:900,margin:"0 auto"}}>
  <Link href="/annonces" style={{display:"inline-flex",alignItems:"center",gap:8,color:"#f1d45e",textDecoration:"none"}}><ArrowLeft size={18}/> Retour au marché</Link>
  <header style={{margin:"25px 0 20px"}}><span style={{fontSize:11,letterSpacing:".18em",color:"#f1d45e",fontWeight:800}}>EMi MARKET · PERSONNEL</span><h1 style={{fontSize:30,fontWeight:850,margin:"7px 0"}}>Mes favoris <Heart size={25} fill="#f1d45e" color="#f1d45e" style={{display:"inline",verticalAlign:"-3px"}}/></h1><p style={{color:"#b7c9bf",fontSize:14}}>Retrouve les produits que tu as enregistrés.</p></header>
  {notice&&<p role="status" style={{padding:12,border:"1px solid #4b6b58",borderRadius:12,color:"#f1d45e",fontSize:13}}>{notice}</p>}
  {loading?<p style={{padding:30,textAlign:"center"}}><LoaderCircle className="animate-spin" style={{display:"inline"}}/> Chargement…</p>:items.length===0?<section style={{textAlign:"center",padding:"40px 20px",border:"1px solid #244b3c",borderRadius:22,background:"#09271d"}}><ShoppingBag size={34} color="#f1d45e" style={{margin:"0 auto 12px"}}/><h2 style={{fontWeight:800,fontSize:18}}>Aucun favori pour le moment</h2><p style={{color:"#b7c9bf",fontSize:13,margin:"8px 0 18px"}}>Explore le marché et enregistre les produits qui t’intéressent.</p><Link href="/annonces" style={{display:"inline-block",background:"#f1d45e",color:"#173628",padding:"12px 18px",borderRadius:999,fontWeight:800,textDecoration:"none"}}>Explorer le marché</Link></section>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14}}>{items.map(f=>{const a=f.annonce;return <article key={f.id} style={{border:"1px solid #315542",borderRadius:18,overflow:"hidden",background:"#09271d"}}><div style={{height:155,background:"#0c3326",display:"grid",placeItems:"center"}}>{a?.image_urls?.[0]?<img src={a.image_urls[0]} alt={a.titre||"Produit favori"} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<ShoppingBag size={36} color="#a8c5b4"/>}</div><div style={{padding:14}}><h2 style={{fontSize:16,fontWeight:800}}>{a?.titre||"Annonce indisponible"}</h2><p style={{color:"#f1d45e",fontWeight:850,margin:"7px 0"}}>{a?new Intl.NumberFormat("fr-FR").format(a.prix)+" "+(a.devise||"FCFA"):"Ce produit n’est plus disponible"}</p><div style={{display:"flex",gap:8,marginTop:12}}><button type="button" disabled={busy===f.id} onClick={()=>void remove(f.id)} style={{display:"inline-flex",alignItems:"center",gap:6,border:"1px solid #5a4a42",padding:"9px 11px",borderRadius:10,color:"#f3c7b9",fontSize:12}}><Trash2 size={14}/>{busy===f.id?"Suppression…":"Retirer"}</button>{a&&<Link href="/annonces" style={{marginLeft:"auto",background:"#f1d45e",color:"#173628",padding:"9px 12px",borderRadius:10,fontSize:12,fontWeight:800,textDecoration:"none"}}>Voir le marché</Link>}</div></div></article>})}</div>}
 </main>;
}
