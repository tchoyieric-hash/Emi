"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BrainCircuit, Activity, Sparkles, RefreshCw, TrendingUp } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Listing = { titre: string; description: string | null; created_at: string; prix: number | null };
type Result = { category: string; count: number; examples: string[] };
const supabase = createSupabaseBrowserClient();
const groups: Record<string, string[]> = {
  "Téléphones & informatique": ["téléphone", "telephone", "smartphone", "ordinateur", "pc", "laptop", "tablette", "iphone", "samsung"],
  "Cuisine & maison": ["cuisine", "gaz", "mixeur", "réfrigérateur", "refrigerateur", "four", "marmite", "meuble", "chaise", "table"],
  "Mode & accessoires": ["chaussure", "vêtement", "vetement", "sac", "montre", "robe", "pantalon", "bijou"],
  "Équipements professionnels": ["outil", "machine", "imprimante", "matériel", "materiel", "équipement", "equipement", "professionnel"],
  "Autres articles": []
};

export default function NeuralTradePage() {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  async function analyze() {
    setBusy(true); setNotice(""); setAnalyzed(false);
    if (!supabase) {
      setNotice("La connexion Supabase n'est pas configurée. Impossible d'analyser les annonces réelles.");
      setBusy(false); return;
    }
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("annonces").select("titre,description,created_at,prix").eq("statut", "active").gte("created_at", since).order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      const rows = (data || []) as Listing[];
      const counts = new Map<string, { count: number; examples: string[] }>();
      for (const category of Object.keys(groups)) counts.set(category, { count: 0, examples: [] });
      for (const row of rows) {
        const value = (row.titre + " " + (row.description || "")).toLocaleLowerCase("fr");
        const category = Object.entries(groups).find(([name, keywords]) => name !== "Autres articles" && keywords.some(k => value.includes(k)))?.[0] || "Autres articles";
        const bucket = counts.get(category)!;
        bucket.count++;
        if (bucket.examples.length < 3) bucket.examples.push(row.titre);
      }
      setResults(Array.from(counts.entries()).map(([category, v]) => ({ category, ...v })).filter(r => r.count > 0).sort((a,b) => b.count-a.count));
      setTotal(rows.length);
      setAnalyzed(true);
      if (!rows.length) setNotice("Aucune annonce active n'a été trouvée sur les 30 derniers jours. Les tendances ne peuvent pas être estimées sans données.");
    } catch (e) {
      setNotice("Analyse impossible : " + (e instanceof Error ? e.message : "erreur inconnue"));
    } finally { setBusy(false); }
  }

  const top = results[0];
  return <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50 sm:py-10"><div className="mx-auto max-w-3xl">
    <header className="mb-6 flex items-center justify-between"><Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-violet-300"><ArrowLeft size={17}/> Marché EMi</Link><Link href="/" className="font-semibold tracking-[.22em] text-amber-200">EMi</Link></header>
    <section className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-5 shadow-2xl shadow-violet-950/20 sm:p-8">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.25em] text-violet-300"><Sparkles size={15}/> Intelligence du marché</p>
      <h1 className="flex items-center gap-3 text-2xl font-semibold sm:text-3xl"><BrainCircuit className="text-violet-300" size={30}/> EMI Neural-Trade</h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">Explore les catégories les plus présentes dans les annonces EMi récentes pour aider les vendeurs à décider quels articles mettre en avant.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2 text-sm text-slate-400"><Activity size={17}/> Source analysée</div><p className="mt-2 font-semibold">Annonces actives EMi</p><p className="mt-1 text-xs text-slate-500">Données Supabase, fenêtre de 30 jours</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center gap-2 text-sm text-slate-400"><TrendingUp size={17}/> Méthode</div><p className="mt-2 font-semibold">Classement par mots-clés</p><p className="mt-1 text-xs text-slate-500">Analyse indicative, pas un modèle prédictif entraîné</p></div>
      </div>
      <button type="button" onClick={analyze} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:opacity-60">{busy ? <RefreshCw className="animate-spin" size={18}/> : <BrainCircuit size={18}/>} {busy ? "Analyse des annonces…" : "Analyser les tendances du marché"}</button>
      {notice && <p role="status" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{notice}</p>}
      {analyzed && <div className="mt-6 space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-sm text-slate-400">Échantillon analysé · 30 derniers jours</p><p className="mt-1 text-3xl font-semibold text-violet-200">{total}</p><p className="text-sm text-slate-400">annonce(s) active(s)</p></div>
        {top && <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Catégorie la plus présente</p><h2 className="mt-2 text-xl font-semibold">{top.category}</h2><p className="mt-1 text-sm text-slate-300">{top.count} annonce(s), soit {Math.round(top.count / Math.max(total, 1) * 100)} % de l'échantillon analysé.</p><p className="mt-2 text-xs text-slate-400">Piste à explorer : mets en valeur les articles de cette catégorie, sans considérer ce résultat comme une garantie de ventes.</p></div>}
        {results.length > 0 && <div className="space-y-3"><h2 className="font-semibold">Répartition par catégorie</h2>{results.map(r => <div key={r.category} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between gap-3"><span className="font-medium">{r.category}</span><span className="text-sm text-violet-200">{r.count} annonce(s)</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{width: Math.max(2, r.count / Math.max(total,1) * 100) + "%"}}/></div>{r.examples.length > 0 && <p className="mt-2 text-xs text-slate-400">Exemples : {r.examples.join(" · ")}</p>}</div>)}</div>}
      </div>}
    </section>
    <p className="mt-5 text-center text-xs leading-5 text-slate-500">Transparence : cette version utilise les annonces réellement disponibles dans EMi et un classement simple par mots-clés. Elle ne lit pas les ventes de tout Bastos/Yaoundé, ne prédit pas la demande future et ne calcule pas de taux de confiance artificiel. Les résultats dépendent des annonces enregistrées.</p>
  </div></main>;
}
