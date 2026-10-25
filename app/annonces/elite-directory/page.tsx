"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, BriefcaseBusiness, Phone, MapPin, UserRound, Save, LoaderCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Profile = { id?: string; user_id?: string; nom: string; specialite: string; telephone: string; ville: string; bio: string; created_at?: string };
const supabase = createSupabaseBrowserClient();

export default function EliteDirectoryPage() {
  const [userId, setUserId] = useState("");
  const [nom, setNom] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("Yaoundé");
  const [bio, setBio] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);

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
          const { data, error } = await supabase.from("elite_directory_profiles").select("id,user_id,nom,specialite,telephone,ville,bio,created_at").eq("user_id", uid).maybeSingle();
          if (error && error.code !== "42P01") setNotice("Lecture du profil impossible : " + error.message);
          if (data) { setNom(data.nom || ""); setSpecialite(data.specialite || ""); setTelephone(data.telephone || ""); setVille(data.ville || "Yaoundé"); setBio(data.bio || ""); }
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
      const payload = { user_id: userId, nom: nom.trim(), specialite: specialite.trim(), telephone: digits, ville: ville.trim(), bio: bio.trim(), published: true };
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

  return <main className="min-h-screen bg-[#030712] px-4 py-7 text-slate-50"><div className="mx-auto max-w-3xl space-y-5">
    <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={18}/> Retour au marché EMi</Link>
    <header className="rounded-3xl border border-amber-400/25 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.25em] text-amber-300">EMi · Réseau professionnel</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Elite Hospitality Directory</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Crée une carte professionnelle pour les métiers de l’hôtellerie, de la restauration et de l’accueil. Les coordonnées ne sont publiées que lorsque le profil est enregistré et rendu visible.</p></header>
    <section className="rounded-3xl border border-amber-300/20 bg-slate-900/80 p-5 sm:p-7"><h2 className="flex items-center gap-2 text-lg font-bold text-amber-300"><BriefcaseBusiness size={20}/> Créer / mettre à jour mon profil VIP</h2>
      {!userId && !loading && <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">Connecte-toi à EMi pour enregistrer ton profil.</p>}
      <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Nom et prénom<input required minLength={2} maxLength={100} value={nom} onChange={e=>setNom(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" placeholder="Ton nom professionnel"/></label>
        <label className="grid gap-2 text-sm">Spécialité<input required minLength={2} maxLength={120} value={specialite} onChange={e=>setSpecialite(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" placeholder="Chef, serveur, hôtesse, barman…"/></label>
        <label className="grid gap-2 text-sm"><span className="flex items-center gap-2"><Phone size={15}/> Téléphone / WhatsApp</span><input required inputMode="tel" maxLength={24} value={telephone} onChange={e=>setTelephone(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" placeholder="+237 6XX XXX XXX"/></label>
        <label className="grid gap-2 text-sm"><span className="flex items-center gap-2"><MapPin size={15}/> Ville / quartier</span><input maxLength={100} value={ville} onChange={e=>setVille(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" placeholder="Yaoundé, Bastos…"/></label>
        <label className="grid gap-2 text-sm sm:col-span-2">Présentation professionnelle<textarea rows={3} maxLength={1500} value={bio} onChange={e=>setBio(e.target.value)} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-amber-300" placeholder="Expérience, compétences, langues…"/></label>
        <button disabled={saving || loading} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-600 px-5 py-3 font-bold text-slate-950 disabled:opacity-50 sm:col-span-2">{saving ? <LoaderCircle size={18} className="animate-spin"/> : <Save size={18}/>} {saving ? "Enregistrement…" : "Enregistrer mon profil"}</button>
      </form>
      {notice && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">{notice}</p>}
    </section>
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Profils professionnels publiés</h2><span className="text-xs text-slate-400">{profiles.length} profil(s)</span></div>
      {loading ? <p className="py-8 text-sm text-slate-400">Chargement de l’annuaire…</p> : profiles.length === 0 ? <p className="py-8 text-sm leading-6 text-slate-400">Aucun profil publié pour le moment. Les profils apparaîtront ici après configuration de la table Supabase et publication par leurs propriétaires.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{profiles.map((p, i) => <article key={p.id || p.user_id || i} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-300/10 text-amber-200"><UserRound size={23}/></span><div className="min-w-0"><h3 className="font-semibold">{p.nom}</h3><p className="mt-1 text-xs text-slate-400">{p.ville || "Ville non précisée"}</p><span className="mt-2 inline-block rounded-md bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-200">{p.specialite}</span></div></div>{p.bio && <p className="mt-3 text-sm leading-5 text-slate-300">{p.bio}</p>}<a className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300" href={"https://wa.me/" + (p.telephone || "").replace(/\D/g, "")} target="_blank" rel="noopener noreferrer"><Phone size={15}/> Contacter sur WhatsApp</a></article>)}</div>}
    </section>
    <p className="text-xs leading-5 text-slate-500">Confidentialité : en publiant ton profil, tu acceptes que ton nom professionnel, ta spécialité, ta ville et ton contact soient visibles dans l’annuaire. N’utilise que des coordonnées que tu acceptes de partager.</p>
  </div></main>;
}
