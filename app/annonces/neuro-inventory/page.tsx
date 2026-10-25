"use client";

import { useState } from "react";
import Link from "next/link";

const sectors = {
  poissonnerie: { label: "🐟 Poissonnerie", title: "Suggestion Poissonnerie", message: "Arrivage de Bar & Capitaine frais : vérifiez le stock et envisagez une promo avant 18 h.", button: "Préparer une vente flash (-20 %)" },
  restaurant: { label: "🍽️ Restaurant", title: "Heure creuse détectée", message: "Créneau 15 h–17 h : envisagez une offre Menu Express pour les étudiants.", button: "Préparer une offre heure creuse" },
  bijouterie: { label: "💎 Bijouterie", title: "Réservation à vérifier", message: "Une demande de réservation de bijou est simulée. Vérifiez le client et les conditions avant tout engagement.", button: "Examiner la réservation" },
  hotel: { label: "🏨 Hôtel", title: "Occupation estimée", message: "Exemple de taux d’occupation : 65 %. Envisagez une offre Day-Use si vos disponibilités le permettent.", button: "Préparer une offre chambre" },
  boutique: { label: "👗 Boutique", title: "Articles à écouler", message: "Exemple : cinq articles anciens en stock. Envisagez un pack assorti ou une promotion.", button: "Préparer un pack mode" },
  general: { label: "🛒 Épicerie", title: "Réapprovisionnement", message: "Exemple : huile et riz à surveiller. Comparez les prix avec d’autres commerçants avant un achat groupé.", button: "Préparer un achat groupé" },
} as const;

type Sector = keyof typeof sectors;

export default function NeuroInventoryPage() {
  const [sector, setSector] = useState<Sector>("poissonnerie");
  const [notice, setNotice] = useState("");
  const current = sectors[sector];

  function prepareAction() {
    setNotice("Brouillon préparé pour votre commerce. Aucune offre n’a été publiée et aucun client n’a été alerté : la diffusion réelle nécessite une connexion aux services EMi.");
  }

  return (
    <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50">
      <div className="mx-auto flex max-w-lg flex-col gap-4">
        <Link href="/annonces" className="w-fit rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">← Retour aux annonces</Link>
        <section className="rounded-2xl border border-slate-700 bg-slate-800/90 p-5 shadow-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">EMi • Espace commerçant</p>
          <h1 className="text-2xl font-bold text-amber-400">🏪 Neuro-Inventory Pro</h1>
          <p className="mt-2 text-sm text-slate-300">Un tableau de bord pour préparer vos décisions de stock, offres et réapprovisionnement.</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(sectors) as Sector[]).map((key) => (
              <button key={key} type="button" onClick={() => { setSector(key); setNotice(""); }} aria-pressed={sector === key} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${sector === key ? "border-blue-400 bg-blue-600 text-white" : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"}`}>
                {sectors[key].label}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl border-l-4 border-rose-400 bg-slate-950 p-4">
            <p className="font-bold text-rose-300">⚠️ {current.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{current.message}</p>
          </div>
          <button type="button" onClick={prepareAction} className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 px-4 py-3 font-bold text-slate-950 hover:brightness-110">
            {current.button}
          </button>
          {notice && <p role="status" className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950/60 p-3 text-sm text-emerald-200">{notice}</p>}
          <p className="mt-4 text-xs leading-5 text-slate-500">Mode prototype : les suggestions sont des exemples, pas des prévisions IA vérifiées. Pas de publication, commande, paiement ni alerte réelle depuis cette page.</p>
        </section>
      </div>
    </main>
  );
}
