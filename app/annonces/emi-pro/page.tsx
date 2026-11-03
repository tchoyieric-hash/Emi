"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft, BadgeCheck, BarChart3, Camera, Check, ChevronRight, Eye, EyeOff,
  ImagePlus, Images, Instagram, Mail, MapPin, MessageCircle, Pencil, Phone,
  Plus, Settings2, ShieldCheck, ShoppingBag, Trash2, UploadCloud, UserRound,
  Video, X
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Profile = {
  id: string; user_id: string; nom: string; specialite: string; telephone: string;
  ville: string; bio: string; image_url: string | null; cover_url: string | null;
  email: string | null; website: string | null; visibility: "public" | "hidden";
  published: boolean;
};
type Media = { id: string; profile_id: string; user_id: string; storage_path: string; public_url: string; media_type: "image" | "video"; album: string; created_at: string };
const supabase = createSupabaseBrowserClient();
const BUCKET = "emi-pro-media";

export default function EmiProPage() {
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"overview" | "gallery" | "settings">("overview");
  const [album, setAlbum] = useState("Général");
  const [form, setForm] = useState({ nom: "", specialite: "", telephone: "", ville: "Yaoundé", bio: "", email: "", website: "", visibility: "public" as "public" | "hidden" });
  const galleryInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async (uid: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("elite_directory_profiles")
      .select("id,user_id,nom,specialite,telephone,ville,bio,image_url,cover_url,email,website,visibility,published")
      .eq("user_id", uid).maybeSingle();
    if (error) throw error;
    if (data) {
      const p = data as Profile;
      setProfile(p);
      setForm({ nom: p.nom || "", specialite: p.specialite || "", telephone: p.telephone || "", ville: p.ville || "Yaoundé", bio: p.bio || "", email: p.email || "", website: p.website || "", visibility: p.visibility || "public" });
      const { data: rows, error: mediaError } = await supabase.from("elite_directory_media")
        .select("id,profile_id,user_id,storage_path,public_url,media_type,album,created_at")
        .eq("profile_id", p.id).order("created_at", { ascending: false });
      if (mediaError) throw mediaError;
      setMedia((rows || []) as Media[]);
    } else {
      setProfile(null);
      setMedia([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!supabase) throw new Error("Supabase n’est pas configuré.");
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        const uid = data.user?.id || "";
        if (!active) return;
        setUserId(uid);
        if (!uid) setNotice("Connecte-toi à ton compte EMi pour créer et gérer ta vitrine.");
        else await refresh(uid);
      } catch (e) {
        if (active) setNotice(e instanceof Error ? e.message : "Chargement impossible.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [refresh]);

  const updateField = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }));
  const stats = useMemo(() => ({ photos: media.filter(m => m.media_type === "image").length, videos: media.filter(m => m.media_type === "video").length }), [media]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setNotice("");
    if (!supabase || !userId) { setNotice("Connecte-toi à EMi avant d’enregistrer."); return; }
    if (form.nom.trim().length < 2 || form.specialite.trim().length < 2) { setNotice("Ajoute le nom de l’entreprise et son activité."); return; }
    setSaving(true);
    try {
      const payload = { user_id: userId, nom: form.nom.trim(), specialite: form.specialite.trim(), telephone: form.telephone.trim(), ville: form.ville.trim(), bio: form.bio.trim(), email: form.email.trim() || null, website: form.website.trim() || null, visibility: form.visibility, published: true };
      const result = profile
        ? await supabase.from("elite_directory_profiles").update(payload).eq("id", profile.id).eq("user_id", userId).select("id").single()
        : await supabase.from("elite_directory_profiles").insert(payload).select("id").single();
      if (result.error) throw result.error;
      await refresh(userId);
      setNotice("Ta vitrine EMi PRO a été enregistrée.");
      setTab("overview");
    } catch (e) { setNotice("Enregistrement impossible : " + (e instanceof Error ? e.message : "erreur inconnue")); }
    finally { setSaving(false); }
  }

  async function uploadMedia(files: FileList | null, kind: "gallery" | "avatar" | "cover") {
    if (!supabase || !userId || !files?.length) return;
    setNotice("");
    if (kind === "gallery" && !profile) { setNotice("Enregistre d’abord les informations de ta vitrine."); return; }
    const chosen = Array.from(files);
    if (kind === "gallery" && chosen.length > 20) { setNotice("Tu peux ajouter au maximum 20 médias à la fois."); return; }
    if (chosen.some(f => !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(f.type))) { setNotice("Formats acceptés : JPG, PNG, WebP, MP4 et WebM."); return; }
    if (chosen.some(f => f.size > 10 * 1024 * 1024)) { setNotice("Chaque fichier doit peser 10 Mo maximum."); return; }
    setUploading(true);
    try {
      for (const file of chosen) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = userId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: url } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (kind === "avatar" || kind === "cover") {
          if (!profile) throw new Error("Enregistre d’abord les informations de ta vitrine.");
          const column = kind === "avatar" ? "image_url" : "cover_url";
          const { error } = await supabase.from("elite_directory_profiles").update({ [column]: url.publicUrl }).eq("id", profile.id).eq("user_id", userId);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("elite_directory_media").insert({ profile_id: profile!.id, user_id: userId, storage_path: path, public_url: url.publicUrl, media_type: file.type.startsWith("video/") ? "video" : "image", album });
          if (error) throw error;
        }
      }
      await refresh(userId);
      setNotice(chosen.length === 1 ? "Média ajouté à ta vitrine." : chosen.length + " médias ajoutés à ta vitrine.");
    } catch (e) { setNotice("Envoi impossible : " + (e instanceof Error ? e.message : "erreur inconnue")); }
    finally {
      setUploading(false);
      if (galleryInput.current) galleryInput.current.value = "";
      if (avatarInput.current) avatarInput.current.value = "";
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  async function removeMedia(item: Media) {
    if (!supabase || !window.confirm("Retirer ce média de ta galerie ?")) return;
    try {
      const { error } = await supabase.from("elite_directory_media").delete().eq("id", item.id).eq("user_id", userId);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([item.storage_path]);
      await refresh(userId);
      setNotice("Média retiré.");
    } catch (e) { setNotice("Suppression du média impossible : " + (e instanceof Error ? e.message : "erreur inconnue")); }
  }

  async function deleteShowcase() {
    if (!supabase || !profile || !userId) return;
    const confirmed = window.confirm("Supprimer définitivement cette vitrine professionnelle ? Ton compte EMi personnel et tes commandes/historiques conservés ailleurs ne seront pas supprimés. Cette action est irréversible.");
    if (!confirmed) return;
    setDeleting(true); setNotice("");
    try {
      const paths = media.map(m => m.storage_path);
      if (paths.length) {
        const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
        if (storageError) throw new Error("Nettoyage des photos impossible : " + storageError.message);
      }
      const { data, error } = await supabase.from("elite_directory_profiles").delete()
        .eq("id", profile.id).eq("user_id", userId).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("La base n’a confirmé aucune suppression. Vérifie la session propriétaire et les règles RLS.");
      setProfile(null); setMedia([]);
      setForm({ nom: "", specialite: "", telephone: "", ville: "Yaoundé", bio: "", email: "", website: "", visibility: "public" });
      setNotice("Vitrine supprimée. Ton compte personnel EMi reste actif.");
      setTab("settings");
    } catch (e) { setNotice("Suppression impossible : " + (e instanceof Error ? e.message : "erreur inconnue")); }
    finally { setDeleting(false); }
  }

  return <main className="ep-root">
    <style>{`
      .ep-root{min-height:100vh;background:radial-gradient(ellipse at 50% -10%,#14563d 0,#062e22 48%,#031b15 100%);color:#f7f8f2;padding:16px 14px 42px;font-family:Arial,sans-serif}
      .ep-root *{box-sizing:border-box}.ep-wrap{max-width:1080px;margin:auto}.ep-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}.ep-back{display:flex;align-items:center;gap:8px;color:#e8d36d;text-decoration:none;font-size:13px}.ep-brand{display:flex;align-items:center;gap:10px}.ep-mark{width:42px;height:42px;border:1px solid #e7cd62;border-radius:14px;display:grid;place-items:center;color:#f5d65e;font-weight:900;font-size:17px;box-shadow:0 0 18px #d4b74a22}.ep-brand b{font-size:18px}.ep-brand small{display:block;color:#b7cfc2;font-size:11px;margin-top:3px}.ep-tabs{display:flex;gap:8px;margin:16px 0;overflow:auto}.ep-tab{border:1px solid #718d78;background:#082d22;color:#dce8df;border-radius:999px;padding:10px 15px;white-space:nowrap;font-weight:700}.ep-tab[aria-selected=true]{background:#f1d35d;color:#153525;border-color:#f1d35d}.ep-panel{background:linear-gradient(145deg,#0c3b2c,#06291f);border:1px solid #9b914c;border-radius:22px;overflow:hidden;box-shadow:0 18px 45px #0003}.ep-cover{height:220px;position:relative;background:linear-gradient(120deg,#174e36,#081f18);background-size:cover;background-position:center}.ep-cover:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#031d16 0%,transparent 80%)}.ep-cover-tools{position:absolute;z-index:1;right:14px;top:14px}.ep-pill{border:1px solid #e7cc62;background:#082d22e8;color:#f3d66a;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:700}.ep-profile{position:relative;padding:0 18px 20px}.ep-avatar{width:104px;height:104px;border:3px solid #f0d15b;border-radius:50%;object-fit:cover;background:#0a3b2a;margin-top:-54px;position:relative;z-index:2}.ep-edit-avatar{position:absolute;left:94px;top:12px;border-radius:50%;width:34px;height:34px;border:1px solid #f0d15b;background:#f0d15b;color:#153525;display:grid;place-items:center}.ep-name{font-size:25px;font-weight:900;margin:10px 0 4px}.ep-muted{color:#c3d5ca;font-size:13px;line-height:1.55}.ep-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.ep-primary{background:linear-gradient(100deg,#f7df78,#d6ac35);border:0;color:#173526;border-radius:999px;padding:12px 17px;font-weight:900}.ep-secondary{background:#0b3a2b;border:1px solid #c8b455;color:#f3d66a;border-radius:999px;padding:11px 15px;font-weight:800}.ep-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:18px}.ep-stat{border:1px solid #456a51;border-radius:14px;padding:12px;background:#06251c}.ep-stat strong{display:block;font-size:18px;color:#f3d66a}.ep-stat small{font-size:11px;color:#b9d0c2}.ep-section{margin-top:20px}.ep-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.ep-section h2{font-size:19px;margin:0}.ep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ep-media{position:relative;aspect-ratio:1/1;border:1px solid #6d8752;border-radius:14px;overflow:hidden;background:#0a3527}.ep-media img,.ep-media video{width:100%;height:100%;object-fit:cover}.ep-media button{position:absolute;right:7px;top:7px;background:#071f19dd;border:1px solid #edce5e;color:#ffb2a9;border-radius:50%;width:32px;height:32px;display:grid;place-items:center}.ep-empty{border:1px dashed #7b9163;border-radius:16px;padding:25px;text-align:center;color:#c1d3c7;font-size:13px}.ep-card{border:1px solid #466c53;border-radius:16px;padding:15px;background:#082c21;margin-top:10px}.ep-row{display:flex;align-items:center;gap:12px}.ep-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:13px;background:#164735;color:#f1d35d;flex:none}.ep-row strong{display:block;font-size:14px}.ep-row small{display:block;color:#b7cfc2;font-size:11px;margin-top:4px}.ep-row .ep-chevron{margin-left:auto;color:#e7cc62}.ep-form{display:grid;grid-template-columns:1fr;gap:12px}.ep-form label{display:flex;flex-direction:column;gap:7px;color:#dce8df;font-size:12px;font-weight:700}.ep-form input,.ep-form textarea,.ep-form select{width:100%;border:1px solid #587966;border-radius:12px;background:#041f18;color:white;padding:13px;font-size:14px;outline:none}.ep-form textarea{min-height:105px;resize:vertical}.ep-form input:focus,.ep-form textarea:focus,.ep-form select:focus{border-color:#f1d35d}.ep-notice{margin:14px 0;border:1px solid #8e8750;border-radius:13px;padding:13px;color:#f7e9a9;font-size:13px;line-height:1.5;overflow-wrap:anywhere}.ep-danger{border:1px solid #a65353;background:#321d1b;color:#ffaaaa;border-radius:14px;padding:14px;width:100%;font-weight:800;text-align:left}.ep-danger small{display:block;font-weight:400;margin-top:5px;color:#e5b7b0}.ep-upload{display:flex;align-items:center;justify-content:center;gap:9px;border:1px dashed #e3c95d;border-radius:15px;padding:16px;color:#f4d76a;background:#092d21;font-weight:800;width:100%}.ep-count{color:#b8cfc1;font-size:12px}.ep-footer{color:#91ad9e;font-size:11px;text-align:center;margin-top:28px}
      @media(min-width:680px){.ep-root{padding:24px}.ep-cover{height:300px}.ep-profile{padding:0 26px 24px}.ep-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.ep-form{grid-template-columns:repeat(2,minmax(0,1fr))}.ep-full{grid-column:1/-1}.ep-avatar{width:124px;height:124px}.ep-edit-avatar{left:112px;top:18px}}
    `}</style>
    <div className="ep-wrap">
      <header className="ep-top">
        <Link href="/annonces" className="ep-back"><ArrowLeft size={18}/> Marché EMi</Link>
        <div className="ep-brand"><div className="ep-mark">EMi</div><div><b>EMi PRO</b><small>Vitrine professionnelle nouvelle génération</small></div></div>
      </header>
      <nav className="ep-tabs" aria-label="Navigation EMi PRO">
        <button className="ep-tab" aria-selected={tab === "overview"} onClick={() => setTab("overview")}>Ma vitrine</button>
        <button className="ep-tab" aria-selected={tab === "gallery"} onClick={() => setTab("gallery")}>Galerie & albums</button>
        <button className="ep-tab" aria-selected={tab === "settings"} onClick={() => setTab("settings")}>Réglages</button>
      </nav>
      {notice && <div className="ep-notice" role="status">{notice}</div>}
      {loading ? <div className="ep-empty">Chargement de ta vitrine EMi PRO…</div> : !userId ? <div className="ep-empty">Connecte-toi à EMi pour gérer ta vitrine professionnelle.</div> : (
        <>
          {tab === "overview" && <>
            <section className="ep-panel">
              <div className="ep-cover" style={profile?.cover_url ? {backgroundImage:`url("${profile.cover_url}")`} : undefined}>
                <div className="ep-cover-tools"><button className="ep-pill" onClick={() => coverInput.current?.click()}><Camera size={14} style={{display:"inline",verticalAlign:"middle"}}/> Modifier la couverture</button></div>
              </div>
              <div className="ep-profile">
                <img className="ep-avatar" src={profile?.image_url || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80"} alt="Photo du profil professionnel"/>
                <button className="ep-edit-avatar" aria-label="Modifier la photo de profil" onClick={() => avatarInput.current?.click()}><Pencil size={15}/></button>
                <div className="ep-name">{profile?.nom || "Ta vitrine professionnelle"}</div>
                <div className="ep-muted">{profile?.specialite || "Présente ton activité sur EMi"} · <MapPin size={13} style={{display:"inline"}}/> {profile?.ville || "Yaoundé"}</div>
                <p className="ep-muted">{profile?.bio || "Ajoute une description claire pour présenter ton entreprise, tes services et ce qui te distingue."}</p>
                <div className="ep-actions">
                  {profile?.telephone && <a className="ep-primary" href={`https://wa.me/${profile.telephone.replace(/[^0-9]/g,"")}`} target="_blank" rel="noreferrer"><MessageCircle size={16} style={{display:"inline",verticalAlign:"middle"}}/> Contacter sur WhatsApp</a>}
                  <button className="ep-secondary" onClick={() => setTab("settings")}><Settings2 size={15} style={{display:"inline",verticalAlign:"middle"}}/> Gérer ma vitrine</button>
                </div>
                <div className="ep-stats">
                  <div className="ep-stat"><strong>{stats.photos}</strong><small>Photos</small></div>
                  <div className="ep-stat"><strong>{stats.videos}</strong><small>Vidéos</small></div>
                  <div className="ep-stat"><strong>{profile?.visibility === "hidden" ? "Privée" : "Publique"}</strong><small>Visibilité</small></div>
                </div>
              </div>
            </section>
            <section className="ep-section">
              <div className="ep-section-head"><h2>Galerie professionnelle</h2><button className="ep-secondary" onClick={() => setTab("gallery")}>Tout voir <ChevronRight size={15} style={{display:"inline",verticalAlign:"middle"}}/></button></div>
              {media.length ? <div className="ep-grid">{media.slice(0,4).map(m => <div className="ep-media" key={m.id}>{m.media_type === "video" ? <video src={m.public_url} muted playsInline controls/> : <img src={m.public_url} alt={m.album}/>}</div>)}</div> : <div className="ep-empty"><Images size={28}/><p>Ta galerie est prête. Ajoute plusieurs photos de tes produits, réalisations ou locaux.</p><button className="ep-primary" onClick={() => setTab("gallery")}>Ajouter des photos</button></div>}
            </section>
          </>}
          {tab === "gallery" && <section className="ep-panel" style={{padding:16}}>
            <div className="ep-section-head"><h2>Photos & albums</h2><span className="ep-count">{media.length} média(s)</span></div>
            <div className="ep-form" style={{marginBottom:14}}>
              <label>Album<select value={album} onChange={e => setAlbum(e.target.value)}><option>Général</option><option>Produits</option><option>Réalisations</option><option>Équipe</option><option>Locaux</option><option>Événements</option></select></label>
              <div style={{alignSelf:"end"}}><button className="ep-upload" disabled={uploading || !profile} onClick={() => galleryInput.current?.click()}><ImagePlus size={18}/> {uploading ? "Envoi en cours…" : "Sélectionner plusieurs médias"}</button></div>
            </div>
            <p className="ep-muted">Sélection multiple depuis ton téléphone. Jusqu’à 20 fichiers à la fois, 10 Mo maximum par fichier.</p>
            {media.length ? <div className="ep-grid">{media.map(m => <div className="ep-media" key={m.id}>{m.media_type === "video" ? <video src={m.public_url} controls playsInline/> : <img src={m.public_url} alt={m.album}/>}<button aria-label="Supprimer ce média" onClick={() => void removeMedia(m)}><Trash2 size={15}/></button></div>)}</div> : <div className="ep-empty">Aucun média pour le moment. Crée ton premier album professionnel.</div>}
          </section>}
          {tab === "settings" && <section className="ep-panel" style={{padding:16}}>
            <div className="ep-section-head"><h2>Réglages de la vitrine</h2><ShieldCheck color="#f1d35d"/></div>
            <form className="ep-form" onSubmit={saveProfile}>
              <label>Nom de l’entreprise / professionnel<input required value={form.nom} onChange={e => updateField("nom",e.target.value)} placeholder="Ex. Tchoyi Eric"/></label>
              <label>Activité principale<input required value={form.specialite} onChange={e => updateField("specialite",e.target.value)} placeholder="Ex. Hôtel, restaurant, vente…"/></label>
              <label>Téléphone / WhatsApp<input value={form.telephone} onChange={e => updateField("telephone",e.target.value)} placeholder="+237…"/></label>
              <label>Ville<input value={form.ville} onChange={e => updateField("ville",e.target.value)} placeholder="Yaoundé"/></label>
              <label>Email professionnel<input type="email" value={form.email} onChange={e => updateField("email",e.target.value)} placeholder="contact@entreprise.com"/></label>
              <label>Site web<input value={form.website} onChange={e => updateField("website",e.target.value)} placeholder="https://…"/></label>
              <label className="ep-full">Présentation<textarea value={form.bio} onChange={e => updateField("bio",e.target.value)} placeholder="Présente ton activité, tes produits et tes services…"/></label>
              <label>Visibilité<select value={form.visibility} onChange={e => updateField("visibility",e.target.value)}><option value="public">Visible publiquement</option><option value="hidden">Masquer temporairement</option></select></label>
              <div className="ep-full"><button className="ep-primary" type="submit" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer les réglages"}</button></div>
            </form>
            <div className="ep-card">
              <div className="ep-row"><div className="ep-icon"><Camera/></div><div><strong>Photo de profil</strong><small>Modifier le logo ou la photo professionnelle</small></div><ChevronRight className="ep-chevron"/></div>
              <button className="ep-upload" style={{marginTop:10}} onClick={() => avatarInput.current?.click()}>Choisir une photo de profil</button>
              <div className="ep-row" style={{marginTop:18}}><div className="ep-icon"><Images/></div><div><strong>Photo de couverture</strong><small>Mettre en valeur ta vitrine</small></div><ChevronRight className="ep-chevron"/></div>
              <button className="ep-upload" style={{marginTop:10}} onClick={() => coverInput.current?.click()}>Choisir une couverture</button>
            </div>
            <div className="ep-card">
              <div className="ep-row"><div className="ep-icon"><EyeOff/></div><div><strong>Confidentialité</strong><small>Masquer la vitrine sans la supprimer</small></div></div>
              <p className="ep-muted">Une vitrine masquée n’apparaît plus dans l’annuaire public. Tu peux la réactiver à tout moment.</p>
            </div>
            <button className="ep-danger" disabled={!profile || deleting} onClick={() => void deleteShowcase()}><Trash2 size={17} style={{display:"inline",verticalAlign:"middle"}}/> {deleting ? "Suppression en cours…" : "Supprimer définitivement ma vitrine"}<small>Cette action ne supprime pas ton compte personnel EMi.</small></button>
          </section>}
        </>
      )}
      <input ref={galleryInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple hidden onChange={e => void uploadMedia(e.target.files,"gallery")}/>
      <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => void uploadMedia(e.target.files,"avatar")}/>
      <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => void uploadMedia(e.target.files,"cover")}/>
      <footer className="ep-footer">EMi PRO · Connecter · Partager · Réussir</footer>
    </div>
  </main>;
}
