"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, LoaderCircle, PackageCheck, Printer, RefreshCw, Truck, XCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Business = { id:string; name:string; phone:string|null; whatsapp:string|null; city:string|null; address:string|null };
type Order = { id:string; buyer_id:string; business_id:string; status:string; subtotal:number; currency:string; buyer_note:string|null; created_at:string; updated_at:string };
type Item = { id:string; order_id:string; product_id:string; quantity:number; unit_price:number; product?:{id:string;name:string}|null };
type Buyer = { id:string; username:string|null; display_name:string|null };
type Invoice = Order & { business:Business; items:Item[]; buyer:Buyer|null };
const supabase=createSupabaseBrowserClient();
const money=(n:number,c="XAF")=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(n||0))+" "+(c==="XAF"?"FCFA":c);
const ref=(id:string)=>"EMI-"+id.replace(/-/g,"").slice(0,10).toUpperCase();
const labels:Record<string,string>={pending:"À traiter",confirmed:"Confirmée",preparing:"En préparation",shipped:"Expédiée",delivered:"Livrée",cancelled:"Refusée"};
const tones:Record<string,string>={pending:"border-amber-300/30 bg-amber-300/10 text-amber-200",confirmed:"border-emerald-300/30 bg-emerald-300/10 text-emerald-200",preparing:"border-sky-300/30 bg-sky-300/10 text-sky-200",shipped:"border-cyan-300/30 bg-cyan-300/10 text-cyan-200",delivered:"border-emerald-300/30 bg-emerald-300/10 text-emerald-200",cancelled:"border-red-300/30 bg-red-300/10 text-red-200"};

export default function CommandesVendeurPage(){
 const [rows,setRows]=useState<Invoice[]>([]),[selectedId,setSelectedId]=useState(""),[filter,setFilter]=useState("all");
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[notice,setNotice]=useState(""),[sellerName,setSellerName]=useState("Espace vendeur");
 const load=useCallback(async(preferred?:string)=>{
  if(!supabase){setNotice("Connexion EMi indisponible.");setLoading(false);return;}
  setLoading(true);setNotice("");
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user){setRows([]);setNotice("Connecte-toi à EMi pour consulter les commandes reçues.");setLoading(false);return;}
  const {data:shops,error:shopError}=await supabase.from("businesses").select("id,name,phone,whatsapp,city,address").eq("owner_id",auth.user.id);
  if(shopError){setNotice("Espaces professionnels : "+shopError.message);setLoading(false);return;}
  const businesses=(shops||[]) as Business[];
  if(!businesses.length){setRows([]);setSelectedId("");setNotice("Aucun espace professionnel n’est associé à ce compte. Les commandes apparaîtront ici dès qu’un espace vendeur sera configuré.");setLoading(false);return;}
  const byBusiness=new Map(businesses.map(x=>[x.id,x]));setSellerName(businesses.length===1?businesses[0].name:"Mes espaces professionnels");
  const {data:orders,error}=await supabase.from("orders").select("id,buyer_id,business_id,status,subtotal,currency,buyer_note,created_at,updated_at").in("business_id",businesses.map(x=>x.id)).order("created_at",{ascending:false}).limit(100);
  if(error){setNotice("Chargement des commandes impossible : "+error.message);setLoading(false);return;}
  const list=(orders||[]) as Order[];
  if(!list.length){setRows([]);setSelectedId("");setNotice("Aucune commande reçue pour le moment. Les nouvelles commandes apparaîtront ici sous forme de facture.");setLoading(false);return;}
  const orderIds=list.map(x=>x.id), buyerIds=[...new Set(list.map(x=>x.buyer_id))];
  const {data:rawItems,error:itemError}=await supabase.from("order_items").select("id,order_id,product_id,quantity,unit_price").in("order_id",orderIds);
  if(itemError){setNotice("Lecture des articles impossible : "+itemError.message);setLoading(false);return;}
  const items=(rawItems||[]) as Item[], productIds=[...new Set(items.map(x=>x.product_id))];
  const [productResult,buyerResult]=await Promise.all([
   productIds.length?supabase.from("products").select("id,name").in("id",productIds):Promise.resolve({data:[],error:null}),
   buyerIds.length?supabase.from("profiles").select("id,username,display_name").in("id",buyerIds):Promise.resolve({data:[],error:null})
  ]);
  if(productResult.error||buyerResult.error){setNotice("Impossible de charger les détails des factures.");setLoading(false);return;}
  const products=new Map(((productResult.data||[]) as {id:string;name:string}[]).map(x=>[x.id,x]));
  const buyers=new Map(((buyerResult.data||[]) as Buyer[]).map(x=>[x.id,x]));
  const grouped=new Map<string,Item[]>();
  items.forEach(x=>{const a=grouped.get(x.order_id)||[];a.push({...x,product:products.get(x.product_id)||null});grouped.set(x.order_id,a);});
  const result:Invoice[]=list.map(x=>({...x,business:byBusiness.get(x.business_id)!,items:grouped.get(x.id)||[],buyer:buyers.get(x.buyer_id)||null}));
  setRows(result);
  const queryId=typeof window!=="undefined"?(new URLSearchParams(window.location.search).get("order")||""):"";
  const target=preferred||queryId;
  setSelectedId(result.some(x=>x.id===target)?target:result[0].id);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();},[load]);
 const visible=useMemo(()=>filter==="all"?rows:rows.filter(x=>x.status===filter),[rows,filter]);
 const selected=rows.find(x=>x.id===selectedId)||null;
 async function update(order:Invoice,status:string){
  if(!supabase||busy)return;
  if(!window.confirm(status==="cancelled"?"Refuser cette commande ? Le stock sera rétabli.":"Confirmer cette mise à jour ?"))return;
  setBusy(order.id);
  const result=status==="cancelled"?await supabase.rpc("emi_cancel_order",{p_order_id:order.id}):await supabase.rpc("emi_update_order_status",{p_order_id:order.id,p_status:status});
  if(result.error)setNotice("Action impossible : "+result.error.message);
  else{setNotice(status==="cancelled"?"Commande refusée et stock rétabli.":"Statut de la commande mis à jour.");await load(order.id);}
  setBusy("");
 }
 const next=(o:Invoice)=>o.status==="pending"?{status:"confirmed",label:"Confirmer la commande"}:o.status==="confirmed"?{status:"preparing",label:"Passer en préparation"}:o.status==="preparing"?{status:"shipped",label:"Marquer expédiée"}:o.status==="shipped"?{status:"delivered",label:"Confirmer la livraison"}:null;
 return <main className="min-h-screen bg-[#080d0b] px-3 py-5 text-white sm:px-6 sm:py-8">
  <style>{`@media print{body{background:#fff!important}.no-print{display:none!important}.invoice-paper{box-shadow:none!important;border:0!important;color:#111!important;background:#fff!important}.invoice-paper *{color:#111!important;border-color:#ddd!important}}`}</style>
  <div className="mx-auto max-w-6xl">
   <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><Link href="/annonces/espace-vendeur" className="inline-flex items-center gap-2 text-sm text-emerald-100"><ArrowLeft size={17}/> Espace vendeur</Link><div className="text-right"><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200">EMi · Gestion professionnelle</p><p className="mt-1 text-xs text-white/45">{sellerName}</p></div></header>
   <section className="no-print mb-5 rounded-3xl border border-emerald-200/15 bg-gradient-to-br from-emerald-950/80 via-[#10251c] to-[#0b1110] p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-amber-200"><FileText className="mr-2 inline" size={15}/>Gestion des ventes</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Factures reçues</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/60">Chaque commande client apparaît comme un bon de commande professionnel, avec ses articles, son montant et son statut.</p></div><button onClick={()=>void load(selectedId)} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold"><RefreshCw size={16} className={loading?"animate-spin":""}/>Actualiser</button></div>
    <div className="mt-5 grid max-w-xl grid-cols-3 gap-2"><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-white/50">Total</p><p className="mt-1 text-xl font-semibold">{rows.length}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-white/50">À traiter</p><p className="mt-1 text-xl font-semibold text-amber-200">{rows.filter(x=>x.status==="pending").length}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-white/50">Livrées</p><p className="mt-1 text-xl font-semibold text-emerald-200">{rows.filter(x=>x.status==="delivered").length}</p></div></div>
   </section>
   {notice&&<div role="status" className="no-print mb-4 rounded-2xl border border-amber-200/20 bg-amber-100/10 p-4 text-sm text-amber-100">{notice}</div>}
   {loading?<div className="flex items-center gap-3 py-16 text-white/60"><LoaderCircle className="animate-spin"/>Chargement des factures…</div>:!rows.length?<div className="rounded-2xl border border-white/10 bg-white/[.03] p-7 text-center"><FileText className="mx-auto text-emerald-200" size={34}/><h2 className="mt-3 text-lg font-semibold">Aucune facture pour le moment</h2><p className="mt-2 text-sm text-white/55">Les commandes destinées à tes espaces professionnels apparaîtront automatiquement ici.</p></div>:<div className="grid gap-5 lg:grid-cols-[minmax(250px,.8fr)_minmax(0,1.5fr)]">
    <aside className="no-print min-w-0 rounded-2xl border border-white/10 bg-white/[.03] p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Commandes clients</h2><span className="text-xs text-white/45">{visible.length}</span></div>
     <select value={filter} onChange={e=>setFilter(e.target.value)} className="mb-3 min-h-11 w-full rounded-xl border border-white/10 bg-[#101a15] px-3 text-sm text-white"><option value="all">Toutes les commandes</option><option value="pending">À traiter</option><option value="confirmed">Confirmées</option><option value="preparing">En préparation</option><option value="shipped">Expédiées</option><option value="delivered">Livrées</option><option value="cancelled">Refusées</option></select>
     <div className="max-h-[70vh] space-y-2 overflow-y-auto">{visible.map(o=><button key={o.id} onClick={()=>setSelectedId(o.id)} className={`w-full rounded-xl border p-3 text-left ${selectedId===o.id?"border-emerald-300/50 bg-emerald-300/10":"border-white/10 bg-black/10"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-amber-200">{ref(o.id)}</span><span className={`rounded-full border px-2 py-1 text-[10px] ${tones[o.status]||tones.pending}`}>{labels[o.status]||o.status}</span></div><p className="mt-2 truncate text-sm font-semibold">{o.buyer?.display_name||o.buyer?.username||"Client EMi"}</p><div className="mt-1 flex items-center justify-between gap-2 text-xs text-white/45"><span>{new Date(o.created_at).toLocaleDateString("fr-FR")}</span><strong className="text-white/80">{money(Number(o.subtotal),o.currency)}</strong></div></button>)}{!visible.length&&<p className="rounded-xl bg-black/20 p-4 text-sm text-white/50">Aucune commande dans ce filtre.</p>}</div>
    </aside>
    {selected&&<article className="invoice-paper min-w-0 overflow-hidden rounded-2xl border border-emerald-200/20 bg-[#fbfcf8] text-[#17221b] shadow-2xl">
     <div className="border-b border-[#dfe7df] bg-gradient-to-r from-[#eff8ef] to-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#99772b]">EMi · Document commercial</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Bon de commande</h2><p className="mt-1 text-sm text-[#667269]">Facture pro forma · Paiement à confirmer</p></div><div className="text-left sm:text-right"><p className="text-xs font-semibold uppercase tracking-wider text-[#6d7b70]">Référence</p><p className="mt-1 break-all text-lg font-bold">{ref(selected.id)}</p><p className="mt-1 text-xs text-[#6d7b70]">{new Date(selected.created_at).toLocaleString("fr-FR")}</p></div></div><div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#cbd9ce] bg-white px-3 py-1.5 text-xs font-semibold text-[#24583d]"><Clock3 size={14}/>{labels[selected.status]||selected.status}</div></div>
     <div className="p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8b7950]">Vendeur</p><p className="mt-2 font-bold">{selected.business.name}</p><p className="mt-1 text-sm text-[#667269]">{[selected.business.address,selected.business.city].filter(Boolean).join(", ")||"Adresse non renseignée"}</p><p className="mt-1 text-sm text-[#667269]">{selected.business.phone||selected.business.whatsapp||"Contact non renseigné"}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#8b7950]">Acheteur</p><p className="mt-2 font-bold">{selected.buyer?.display_name||selected.buyer?.username||"Client EMi"}</p><p className="mt-1 text-sm text-[#667269]">{selected.buyer?.username?"@"+selected.buyer.username:"Compte client EMi"}</p></div></div>
      <div className="my-6 overflow-x-auto"><table className="w-full min-w-[420px] border-collapse text-sm"><thead><tr className="border-y border-[#dfe7df] text-left text-[11px] uppercase tracking-wider text-[#738076]"><th className="py-3 pr-3">Désignation</th><th className="px-2 py-3 text-right">Qté</th><th className="px-2 py-3 text-right">Prix unitaire</th><th className="py-3 pl-2 text-right">Total</th></tr></thead><tbody>{selected.items.map(item=><tr key={item.id} className="border-b border-[#e9eee8]"><td className="py-3 pr-3 font-semibold">{item.product?.name||"Article indisponible"}</td><td className="px-2 py-3 text-right">{item.quantity}</td><td className="px-2 py-3 text-right">{money(Number(item.unit_price),selected.currency)}</td><td className="py-3 pl-2 text-right font-semibold">{money(Number(item.unit_price)*item.quantity,selected.currency)}</td></tr>)}</tbody></table></div>
      {selected.buyer_note&&<div className="mb-5 rounded-xl border border-[#e1e8df] bg-[#f4f7f2] p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-[#7b866f]">Note du client</p><p className="mt-1 whitespace-pre-wrap text-sm">{selected.buyer_note}</p></div>}
      <div className="ml-auto max-w-sm border-t border-[#dfe7df] pt-4"><div className="flex items-center justify-between text-sm text-[#667269]"><span>Sous-total</span><span>{money(Number(selected.subtotal),selected.currency)}</span></div><div className="mt-3 flex items-center justify-between text-lg font-bold"><span>Total commande</span><span className="text-[#17613d]">{money(Number(selected.subtotal),selected.currency)}</span></div><p className="mt-2 text-right text-xs text-[#7a867d]">Livraison non incluse, à convenir avec le client.</p></div>
      <div className="mt-6 border-t border-dashed border-[#d7e0d7] pt-4 text-xs leading-5 text-[#7b867d]">Document généré automatiquement par EMi à partir des informations enregistrées lors de la commande. Ce document est un bon de commande / facture pro forma, et non une facture fiscale.</div>
     </div>
     <div className="no-print flex flex-wrap gap-2 border-t border-[#e0e8df] bg-[#f3f7f1] p-4 sm:p-5"><button onClick={()=>window.print()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#b7c8ba] bg-white px-3 text-sm font-semibold text-[#24583d]"><Printer size={16}/>Imprimer / PDF</button>{next(selected)&&<button disabled={busy===selected.id} onClick={()=>void update(selected,next(selected)!.status)} className="inline-flex min-h-11 flex-[2] items-center justify-center gap-2 rounded-xl bg-[#17613d] px-3 text-sm font-bold text-white disabled:opacity-50">{busy===selected.id?<LoaderCircle className="animate-spin" size={16}/>:<CheckCircle2 size={16}/>}{next(selected)!.label}</button>}{selected.status==="pending"&&<button disabled={busy===selected.id} onClick={()=>void update(selected,"cancelled")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-700"><XCircle size={16}/>Refuser</button>}</div>
    </article>}
   </div>}
   <footer className="no-print mt-8 border-t border-white/10 py-5 text-center text-xs text-white/35">Une notification EMi ouvre directement la facture de la commande concernée.</footer>
  </div>
 </main>;
}
