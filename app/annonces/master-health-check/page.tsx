"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, CircleHelp, MessageCircle, ShieldCheck, ShoppingBag, Users, HeartHandshake, ChevronDown, BookOpen, LifeBuoy, Sparkles } from "lucide-react";

const faqs = [
  {category:"Compte",q:"Comment sécuriser mon compte EMi ?",a:"Utilise une adresse ou un numéro auquel tu as accès, garde tes identifiants privés et déconnecte-toi sur les appareils partagés. Les options de sécurité disponibles dépendent des réglages actuellement activés sur ton compte."},
  {category:"Marché",q:"Comment vendre sur le Marché EMi ?",a:"Ouvre le Marché, choisis l’action de vente et complète les informations du produit avec des photos claires, un prix en FCFA et un moyen de contact fiable. Vérifie les détails avant de publier."},
  {category:"Djangui Flow",q:"Comment fonctionne un cercle Djangui ?",a:"Crée un cercle, indique son objectif et le nombre de membres. La cotisation affichée est une estimation calculée à partir de ces valeurs. Elle ne déclenche aucun paiement automatique."},
  {category:"Fondation",q:"Puis-je faire un don depuis EMi Fondation ?",a:"La page Fondation présente des initiatives à découvrir. Les contributions en ligne ne sont pas activées tant qu’un parcours de paiement sécurisé et la vérification des bénéficiaires ne sont pas disponibles."},
  {category:"Confidentialité",q:"Comment signaler un problème ou un contenu ?",a:"Ne partage pas d’informations sensibles dans un message public. Utilise les options de signalement visibles dans l’espace concerné lorsqu’elles sont disponibles et conserve les informations nécessaires pour décrire le problème."},
];
const topics = [
  {title:"Compte & sécurité",detail:"Connexion, profil et confidentialité",icon:ShieldCheck},
  {title:"Marché EMi",detail:"Acheter, vendre et gérer une annonce",icon:ShoppingBag},
  {title:"Djangui Flow",detail:"Cercles, objectifs et cotisations",icon:Users},
  {title:"EMi Fondation",detail:"Initiatives solidaires et transparence",icon:HeartHandshake},
];
export default function MasterHealthCheckPage() {
  const [query,setQuery]=useState("");
  const [opened,setOpened]=useState<number|null>(0);
  const [contactNotice,setContactNotice]=useState("");
  const filtered=useMemo(()=>faqs.filter(x=>(x.q+" "+x.a+" "+x.category).toLowerCase().includes(query.toLowerCase())),[query]);
  return <main className="emi-help min-h-screen bg-[#031b14] pb-28 text-white">
    <style jsx global>{`
      .emi-help{background:radial-gradient(ellipse at 78% 0%,rgba(17,103,70,.32),transparent 42%),#031b14!important;color:#f7f5ec;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
      .emi-help input{background:transparent!important;color:#fff!important;border:0!important;outline:none!important;box-shadow:none!important;font-size:16px!important;width:100%;min-width:0}
      .emi-help input::placeholder{color:#a7b9af!important}
      .emi-help .help-topic{min-height:112px;border:1px solid rgba(233,202,91,.62);background:linear-gradient(145deg,rgba(9,54,39,.98),rgba(2,22,16,.98));box-shadow:0 10px 28px rgba(0,0,0,.18),inset 0 1px rgba(255,255,255,.04);transition:transform .18s ease,border-color .18s ease}
      .emi-help .help-topic:active{transform:scale(.98)}
      .emi-help .help-hero{background:linear-gradient(105deg,rgba(2,24,17,.95),rgba(4,62,43,.8)),radial-gradient(circle at 85% 20%,rgba(235,202,84,.18),transparent 38%)}
      .emi-help button{transition:filter .18s ease,transform .18s ease}
      .emi-help button:active{transform:scale(.99)}
    `}</style>
    <header className="sticky top-0 z-30 border-b border-amber-200/15 bg-[#05271d]/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <Link href="/annonces" aria-label="Retour au marché EMi" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-amber-200/35 text-amber-200"><ArrowLeft size={21}/></Link>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.22em] text-amber-200">EMi · Assistance</p><h1 className="text-lg font-bold">Help EMi</h1></div>
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-200/25 bg-white/5 text-amber-200"><LifeBuoy size={22}/></span>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-4">
      <section className="help-hero relative mt-5 overflow-hidden rounded-[28px] border border-amber-200/45 p-6 shadow-2xl shadow-black/25 sm:p-9">
        <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border border-amber-200/15"/><div className="pointer-events-none absolute -right-2 -top-6 h-36 w-36 rounded-full border border-amber-200/10"/>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/35 bg-black/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-amber-200"><Sparkles size={14}/> Toujours à tes côtés</span>
        <h2 className="mt-4 max-w-xl text-3xl font-extrabold leading-tight sm:text-5xl">Comment pouvons-nous <span className="text-amber-200">t’aider ?</span></h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">Trouve rapidement des réponses sur ton compte, le Marché, Djangui Flow et les initiatives EMi.</p>
        <label className="mt-6 flex h-14 items-center gap-3 rounded-2xl border border-amber-200/40 bg-[#031b14]/80 px-4 shadow-lg"><Search size={21} className="shrink-0 text-amber-200"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une question..." aria-label="Rechercher dans l’aide" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"/></label>
      </section>
      <section className="mt-7"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Centre d’assistance</p><h2 className="mt-1 text-2xl font-extrabold">Explorer par rubrique</h2></div><BookOpen className="text-amber-200" size={25}/></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{topics.map(t=><button type="button" key={t.title} onClick={()=>{setQuery(t.title.replace("EMi ","").replace("Compte & sécurité","Compte"));setOpened(0);document.getElementById("help-faq")?.scrollIntoView({behavior:"smooth",block:"start"});}} className="help-topic flex w-full items-center gap-4 rounded-2xl p-4 text-left"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-200/35 bg-black/15 text-amber-200"><t.icon size={23}/></span><div className="min-w-0 flex-1"><h3 className="font-bold">{t.title}</h3><p className="mt-1 text-sm text-slate-300">{t.detail}</p></div><span className="text-xl text-amber-200" aria-hidden="true">›</span></button>)}</div>
      </section>
      <section id="help-faq" className="mt-8 scroll-mt-24"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Réponses rapides</p><h2 className="mt-1 text-2xl font-extrabold">Questions fréquentes</h2></div>
        <div className="space-y-3">{filtered.map((item,index)=><article key={item.q} className="overflow-hidden rounded-2xl border border-amber-200/25 bg-gradient-to-br from-[#0a3326] to-[#041b14]"><button onClick={()=>setOpened(opened===index?null:index)} aria-expanded={opened===index} className="flex w-full items-center gap-3 p-4 text-left"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-200/10 text-amber-200"><CircleHelp size={19}/></span><span className="flex-1"><span className="block text-xs font-semibold text-amber-200">{item.category}</span><span className="mt-1 block font-semibold">{item.q}</span></span><ChevronDown size={19} className={opened===index?"rotate-180 text-amber-200 transition-transform":"text-slate-400 transition-transform"}/></button>{opened===index&&<p className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-6 text-slate-300">{item.a}</p>}</article>)}{filtered.length===0&&<p className="rounded-2xl border border-white/10 p-5 text-slate-300">Aucun résultat. Essaie un autre mot-clé.</p>}</div>
      </section>
      <section className="mt-8 rounded-3xl border border-amber-200/45 bg-gradient-to-r from-[#0b3b2a] to-[#061f17] p-5 shadow-xl shadow-black/20 sm:p-7"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-200 text-[#06251a]"><MessageCircle size={23}/></span><div className="flex-1"><h2 className="text-xl font-extrabold">Tu n’as pas trouvé ta réponse ?</h2><p className="mt-2 text-sm leading-6 text-slate-300">Le contact direct sera activé lorsqu’un canal officiel sera configuré. Tu peux déjà rechercher une question ou ouvrir une rubrique ci-dessus.</p><button type="button" onClick={()=>setContactNotice("Le canal de contact direct n’est pas encore configuré. Consulte les questions fréquentes ou reviens dans les espaces EMi.")} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 px-5 py-3 font-bold text-[#06251a]">Contacter l’assistance <MessageCircle size={16}/></button>{contactNotice&&<p role="status" className="mt-3 text-sm text-amber-100">{contactNotice}</p>}</div></div></section>
      <p className="mt-5 text-center text-xs leading-5 text-slate-500">EMi Help · Les réponses décrivent les fonctionnalités disponibles et ne garantissent pas l’activation de services externes ou de paiements.</p>
    </div>
    <nav aria-label="Navigation Help EMi" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200/20 bg-[#041b14]/95 px-3 py-2 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-around"><Link href="/annonces" className="flex flex-col items-center gap-1 text-xs text-slate-300"><ShoppingBag size={23}/>Marché</Link><a href="#top" className="flex flex-col items-center gap-1 text-xs text-amber-200"><CircleHelp size={23}/>Aide</a><Link href="/annonces/philanthropy" className="flex flex-col items-center gap-1 text-xs text-slate-300"><HeartHandshake size={23}/>Fondation</Link><Link href="/annonces/tontine" className="flex flex-col items-center gap-1 text-xs text-slate-300"><Users size={23}/>Djangui</Link></div></nav>
  </main>;
}
