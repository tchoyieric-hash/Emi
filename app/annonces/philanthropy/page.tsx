"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Camera, Heart, Home, LayoutGrid, ArrowLeft } from "lucide-react";

const initiatives = [
 { tag:"Éducation", title:"Offrir aux enfants un avenir meilleur", source:"EMi Fondation", meta:"Éducation · Entraide", image:"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85" },
 { tag:"Solidarité", title:"Partager un repas, partager l’espoir", source:"EMi Fondation", meta:"Communauté · Entraide", image:"https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85" },
 { tag:"Autonomie", title:"Faire grandir les initiatives locales", source:"EMi Fondation", meta:"Entrepreneuriat · Avenir", image:"https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85" },
 { tag:"Santé", title:"Prendre soin de notre communauté", source:"EMi Fondation", meta:"Santé · Prévention", image:"https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85" },
 { tag:"Entraide", title:"Ensemble, nous allons plus loin", source:"EMi Fondation", meta:"Solidarité · Communauté", image:"https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85" },
];

export default function PhilanthropyPage() {
 const [search,setSearch]=useState("");
 const [notice,setNotice]=useState("");
 const filtered=useMemo(()=>initiatives.filter(x=>(x.tag+" "+x.title+" "+x.meta).toLowerCase().includes(search.toLowerCase())),[search]);
 return <main id="top" className="emi-foundation min-h-screen bg-[#031b14] pb-24 text-white">
  <style jsx global>{`
    .emi-foundation{background:radial-gradient(ellipse at 75% 0%,rgba(17,103,70,.32),transparent 42%),#031b14!important;color:#f7f5ec;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
    .emi-foundation input{background:transparent!important;color:#fff!important;border:0!important;outline:none!important;box-shadow:none!important;font-size:16px!important;width:100%;min-width:0}
    .emi-foundation input::placeholder{color:#a7b9af!important}
    .emi-foundation a,.emi-foundation button{transition:transform .18s ease,border-color .18s ease,filter .18s ease}
    .emi-foundation a:active,.emi-foundation button:active{transform:scale(.98)}
    .emi-foundation .foundation-card{border:1px solid rgba(233,202,91,.62);background:linear-gradient(145deg,rgba(9,54,39,.98),rgba(2,22,16,.98));box-shadow:0 10px 28px rgba(0,0,0,.22),inset 0 1px rgba(255,255,255,.04)}
    .emi-foundation .foundation-image{display:block;width:100%;height:180px;object-fit:cover;border-radius:13px}
    .emi-foundation .foundation-action{background:linear-gradient(100deg,#f5dc72,#d7b848);color:#10291c;border:1px solid rgba(255,236,154,.8);box-shadow:0 5px 18px rgba(226,192,66,.14)}
    @media(min-width:640px){.emi-foundation .foundation-image{height:220px}}
  `}</style>
  <header className="sticky top-0 z-30 border-b border-amber-200/15 bg-[#05271d]/95 px-4 pb-3 pt-3 text-white backdrop-blur">
   <div className="mx-auto flex max-w-5xl items-center gap-3">
    <Link href="/annonces" aria-label="Retour aux espaces EMi" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-200/35 text-amber-200"><ArrowLeft size={21}/></Link>
    <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-amber-200/40 bg-[#071f18] px-4 text-amber-100 shadow-lg">
     <Search size={25}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher" aria-label="Rechercher une initiative" className="min-w-0 flex-1 bg-transparent text-lg text-white outline-none placeholder:text-slate-400"/><Camera size={24}/>
    </label>
   </div>
  </header>
  <section style={{height:"min(430px, 48svh)",minHeight:"280px",maxHeight:"460px",position:"relative",width:"100%",overflow:"hidden"}} className="relative overflow-hidden sm:h-[540px]">
   <img src="https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1200&q=85" alt="Des personnes réunies pour une initiative solidaire" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}} className="absolute inset-0"/>
   <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/15"/>
   <div className="absolute bottom-8 left-5 right-5 text-white sm:bottom-12 sm:left-10 sm:max-w-3xl">
    <p className="text-base font-semibold sm:text-xl">EMi Fondation · Solidarité</p>
    <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-6xl">Ensemble, faisons grandir l’espoir</h1>
    <p className="mt-3 max-w-xl text-sm text-white/90 sm:text-lg">Des initiatives pour aider, partager et construire un avenir meilleur.</p>
    <a href="#idees" className="foundation-action mt-4 inline-flex rounded-full px-5 py-3 font-bold">Découvrir les initiatives</a>
   </div>
  </section>
  <div className="flex justify-center gap-3 py-4" aria-hidden="true">{[0,1,2,3,4,5,6].map((n)=><span key={n} className={`h-2.5 w-2.5 rounded-full ${n===0?"bg-amber-300":"bg-white/20"}`}/>)}</div>
  <section id="idees" className="px-4 pt-1">
   <p className="text-sm font-semibold uppercase tracking-[.18em] text-amber-200">Explorer les initiatives à la une</p>
   <div className="mb-4 mt-1 flex items-end justify-between gap-2"><h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">Des idées qui pourraient vous inspirer</h2><span className="shrink-0 rounded-full border border-amber-200/25 bg-white/5 px-3 py-2 text-xs text-amber-100">{filtered.length} idées</span></div>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {filtered.map(item=><article key={item.title} className="foundation-card mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl p-2">
      <img src={item.image} alt={item.title} loading="lazy" className="foundation-image"/>
      <div className="px-1 pt-2"><h3 className="text-base font-semibold leading-snug sm:text-lg">{item.title}</h3><p className="mt-1 text-sm">{item.source} <span className="ml-1 inline-block rounded-full bg-emerald-700 px-1 text-xs text-white">✓</span></p><p className="text-sm text-slate-400">{item.meta}</p></div>
    </article>)}
   </div>
   {filtered.length===0&&<p className="py-8 text-slate-400">Aucune initiative ne correspond à cette recherche.</p>}
  </section>
  <section id="soutien" className="mx-4 mt-6 rounded-3xl bg-emerald-950 p-5 text-white sm:p-7">
   <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">EMi Fondation</p><h2 className="mt-2 text-2xl font-extrabold">Un geste qui compte</h2><p className="mt-2 text-sm leading-6 text-white/80">Les initiatives affichées sont des exemples d’inspiration, pas des collectes validées. Les bénéficiaires et les projets doivent être vérifiés avant toute contribution.</p>
   <button onClick={()=>setNotice("Les soutiens en ligne ne sont pas encore activés. Aucun paiement n’a été effectué.")} className="foundation-action mt-4 rounded-full px-5 py-3 font-bold">Soutenir la communauté</button>
   {notice&&<p role="status" className="mt-3 text-sm text-amber-100">{notice}</p>}
  </section>
  <nav aria-label="Navigation Fondation" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200/20 bg-[#041b14]/95 px-3 py-2 text-amber-100 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-around">
   <a href="#top" className="flex flex-col items-center gap-1 text-xs text-slate-300"><Home size={25}/>Accueil</a><a href="#idees" className="flex flex-col items-center gap-1 text-xs text-slate-300"><Search size={25}/>Explorer</a><a href="#soutien" onClick={e=>{e.preventDefault();setNotice("Les soutiens en ligne ne sont pas encore activés. Aucun paiement n’a été effectué."); document.getElementById("soutien")?.scrollIntoView({behavior:"smooth"});}} className="flex flex-col items-center gap-1 text-xs"><Heart size={25}/>Soutenir</a><Link href="/annonces" className="flex flex-col items-center gap-1 text-xs"><LayoutGrid size={25}/>Espaces</Link>
  </div></nav>
 </main>;
}
