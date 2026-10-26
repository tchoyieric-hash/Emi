"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Plus, ShoppingBag, LoaderCircle, ImagePlus, Menu, X, ArrowUpRight, Search } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { genererLienWhatsApp } from "@/lib/whatsapp";

type Annonce = { id:string; seller_id:string; titre:string; description:string; prix:number; devise:string; image_urls:string[]; numero_whatsapp:string; created_at:string };
type MarketItem = { id:string; title:string; description:string; badge:string; badgeColor:string; image:string; meta:string; href:string; created_at:string; price?:number; phone?:string; origin:"market"|"hospitality"|"troc"|"djangui"|"foundation"|"help" };
const supabase = createSupabaseBrowserClient();

export default function AnnoncesPage() {
  const [annonces,setAnnonces] = useState<Annonce[]>([]);
  const [communityItems,setCommunityItems] = useState<MarketItem[]>([]);
  const [user,setUser] = useState<any>(null);
  const [open,setOpen] = useState(false);
  const [spacesOpen,setSpacesOpen] = useState(false);
  const [royalOpen,setRoyalOpen] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [search,setSearch] = useState("");
  const [titre,setTitre] = useState("");
  const [description,setDescription] = useState("");
  const [prix,setPrix] = useState("");
  const [telephone,setTelephone] = useState("");
  const [photos,setPhotos] = useState<File[]>([]);

  async function load() {
    if (!supabase) { setNotice("La connexion Supabase n'est pas configurée."); setLoading(false); return; }
    const [{data:auth},{data,error},{data:hotelData},{data:trocData},{data:flowData}] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("annonces").select("id,seller_id,titre,description,prix,devise,image_urls,numero_whatsapp,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(60),
      supabase.from("elite_directory_profiles").select("id,user_id,nom,specialite,telephone,ville,bio,image_url,created_at").eq("published",true).order("created_at",{ascending:false}).limit(30),
      supabase.from("troc_offres").select("id,user_id,bien_offert,bien_recherche,description,statut,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(30),
      supabase.from("tontine_cercles").select("id,createur_id,nom_article,prix_cible,devise,membres_max,statut,created_at").order("created_at",{ascending:false}).limit(30)
    ]);
    setUser(auth.user ?? null);
    if(error) setNotice("Chargement des produits impossible : "+error.message);
    else setAnnonces((data||[]) as Annonce[]);
    const items:MarketItem[] = [
      ...((hotelData||[]) as any[]).map(p=>({id:p.id,title:p.nom,description:p.bio||p.specialite,badge:"ELITE HOSPITALITY",badgeColor:"#f3ce45",image:p.image_url||"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",meta:[p.specialite,p.ville].filter(Boolean).join(" · "),href:"/annonces/elite-directory",created_at:p.created_at,phone:p.telephone,origin:"hospitality" as const})),
      ...((trocData||[]) as any[]).map(p=>({id:p.id,title:p.bien_offert,description:"Recherche en échange : "+p.bien_recherche+(p.description?" — "+p.description:""),badge:"EMi TROC",badgeColor:"#2767ff",image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=85",meta:"Échange communautaire",href:"/annonces/troc",created_at:p.created_at,origin:"troc" as const})),
      ...((flowData||[]) as any[]).map(p=>({id:p.id,title:p.nom_article,description:"Rejoignez ce cercle d’achat groupé pour avancer ensemble vers un objectif commun.",badge:"DJANGUI FLOW",badgeColor:"#7c3aed",image:"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85",meta:[p.prix_cible?new Intl.NumberFormat("fr-FR").format(Number(p.prix_cible))+" FCFA":"",p.membres_max?p.membres_max+" membres max":""].filter(Boolean).join(" · "),href:"/annonces/tontine",created_at:p.created_at,origin:"djangui" as const}))
    ];
    setCommunityItems(items);
    setLoading(false);
  }
  useEffect(()=>{ void load(); },[]);

  async function publier(e:FormEvent) {
    e.preventDefault(); setNotice("");
    if(!supabase) { setNotice("Supabase n'est pas configuré."); return; }
    const {data:{user:current}} = await supabase.auth.getUser();
    if(!current) { setNotice("Connecte-toi à EMi avant de publier une annonce."); return; }
    const digits=telephone.replace(/[^0-9]/g,"");
    if(digits.length<8||digits.length>15) { setNotice("Entre un numéro WhatsApp avec indicatif international (ex. 2376XXXXXXXX)."); return; }
    if(!titre.trim()||Number(prix)<0||prix.trim()===""||!Number.isFinite(Number(prix))) { setNotice("Vérifie le titre et le prix."); return; }
    setSaving(true);
    try {
      let image_urls:string[]=[];
      if(photos.length>10) throw new Error("Tu peux ajouter jusqu'à 10 photos par annonce.");
      for(const photo of photos) {
        if(!photo.type.startsWith("image/")) throw new Error("Chaque fichier doit être une image.");
        if(photo.size>12*1024*1024) throw new Error("Chaque image doit faire moins de 12 Mo.");
        const ext=photo.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"")||"jpg";
        const path=current.id+"/annonces/"+crypto.randomUUID()+"."+ext;
        const {error:upErr}=await supabase.storage.from("post-media").upload(path,photo,{contentType:photo.type,upsert:false});
        if(upErr) throw new Error("Envoi d'une photo impossible : "+upErr.message);
        const {data:urlData}=supabase.storage.from("post-media").getPublicUrl(path);
        image_urls.push(urlData.publicUrl);
      }
      const {error}=await supabase.from("annonces").insert({seller_id:current.id,titre:titre.trim(),description:description.trim(),prix:Number(prix),devise:"XAF",image_urls,numero_whatsapp:digits,statut:"active"});
      if(error) throw error;
      setTitre("");setDescription("");setPrix("");setTelephone("");setPhotos([]);setOpen(false);
      setNotice("Annonce publiée avec succès.");
      await load();
    } catch(err) { setNotice(err instanceof Error?err.message:"Publication impossible."); }
    finally { setSaving(false); }
  }

  const annoncesFiltrees = annonces.filter(a => `${a.titre} ${a.description}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")));
  const communityFiltered = communityItems.filter(a => `${a.title} ${a.description} ${a.badge} ${a.meta}`.toLocaleLowerCase("fr").includes(search.trim().toLocaleLowerCase("fr")));

  return <main className="min-h-screen w-full overflow-x-hidden bg-[#09090d] text-white">
    <section className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-4 sm:py-9">
      <section className="emi-shop-shell">
        <div className="emi-shop-brandbar"><button className="emi-shop-menu" onClick={()=>{setSpacesOpen(!spacesOpen);setRoyalOpen(false);}} aria-label={spacesOpen?"Fermer le centre de commandes":"Ouvrir le centre de commandes"} aria-expanded={spacesOpen}><Menu size={21}/></button><div className="emi-shop-brand"><span className="emi-shop-monogram">M</span><span><strong>EMi MARKET</strong><small>Le marché de la communauté</small></span></div><button className="emi-shop-notice" onClick={()=>{setRoyalOpen(!royalOpen);setSpacesOpen(false);}} aria-label={royalOpen?"Fermer EMi Royal":"Ouvrir EMi Royal"} aria-expanded={royalOpen}>♣</button></div>
        <div className="emi-shop-profile"><div className="emi-shop-avatar">EM<span>✦</span></div><div className="emi-shop-profile-copy"><h1>Le Marché EMi</h1><p>Mode, technologie, maison & découvertes</p><div className="emi-shop-trust">✦ La boutique de la communauté</div></div><button className="emi-shop-sell" onClick={()=>setOpen(!open)}><Plus size={15}/> Vendre</button></div>
        <label htmlFor="annonces-search" className="emi-shop-search"><Search size={18}/><input id="annonces-search" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit…"/><span>⌕</span></label>
        <div className="emi-shop-categories">{["Tout","Mode","Électronique","Sacs","Chaussures","Maison","Immobilier"].map((cat,i)=><button key={cat} className={i===0&&!search?"selected":""} onClick={()=>{setSearch(i===0?"":cat);document.getElementById("annonces-list")?.scrollIntoView({behavior:"smooth",block:"start"});}}>{cat}</button>)}</div>
        <Link href="/annonces/tontine" style={{position:"relative",display:"flex",alignItems:"flex-end",height:"min(230px, 30svh)",minHeight:"190px",maxHeight:"260px",width:"100%",overflow:"hidden",borderRadius:"22px",margin:"14px 0 0",border:"1px solid rgba(231,205,101,.65)",color:"#fff",textDecoration:"none",background:"#063b2a"}} className="emi-flow-feature" aria-label="Découvrir EMi Djangui Flow">
          <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85" alt="Une communauté réunie" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 42%"}} />
          <span className="emi-flow-feature-shade" style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(2,29,21,.94),rgba(2,29,21,.62) 60%,rgba(2,29,21,.12))"}} />
          <span className="emi-flow-feature-copy" style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"7px",maxWidth:"560px",padding:"18px"}}>
            <span className="emi-flow-feature-kicker">NOUVEAU · SOLIDARITÉ COMMUNAUTAIRE</span>
            <strong>EMi Djangui Flow</strong>
            <span>Réunissez-vous, créez un cercle et avancez ensemble vers un objectif commun.</span>
            <span className="emi-flow-feature-cta">Découvrir les cercles <ArrowUpRight size={16}/></span>
          </span>
        </Link>
        <Link href="/annonces/battle" style={{position:"relative",display:"flex",alignItems:"flex-end",minHeight:210,width:"100%",overflow:"hidden",borderRadius:22,margin:"12px 0 0",border:"1px solid rgba(231,205,101,.8)",color:"#fff",textDecoration:"none",background:"radial-gradient(ellipse at 80% 15%,rgba(247,211,91,.28),transparent 45%),linear-gradient(135deg,#10150f,#032c20 58%,#050505)",boxShadow:"0 10px 32px rgba(0,0,0,.2)"}} aria-label="Découvrir Battle of Commerçants">
          <span aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(110deg,rgba(3,23,17,.97),rgba(3,23,17,.74) 62%,rgba(3,23,17,.28))"}}/>
          <span style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:8,padding:20,maxWidth:620}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:7,borderRadius:999,background:"#f1d45e",color:"#173629",padding:"7px 12px",fontSize:10,fontWeight:900,letterSpacing:".1em"}}>♛ NOUVEAU · EMi LIVE</span>
            <strong style={{fontSize:"clamp(23px,5vw,32px)",lineHeight:1.1}}>Battle of Commerçants</strong>
            <span style={{fontSize:14,lineHeight:1.55,color:"rgba(255,255,255,.9)"}}>Des duels de boutiques, des votes communautaires et les produits en vedette. Qui sera le champion EMi ?</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:5,borderRadius:999,background:"#f1d45e",color:"#143629",padding:"12px 17px",fontSize:13,fontWeight:900}}>Entrer dans l’arène <ArrowUpRight size={17}/></span>
          </span>
        </Link>
        <nav aria-label="Catégories du marché" style={{display:"flex",gap:8,overflowX:"auto",padding:"12px 0 4px"}}>
          {[["Tout","/annonces"],["EMi Market","/annonces"],["EMi Troc","/annonces/troc"],["Djangui Flow","/annonces/tontine"],["Battle of Commerçants","/annonces/battle"],["Elite Hospitality","/annonces/elite-directory"],["EMi Fondation","/annonces/philanthropy"],["EMi Help","/annonces/master-health-check"]].map(([label,href],i)=><Link key={label} href={href} style={{flexShrink:0,border:"1px solid rgba(231,205,101,.55)",borderRadius:999,padding:"10px 14px",background:i===0?"#f1d45e":"rgba(3,44,32,.8)",color:i===0?"#143629":"#f5f3e9",fontWeight:700,fontSize:12,textDecoration:"none"}}>{label}</Link>)}
        </nav>
        <Link href="/annonces/elite-directory" style={{position:"relative",display:"flex",alignItems:"flex-end",minHeight:220,margin:"14px 0 0",overflow:"hidden",border:"1px solid #e6ca59",borderRadius:22,color:"#fff",textDecoration:"none",background:"#063b2a"}}>
          <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85" alt="Restaurant élégant" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
          <span style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(2,25,18,.95),rgba(2,25,18,.65) 62%,rgba(2,25,18,.1))"}}/>
          <span style={{position:"relative",padding:20,maxWidth:620}}><span style={{display:"inline-block",borderRadius:999,background:"#f1d45e",color:"#173629",padding:"7px 12px",fontSize:10,fontWeight:900}}>🏨 ELITE HOSPITALITY</span><strong style={{display:"block",fontSize:"clamp(22px,5vw,32px)",lineHeight:1.12,marginTop:12}}>Séjournez, savourez, vivez l’exception</strong><span style={{display:"block",fontSize:13,lineHeight:1.5,marginTop:8}}>Hôtels, restaurants et services premium près de chez vous.</span><span style={{display:"inline-flex",marginTop:12,borderRadius:999,background:"#f1d45e",color:"#143629",padding:"11px 15px",fontSize:12,fontWeight:800}}>Découvrir les professionnels ↗</span></span>
        </Link>
        <section aria-label="Découvrir tous les espaces EMi" style={{marginTop:"20px",paddingBottom:"18px"}}>
          <div style={{display:"flex",alignItems:"end",justifyContent:"space-between",gap:"12px",marginBottom:"12px"}}>
            <div><p style={{fontSize:"10px",fontWeight:800,letterSpacing:"0.18em",color:"#d9bd53",margin:0}}>LA COMMUNAUTÉ EMi</p><h2 style={{fontSize:"clamp(20px,5vw,26px)",fontWeight:800,lineHeight:1.2,color:"#fff",margin:"5px 0 0"}}>Découvrir tous les espaces</h2></div>
            <span style={{fontSize:"11px",color:"#c6d6ce",whiteSpace:"nowrap"}}>Nos services</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
            {[
              {title:"Battle of Commerçants",desc:"Affrontez d’autres boutiques, mobilisez la communauté et présentez vos produits dans l’arène EMi.",href:"/annonces/battle",kicker:"EMi LIVE · DUELS COMMERCIAUX",cta:"Entrer dans l’arène",image:"https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85",position:"center"},
              {title:"EMi Fondation",desc:"Ensemble, faisons grandir l’espoir. Découvrez les initiatives solidaires et les projets à soutenir.",href:"/annonces/philanthropy",kicker:"SOLIDARITÉ · IMPACT COMMUNAUTAIRE",cta:"Découvrir la Fondation",image:"https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1200&q=85",position:"center 42%"},
              {title:"EMi Troc",desc:"Donnez une seconde vie aux objets et trouvez des échanges utiles dans la communauté.",href:"/annonces/troc",kicker:"ÉCHANGE · ÉCONOMIE CIRCULAIRE",cta:"Explorer les échanges",image:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=85",position:"center"},
              {title:"EMi Help",desc:"Retrouvez les services d’aide disponibles et découvrez comment la communauté peut se soutenir.",href:"/annonces/master-health-check",kicker:"ENTRAIDE · SERVICES COMMUNAUTAIRES",cta:"Découvrir EMi Help",image:"https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=85",position:"center 40%"},
              {title:"Espace vendeur",desc:"Présentez vos produits et gérez vos annonces pour toucher la communauté EMi.",href:"/annonces/espace-vendeur",kicker:"ENTREPRENDRE · VENDRE SUR EMi",cta:"Accéder à l’espace vendeur",image:"https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=85",position:"center"},
              {title:"Elite Hospitality",desc:"Publiez les offres de votre hôtel, restaurant ou service professionnel et soyez visible sur le Marché EMi.",href:"/annonces/elite-directory",kicker:"HÔTELLERIE · RESTAURATION · ACCUEIL",cta:"Découvrir l’espace professionnel",image:"https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",position:"center"},
            ].map((space)=><Link key={space.href} href={space.href} aria-label={space.cta} style={{position:"relative",display:"flex",alignItems:"flex-end",height:"min(230px, 30svh)",minHeight:"190px",maxHeight:"260px",width:"100%",overflow:"hidden",borderRadius:"22px",border:"1px solid rgba(231,205,101,.65)",color:"#fff",textDecoration:"none",background:"#063b2a"}}>
              <img src={space.image} alt="" loading="lazy" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:space.position}} />
              <span aria-hidden="true" style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(2,29,21,.94),rgba(2,29,21,.65) 62%,rgba(2,29,21,.12))"}} />
              <span style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"7px",maxWidth:"560px",padding:"18px"}}>
                <span style={{fontSize:"10px",fontWeight:800,letterSpacing:"0.14em",color:"#f2d86a"}}>{space.kicker}</span>
                <strong style={{fontSize:"clamp(21px,5vw,28px)",lineHeight:1.1}}>{space.title}</strong>
                <span style={{fontSize:"13px",lineHeight:1.5,color:"rgba(255,255,255,.92)"}}>{space.desc}</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:"7px",marginTop:"4px",borderRadius:"999px",background:"#f0d45f",color:"#12392c",padding:"10px 14px",fontSize:"12px",fontWeight:800}}>{space.cta}<ArrowUpRight size={16}/></span>
              </span>
            </Link>)}
          </div>
          <Link href="/annonces" style={{display:"flex",alignItems:"center",justifyContent:"center",marginTop:"10px",padding:"12px",borderRadius:"14px",border:"1px solid rgba(222,199,105,.32)",color:"#e8d47c",fontWeight:700,fontSize:"13px",textDecoration:"none"}}>Voir toutes les annonces du Marché <ArrowUpRight size={15}/></Link>
        </section>
      </section>
      <style jsx>{`
        .emi-flow-feature{position:relative;display:flex;align-items:flex-end;min-height:190px;margin:14px 0 0;overflow:hidden;border:1px solid rgba(231,205,101,.65);border-radius:22px;color:#fff;text-decoration:none;background:#063b2a}
        .emi-flow-feature>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 42%}
        .emi-flow-feature-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,29,21,.94),rgba(2,29,21,.62) 60%,rgba(2,29,21,.12))}
        .emi-flow-feature-copy{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:7px;max-width:560px;padding:18px}
        .emi-flow-feature-kicker{font-size:10px;font-weight:800;letter-spacing:.14em;color:#f2d86a}
        .emi-flow-feature-copy strong{font-size:clamp(21px,5vw,30px);line-height:1.1}
        .emi-flow-feature-copy>span:nth-child(3){max-width:420px;font-size:13px;line-height:1.5;color:rgba(255,255,255,.9)}
        .emi-flow-feature-cta{display:inline-flex;align-items:center;gap:6px;margin-top:4px;border-radius:999px;background:#f0d45f;color:#12392c;padding:9px 13px;font-size:12px;font-weight:800}
        @media(min-width:640px){.emi-flow-feature{min-height:220px;margin-top:18px}.emi-flow-feature-copy{padding:25px}.emi-flow-feature-copy>span:nth-child(3){font-size:14px}}
      `}</style>
      {royalOpen&&<section style={{margin:"12px 0 20px",padding:"16px",border:"1px solid rgba(231,205,101,.7)",borderRadius:"20px",background:"radial-gradient(ellipse at top right,rgba(241,212,94,.13),transparent 45%),linear-gradient(150deg,#0b3528,#03140e)",color:"#f2e7bd",position:"relative",zIndex:6,boxShadow:"0 16px 35px rgba(0,0,0,.3)"}} aria-label="Centre EMi Royal">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div><span style={{fontSize:10,fontWeight:900,letterSpacing:".16em",color:"#f2d86a"}}>EMi ROYAL · ESPACE PREMIUM</span><h2 style={{fontSize:22,fontWeight:850,lineHeight:1.15,margin:"6px 0"}}>Le centre Royal</h2><p style={{fontSize:13,color:"#c5d9ce",lineHeight:1.5}}>Accède aux vitrines professionnelles, à la performance de ta boutique et aux services du marché.</p></div>
          <button type="button" onClick={()=>setRoyalOpen(false)} aria-label="Fermer EMi Royal" style={{flexShrink:0,border:"1px solid rgba(255,255,255,.18)",borderRadius:999,padding:9,color:"#fff"}}><X size={17}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:16}}>
          {[
            {title:"Performance de ma boutique",desc:"Annonces, vues et interactions enregistrées",href:"/annonces/espace-vendeur",icon:"📈"},
            {title:"Classement des vendeurs",desc:"Découvrir les professionnels et leurs profils",href:"/annonces/elite-directory",icon:"🏆"},
            {title:"Boutiques à la une",desc:"Parcourir les profils professionnels publiés",href:"/annonces/elite-directory",icon:"💎"},
            {title:"Vendre sur EMi",desc:"Publier et gérer tes annonces",href:"/annonces/espace-vendeur",icon:"🛍️"},
            {title:"EMi Troc",desc:"Proposer ou consulter des échanges",href:"/annonces/troc",icon:"🔄"},
            {title:"Djangui Flow",desc:"Créer ou rejoindre un cercle",href:"/annonces/tontine",icon:"🤝"},
            {title:"EMi Fondation",desc:"Voir les initiatives solidaires",href:"/annonces/philanthropy",icon:"💚"},
            {title:"EMi Help",desc:"Accéder à l’espace d’assistance",href:"/annonces/master-health-check",icon:"🛟"}
          ].map(item=><Link key={item.title} href={item.href} onClick={()=>setRoyalOpen(false)} style={{minWidth:0,display:"flex",alignItems:"flex-start",gap:9,padding:12,border:"1px solid rgba(231,205,101,.3)",borderRadius:14,background:"rgba(255,255,255,.04)",color:"#fff",textDecoration:"none"}}>
            <span aria-hidden="true" style={{fontSize:22,lineHeight:1.2}}>{item.icon}</span><span style={{minWidth:0,flex:1}}><strong style={{display:"block",fontSize:12,lineHeight:1.35}}>{item.title}</strong><small style={{display:"block",fontSize:10,lineHeight:1.45,color:"#c1d5ca",marginTop:4}}>{item.desc}</small></span><ArrowUpRight size={14} style={{flexShrink:0,color:"#f2d86a"}}/>
          </Link>)}
        </div>
        <div style={{marginTop:12,padding:12,borderRadius:13,border:"1px solid rgba(231,205,101,.22)",background:"rgba(0,0,0,.14)"}}>
          <strong style={{fontSize:12,color:"#f2d86a"}}>Récompenses, promotions et partenariats</strong>
          <p style={{fontSize:11,lineHeight:1.55,color:"#b9cfc3",margin:"5px 0 10px"}}>Ces programmes ne sont pas encore reliés à un système de récompenses ou de promotions. Aucun avantage fictif ne sera affiché.</p>
          <button type="button" onClick={()=>{setRoyalOpen(false);setNotice("EMi Royal : récompenses, promotions et partenariats attendent la mise en place de règles et d’un stockage sécurisé. Les autres raccourcis ouvrent les espaces déjà disponibles.");}} style={{border:"1px solid rgba(231,205,101,.55)",borderRadius:999,padding:"9px 12px",fontSize:11,fontWeight:800,color:"#f2d86a"}}>Voir l’état des services</button>
        </div>
      </section>}
      {spacesOpen&&<section style={{margin:"12px 0 20px",padding:"16px",border:"1px solid rgba(231,205,101,.55)",borderRadius:"20px",background:"linear-gradient(150deg,#0b3528,#071d16)",color:"#f2e7bd",position:"relative",zIndex:5,boxShadow:"0 16px 35px rgba(0,0,0,.24)"}} className="emi-shop-spaces" aria-label="Centre de commandes EMi">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
          <div><span style={{fontSize:10,fontWeight:900,letterSpacing:".16em",color:"#f2d86a"}}>ESPACE DE GESTION</span><h2 style={{fontSize:22,fontWeight:850,lineHeight:1.15,margin:"6px 0"}}>Centre de commandes EMi</h2><p style={{fontSize:13,color:"#c5d9ce",lineHeight:1.5}}>Publie, gère ton activité et retrouve rapidement les espaces de la communauté.</p></div>
          <button type="button" onClick={()=>setSpacesOpen(false)} aria-label="Fermer le menu" style={{flexShrink:0,border:"1px solid rgba(255,255,255,.18)",borderRadius:999,padding:9,color:"#fff"}}><X size={17}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:16}}>
          <button type="button" onClick={()=>{setOpen(true);setSpacesOpen(false);setTimeout(()=>document.querySelector('form')?.scrollIntoView({behavior:"smooth",block:"start"}),80)}} style={{gridColumn:"1 / -1",display:"flex",alignItems:"center",gap:12,textAlign:"left",padding:14,borderRadius:15,background:"#f1d45e",color:"#143629",fontWeight:800}}>
            <span style={{display:"grid",placeItems:"center",width:42,height:42,borderRadius:12,background:"rgba(20,54,41,.12)"}}><Plus size={23}/></span><span><strong style={{display:"block",fontSize:14}}>Publier une annonce</strong><small style={{display:"block",fontSize:11,fontWeight:500,marginTop:3}}>Ajouter un produit et ses photos au marché</small></span><ArrowUpRight size={17} style={{marginLeft:"auto"}}/>
          </button>
          {[
            {title:"Mon espace vendeur",desc:"Mes annonces, vues et interactions",href:"/annonces/espace-vendeur",icon:"🏪"},
            {title:"Mes commandes",desc:"Suivi des commandes non encore activé",action:"orders",icon:"📦"},
            {title:"Messages acheteurs",desc:"Contacter les vendeurs via WhatsApp",action:"messages",icon:"💬"},
            {title:"Mes favoris produits",desc:"Favoris produits non encore disponibles",action:"favorites",icon:"❤️"},
            {title:"Statistiques",desc:"Consulter les métriques disponibles",href:"/annonces/espace-vendeur",icon:"📊"},
            {title:"Mes promotions",desc:"Promotions non encore configurées",action:"promotions",icon:"🏷️"},
            {title:"Paramètres du marché",desc:"Gérer tes annonces et ton profil vendeur",href:"/annonces/espace-vendeur",icon:"⚙️"},
            {title:"Profil professionnel",desc:"Découvrir les profils professionnels",href:"/annonces/elite-directory",icon:"🏨"},
            {title:"Djangui Flow",desc:"Créer ou retrouver un cercle communautaire",href:"/annonces/tontine",icon:"🤝"},
            {title:"EMi Troc",desc:"Proposer un échange ou un don",href:"/annonces/troc",icon:"🔄"},
            {title:"EMi Fondation",desc:"Découvrir les initiatives solidaires",href:"/annonces/philanthropy",icon:"💚"},
            {title:"EMi Help",desc:"Trouver les services d’aide",href:"/annonces/master-health-check",icon:"✚"}
          ].map(item=>item.href?<Link key={item.title} href={item.href} onClick={()=>setSpacesOpen(false)} style={{minWidth:0,display:"flex",alignItems:"flex-start",gap:9,padding:11,border:"1px solid rgba(231,205,101,.24)",borderRadius:14,background:"rgba(255,255,255,.035)",color:"#fff",textDecoration:"none"}}>
            <span aria-hidden="true" style={{fontSize:22,lineHeight:1.2}}>{item.icon}</span><span style={{minWidth:0,flex:1}}><strong style={{display:"block",fontSize:12,lineHeight:1.35}}>{item.title}</strong><small style={{display:"block",fontSize:10,lineHeight:1.45,color:"#c1d5ca",marginTop:4}}>{item.desc}</small></span><ArrowUpRight size={14} style={{flexShrink:0,color:"#f2d86a"}}/>
          </Link>:<button key={item.title} type="button" onClick={()=>{setSpacesOpen(false);setNotice(item.action==="messages"?"Pour contacter un vendeur, ouvre une annonce puis utilise « Contacter sur WhatsApp ». La messagerie acheteurs n’est pas encore reliée au marché.":item.action==="orders"?"Le suivi des commandes n’est pas encore disponible : EMi Market utilise actuellement WhatsApp et ne traite pas les paiements.":item.action==="favorites"?"Les favoris pour les produits du marché ne sont pas encore disponibles. Les favoris actuels concernent les publications sociales.":"Les promotions ne sont pas encore configurées. Aucun code de réduction ne sera annoncé tant que son application réelle n’est pas prête.");}} style={{minWidth:0,display:"flex",alignItems:"flex-start",gap:9,padding:11,border:"1px solid rgba(231,205,101,.24)",borderRadius:14,background:"rgba(255,255,255,.035)",color:"#fff",textAlign:"left"}}>
            <span aria-hidden="true" style={{fontSize:22,lineHeight:1.2}}>{item.icon}</span><span style={{minWidth:0,flex:1}}><strong style={{display:"block",fontSize:12,lineHeight:1.35}}>{item.title}</strong><small style={{display:"block",fontSize:10,lineHeight:1.45,color:"#c1d5ca",marginTop:4}}>{item.desc}</small></span><ArrowUpRight size={14} style={{flexShrink:0,color:"#f2d86a"}}/>
          </button>)}
        </div>
        <p style={{fontSize:10,color:"#9db8aa",lineHeight:1.5,margin:"13px 2px 0"}}>Les raccourcis ouvrent les espaces existants. Les fonctions non encore implémentées affichent leur état réel au lieu de simuler une action.</p>
      </section>}
      {notice&&<div role="status" className="mb-5 rounded-2xl border border-amber-200/20 bg-amber-100/10 p-4 text-sm text-amber-100">{notice}</div>}
      {open&&<form onSubmit={publier} className="mb-8 grid gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-2 sm:p-7">
        <h2 className="sm:col-span-2 text-xl font-semibold">Publier une annonce</h2>
        <label className="grid gap-2 text-sm">Nom de l'article<input required minLength={3} maxLength={120} value={titre} onChange={e=>setTitre(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="Ex. Smartphone en bon état"/></label>
        <label className="grid gap-2 text-sm">Prix (FCFA)<input required type="number" min="0" step="1" value={prix} onChange={e=>setPrix(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="Ex. 75000"/></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Description<textarea maxLength={5000} rows={3} value={description} onChange={e=>setDescription(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="État, détails, lieu…"/></label>
        <label className="grid gap-2 text-sm">WhatsApp du vendeur (indicatif pays inclus)<input required inputMode="tel" value={telephone} onChange={e=>setTelephone(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-200" placeholder="2376XXXXXXXX"/><span className="text-xs text-white/45">Ce numéro sera visible sur l'annonce via le bouton WhatsApp.</span></label>
        <label className="grid cursor-pointer gap-2 text-sm sm:col-span-2">Photos de l'article <span className="flex items-center gap-2 rounded-xl border border-dashed border-amber-200/35 bg-emerald-950/30 px-4 py-4 text-white/75"><ImagePlus size={20}/><span><strong className="block text-sm text-amber-100">Sélectionner plusieurs photos</strong><small className="mt-1 block text-xs text-white/50">Jusqu'à 10 images · sélectionne plusieurs photos dans ta galerie</small></span></span><input type="file" accept="image/*" multiple className="hidden" onChange={e=>setPhotos(Array.from(e.target.files||[]).slice(0,10))}/></label>
        {photos.length>0&&<div className="grid grid-cols-3 gap-2 sm:col-span-2 sm:grid-cols-5">{photos.map((file,i)=><div key={file.name+i} className="relative overflow-hidden rounded-xl border border-amber-200/25 bg-black/20"><img src={URL.createObjectURL(file)} alt={"Photo "+(i+1)} className="h-24 w-full object-cover"/><span className="absolute left-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">{i+1}</span><button type="button" onClick={()=>setPhotos(old=>old.filter((_,j)=>j!==i))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-white" aria-label={"Retirer la photo "+(i+1)}><X size={13}/></button></div>)}</div>}
        <div className="flex gap-3 sm:col-span-2"><button disabled={saving} className="flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 font-semibold text-black disabled:opacity-60">{saving&&<LoaderCircle className="animate-spin" size={17}/>} {saving?"Publication…":"Publier l'annonce"}</button><button type="button" onClick={()=>setOpen(false)} className="rounded-full border border-white/15 px-5 py-3 text-white/70">Annuler</button></div>
      </form>}
      <div id="annonces-list" className="emi-shop-list-heading"><div><p>À DÉCOUVRIR</p><h2>Annonces de la communauté</h2><span style={{display:"block",fontSize:12,color:"#b8cfc3",marginTop:5}}>Chaque carte affiche l’espace d’origine de l’offre.</span></div><span>{annoncesFiltrees.length+communityFiltered.length} offre(s)</span></div>
      {communityFiltered.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:12,margin:"12px 0 18px"}}>
        {[...communityFiltered].sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).map(item=><article key={item.origin+item.id} style={{minWidth:0,overflow:"hidden",border:"1px solid rgba(231,205,101,.65)",borderRadius:16,background:"linear-gradient(160deg,#073b2b,#021e17)",color:"#fff"}}>
          <Link href={item.href} style={{position:"relative",display:"block",height:150,overflow:"hidden",color:"white",textDecoration:"none"}}>
            <img src={item.image} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <span style={{position:"absolute",top:10,left:10,background:item.badgeColor,color:item.badge==="ELITE HOSPITALITY"?"#173629":"white",padding:"7px 10px",borderRadius:999,fontSize:10,fontWeight:900,boxShadow:"0 2px 10px #0005"}}>{item.badge}</span>
          </Link>
          <div style={{padding:12}}>
            <Link href={item.href} style={{fontSize:15,fontWeight:800,lineHeight:1.3,color:"#fff",textDecoration:"none"}}>{item.title}</Link>
            <p style={{fontSize:12,lineHeight:1.5,color:"#d0e2d8",margin:"7px 0"}}>{item.description}</p>
            <p style={{fontSize:11,color:"#b6cfc2",margin:"6px 0 10px"}}>{item.meta}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              <Link href={item.href} style={{display:"inline-flex",alignItems:"center",border:"1px solid rgba(231,205,101,.7)",borderRadius:999,padding:"9px 12px",fontSize:11,fontWeight:800,color:"#f3d86a",textDecoration:"none"}}>Voir le profil / l’espace ↗</Link>
              {item.origin==="hospitality"&&item.phone&&<a href={genererLienWhatsApp(item.title,0,item.id,item.phone)} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,borderRadius:999,padding:"9px 12px",fontSize:11,fontWeight:800,color:"#052e1e",background:"#25D366",textDecoration:"none"}}><MessageCircle size={14}/> WhatsApp</a>}
            </div>
          </div>
        </article>)}
      </div>}
      {loading?<div className="flex items-center gap-3 py-12 text-white/60"><LoaderCircle className="animate-spin"/> Chargement des annonces…</div>:annoncesFiltrees.length===0?<div className="rounded-3xl border border-dashed border-white/15 bg-white/[.02] px-5 py-10 text-center sm:px-10"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/[.07]"><ShoppingBag className="text-amber-200" size={27}/></div><h3 className="text-lg font-semibold">{search ? "Aucun résultat pour cette recherche" : "Les premières offres arrivent bientôt"}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">{search ? "Essaie un autre mot-clé." : "Aucune annonce n’est encore publiée. Tu peux lancer le marché en partageant la première offre."}</p><button onClick={()=>setOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-200 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-100"><Plus size={16}/> Publier la première annonce</button></div>:<div className="emi-shop-products">{annoncesFiltrees.map(a=><article key={a.id} className="emi-shop-product">
        {a.image_urls?.length>0?<Link href={"/annonce/"+a.id} className="emi-shop-product-gallery">{a.image_urls.slice(0,4).map((url,i)=><img key={url+i} src={url} alt={a.titre+" — photo "+(i+1)} className="emi-shop-product-image" loading="lazy"/>)}{a.image_urls.length>1&&<span className="emi-shop-photo-count">▧ {a.image_urls.length}</span>}</Link>:<div className="flex h-40 items-center justify-center bg-white/[.04]"><ShoppingBag size={36} className="text-white/20"/></div>}
        <div className="emi-shop-product-copy"><span style={{display:"inline-flex",marginBottom:8,borderRadius:999,background:"#f1d45e",color:"#173629",padding:"5px 9px",fontSize:10,fontWeight:900}}>🛍️ EMi MARKET</span><Link href={"/annonce/"+a.id} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-amber-200 sm:text-base">{a.titre}</Link><p className="emi-shop-price">{new Intl.NumberFormat("fr-FR").format(Number(a.prix))} FCFA</p><p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-white/60 sm:mt-3 sm:line-clamp-3 sm:text-sm">{a.description||"Contacte le vendeur pour plus d'informations."}</p>
          <div className="mt-3 flex flex-col gap-2 sm:mt-5 sm:flex-row"><a href={genererLienWhatsApp(a.titre,Number(a.prix),a.id,a.numero_whatsapp)} onClick={()=>{ if(supabase) void supabase.from("annonce_events").insert({annonce_id:a.id,event_type:"whatsapp_click"}); }} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-2 py-2.5 text-xs font-semibold text-black sm:flex-1 sm:gap-2 sm:px-3 sm:py-3 sm:text-sm"><MessageCircle size={17}/> Contacter sur WhatsApp</a><Link href={"/annonce/"+a.id} className="rounded-full border border-white/15 px-3 py-2.5 text-center text-xs sm:px-4 sm:py-3 sm:text-sm">Voir</Link></div>
        </div></article>)}</div>}
      <p className="mt-10 text-center text-xs text-white/35">Prudence : vérifie l'article et le vendeur avant tout paiement. EMi ne traite pas le paiement.</p>
    </section>
  </main>;
}
