"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, BriefcaseBusiness, Phone, MapPin, UserRound, Save, LoaderCircle, Trash2, ExternalLink } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Profile = { id?: string; user_id?: string; nom: string; specialite: string; telephone: string; ville: string; bio: string; image_url?: string | null; created_at?: string };
const supabase = createSupabaseBrowserClient();

export default function EliteDirectoryPage() {
  const [userId, setUserId] = useState("");
  const [nom, setNom] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("Yaoundé");
  const [bio, setBio] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const filteredProfiles = profiles.filter(p => `${p.nom} ${p.specialite} ${p.ville} ${p.bio}`.toLocaleLowerCase("fr").includes(searchTerm.trim().toLocaleLowerCase("fr")));

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setNotice("Supabase n’est pas configuré. Le profil ne peut pas être enregistré."); setLoading(false); return; }
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!alive) return;
        const uid = auth.user?.id || "";
        setUserId(uid);
        if (uid) {
          const { data, error } = await supabase.from("elite_directory_profiles").select("id,user_id,nom,specialite,telephone,ville,bio,image_url,created_at").eq("user_id", uid).maybeSingle();
          if (error && error.code !== "42P01") setNotice("Lecture du profil impossible : " + error.message);
          if (data) { setNom(data.nom || ""); setSpecialite(data.specialite || ""); setTelephone(data.telephone || ""); setVille(data.ville || "Yaoundé"); setBio(data.bio || ""); setImageUrl(data.image_url || ""); }
        }
        const { data: list, error: listError } = await supabase.from("elite_directory_profiles").select("id,user_id,nom,specialite,telephone,ville,bio,created_at").eq("published", true).order("created_at", { ascending: false }).limit(40);
        if (!listError && alive) setProfiles((list || []) as Profile[]);
      } catch { if (alive) setNotice("Impossible de charger l’annuaire pour le moment."); }
      finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setNotice("");
    if (!supabase) { setNotice("Supabase n’est pas configuré."); return; }
    if (!userId) { setNotice("Connecte-toi à EMi pour créer ou modifier ton profil professionnel."); return; }
    if (nom.trim().length < 2 || specialite.trim().length < 2) { setNotice("Renseigne ton nom et ta spécialité."); return; }
    const digits = telephone.replace(/[^0-9+]/g, "");
    if (digits.replace(/\D/g, "").length < 8 || digits.replace(/\D/g, "").length > 15) { setNotice("Vérifie le numéro de téléphone / WhatsApp avec indicatif pays."); return; }
    setSaving(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) throw new Error("Choisis une image JPG, PNG ou WebP.");
        if (imageFile.size > 5 * 1024 * 1024) throw new Error("La photo doit faire 5 Mo maximum.");
        const extension = imageFile.type === "image/png" ? "png" : imageFile.type === "image/webp" ? "webp" : "jpg";
        const path = userId + "/" + Date.now() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("elite-hospitality-photos").upload(path, imageFile, { upsert: true, contentType: imageFile.type });
        if (uploadError) throw new Error("Envoi de la photo impossible : " + uploadError.message);
        const { data: publicUrl } = supabase.storage.from("elite-hospitality-photos").getPublicUrl(path);
        finalImageUrl = publicUrl.publicUrl;
        setImageUrl(finalImageUrl);
        setImageFile(null);
      }
      const payload = { user_id: userId, nom: nom.trim(), specialite: specialite.trim(), telephone: digits, ville: ville.trim(), bio: bio.trim(), image_url: finalImageUrl || null, published: true };
      const { data: existing, error: findError } = await supabase.from("elite_directory_profiles").select("id").eq("user_id", userId).maybeSingle();
      if (findError) throw new Error("La table de l’annuaire n’est peut-être pas configurée : " + findError.message);
      const result = existing?.id
        ? await supabase.from("elite_directory_profiles").update(payload).eq("user_id", userId)
        : await supabase.from("elite_directory_profiles").insert(payload);
      if (result.error) throw new Error(result.error.message);
      setNotice("Profil enregistré. Il sera visible dans l’annuaire si les règles d’accès Supabase autorisent sa publication.");
      const { data: list } = await supabase.from("elite_directory_profiles").select("id,user_id,nom,specialite,telephone,ville,bio,created_at").eq("published", true).order("created_at", { ascending: false }).limit(40);
      setProfiles((list || []) as Profile[]);
    } catch (err) { setNotice(err instanceof Error ? "Enregistrement impossible : " + err.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  async function deleteProfile() {
    if (!supabase || !userId) { setNotice("Connecte-toi au compte qui possède ce profil."); return; }
    if (!window.confirm("Supprimer ton profil professionnel public ? Cette action ne supprime pas ton compte EMi.")) return;
    setDeleting(true); setNotice("");
    try {
      const { error } = await supabase.from("elite_directory_profiles").delete().eq("user_id", userId);
      if (error) throw new Error(error.message);
      setNom(""); setSpecialite(""); setTelephone(""); setVille("Yaoundé"); setBio(""); setImageUrl(""); setImageFile(null);
      setProfiles(current => current.filter(profile => profile.user_id !== userId));
      setNotice("Ton profil professionnel a été supprimé. Ton compte EMi personnel reste intact.");
    } catch (error) { setNotice(error instanceof Error ? "Suppression impossible : " + error.message : "Suppression impossible."); }
    finally { setDeleting(false); }
  }

  return <main className="emi-hospitality" style={{minHeight:"100vh",background:"#042e22",color:"#f8fafc",padding:"16px 12px 36px",fontFamily:"Arial,sans-serif"}}>
  <style>{`
    .emi-hospitality *{box-sizing:border-box}.eh-wrap{max-width:1000px;margin:auto}.eh-back{display:inline-flex;gap:8px;align-items:center;color:#e8d47c;text-decoration:none;margin:2px 0 14px;font-size:13px}.eh-top{display:flex;align-items:center;gap:12px;justify-content:space-between}.eh-brand{display:flex;align-items:center;gap:10px;min-width:0}.eh-logo{height:48px;width:48px;border:2px solid #e9ce62;color:#f4d76a;border-radius:50%;display:grid;place-items:center;font-family:Georgia,serif;font-weight:bold;font-size:20px;flex-shrink:0}.eh-title{font-weight:800;font-size:clamp(16px,4vw,24px);line-height:1.15}.eh-sub{font-size:12px;color:#c3d6cd;margin-top:4px}.eh-publish{border:0;border-radius:999px;background:#f1d45e;color:#102d22;font-weight:800;padding:12px 14px;white-space:nowrap}.eh-search{display:flex;gap:10px;align-items:center;background:#fff;color:#52645b;border:3px solid #e6ce66;border-radius:18px;padding:11px 14px;margin:18px 0 12px}.eh-search input{width:100%;min-width:0;border:0;outline:0;color:#12392c;font-size:14px}.eh-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px}.eh-chips span{white-space:nowrap;border:1px solid #a2b9a9;border-radius:999px;padding:9px 14px;font-size:12px}.eh-chips span:first-child{background:#f1d45e;color:#163a2b;border-color:#f1d45e}.eh-hero{position:relative;overflow:hidden;border:1px solid #d9c45e;border-radius:20px;min-height:220px;display:flex;align-items:flex-end;margin-top:8px;background:#163d2c}.eh-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.eh-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(1,28,19,.96),rgba(1,28,19,.64) 62%,rgba(1,28,19,.12))}.eh-hero-copy{position:relative;padding:20px;max-width:620px}.eh-kicker{font-size:10px;letter-spacing:.15em;color:#f1d45e;font-weight:800}.eh-hero h2{font-size:clamp(22px,5vw,34px);font-weight:800;line-height:1.1;margin:8px 0}.eh-hero p{font-size:13px;line-height:1.5;color:#eef6f0}.eh-cta{display:inline-block;margin-top:10px;border-radius:999px;padding:11px 16px;background:#f1d45e;color:#143629;font-weight:800;font-size:13px}.eh-section{margin-top:22px}.eh-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:11px}.eh-section h3{font-size:19px;font-weight:800;margin:0}.eh-categories{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.eh-cat{background:#f8faf8;color:#12392c;border-radius:12px;overflow:hidden;border:1px solid #d8c568;min-width:0}.eh-cat img{width:100%;height:82px;object-fit:cover;display:block}.eh-cat strong{display:block;padding:9px 8px 3px;font-size:12px}.eh-cat small{display:block;padding:0 8px 10px;font-size:10px;color:#4e6a5e}.eh-form{margin-top:22px;padding:16px;border:1px solid rgba(234,208,93,.45);border-radius:20px;background:#073a2b}.eh-form h3{margin:0 0 14px;color:#f1d45e;font-size:19px;font-weight:800}.eh-fields{display:grid;grid-template-columns:1fr;gap:12px}.eh-fields label{display:flex;flex-direction:column;gap:7px;min-width:0;font-size:13px;color:#e9f2ed}.eh-fields input,.eh-fields textarea,.eh-fields select{display:block;width:100%;min-width:0;border:1px solid #55786a;background:#06291f;color:white;border-radius:11px;padding:12px;font-size:14px;outline:none}.eh-fields input:focus,.eh-fields textarea:focus{border-color:#f1d45e}.eh-delete{border:1px solid #ef6b6b;border-radius:12px;padding:12px;background:transparent;color:#ff9696;font-weight:800;width:100%}.eh-save{border:0;border-radius:12px;padding:13px;background:#f1d45e;color:#143629;font-weight:800;width:100%}.eh-listing{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;border:1px solid rgba(231,205,101,.65);border-radius:16px;padding:10px;margin-top:10px;background:#073728}.eh-listing img{width:96px;height:100px;object-fit:cover;border-radius:10px}.eh-badge{display:inline-block;border:1px solid #e9ce62;border-radius:999px;padding:5px 8px;color:#f3d96a;font-size:10px;margin-bottom:6px}.eh-listing h4{font-size:14px;font-weight:800;margin:0 0 5px}.eh-listing p{font-size:12px;color:#d1e1d7;line-height:1.45;margin:4px 0}.eh-contact{display:inline-block;margin-top:6px;border:1px solid #e9ce62;border-radius:999px;padding:7px 10px;color:#f3d96a;text-decoration:none;font-size:11px;font-weight:700}.eh-notice{margin-top:12px;border:1px solid #587c6b;border-radius:12px;padding:12px;font-size:13px;color:#f9e9a5;overflow-wrap:anywhere}.eh-empty{padding:24px 10px;color:#c4d8cd;font-size:13px;line-height:1.5}
    @media(min-width:620px){.eh-categories{grid-template-columns:repeat(6,minmax(0,1fr))}.eh-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.eh-full{grid-column:1/-1}.eh-listing{grid-template-columns:180px minmax(0,1fr);padding:12px}.eh-listing img{width:180px;height:135px}.eh-hero{min-height:260px}.eh-form{padding:22px}}
  `}</style>
  <div className="eh-wrap">
    <Link href="/annonces" className="eh-back"><ArrowLeft size={18}/> Retour au marché EMi</Link>
    <header className="eh-top"><div className="eh-brand"><div className="eh-logo">EM</div><div><div className="eh-title">Elite Hospitality</div><div className="eh-sub">Hôtellerie · Restauration · Accueil · Services premium</div></div></div><button className="eh-publish" onClick={()=>document.getElementById("eh-profile-form")?.scrollIntoView({behavior:"smooth"})}>＋ Publier</button></header>
    <label className="eh-search"><span>⌕</span><input aria-label="Rechercher un professionnel" placeholder="Rechercher un professionnel, un établissement…" onChange={e=>setSearchTerm(e.target.value)}/><span>⌕</span></label>
    <div className="eh-chips"><span>Tous</span><span>Hôtels</span><span>Restaurants</span><span>Chefs</span><span>Serveurs</span><span>Hôtesses</span><span>Barmans</span><span>Autres</span></div>
    <section className="eh-hero"><img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85" alt="Restaurant élégant"/><div className="eh-shade"/><div className="eh-hero-copy"><div className="eh-kicker">ELITE HOSPITALITY DIRECTORY</div><h2>L’excellence au service de vos séjours et de vos repas</h2><p>Trouvez des professionnels de l’hôtellerie, de la restauration et de l’accueil près de chez vous.</p><a className="eh-cta" href="#eh-list">Découvrir les professionnels　↗</a></div></section>
    <section className="eh-section"><div className="eh-section-head"><h3>Nos professionnels VIP</h3><span style={{fontSize:12,color:"#c5d7cd"}}>Explorer par métier</span></div><div className="eh-categories">
      {[
        ["Hôtels","Séjours d’exception","https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"],
        ["Restaurants","Saveurs locales","https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80"],
        ["Chefs","Créations culinaires","https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=400&q=80"],
        ["Serveurs","Service élégant","https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80"],
        ["Hôtesses","Accueil & relation client","https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80"],
        ["Barmans","Cocktails & ambiance","https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80"]
      ].map(([title,desc,img])=><article className="eh-cat" key={title}><img src={img} alt=""/><strong>{title}</strong><small>{desc}</small></article>)}
    </div></section>
    <section className="eh-form" id="eh-profile-form"><h3>＋ Créer / mettre à jour mon profil professionnel</h3>
      {!userId&&!loading&&<p className="eh-notice">Connecte-toi à EMi pour enregistrer ton profil.</p>}
      <form onSubmit={saveProfile} className="eh-fields">
        <label>Nom professionnel<input required minLength={2} maxLength={100} value={nom} onChange={e=>setNom(e.target.value)} placeholder="Nom de l’hôtel, restaurant ou professionnel"/></label>
        <label>Métier / spécialité<input required minLength={2} maxLength={120} value={specialite} onChange={e=>setSpecialite(e.target.value)} placeholder="Hôtel, restaurateur, chef…"/></label>
        <label>Téléphone / WhatsApp<input required inputMode="tel" maxLength={24} value={telephone} onChange={e=>setTelephone(e.target.value)} placeholder="+237 6XX XXX XXX"/></label>
        <label>Ville / quartier<input maxLength={100} value={ville} onChange={e=>setVille(e.target.value)} placeholder="Douala, Yaoundé, Bastos…"/></label>
        <label className="eh-full">Photo de profil professionnelle<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImageFile(e.target.files?.[0] || null)} /></label>
        {(imageFile || imageUrl) && <div className="eh-full" style={{display:"flex",alignItems:"center",gap:12}}><img src={imageFile ? URL.createObjectURL(imageFile) : imageUrl} alt="Aperçu de la photo professionnelle" style={{width:88,height:88,objectFit:"cover",borderRadius:16,border:"2px solid #e9ce62"}}/><span style={{fontSize:12,color:"#c5d7cd"}}>{imageFile ? imageFile.name : "Photo actuelle"}</span></div>}
        <label className="eh-full">Présentation / offre<textarea rows={3} maxLength={1500} value={bio} onChange={e=>setBio(e.target.value)} placeholder="Services, menu, chambres, tarifs, disponibilités…"/></label>
        <button disabled={saving||loading} className="eh-save eh-full">{saving?"Enregistrement…":"Enregistrer mes informations professionnelles"}</button>{userId&&<div className="eh-full" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><a href={"/annonces/elite-directory?profil="+encodeURIComponent(userId)} className="eh-contact" style={{textAlign:"center",padding:12}}>Aperçu du profil <ExternalLink size={13} style={{display:"inline",verticalAlign:"middle"}}/></a><button type="button" disabled={deleting} onClick={()=>void deleteProfile()} className="eh-delete">{deleting?"Suppression…":"Supprimer mon profil"}</button></div>}
      </form>
      {notice&&<p role="status" className="eh-notice">{notice}</p>}
    </section>
    <section className="eh-section" id="eh-list"><div className="eh-section-head"><h3>Publications des professionnels</h3><span style={{fontSize:12,color:"#c5d7cd"}}>{filteredProfiles.length} offre(s)</span></div>
      {loading?<p className="eh-empty">Chargement des professionnels…</p>:filteredProfiles.length===0?<p className="eh-empty">Aucune offre professionnelle publiée pour le moment. Les annonces apparaîtront ici après publication par leurs propriétaires.</p>:filteredProfiles.map((p,i)=><article key={p.id||p.user_id||i} className="eh-listing"><img src={p.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80"} alt={"Photo de "+p.nom}/><div><span className="eh-badge">{p.specialite}</span><h4>{p.nom}</h4><p>{p.specialite} · {p.ville||"Cameroun"}</p><p>{p.bio}</p><span className="eh-badge">EMi PRO · Profil professionnel</span><br/><a className="eh-contact" href={"https://wa.me/"+(p.telephone||"").replace(/\D/g,"")+"?text="+encodeURIComponent("Bonjour "+p.nom+", je vous contacte depuis EMi au sujet de votre activité.")} target="_blank" rel="noopener noreferrer">Contacter sur WhatsApp</a></div></article>)}
    </section>
    <p style={{marginTop:20,fontSize:11,color:"#9bb8a8",lineHeight:1.5}}>Les coordonnées professionnelles sont visibles uniquement lorsque le profil est publié. Publie seulement des informations que tu acceptes de partager.</p>
  </div></main>;
}