"use client";

import { useCallback, useEffect, useState, FormEvent, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Users, HandCoins, PlusCircle, RefreshCw, ShieldCheck, Search, Camera, Home, Heart, LayoutGrid, Compass, Target, Sprout } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Cercle = { id: string; createur_id: string; nom_article: string; prix_cible: number; devise: string; membres_max: number; statut: string; created_at: string };
type Participant = { id: string; cercle_id: string; user_id: string; montant_promis: number; statut: string };
const supabase = createSupabaseBrowserClient();

export default function TontineFlowPage() {
  const [cercles, setCercles] = useState<Cercle[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [userId, setUserId] = useState("");
  const [nom, setNom] = useState("");
  const [prix, setPrix] = useState("150000");
  const [max, setMax] = useState("5");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const charger = useCallback(async () => {
    if (!supabase) { setNotice("La connexion Supabase n'est pas configurée."); setLoading(false); return; }
    const [{ data: auth }, { data, error }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("tontine_cercles").select("id,createur_id,nom_article,prix_cible,devise,membres_max,statut,created_at").order("created_at", { ascending: false }).limit(50)
    ]);
    setUserId(auth.user?.id ?? "");
    if (error) setNotice("Impossible de charger les cercles : " + error.message);
    const rows = (data || []) as Cercle[];
    setCercles(rows);
    if (rows.length) {
      const { data: parts, error: partError } = await supabase.from("tontine_participants").select("id,cercle_id,user_id,montant_promis,statut").in("cercle_id", rows.map(x => x.id)).neq("statut", "annule");
      if (partError) setNotice("Impossible de charger les participants : " + partError.message);
      setParticipants((parts || []) as Participant[]);
    } else setParticipants([]);
    setLoading(false);
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  async function creer(e: FormEvent) {
    e.preventDefault(); setNotice("");
    if (!supabase) return setNotice("Supabase n'est pas configuré.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setNotice("Connecte-toi à EMi pour créer un cercle.");
    const amount = Number(prix), count = Number(max);
    if (nom.trim().length < 3 || !Number.isSafeInteger(amount) || amount <= 0 || !Number.isInteger(count) || count < 2 || count > 50)
      return setNotice("Vérifie le nom, le prix et le nombre de membres (2 à 50).");
    setSaving(true);
    const { data, error } = await supabase.from("tontine_cercles").insert({
      createur_id: auth.user.id, nom_article: nom.trim(), prix_cible: amount, devise: "XAF", membres_max: count, statut: "ouvert"
    }).select("id").single();
    if (error) { setNotice("Création impossible : " + error.message); setSaving(false); return; }
    const part = Math.ceil(amount / count);
    const { error: joinError } = await supabase.from("tontine_participants").insert({ cercle_id: data.id, user_id: auth.user.id, montant_promis: part, statut: "inscrit" });
    if (joinError) setNotice("Cercle créé, mais inscription du créateur impossible : " + joinError.message);
    else { setNotice("Cercle créé. Ta participation est enregistrée comme intention, aucun paiement n'a été effectué."); setNom(""); }
    await charger(); setSaving(false);
  }

  async function rejoindre(c: Cercle) {
    setNotice("");
    if (!supabase) return setNotice("Supabase n'est pas configuré.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setNotice("Connecte-toi à EMi pour rejoindre un cercle.");
    const current = participants.filter(p => p.cercle_id === c.id);
    if (c.statut !== "ouvert" || current.length >= c.membres_max) return setNotice("Ce cercle est complet ou fermé.");
    if (current.some(p => p.user_id === auth.user!.id)) return setNotice("Tu es déjà inscrit à ce cercle.");
    const contribution = Math.ceil(Number(c.prix_cible) / c.membres_max);
    const { error } = await supabase.from("tontine_participants").insert({ cercle_id: c.id, user_id: auth.user.id, montant_promis: contribution, statut: "inscrit" });
    if (error) { setNotice("Inscription impossible : " + error.message); return; }
    setNotice("Inscription enregistrée comme engagement. Aucun paiement Mobile Money n'a été déclenché.");
    await charger();
  }

  const fmt = (n: number) => Number(n).toLocaleString("fr-FR") + " FCFA";
  const filtered = cercles.filter(c => (c.nom_article + " " + c.statut).toLowerCase().includes(searchQuery.toLowerCase()));
  const field: CSSProperties = { width:"100%",minWidth:0,minHeight:50,border:"1px solid rgba(225,199,105,.35)",borderRadius:14,background:"#071f19",color:"#fff9e7",padding:"13px 15px",outline:"none" };
  const goldButton: CSSProperties = { display:"inline-flex",alignItems:"center",justifyContent:"center",gap:9,minHeight:48,padding:"12px 18px",border:0,borderRadius:999,background:"linear-gradient(135deg,#f9e58a,#d8b64f)",color:"#09251b",fontWeight:800,cursor:"pointer",boxShadow:"0 8px 24px rgba(216,182,79,.16)" };
  return <main style={{minHeight:"100vh",width:"100%",overflowX:"hidden",paddingBottom:100,background:"radial-gradient(ellipse at 50% -8%,rgba(27,102,74,.38),transparent 42%),#041711",color:"#f7f5ec",fontFamily:"Arial, sans-serif"}}>
    <header style={{position:"sticky",top:0,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"13px 16px",background:"rgba(4,31,23,.94)",backdropFilter:"blur(18px)",borderBottom:"1px solid rgba(222,198,105,.2)"}}>
      <Link href="/annonces" aria-label="Retour au marché EMi" style={{display:"inline-flex",alignItems:"center",gap:7,color:"#f3d76c",fontSize:13,fontWeight:700}}><ArrowLeft size={19}/> Marché EMi</Link>
      <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{display:"grid",placeItems:"center",width:39,height:39,borderRadius:12,border:"1px solid #d9bd5d",color:"#f5dc78",fontFamily:"Georgia,serif",fontSize:22}}>D</span><div><div style={{fontFamily:"Georgia,serif",fontSize:16,fontWeight:700,letterSpacing:1,color:"#f5d975"}}>EMi DJANGUI FLOW</div><div style={{fontSize:11,color:"#b8c7bf",marginTop:3}}>Ensemble, on avance</div></div></div>
      <button onClick={()=>{setLoading(true);void charger();}} aria-label="Actualiser les cercles" style={{width:40,height:40,display:"grid",placeItems:"center",border:"1px solid rgba(229,207,119,.38)",borderRadius:13,background:"#0b2a20",color:"#f2d873"}}><RefreshCw size={17}/></button>
    </header>
    <div style={{maxWidth:980,margin:"0 auto",padding:"18px 15px 28px"}}>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:15,marginBottom:8}}>
        {["Épargne collective","Cercles ouverts","Créer un cercle"].map((label,i)=><a key={label} href={i===2?"#creer":"#cercles"} onClick={i===2?e=>{e.preventDefault();document.getElementById("creer")?.scrollIntoView({behavior:"smooth"});}:undefined} style={{whiteSpace:"nowrap",border:"1px solid "+(i===0?"#e2c75f":"rgba(202,222,210,.25)"),background:i===0?"linear-gradient(135deg,#f8e58b,#d8b64f)":"rgba(255,255,255,.035)",color:i===0?"#09251b":"#d7e0d9",padding:"10px 15px",borderRadius:999,fontSize:12,fontWeight:700}}>{label}</a>)}
      </div>
      <section style={{position:"relative",minHeight:390,display:"flex",alignItems:"flex-end",overflow:"hidden",border:"1px solid rgba(225,200,102,.7)",borderRadius:25,marginBottom:28,background:"#08291e",boxShadow:"0 18px 55px rgba(0,0,0,.22)"}}>
        <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=90" alt="Communauté réunie autour d’un projet" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.58}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(2,22,15,.95) 0%,rgba(2,22,15,.72) 50%,rgba(2,22,15,.12) 100%),linear-gradient(0deg,rgba(2,22,15,.8),transparent 70%)"}}/>
        <div style={{position:"relative",padding:"26px 22px",maxWidth:620}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:7,padding:"7px 11px",borderRadius:999,background:"linear-gradient(135deg,#f8e58b,#d8b64f)",color:"#10281c",fontSize:10,fontWeight:900,letterSpacing:1}}>✦ SOLIDARITÉ COMMUNAUTAIRE</div>
          <h1 style={{fontSize:"clamp(32px,7vw,52px)",lineHeight:1.04,letterSpacing:-1.2,margin:"17px 0 12px",fontWeight:850}}>Vos projets.<br/><span style={{color:"#f3d66a"}}>Votre communauté.</span></h1>
          <p style={{maxWidth:500,fontSize:15,lineHeight:1.65,color:"#f0f3ee",margin:"0 0 19px"}}>Créez un cercle d’achat, réunissez les participants et suivez les engagements avec une cotisation indicative calculée automatiquement.</p>
          <button onClick={()=>document.getElementById("creer")?.scrollIntoView({behavior:"smooth"})} style={goldButton}><PlusCircle size={18}/> Créer un cercle <ArrowLeft size={16} style={{transform:"rotate(180deg)"}}/></button>
          <p style={{fontSize:11,lineHeight:1.55,color:"#d3ddd4",margin:"16px 0 0"}}><ShieldCheck size={14} style={{display:"inline",verticalAlign:"-3px",marginRight:5}}/>Les inscriptions sont des engagements déclarés : aucun paiement n’est encaissé automatiquement.</p>
        </div>
      </section>
      <section style={{marginBottom:28}}>
        <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:12,marginBottom:14}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:2,color:"#e7cd70",marginBottom:6}}>VOTRE ESPACE</div><h2 style={{fontSize:25,margin:0}}>Djangui, simplement</h2></div><span style={{fontSize:11,color:"#aebfb4"}}>EMi Community</span></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
          {[{icon:"♧",title:"Épargner ensemble",desc:"Une cotisation claire pour chaque membre."},{icon:"◎",title:"Suivre l’objectif",desc:"Visualisez la progression des engagements."},{icon:"♡",title:"Agir en confiance",desc:"Des règles visibles pour tout le cercle."},{icon:"↗",title:"Avancer ensemble",desc:"Rejoignez un projet de la communauté."}].map(x=><article key={x.title} style={{padding:"17px 14px",border:"1px solid rgba(225,200,102,.5)",borderRadius:19,background:"linear-gradient(145deg,rgba(13,53,39,.82),rgba(5,28,21,.95))"}}><div style={{fontSize:25,color:"#f0d36b",marginBottom:10}}>{x.icon}</div><h3 style={{fontSize:14,margin:"0 0 7px"}}>{x.title}</h3><p style={{fontSize:12,lineHeight:1.5,color:"#afc1b6",margin:0}}>{x.desc}</p></article>)}
        </div>
      </section>
      <form id="creer" onSubmit={creer} style={{scrollMarginTop:85,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:14,padding:20,border:"1px solid rgba(225,200,102,.6)",borderRadius:23,background:"linear-gradient(145deg,rgba(12,47,35,.96),rgba(4,24,18,.98))",boxShadow:"0 18px 50px rgba(0,0,0,.18)"}}>
        <div style={{gridColumn:"1/-1"}}><div style={{fontSize:10,fontWeight:900,letterSpacing:2,color:"#e8ce70"}}>COMMENCER MAINTENANT</div><h2 style={{fontSize:26,margin:"8px 0"}}>Créer un cercle</h2><p style={{fontSize:13,lineHeight:1.6,color:"#b8c8bd",margin:0}}>Définissez l’achat, l’objectif et le nombre de membres. Le montant par personne se calcule automatiquement.</p></div>
        <label style={{display:"grid",gap:8,fontSize:12,color:"#dce5dd",gridColumn:"1/-1"}}>Article ou achat prévu<input value={nom} onChange={e=>setNom(e.target.value)} required minLength={3} maxLength={120} placeholder="Ex. Pack stock marchand, ordinateur, équipement…" style={field}/></label>
        <label style={{display:"grid",gap:8,fontSize:12,color:"#dce5dd"}}>Objectif total (FCFA)<input value={prix} onChange={e=>setPrix(e.target.value)} type="number" min="1" step="1" required style={field}/></label>
        <label style={{display:"grid",gap:8,fontSize:12,color:"#dce5dd"}}>Nombre de membres<input value={max} onChange={e=>setMax(e.target.value)} type="number" min="2" max="50" step="1" required style={field}/></label>
        <div style={{gridColumn:"1/-1",padding:16,borderRadius:15,border:"1px solid rgba(225,200,102,.3)",background:"rgba(229,201,100,.07)"}}><div style={{fontSize:11,color:"#b8c8bd"}}>Cotisation indicative par membre</div><div style={{fontSize:25,fontWeight:850,color:"#f3d66a",marginTop:6}}>{fmt(Math.ceil((Number(prix)||0)/Math.max(2,Number(max)||5)))} </div><div style={{fontSize:11,color:"#b8c8bd",marginTop:5}}>Calcul estimatif · aucun débit automatique</div></div>
        <button disabled={saving} style={{...goldButton,gridColumn:"1/-1",width:"100%",opacity:saving ? 0.65 : 1}}><PlusCircle size={18}/>{saving?"Création en cours…":"Créer mon cercle"}</button>
      </form>
      {notice&&<div role="status" style={{marginTop:15,padding:14,borderRadius:14,border:"1px solid rgba(225,200,102,.45)",background:"#0b3325",color:"#f7e9a9",fontSize:13,lineHeight:1.6}}>{notice}</div>}
      <section id="cercles" style={{scrollMarginTop:85,marginTop:32}}>
        <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:12,marginBottom:14}}><div><div style={{fontSize:10,fontWeight:900,letterSpacing:2,color:"#e8ce70",marginBottom:6}}>OUVERT À LA COMMUNAUTÉ</div><h2 style={{fontSize:25,margin:0}}>Cercles ouverts</h2><p style={{fontSize:13,color:"#b7c7bd",margin:"7px 0 0"}}>Découvre un projet et rejoins le groupe.</p></div><span style={{whiteSpace:"nowrap",fontSize:12,color:"#f0d56f"}}>{filtered.length} cercle(s)</span></div>
        <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:15,padding:"0 14px",minHeight:49,borderRadius:15,border:"1px solid rgba(225,200,102,.35)",background:"#08241a"}}><Search size={18} color="#e8ce70"/><input aria-label="Rechercher un cercle" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Rechercher un projet…" style={{...field,minHeight:46,border:0,background:"transparent",padding:"10px 0"}}/></label>
        {loading?<p style={{padding:30,textAlign:"center",color:"#b7c7bd"}}>Chargement des cercles…</p>:filtered.length===0?<div style={{padding:25,textAlign:"center",border:"1px dashed rgba(225,200,102,.4)",borderRadius:18,background:"rgba(255,255,255,.025)"}}><Users size={28} color="#e8ce70" style={{margin:"0 auto 10px"}}/><p style={{fontWeight:700,margin:"0 0 7px"}}>{searchQuery?"Aucun résultat":"Le premier cercle commence avec toi"}</p><p style={{fontSize:12,color:"#b7c7bd",lineHeight:1.6,margin:0}}>{searchQuery?"Essaie un autre mot-clé.":"Crée un cercle d’achat pour le rendre visible à la communauté."}</p></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,270px),1fr))",gap:14}}>{filtered.map(c=>{
          const parts=participants.filter(p=>p.cercle_id===c.id); const amount=parts.reduce((sum,p)=>sum+Number(p.montant_promis),0); const progress=Math.min(100,Math.round(amount/Number(c.prix_cible)*100)); const full=parts.length>=c.membres_max; const joined=parts.some(p=>p.user_id===userId);
          return <article key={c.id} style={{overflow:"hidden",border:"1px solid rgba(225,200,102,.38)",borderRadius:20,background:"linear-gradient(145deg,#0c3023,#061d15)"}}>
            <div style={{position:"relative",height:125,overflow:"hidden"}}><img src={"https://images.unsplash.com/photo-"+(["1529156069898-49953e39b3ac","1511632765486-a01980e01a18","1527528484897-7e9f6e7c3b2f"][cercles.indexOf(c)%3])+"?auto=format&fit=crop&w=900&q=85"} alt="Communauté Djangui" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",opacity:.7}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(0deg,rgba(3,24,17,.85),transparent)"}}/><span style={{position:"absolute",left:13,bottom:12,fontSize:10,fontWeight:900,letterSpacing:1,color:"#f4dc78"}}>✦ DJANGUI FLOW</span></div>
            <div style={{padding:16}}><div style={{display:"flex",alignItems:"start",justifyContent:"space-between",gap:10}}><h3 style={{fontSize:16,lineHeight:1.4,margin:0,overflowWrap:"anywhere"}}>{c.nom_article}</h3><span style={{fontSize:10,whiteSpace:"nowrap",padding:"5px 8px",borderRadius:999,background:full?"rgba(248,226,134,.15)":"rgba(80,210,147,.12)",color:full?"#f3d66a":"#8ee0b5"}}>{full?"Complet":c.statut==="annule"?"Annulé":"Ouvert"}</span></div>
              <div style={{fontSize:23,fontWeight:850,color:"#f3d66a",marginTop:12}}>{fmt(Number(c.prix_cible))}</div>
              <div style={{display:"flex",justifyContent:"space-between",gap:8,marginTop:13,fontSize:11,color:"#bdc9c0"}}><span><Users size={13} style={{display:"inline",verticalAlign:"-2px",marginRight:4}}/>{parts.length}/{c.membres_max} membres</span><span>{progress}% des engagements</span></div>
              <div style={{height:6,marginTop:8,borderRadius:99,background:"rgba(255,255,255,.1)",overflow:"hidden"}}><div style={{height:"100%",width:progress+"%",background:"linear-gradient(90deg,#d7b34d,#f5e28b)",transition:"width .3s"}}/></div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginTop:15,flexWrap:"wrap"}}><span style={{fontSize:11,color:"#c5d0c7"}}>{fmt(Math.ceil(Number(c.prix_cible)/c.membres_max))} / personne</span><button onClick={()=>void rejoindre(c)} disabled={full||c.statut!=="ouvert"||joined} style={{...goldButton,minHeight:40,padding:"9px 14px",fontSize:12,opacity:full||c.statut!=="ouvert"||joined ? 0.55 : 1,cursor:full||c.statut!=="ouvert"||joined?"not-allowed":"pointer"}}>{joined?"Déjà inscrit":full?"Cercle complet":c.statut!=="ouvert"?"Fermé":"Rejoindre"}</button></div>
              <p style={{fontSize:10,lineHeight:1.5,color:"#8fa99a",margin:"13px 0 0"}}>Engagements déclarés, pas des paiements vérifiés.</p>
            </div>
          </article>;
        })}</div>}
      </section>
      <section style={{marginTop:28,padding:18,borderRadius:20,border:"1px solid rgba(225,200,102,.32)",background:"rgba(255,255,255,.025)"}}><div style={{display:"flex",alignItems:"center",gap:10}}><ShieldCheck size={22} color="#f3d66a"/><h2 style={{fontSize:18,margin:0}}>La confiance avant tout</h2></div><p style={{fontSize:12,lineHeight:1.7,color:"#b7c7bd",margin:"10px 0 0"}}>Les cercles et les inscriptions sont enregistrés dans Supabase. La cotisation affichée est indicative. Les paiements Mobile Money ne sont pas encore intégrés à ce parcours et aucun argent n’est encaissé automatiquement.</p></section>
    </div>
    <nav aria-label="Navigation Djangui Flow" style={{position:"fixed",left:0,right:0,bottom:0,zIndex:40,display:"flex",justifyContent:"space-around",alignItems:"center",padding:"10px 8px calc(10px + env(safe-area-inset-bottom))",background:"rgba(3,20,15,.96)",borderTop:"1px solid rgba(225,200,102,.3)",backdropFilter:"blur(18px)"}}>
      <Link href="/annonces" style={{display:"grid",justifyItems:"center",gap:4,color:"#c6d0c8",fontSize:10}}><Home size={21}/>Marché</Link>
      <a href="#cercles" style={{display:"grid",justifyItems:"center",gap:4,color:"#c6d0c8",fontSize:10}}><Search size={21}/>Explorer</a>
      <button aria-label="Créer un cercle" onClick={()=>document.getElementById("creer")?.scrollIntoView({behavior:"smooth"})} style={{...goldButton,width:52,height:52,minHeight:52,padding:0,borderRadius:20}}><PlusCircle size={25}/></button>
      <a href="#cercles" style={{display:"grid",justifyItems:"center",gap:4,color:"#f3d66a",fontSize:10}}><Users size={21}/>Cercles</a>
      <Link href="/" style={{display:"grid",justifyItems:"center",gap:4,color:"#c6d0c8",fontSize:10}}><LayoutGrid size={21}/>EMi</Link>
    </nav>
  </main>;
}
