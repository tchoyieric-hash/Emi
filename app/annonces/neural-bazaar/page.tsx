"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShoppingBag, Sparkles, RotateCw, ShieldCheck } from "lucide-react";

const demoProduct = { title: "Pack Tech & Accessoires Premium", shop: "Boutique Akwa", price: 12500 };

export default function NeuralBazaarPage() {
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Tour de démonstration disponible. Aucun cashback réel n'est attribué.");
  const [orderMessage, setOrderMessage] = useState("");

  function order() {
    setOrderMessage("Cette fiche est une démonstration : aucune commande, aucun paiement et aucune notification au marchand n'ont été envoyés. Consulte les annonces réelles du marché EMi pour contacter un vendeur.");
  }

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setMessage("La roue tourne…");
    window.setTimeout(() => {
      setSpinning(false);
      setMessage("Animation terminée : aucun cashback, Neural-Coin ou code promo réel n'a été crédité.");
    }, 1200);
  }

  return <main className="min-h-screen bg-[#090d16] px-4 pb-12 text-slate-50">
    <header className="mx-auto flex max-w-3xl items-center justify-between py-5">
      <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-amber-200"><ArrowLeft size={17}/> Retour au marché</Link>
      <span className="font-semibold tracking-[.22em] text-amber-200">EMi</span>
    </header>
    <section className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-3xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-500/15 via-slate-900 to-amber-500/10 p-6 sm:p-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.25em] text-fuchsia-200">Shopping intelligent · Avantages</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Neural-<span className="text-amber-200">Bazaar</span></h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Découvre une vitrine d'offres et les animations EMi. La personnalisation par IA, la géolocalisation précise et le paiement en un clic ne sont pas encore activés.</p>
      </div>

      <section className="mb-6 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="text-fuchsia-300" size={20}/> Flash Deals</h2>
        <p className="mt-2 text-sm text-slate-400">Produit d'exemple, non vérifié comme stock réellement disponible.</p>
        <article className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/70 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><p className="font-semibold">📦 {demoProduct.title}</p><p className="mt-1 text-xs text-slate-400">{demoProduct.shop} · Offre illustrative</p></div>
            <strong className="text-xl text-emerald-300">{new Intl.NumberFormat("fr-FR").format(demoProduct.price)} FCFA</strong>
          </div>
          <p className="mt-3 text-sm text-slate-400">Aucun stock ni distance n'a été vérifié. Le tarif est uniquement un exemple d'interface.</p>
          <button onClick={order} className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-emerald-300"><ShoppingBag className="mr-2 inline" size={18}/> Commander en 1 clic</button>
          {orderMessage && <p role="status" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{orderMessage}</p>}
          <Link href="/annonces" className="mt-3 block text-center text-sm text-emerald-200 underline underline-offset-4">Voir les annonces réellement publiées</Link>
        </article>
      </section>

      <section className="rounded-3xl border border-amber-300/20 bg-gradient-to-br from-amber-400/10 to-white/[.025] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-200">🎰 Roue Chop-Cash</h2>
        <p className="mt-2 text-sm text-slate-400">Animation ludique de démonstration. Aucun gain financier réel.</p>
        <div className="mt-4 rounded-2xl border border-dashed border-amber-300/40 bg-slate-950/70 p-6 text-center">
          <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-300/60 bg-gradient-to-br from-amber-300/20 to-fuchsia-500/20 text-5xl ${spinning ? "animate-spin" : ""}`}>🎡</div>
          <p role="status" className="mx-auto mt-4 max-w-md text-sm text-slate-300">{message}</p>
          <button onClick={spin} disabled={spinning} className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 font-bold text-slate-950 disabled:opacity-60"><RotateCw size={17}/>{spinning ? "La roue tourne…" : "Tenter ma chance"}</button>
        </div>
      </section>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0"/> Le paiement sécurisé, le cashback, les Neural-Coins, la livraison et les notifications marchand nécessitent encore des intégrations réelles et une validation serveur.</p>
    </section>
  </main>;
}
