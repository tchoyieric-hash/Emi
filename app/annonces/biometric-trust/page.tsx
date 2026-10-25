"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Fingerprint, ShieldCheck, LockKeyhole, AlertTriangle } from "lucide-react";

export default function BiometricTrustPage() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function authorize() {
    setStatus("");
    if (typeof window === "undefined" || !window.isSecureContext || !("PublicKeyCredential" in window) || !navigator.credentials) {
      setStatus("Cet appareil ou navigateur ne prend pas en charge l’authentification biométrique WebAuthn dans ce contexte. Aucun paiement n’a été effectué.");
      return;
    }
    setBusy(true);
    try {
      // WebAuthn requires a server-issued challenge and a registered credential.
      // Do not trigger a fake biometric prompt or claim a payment succeeded without them.
      setStatus("La biométrie est disponible sur cet appareil, mais l’autorisation réelle nécessite un défi WebAuthn fourni par le serveur et un moyen de paiement marchand configuré. Aucun paiement n’a été effectué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090d16] px-4 py-6 text-slate-50">
      <div className="mx-auto max-w-xl">
        <Link href="/annonces" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={18}/> Retour au marché EMi</Link>
        <section className="rounded-3xl border border-rose-400/20 bg-gradient-to-b from-slate-800 to-slate-950 p-6 text-center shadow-2xl shadow-rose-950/20 sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10 text-rose-300"><Fingerprint size={34}/></div>
          <p className="text-xs font-semibold uppercase tracking-[.25em] text-rose-300">EMi • Paiement souverain</p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Biometric-Trust</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">Préparation d’une validation biométrique locale pour sécuriser les paiements EMi.</p>
          <div className="my-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={20}/><div><p className="font-semibold">Biométrie de l’appareil</p><p className="mt-1 text-sm text-slate-400">Le navigateur peut utiliser la sécurité intégrée de l’appareil via WebAuthn, après enregistrement sécurisé.</p></div></div>
            <div className="mt-4 flex items-start gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-amber-300" size={20}/><div><p className="font-semibold">Aucun paiement simulé</p><p className="mt-1 text-sm text-slate-400">Une empreinte seule ne transfère pas d’argent. Il faut un serveur qui vérifie la preuve biométrique et une intégration marchand (par exemple MTN MoMo ou Orange Money).</p></div></div>
          </div>
          <div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-left text-sm text-amber-100"><AlertTriangle className="mr-2 inline" size={16}/>Montant d’exemple : <strong>25 000 FCFA</strong>. Il n’est ni débité ni transmis.</div>
          <button onClick={authorize} disabled={busy} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3.5 font-semibold text-white transition hover:bg-rose-400 disabled:opacity-60"><Fingerprint size={20}/>{busy ? "Vérification…" : "Vérifier la compatibilité biométrique"}</button>
          {status && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-left text-sm leading-6 text-slate-200">{status}</p>}
          <p className="mt-5 text-xs text-slate-500">La page ne collecte ni n’enregistre vos empreintes digitales.</p>
        </section>
      </div>
    </main>
  );
}
