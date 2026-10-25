"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Feather, ScrollText, ShieldCheck } from "lucide-react";

export default function ImmortelTracePage() {
  const [name,setName] = useState("");
  const [message,setMessage] = useState("");
  const [notice,setNotice] = useState("");
  function prepareTribute() {
    setNotice("");
    if(name.trim().length<2 || message.trim().length<5) {
      setNotice("Ajoute un nom (au moins 2 caractères) et un hommage (au moins 5 caractères).");
      return;
    }
    setNotice("Ton hommage est préparé sur cet écran, mais il n’a pas été enregistré dans un registre permanent. Une vraie publication nécessitera une connexion sécurisée et un stockage validé.");
  }
  return <main className="min-h-screen bg-[#030712] px-4 py-6 text-slate-50 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/annonces" className="text-sm text-white/60 hover:text-white">← Retour au marché EMi</Link>
        <Link href="/" className="font-semibold tracking-[.22em] text-violet-200">EMi</Link>
      </header>
      <section className="rounded-3xl border border-violet-400/25 bg-gradient-to-br from-slate-900 via-[#171025] to-slate-950 p-5 shadow-2xl shadow-violet-950/30 sm:p-8">
        <div className="mb-4 flex items-center gap-3"><span className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-3 text-violet-300"><Feather size={28}/></span><div><p className="text-xs uppercase tracking-[.25em] text-violet-200/70">Mémoire · Hommage · Transmission</p><h1 className="mt-1 text-2xl font-semibold text-violet-300 sm:text-3xl">Immortel-Trace & Legacy</h1></div></div>
        <p className="mb-6 text-sm leading-6 text-slate-300">Un espace pour honorer les personnes qui ont marqué nos vies, partager leur histoire et transmettre leur souvenir aux générations futures.</p>
        <div className="my-5 rounded-2xl border border-dashed border-amber-400/70 bg-[#030712] p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Exemple d’hommage</p>
          <Heart className="mx-auto my-3 text-rose-300" size={24}/>
          <p className="text-base font-semibold leading-6">« À une mère courageuse, pilier et guide de sa famille »</p>
          <p className="mt-3 text-xs text-emerald-300">Exemple illustratif — aucun bloc blockchain ni registre permanent n’est connecté.</p>
        </div>
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-violet-200/20 bg-violet-200/5 p-4 text-sm text-violet-100/90"><ShieldCheck className="mt-0.5 shrink-0" size={19}/><p>Respect et confidentialité : partage uniquement des informations que tu as le droit de publier. Demande l’accord des proches pour les données personnelles des personnes vivantes.</p></div>
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">Nom de la personne à honorer<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-violet-300" placeholder="Nom ou surnom"/></label>
          <label className="grid gap-2 text-sm">Hommage et souvenir<textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={4000} rows={5} className="rounded-xl border border-white/15 bg-black/30 px-4 py-3 outline-none focus:border-violet-300" placeholder="Raconte ce que cette personne représentait pour toi…"/></label>
          <button type="button" onClick={prepareTribute} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 px-4 py-4 font-bold text-white transition hover:brightness-110"><ScrollText size={19}/> Préparer un hommage</button>
        </div>
        {notice&&<p role="status" className="mt-5 rounded-xl border border-violet-300/20 bg-violet-300/10 p-4 text-sm leading-6 text-violet-100">{notice}</p>}
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Aucune carte d’honneur n’est délivrée et aucun registre décentralisé n’est connecté à cette démonstration.</p>
      </section>
    </div>
  </main>;
}
