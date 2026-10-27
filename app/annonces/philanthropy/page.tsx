"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Camera, Heart, Home, LayoutGrid, ArrowLeft, ShieldCheck } from "lucide-react";

const initiatives: { tag: string; title: string; source: string; meta: string; image: string }[] = [];

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
  <section aria-label="État des initiatives" className="mx-auto grid max-w-5xl grid-cols-3 gap-2 px-4 py-4 sm:gap-4">
   {[{value:"0",label:"Initiatives vérifiées",icon:<Heart size={20}/>},{value:"0",label:"Projets en cours",icon:<Camera size={20}/>},{value:"0",label:"Actions réalisées",icon:<ShieldCheck size={20}/>}].map(item=><article key={item.label} className="foundation-card rounded-2xl px-2 py-4 text-center sm:px-4"><span className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-amber-200/10 text-amber-200">{item.icon}</span><strong className="block text-2xl font-extrabold text-white sm:text-3xl">{item.value}</strong><span className="mt-1 block text-xs leading-4 text-emerald-50/80 sm:text-sm">{item.label}</span></article>)}
  </section>
  <section id="idees" className="px-4 pt-1">
   <p className="text-xs font-bold uppercase tracking-[.18em] text-amber-200">ENSEMBLE, ON AGIT</p>
   <div className="mb-4 mt-1 flex items-end justify-between gap-2"><h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">Des projets réels, un impact transparent</h2><span className="shrink-0 rounded-full border border-amber-200/25 bg-white/5 px-3 py-2 text-xs text-amber-100">{filtered.length} initiative(s)</span></div>
   {filtered.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {filtered.map(item=><article key={item.title} className="foundation-card mb-4 inline-block w-full break-inside-avoid overflow-hidden rounded-2xl p-2">
      <img src={item.image} alt={item.title} loading="lazy" className="foundation-image"/>
      <div className="px-1 pt-2"><h3 className="text-base font-semibold leading-snug sm:text-lg">{item.title}</h3><p className="mt-1 text-sm">{item.source}</p><p className="text-sm text-slate-400">{item.meta}</p></div>
    </article>)}
   </div> : <div className="foundation-card rounded-2xl p-6 sm:p-8"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/30 bg-amber-200/10 text-amber-200"><Heart size={24}/></span><p className="text-lg font-bold text-amber-100">Les prochaines initiatives commencent ici.</p><p className="mt-2 text-sm leading-6 text-slate-300">Aucun projet n’a encore passé la vérification. Pour protéger la communauté, EMi n’affiche ni faux projets, ni fausses collectes, ni chiffres inventés.</p></div>}
  </section>
  <section id="soutien" className="mx-4 mt-6 rounded-3xl bg-emerald-950 p-5 text-white sm:p-7">
   <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">EMi Fondation</p><h2 className="mt-2 text-2xl font-extrabold">Un geste qui compte</h2><p className="mt-2 text-sm leading-6 text-white/80">Les initiatives affichées sont des exemples d’inspiration, pas des collectes validées. Les bénéficiaires et les projets doivent être vérifiés avant toute contribution.</p>
   <div className="mt-4 flex flex-col gap-3 sm:flex-row"><button onClick={()=>setNotice("La soumission en ligne des initiatives sera activée dès que le formulaire de vérification sera prêt. Aucun projet n’a été envoyé.")} className="rounded-full border border-amber-200/60 px-5 py-3 font-bold text-amber-100">Proposer une initiative <span aria-hidden="true">↗</span></button><button onClick={()=>setNotice("Les soutiens en ligne ne sont pas encore activés. Aucun paiement n’a été effectué.")} className="foundation-action rounded-full px-5 py-3 font-bold">Soutenir un projet <span aria-hidden="true">♡</span></button></div>
   {notice&&<p role="status" className="mt-3 text-sm text-amber-100">{notice}</p>}
  </section>
  <nav aria-label="Navigation Fondation" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200/20 bg-[#041b14]/95 px-3 py-2 text-amber-100 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-around">
   <a href="#top" className="flex flex-col items-center gap-1 text-xs text-slate-300"><Home size={25}/>Accueil</a><a href="#idees" className="flex flex-col items-center gap-1 text-xs text-slate-300"><Search size={25}/>Explorer</a><a href="#soutien" onClick={e=>{e.preventDefault();setNotice("Les soutiens en ligne ne sont pas encore activés. Aucun paiement n’a été effectué."); document.getElementById("soutien")?.scrollIntoView({behavior:"smooth"});}} className="flex flex-col items-center gap-1 text-xs"><Heart size={25}/>Soutenir</a><Link href="/annonces" className="flex flex-col items-center gap-1 text-xs"><LayoutGrid size={25}/>Espaces</Link>
  </div></nav>
 </main>;
}
