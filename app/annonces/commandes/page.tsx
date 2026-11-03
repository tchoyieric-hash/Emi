"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, RefreshCw, Store, ShoppingBag, Ban } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Order = {
  id: string;
  buyer_id: string;
  business_id: string;
  status: "pending" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
  subtotal: number;
  currency: string;
  buyer_note: string;
  created_at: string;
  businesses?: { name: string; owner_id: string } | null;
  order_items?: Array<{ quantity: number; unit_price: number; products?: { name: string; image_urls: string[] } | null }>;
};

const supabase = createSupabaseBrowserClient();
const LABELS: Record<Order["status"], string> = {
  pending: "En attente", confirmed: "Confirmée", preparing: "En préparation",
  shipped: "Expédiée", delivered: "Livrée", cancelled: "Annulée"
};
const NEXT: Partial<Record<Order["status"], Order["status"]>> = {
  pending: "confirmed", confirmed: "preparing", preparing: "shipped", shipped: "delivered"
};

export default function CommandesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"buyer" | "seller">("buyer");
  const [targetOrderId, setTargetOrderId] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setNotice("Connexion Supabase indisponible."); setLoading(false); return; }
    setLoading(true);
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setNotice("Connecte-toi à EMi pour consulter tes commandes.");
      setOrders([]);
      setUserId("");
      setLoading(false);
      return;
    }
    const currentUserId = auth.user.id;
    setUserId(currentUserId);

    const [buyerResult, businessesResult] = await Promise.all([
      supabase.from("orders")
        .select("id,buyer_id,business_id,status,subtotal,currency,buyer_note,created_at,businesses(name,owner_id),order_items(quantity,unit_price,products(name,image_urls))")
        .eq("buyer_id", currentUserId)
        .order("created_at", { ascending: false }).limit(100),
      supabase.from("businesses")
        .select("id,name,owner_id")
        .eq("owner_id", currentUserId)
    ]);

    if (buyerResult.error) {
      setNotice("Chargement des achats impossible : " + buyerResult.error.message);
      setOrders([]);
      setLoading(false);
      return;
    }
    if (businessesResult.error) {
      setNotice("Impossible de retrouver tes boutiques : " + businessesResult.error.message);
      setOrders((buyerResult.data || []) as unknown as Order[]);
      setLoading(false);
      return;
    }

    const businessIds = (businessesResult.data || []).map((business: { id: string }) => business.id);
    let sellerOrders: Order[] = [];
    if (businessIds.length > 0) {
      const { data, error } = await supabase.from("orders")
        .select("id,buyer_id,business_id,status,subtotal,currency,buyer_note,created_at,businesses(name,owner_id),order_items(quantity,unit_price,products(name,image_urls))")
        .in("business_id", businessIds)
        .order("created_at", { ascending: false }).limit(100);
      if (error) {
        setNotice("Tes boutiques sont trouvées, mais les commandes reçues ne peuvent pas être chargées : " + error.message);
        setOrders((buyerResult.data || []) as unknown as Order[]);
        setLoading(false);
        return;
      }
      sellerOrders = (data || []) as unknown as Order[];
    }

    const merged = new Map<string, Order>();
    [...((buyerResult.data || []) as unknown as Order[]), ...sellerOrders].forEach(order => merged.set(order.id, order));
    setOrders([...merged.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setNotice(businessIds.length === 0 ? "Aucune boutique n'est rattachée à ce compte vendeur." : "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "seller") setMode("seller");
    setTargetOrderId(params.get("order") || "");
  }, []);
  useEffect(() => {
    if (!loading && targetOrderId) document.getElementById("emi-order-" + targetOrderId)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, orders, targetOrderId]);

  const visible = orders.filter(o => mode === "buyer" ? o.buyer_id === userId : o.businesses?.owner_id === userId);

  async function cancelOrder(order: Order) {
    if (!supabase || !userId) return;
    setSaving(order.id); setNotice("");
    const { error } = await supabase.rpc("emi_cancel_order", { p_order_id: order.id });
    if (error) setNotice("Annulation impossible : " + error.message);
    else { setNotice("Commande annulée et stock remis en vente."); await load(); }
    setSaving("");
  }

  async function updateStatus(order: Order, status: Order["status"]) {
    if (!supabase || !userId) return;
    setSaving(order.id); setNotice("");
    const { error } = await supabase.rpc("emi_update_order_status", { p_order_id: order.id, p_status: status });
    if (error) setNotice("Mise à jour impossible : " + error.message);
    else { setNotice("Commande mise à jour."); await load(); }
    setSaving("");
  }

  return <main className="min-h-screen bg-[#06110b] px-3 py-5 text-white sm:px-6">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
        <Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-[#f3d77c]"><ArrowLeft size={17}/> Marché</Link>
        <span className="text-xs font-black tracking-[.2em] text-[#f3d77c]">EMi · COMMANDES</span>
      </header>
      <section className="mt-5 rounded-[26px] border border-[#d8b85f]/35 bg-gradient-to-br from-[#0c3b29] to-[#08130d] p-5 sm:p-8">
        <div className="flex items-center gap-3 text-[#f3d77c]"><Package size={25}/><span className="text-[10px] font-black tracking-[.2em]">ESPACE MARCHAND</span></div>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Mes commandes</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50/65">Retrouve tes achats et suis l’avancement des commandes de ta boutique.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setMode("buyer")} className={"rounded-full px-4 py-2.5 text-sm font-bold " + (mode === "buyer" ? "bg-[#f3d77c] text-[#102318]" : "border border-white/15 bg-black/20")}> <ShoppingBag size={15} className="mr-1 inline"/> Mes achats</button>
          <button onClick={() => setMode("seller")} className={"rounded-full px-4 py-2.5 text-sm font-bold " + (mode === "seller" ? "bg-[#f3d77c] text-[#102318]" : "border border-white/15 bg-black/20")}> <Store size={15} className="mr-1 inline"/> Commandes reçues</button>
          <button onClick={() => { setLoading(true); void load(); }} className="ml-auto rounded-full border border-white/15 px-3 py-2.5 text-sm" aria-label="Actualiser"><RefreshCw size={16}/></button>
        </div>
      </section>
      {notice && <p role="status" className="mt-4 rounded-xl border border-[#d8b85f]/25 bg-[#d8b85f]/10 p-3 text-sm text-[#ffe7a1]">{notice}</p>}
      {loading ? <p className="py-12 text-center text-white/55">Chargement des commandes…</p> : !userId ? <p className="mt-5 rounded-2xl border border-white/10 p-6">Connecte-toi à ton compte EMi.</p> : visible.length === 0 ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-8 text-center"><Package className="mx-auto text-[#f3d77c]" size={32}/><h2 className="mt-3 font-bold">{mode === "buyer" ? "Aucun achat pour le moment" : "Aucune commande reçue"}</h2><p className="mt-1 text-sm text-white/50">{mode === "buyer" ? "Tes commandes passées apparaîtront ici." : "Les commandes de tes produits apparaîtront ici."}</p><Link href="/annonces/business" className="mt-4 inline-flex rounded-full bg-[#f3d77c] px-5 py-2.5 text-sm font-black text-[#102318]">Découvrir les boutiques</Link></div> : <section className="mt-5 space-y-3">
        {visible.map(order => <article id={"emi-order-" + order.id} key={order.id} className={"rounded-2xl border p-4 sm:p-5 " + (targetOrderId === order.id ? "border-[#f3d77c] bg-[#f3d77c]/10 ring-2 ring-[#f3d77c]/30" : "border-[#d8b85f]/20 bg-white/[.035]")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-black tracking-[.15em] text-[#f3d77c]">{mode === "buyer" ? "ACHAT AUPRÈS DE" : "COMMANDE POUR"} · {order.businesses?.name || "Boutique EMi"}</p><p className="mt-1 text-xs text-white/45">Réf. {order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleString("fr-FR")}</p></div>
            <span className="rounded-full border border-[#d8b85f]/30 bg-[#d8b85f]/10 px-3 py-1.5 text-xs font-bold text-[#ffe7a1]">{LABELS[order.status]}</span>
          </div>
          <div className="mt-4 space-y-2">{(order.order_items || []).map((item, i) => <div key={i} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 flex-1 text-white/75">{item.products?.name || "Produit"} × {item.quantity}</span><strong className="shrink-0">{(Number(item.unit_price) * item.quantity).toLocaleString("fr-FR")} FCFA</strong></div>)}</div>
          {order.buyer_note && <p className="mt-3 rounded-xl bg-black/20 p-3 text-xs text-white/55">Note acheteur : {order.buyer_note}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="text-xs text-white/50">Total commande</span><strong className="text-lg text-[#f3d77c]">{Number(order.subtotal).toLocaleString("fr-FR")} {order.currency}</strong></div>
          {mode === "seller" && NEXT[order.status] && <button disabled={saving === order.id} onClick={() => void updateStatus(order, NEXT[order.status]!)} className="mt-4 min-h-10 rounded-full bg-[#f3d77c] px-4 py-2 text-sm font-black text-[#102318] disabled:opacity-50">{saving === order.id ? "Mise à jour…" : "Passer à : " + LABELS[NEXT[order.status]!]}</button>}
          {(order.status === "pending" || order.status === "confirmed" || order.status === "preparing") && <button disabled={saving === order.id} onClick={() => void cancelOrder(order)} className="ml-2 mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-red-300/25 px-4 py-2 text-sm font-bold text-red-200 disabled:opacity-50"><Ban size={14}/>{saving === order.id ? "Annulation…" : "Annuler et remettre le stock"}</button>}
        </article>)}
      </section>}
      <p className="mt-8 text-center text-[11px] leading-5 text-white/35">Les commandes sont enregistrées dans EMi. Le paiement et la livraison sont convenus directement entre l’acheteur et le vendeur ; aucun paiement n’est encaissé par EMi à ce stade.</p>
    </div>
  </main>;
}
