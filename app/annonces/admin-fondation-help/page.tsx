"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase";
export default function AdminFoundationHelp(){
 const db=useMemo(()=>createSupabaseBrowserClient(),[]);
 const [state,setState]=useState("Vérification…");
 const [role,setRole]=useState(false);
 const [projects,setProjects]=useState<any[]>([]);
 const [tickets,setTickets]=useState<any[]>([]);
 const [error,setError]=useState("");
 async function load(){
  if(!db){setState("Connexion Supabase indisponible");return}
  const {data:{user}}=await db.auth.getUser();
  if(!user||user.app_metadata?.role!=="admin"){setRole(false);setState("Accès réservé à l’administration");return}
  setRole(true);
  const [p,h]=await Promise.all([db.from("foundation_initiatives").select("id,title,description,status,created_at,owner_id").order("created_at",{ascending:false}),db.from("help_requests").select("id,subject,message,status,category,created_at,user_id").order("created_at",{ascending:false})]);
  if(p.error||h.error){setError("Erreur de chargement : vérifie les droits administrateur Supabase.");return}
  setProjects(p.data||[]);setTickets(h.data||[]);setState("Connecté à Supabase");
 }
 useEffect(()=>{void load()},[db]);
 async function decide(id:string,status:string){if(!db)return;const {data:{user}}=await db.auth.getUser();if(!user||user.app_metadata?.role!=="admin"){setError("Accès refusé");return}const {error}=await db.from("foundation_initiatives").update({status,reviewer_id:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);if(error)setError(error.message);else await load()}
 async function ticketStatus(id:string,status:string){if(!db)return;const {error}=await db.from("help_requests").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error)setError(error.message);else await load()}
 if(!role)return <main className="min-h-screen bg-[#031b14] p-6 text-white"><h1 className="text-2xl font-bold">EMi · Administration</h1><p className="mt-4">{state}</p><p className="mt-2 text-sm text-slate-300">Seul un compte ayant le rôle admin dans les métadonnées sécurisées Supabase peut accéder à cet espace.</p><Link className="mt-6 inline-block rounded-full bg-amber-200 px-4 py-3 font-bold text-black" href="/annonces">Retour aux espaces EMi</Link><button className="ml-3 rounded-full border p-3" onClick={()=>void load()}>Réessayer</button></main>;
 return <main className="min-h-screen bg-[#031b14] p-4 pb-12 text-white"><header className="mx-auto flex max-w-4xl items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-amber-200">EMi · Administration</p><h1 className="text-2xl font-extrabold">Fondation & Help</h1><p className="text-sm text-slate-400">{state}</p></div><Link href="/annonces" className="rounded-full border border-amber-200/30 px-4 py-2">Retour</Link></header>{error&&<p className="mx-auto mt-4 max-w-4xl rounded-xl bg-rose-950 p-3">{error}</p>}<div className="mx-auto mt-6 max-w-4xl"><h2 className="text-xl font-bold">Initiatives à examiner ({projects.length})</h2><div className="mt-3 space-y-3">{projects.map(x=><article key={x.id} className="rounded-2xl border border-amber-200/30 bg-[#08291e] p-4"><p className="text-xs text-amber-200">{x.status} · {x.created_at}</p><h3 className="mt-1 text-lg font-bold">{x.title}</h3><p className="mt-2 text-sm text-slate-300">{x.description}</p>{x.status==="pending"&&<div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>void decide(x.id,"verified")} className="rounded-full bg-amber-200 px-4 py-2 font-bold text-black">Approuver</button><button onClick={()=>void decide(x.id,"rejected")} className="rounded-full border border-rose-300 px-4 py-2">Refuser</button></div>}</article>)}</div><h2 className="mt-8 text-xl font-bold">Demandes d’aide ({tickets.length})</h2><div className="mt-3 space-y-3">{tickets.map(x=><article key={x.id} className="rounded-2xl border border-amber-200/30 bg-[#08291e] p-4"><p className="text-xs text-amber-200">{x.category} · {x.status}</p><h3 className="mt-1 font-bold">{x.subject}</h3><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{x.message}</p><div className="mt-3 flex flex-wrap gap-2">{[["open","Ouverte"],["in_progress","En cours"],["resolved","Résolue"],["closed","Fermée"]].map(([s,label])=><button key={s} onClick={()=>void ticketStatus(x.id,s)} className="rounded-full border border-white/20 px-3 py-2 text-sm">{label}</button>)}</div></article>)}</div></div></main>
}