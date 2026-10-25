"use client";

import Link from "next/link";
import { useState } from "react";
import { HeartHandshake, GraduationCap, HeartPulse, ShieldCheck } from "lucide-react";

const causes = [
  { id:"sante", title:"Fonds Urgence Santé & Dépistage Cancer du Sein", description:"Soutien aux patientes et campagnes de sensibilisation et de prise en charge médicale de proximité.", icon:HeartPulse, color:"rose", action:"💖 Faire un don direct (Mobile Money)" },
  { id:"education", title:"Scolarité & Avenir — Orphelinats et enfants de la rue", description:"Offrez un kit scolaire complet ou envisagez de parrainer la scolarité d’un enfant pour l’année.", icon:GraduationCap, color:"amber", action:"🎓 Parrainer un enfant" },
];

export default function HopeBridgePage() {
  const [amounts,setAmounts] = useState<Record<string,string>>({});
  const [notice,setNotice] = useState("");
  function prepareContribution(cause:string) {
    const amount=amounts[cause]?.trim();
    if(!amount || !Number.isFinite(Number(amount)) || Number(amount)<=0 || !Number.isInteger(Number(amount))) {
      setNotice("Saisis un montant entier positif en FCFA pour préparer ta demande.");
      return;
    }
    setNotice("Demande préparée pour "+Number(amount).toLocaleString("fr-FR")+" FCFA — "+cause+". Aucun paiement n’a été effectué. Le fonds, le bénéficiaire et le moyen Mobile Money doivent être vérifiés avant tout transfert.");
  }
  return <main className="min-h-screen bg-[#030712] px-4 py-6 text-gray-50 sm:py-10">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/annonces" className="text-sm text-white/60 hover:text-white">← Retour au marché EMi</Link>
        <Link href="/" className="font-semibold tracking-[.22em] text-emerald-200">EMi</Link>
      </header>
      <section className="rounded-3xl border border-rose-400/25 bg-gradient-to-br from-gray-900 via-[#1f1018] to-gray-950 p-5 shadow-2xl shadow-rose-950/30 sm:p-8">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-rose-300"><HeartHandshake size={28}/></span><div><p className="text-xs uppercase tracking-[.25em] text-rose-200/70">Solidarité · Santé · Éducation</p><h1 className="mt-1 text-2xl font-semibold text-rose-300 sm:text-3xl">Hope-Bridge & Life-Fund</h1></div></div>
        <p className="mb-6 text-sm leading-6 text-gray-300">Une chaîne de solidarité pour soutenir les enfants vulnérables, l’éducation, les patientes et la sensibilisation au cancer du sein.</p>
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm text-amber-100/90"><ShieldCheck className="mt-0.5 shrink-0" size={19}/><p>Transparence : les causes affichées sont des initiatives proposées. Aucun organisme, bénéficiaire ou compte de collecte n’est certifié par cette page. Vérifie les informations avant tout don.</p></div>
        <div className="grid gap-4">
          {causes.map(cause=>{const Icon=cause.icon;const rose=cause.color==="rose";return <article key={cause.id} className={"rounded-2xl border border-white/10 border-l-4 bg-[#030712]/80 p-4 sm:p-5 "+(rose?"border-l-rose-400":"border-l-amber-400")}>
            <div className="flex items-start gap-3"><Icon className={rose?"mt-0.5 shrink-0 text-rose-300":"mt-0.5 shrink-0 text-amber-300"} size={23}/><div className="min-w-0"><h2 className="font-semibold leading-6">{cause.title}</h2><p className="mt-2 text-sm leading-5 text-gray-400">{cause.description}</p></div></div>
            <label className="mt-4 block text-sm text-white/75">Montant souhaité (FCFA)<input inputMode="numeric" type="number" min="1" step="1" value={amounts[cause.id]||""} onChange={e=>setAmounts(v=>({...v,[cause.id]:e.target.value}))} placeholder="Ex. 5 000" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-rose-300"/></label>
            <button type="button" onClick={()=>prepareContribution(cause.title)} className={"mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold transition hover:brightness-110 "+(rose?"bg-gradient-to-r from-rose-500 to-rose-700 text-white":"bg-gradient-to-r from-amber-400 to-amber-600 text-gray-950")}>{cause.action}</button>
          </article>})}
        </div>
        {notice&&<p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">{notice}</p>}
        <p className="mt-6 text-center text-xs leading-5 text-gray-500">Cette interface ne débite aucun compte, n’envoie pas de fonds et ne délivre pas de certificat de don. L’intégration réelle nécessite un organisme bénéficiaire vérifié et un prestataire Mobile Money.</p>
      </section>
    </div>
  </main>;
}
