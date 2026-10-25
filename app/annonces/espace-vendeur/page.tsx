"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Listing = { id: string; titre: string; prix: number; devise: string; latitude: number | null; longitude: number | null; statut: string; };
type Verification = { status: "pending" | "approved" | "rejected"; submitted_at: string };
declare global { interface Window { L?: any } }
const supabase = createSupabaseBrowserClient();

export default function EspaceVendeurPage() {
  const [userId, setUserId] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [views, setViews] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKyc, setSavingKyc] = useState(false);
  const [notice, setNotice] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  async function refresh() {
    if (!supabase) { setNotice("Supabase n'est pas configuré."); setLoading(false); return; }
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setNotice("Connecte-toi à EMi pour accéder à ton espace vendeur."); setLoading(false); return; }
    setUserId(user.id);
    const { data: rows, error } = await supabase.from("annonces")
      .select("id,titre,prix,devise,latitude,longitude,statut")
      .eq("seller_id", user.id).order("created_at", { ascending: false });
    if (error) setNotice("Impossible de charger les annonces : " + error.message);
    const items = (rows || []) as Listing[];
    setListings(items);
    if (items.length) {
      const ids = items.map(x => x.id);
      const { data: events, error: eventError } = await supabase.from("annonce_events").select("annonce_id,event_type").in("annonce_id", ids);
      if (eventError) setNotice("Les statistiques ne sont pas encore disponibles : " + eventError.message);
      else {
        setViews((events || []).filter((e: any) => e.event_type === "view").length);
        setClicks((events || []).filter((e: any) => e.event_type === "whatsapp_click").length);
      }
    } else { setViews(0); setClicks(0); }
    const { data: kyc } = await supabase.from("seller_verifications").select("status,submitted_at").eq("user_id", user.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
    setVerification(kyc as Verification | null);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  useEffect(() => {
    if (!mapRef.current || !listings.length) return;
    let cancelled = false;
    async function initMap() {
      if (!window.L) {
        await new Promise<void>((resolve, reject) => {
          if (!document.querySelector('link[data-emi-leaflet]')) {
            const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; css.dataset.emiLeaflet = "true"; document.head.appendChild(css);
          }
          const existing = document.querySelector('script[data-emi-leaflet]') as HTMLScriptElement | null;
          if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); if (window.L) resolve(); return; }
          const script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.dataset.emiLeaflet = "true"; script.onload = () => resolve(); script.onerror = () => reject(new Error("La carte n'a pas pu se charger.")); document.body.appendChild(script);
        });
      }
      if (cancelled || !window.L || !mapRef.current) return;
      const located = listings.filter(x => typeof x.latitude === "number" && typeof x.longitude === "number");
      const center: [number, number] = located.length ? [located[0].latitude!, located[0].longitude!] : [3.848, 11.5021];
      if (leafletMap.current) leafletMap.current.remove();
      const map = window.L.map(mapRef.current).setView(center, located.length ? 13 : 6);
      leafletMap.current = map;
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      located.forEach(item => window.L.marker([item.latitude, item.longitude]).addTo(map).bindPopup(
        '<strong>' + String(item.titre).replace(/[&<>"]/g, (c: string) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!)) + '</strong><br>' + Number(item.prix).toLocaleString("fr-FR") + ' FCFA'
      ));
      if (!located.length) setNotice("La carte est prête. Aucune annonce n'a encore de coordonnées GPS : ajoute un lieu aux annonces pour afficher les commerces.");
    }
    void initMap().catch((e) => { if (!cancelled) setNotice(e instanceof Error ? e.message : "Erreur de carte."); });
    return () => { cancelled = true; if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, [listings]);

  async function submitKyc() {
    setNotice("");
    if (!supabase || !userId) { setNotice("Connecte-toi avant d'envoyer une pièce d'identité."); return; }
    if (!file) { setNotice("Sélectionne une pièce d'identité avant de continuer."); return; }
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) { setNotice("Formats autorisés : JPG, PNG, WEBP ou PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setNotice("Le document doit faire 10 Mo maximum."); return; }
    setSavingKyc(true);
    try {
      const path = userId + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { error: uploadError } = await supabase.storage.from("seller-kyc").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("seller_verifications").insert({ user_id: userId, document_path: path, status: "pending" });
      if (insertError) throw insertError;
      setVerification({ status: "pending", submitted_at: new Date().toISOString() });
      setFile(null);
      setNotice("Dossier transmis. Le badge sera activé uniquement après une vérification réelle par un administrateur autorisé.");
    } catch (e) { setNotice("Envoi impossible : " + (e instanceof Error ? e.message : "erreur inconnue")); }
    finally { setSavingKyc(false); }
  }

  function exportReport() {
    const report = { generatedAt: new Date().toISOString(), scope: "espace vendeur connecté", listings: listings.length, views, whatsappClicks: clicks, conversionRate: views ? Number((clicks / views * 100).toFixed(2)) : 0, currency: "XAF", note: "Statistiques basées sur les événements enregistrés dans EMi; les clics ne garantissent pas une vente." };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "emi-rapport-vendeur.json"; a.click(); URL.revokeObjectURL(url);
  }

  const rate = views ? Math.min(100, clicks / views * 100) : 0;
  const statusLabel = verification?.status === "approved" ? "✓ Vendeur certifié" : verification?.status === "pending" ? "⏳ Vérification en attente" : verification?.status === "rejected" ? "✕ Dossier refusé" : "Non vérifié";

  return <main className="min-h-screen bg-[#09090d] px-4 py-6 text-white sm:px-6">
    <div className="mx-auto max-w-6xl">
      <header className="mb-7 flex items-center justify-between gap-3 border-b border-white/10 pb-5">
        <Link href="/annonces" className="text-sm text-amber-200">← Retour au marché</Link>
        <span className="font-semibold tracking-[.22em] text-amber-200">EMi · ESPACE PRO</span>
      </header>
      <section className="mb-7 rounded-3xl border border-amber-200/15 bg-gradient-to-br from-amber-200/10 to-transparent p-6 sm:p-9">
        <p className="text-xs uppercase tracking-[.3em] text-amber-200">Espace vendeur</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Ton activité, en un regard.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">Des chiffres basés sur les événements enregistrés dans EMi, sans statistiques de démonstration.</p>
      </section>
      {notice && <div role="status" className="mb-5 rounded-2xl border border-amber-200/20 bg-amber-100/10 p-4 text-sm text-amber-100">{notice}</div>}
      {loading ? <p className="py-10 text-white/60">Chargement des données réelles…</p> : !userId ? <div className="rounded-2xl border border-white/10 p-6">Connecte-toi à ton compte EMi pour consulter cet espace.</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Annonces", listings.length],["Vues enregistrées", views],["Clics WhatsApp", clicks],["Taux clics / vues", views ? rate.toFixed(1) + "%" : "—"]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[.04] p-5"><p className="text-sm text-white/55">{label}</p><p className="mt-2 text-3xl font-semibold text-amber-200">{value}</p></div>)}
        </section>
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
            <h2 className="text-lg font-semibold">🛡️ Badge de confiance</h2>
            <p className="mt-3 text-sm text-white/60">Statut : <span className={verification?.status === "approved" ? "text-emerald-300" : "text-amber-200"}>{statusLabel}</span></p>
            {verification?.status !== "approved" && <div className="mt-4 space-y-3"><p className="text-sm text-white/55">Dépose un document lisible. Il sera conservé dans un espace privé et devra être vérifié par un administrateur autorisé.</p><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"/><button onClick={()=>void submitKyc()} disabled={savingKyc} className="rounded-full bg-emerald-400 px-5 py-3 font-semibold text-black disabled:opacity-50">{savingKyc ? "Envoi sécurisé…" : "Soumettre mon dossier"}</button><p className="text-xs text-white/40">N'envoie que les documents nécessaires. Aucun badge n'est accordé automatiquement.</p></div>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
            <h2 className="text-lg font-semibold">📥 Rapport d’activité</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">Télécharge tes indicateurs vendeur au format JSON. Les statistiques globales d’investissement ne sont pas affichées ici sans accès administrateur vérifié.</p>
            <button onClick={exportReport} className="mt-4 rounded-full bg-sky-500 px-5 py-3 font-semibold text-white">Exporter mon rapport JSON</button>
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">📍 Carte des annonces géolocalisées</h2>
          <div ref={mapRef} className="h-[320px] w-full overflow-hidden rounded-xl bg-black/30" />
          <p className="mt-3 text-xs text-white/45">La carte affiche uniquement les annonces auxquelles des coordonnées GPS ont été ajoutées. Elle ne suit pas ta position sans ton accord.</p>
        </section>
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold">Mes annonces</h2>
          {listings.length ? <div className="divide-y divide-white/10">{listings.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span>{item.titre}</span><span className="text-sm text-amber-200">{Number(item.prix).toLocaleString("fr-FR")} {item.devise || "XAF"}</span></div>)}</div> : <p className="text-sm text-white/50">Aucune annonce pour le moment. <Link href="/annonces" className="text-amber-200 underline">Publier une annonce</Link></p>}
        </section>
      </>}
      <footer className="mt-10 border-t border-white/10 py-5 text-xs text-white/35">EMi · Les statistiques sont indicatives et dépendent des événements correctement enregistrés.</footer>
    </div>
  </main>;
}
