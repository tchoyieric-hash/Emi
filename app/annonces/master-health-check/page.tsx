"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ArrowLeft, Search, CircleHelp, MessageCircle, ShieldCheck, ShoppingBag, Users, HeartHandshake, ChevronDown, BookOpen, LifeBuoy, Sparkles, X, Loader2 } from "lucide-react";

const faqs = [
 {category:"Compte",q:"Comment sécuriser mon compte EMi ?",a:"Utilise une adresse ou un numéro auquel tu as accès, garde tes identifiants privés et déconnecte-toi sur les appareils partagés. Les options de sécurité disponibles dépendent des réglages actuellement activés sur ton compte."},
 {category:"Marché",q:"Comment vendre sur le Marché EMi ?",a:"Ouvre le Marché, choisis l’action de vente et complète les informations du produit avec des photos claires, un prix en FCFA et un moyen de contact fiable. Vérifie les détails avant de publier."},
 {category:"Djangui Flow",q:"Comment fonctionne un cercle Djangui ?",a:"Crée un cercle, indique son objectif et le nombre de membres. La cotisation affichée est une estimation calculée à partir de ces valeurs. Elle ne déclenche aucun paiement automatique."},
 {category:"Fondation",q:"Puis-je faire un don depuis EMi Fondation ?",a:"La page Fondation présente les initiatives vérifiées. Les contributions en ligne ne sont pas activées tant qu’un parcours de paiement sécurisé et la vérification des bénéficiaires ne sont pas disponibles."},
 {category:"Confidentialité",q:"Comment signaler un problème ou un contenu ?",a:"Ne partage pas d’informations sensibles dans un message public. Utilise les options de signalement visibles dans l’espace concerné lorsqu’elles sont disponibles et conserve les informations nécessaires pour décrire le problème."},
 {category:"Technique",q:"Que faire si une page ne fonctionne pas ?",a:"Actualise la page, vérifie ta connexion internet puis réessaie. Si le problème persiste, envoie une demande à l’assistance en indiquant la rubrique concernée et les étapes qui provoquent le problème."}
];
const topics = [
 {title:"Compte & sécurité",detail:"Connexion, profil, confidentialité, récupération de compte.",icon:ShieldCheck,query:"Compte"},
 {title:"Marché EMi",detail:"Achats, ventes, annonces et problèmes de transactions.",icon:ShoppingBag,query:"Marché"},
 {title:"Djangui Flow",detail:"Fonctionnement, assistance et support.",icon:Users,query:"Djangui Flow"},
 {title:"Fondation EMi",detail:"Projets, initiatives et contributions.",icon:HeartHandshake,query:"Fondation"},
 {title:"Contacter l’assistance",detail:"Parlez à notre équipe d’assistance.",icon:LifeBuoy,query:""},
 {title:"Questions fréquentes",detail:"Toutes les réponses en un seul endroit.",icon:CircleHelp,query:""}
];
const ticketCategories = [{value:"account",label:"Compte & sécurité"},{value:"marketplace",label:"Marché EMi"},{value:"djangui",label:"Djangui Flow"},{value:"foundation",label:"EMi Fondation"},{value:"privacy",label:"Confidentialité"},{value:"technical",label:"Problème technique"},{value:"other",label:"Autre"}];

export default function MasterHealthCheckPage() {
 const supabase=useMemo(()=>createSupabaseBrowserClient(),[]);
 const [query,setQuery]=useState("");
 const [opened,setOpened]=useState<number|null>(0);
 const [showContact,setShowContact]=useState(false);
 const [sending,setSending]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [form,setForm]=useState({category:"technical",subject:"",message:""});
 const filtered=useMemo(()=>faqs.filter(x=>(x.q+" "+x.a+" "+x.category).toLowerCase().includes(query.toLowerCase())),[query]);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();setError("");setNotice("");
  if(!supabase){setError("La connexion à l’assistance n’est pas configurée. Réessaie plus tard.");return;}
  setSending(true);
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setSending(false);setError("Connecte-toi à ton compte EMi avant d’envoyer une demande d’assistance.");return;}
  const {error:insertError}=await supabase.from("help_requests").insert({user_id:user.id,category:form.category,subject:form.subject.trim(),message:form.message.trim(),status:"open"});
  setSending(false);
  if(insertError){setError("L’envoi a échoué. Vérifie les champs puis réessaie.");return;}
  setNotice("Ta demande a bien été enregistrée. L’équipe pourra la traiter depuis le système d’assistance.");setShowContact(false);setForm({category:"technical",subject:"",message:""});
 };
 return <main id="top" className="emi-help min-h-screen bg-[#031b14] pb-28 text-white">
  <style jsx global>{`
   .emi-help{background:radial-gradient(ellipse at 78% 0%,rgba(17,103,70,.32),transparent 42%),#031b14!important;color:#f7f5ec;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
   .emi-help input,.emi-help textarea,.emi-help select{background:#061f18!important;color:#fff!important;border:1px solid rgba(233,202,91,.3)!important;outline:none!important;box-shadow:none!important;font-size:16px!important;width:100%;min-width:0;border-radius:12px;padding:12px}
   .emi-help input::placeholder,.emi-help textarea::placeholder{color:#a7b9af!important}
   .emi-help .help-topic{min-height:104px;border:1px solid rgba(233,202,91,.42);background:linear-gradient(145deg,rgba(9,54,39,.98),rgba(2,22,16,.98));box-shadow:0 10px 28px rgba(0,0,0,.18),inset 0 1px rgba(255,255,255,.04);transition:transform .18s ease,border-color .18s ease}
   .emi-help .help-topic:active{transform:scale(.98)}
   .emi-help .help-hero{background:linear-gradient(105deg,rgba(2,24,17,.95),rgba(4,62,43,.8)),radial-gradient(circle at 85% 20%,rgba(235,202,84,.18),transparent 38%)}
   .emi-help button{transition:filter .18s ease,transform .18s ease}.emi-help button:active{transform:scale(.99)}
  `}</style>
  <header className="sticky top-0 z-30 border-b border-amber-200/20 bg-[#031b14]/95 px-4 py-2 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><Link href="/annonces" aria-label="Retour" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"><ArrowLeft size={25}/></Link><div className="text-center leading-none"><div className="text-[10px] font-bold text-amber-200">♛</div><div className="text-3xl font-black tracking-tight text-amber-200" style={{textShadow:"0 2px 10px rgba(235,202,84,.22)"}}>EMi</div><div className="mt-1 text-sm font-medium text-white">Help</div></div><Link href="/annonces" aria-label="Mon espace" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/50 text-amber-200"><Users size={21}/></Link></div></header>
  <div className="mx-auto max-w-5xl px-4">
   <section className="help-hero relative mt-3 overflow-hidden rounded-[24px] border border-amber-200/35 p-5 shadow-2xl shadow-black/25 sm:p-9">
    <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border border-amber-200/15"/><div className="pointer-events-none absolute -right-2 -top-6 h-36 w-36 rounded-full border border-amber-200/10"/>
    <h2 className="mt-1 max-w-xl text-3xl font-extrabold leading-tight sm:text-5xl">Centre d’assistance</h2>
    <p className="mt-2 max-w-xl text-base font-semibold text-white sm:text-lg">Nous sommes là pour vous aider !</p><p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">Trouvez rapidement des réponses à vos questions ou contactez notre équipe.</p>
    <label className="mt-5 flex min-h-14 items-center gap-3 rounded-2xl border border-amber-200/40 bg-[#031b14]/80 px-4 shadow-lg"><Search size={21} className="shrink-0 text-amber-200"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une question..." aria-label="Rechercher dans l’aide" className="border-0 bg-transparent"/></label>
   </section>
   <section className="mt-7"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Centre d’assistance</p><h2 className="mt-1 text-2xl font-extrabold">Explorer par rubrique</h2></div><BookOpen className="text-amber-200" size={25}/></div>
    <div className="grid grid-cols-2 gap-3">{topics.map(t=><button type="button" key={t.title} onClick={()=>{if(t.title==="Contacter l’assistance"){setShowContact(true);setError("");setNotice("");return;}if(t.title==="Questions fréquentes"){document.getElementById("help-faq")?.scrollIntoView({behavior:"smooth",block:"start"});return;}setQuery(t.query);setOpened(0);document.getElementById("help-faq")?.scrollIntoView({behavior:"smooth",block:"start"});}} className="help-topic flex min-w-0 w-full flex-col items-start gap-3 rounded-2xl p-3 text-left sm:p-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-amber-200/35 bg-black/15 text-amber-200"><t.icon size={23}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold leading-tight sm:text-base">{t.title}</h3><p className="mt-1 text-xs leading-4 text-slate-300 sm:text-sm">{t.detail}</p></div><span className="self-end text-xl text-amber-200" aria-hidden="true">›</span></button>)}</div>
   </section>
   <section id="help-faq" className="mt-8 scroll-mt-24"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Réponses rapides</p><h2 className="mt-1 text-2xl font-extrabold">Questions fréquentes</h2></div>
    <div className="space-y-3">{filtered.map((item,index)=><article key={item.q} className="overflow-hidden rounded-2xl border border-amber-200/25 bg-gradient-to-br from-[#0a3326] to-[#041b14]"><button onClick={()=>setOpened(opened===index?null:index)} aria-expanded={opened===index} className="flex w-full items-center gap-3 p-4 text-left"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-200/10 text-amber-200"><CircleHelp size={19}/></span><span className="flex-1"><span className="block text-xs font-semibold text-amber-200">{item.category}</span><span className="mt-1 block font-semibold">{item.q}</span></span><ChevronDown size={19} className={opened===index?"rotate-180 text-amber-200 transition-transform":"text-slate-400 transition-transform"}/></button>{opened===index&&<p className="border-t border-white/10 px-4 pb-4 pt-3 text-sm leading-6 text-slate-300">{item.a}</p>}</article>)}{filtered.length===0&&<p className="rounded-2xl border border-white/10 p-5 text-slate-300">Aucun résultat. Essaie un autre mot-clé.</p>}</div>
   </section>
   <section className="mt-8 rounded-3xl border border-amber-200/40 bg-gradient-to-r from-[#0b3b2a] to-[#061f17] p-5 shadow-xl shadow-black/20 sm:p-7"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-200 text-[#06251a]"><MessageCircle size={23}/></span><div className="flex-1"><h2 className="text-xl font-extrabold">Tu n’as pas trouvé ta réponse ?</h2><p className="mt-2 text-sm leading-6 text-slate-300">Envoie une demande enregistrée de manière sécurisée dans ton compte EMi.</p><button onClick={()=>{setShowContact(true);setError("");setNotice("");}} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 px-5 py-3 font-bold text-[#06251a]">Contacter l’assistance <MessageCircle size={16}/></button></div></div></section>
   {notice&&<p role="status" className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-950/60 p-4 text-sm text-emerald-100">{notice}</p>}
   {error&&!showContact&&<p role="alert" className="mt-4 rounded-xl border border-rose-300/30 bg-rose-950/50 p-4 text-sm text-rose-100">{error}</p>}
   <p className="mt-5 text-center text-xs leading-5 text-slate-500">EMi Help · Les demandes sont privées et visibles par leur auteur. Le suivi par un agent nécessite un accès interne autorisé.</p>
  </div>
  {showContact&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"><section role="dialog" aria-modal="true" aria-labelledby="contact-title" className="max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-amber-200/30 bg-[#041b14] p-5 sm:rounded-3xl sm:p-7"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-200">Centre d’assistance</p><h2 id="contact-title" className="mt-1 text-xl font-extrabold">Nouvelle demande</h2></div><button onClick={()=>setShowContact(false)} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full border border-white/20"><X/></button></div><form onSubmit={submit} className="space-y-3"><label className="block text-sm font-semibold">Rubrique<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1">{ticketCategories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label><label className="block text-sm font-semibold">Sujet<input required minLength={5} maxLength={160} value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Résume le problème" className="mt-1"/></label><label className="block text-sm font-semibold">Description<textarea required minLength={10} maxLength={5000} rows={5} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Décris ce qui s’est passé et les étapes pour reproduire le problème." className="mt-1"/></label><p className="text-xs leading-5 text-slate-400">N’inclus pas ton mot de passe, tes codes de vérification ni des informations bancaires.</p>{error&&<p role="alert" className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-100">{error}</p>}<button disabled={sending} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-200 to-yellow-400 px-5 py-3 font-bold text-[#06251a] disabled:opacity-60">{sending&&<Loader2 size={18} className="animate-spin"/>}{sending?"Envoi en cours…":"Envoyer la demande"}</button></form></section></div>}
  <nav aria-label="Navigation Help EMi" className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200/20 bg-[#041b14]/95 px-3 py-2 backdrop-blur"><div className="mx-auto flex max-w-md items-center justify-around"><Link href="/annonces" className="flex flex-col items-center gap-1 text-xs text-slate-300"><ShoppingBag size={23}/>Marché</Link><a href="#top" className="flex flex-col items-center gap-1 text-xs text-amber-200"><CircleHelp size={23}/>Aide</a><Link href="/annonces/philanthropy" className="flex flex-col items-center gap-1 text-xs text-slate-300"><HeartHandshake size={23}/>Fondation</Link><Link href="/annonces/tontine" className="flex flex-col items-center gap-1 text-xs text-slate-300"><Users size={23}/>Djangui</Link></div></nav>
 </main>;
}
