"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { ArrowLeft, Trophy, Swords, Radio, MessageCircle, Gift, ShoppingBag, Crown, RefreshCw, Camera, CameraOff, Mic, MicOff, Users, Sparkles, Timer } from "lucide-react";

type Battle = { id: string; title: string; status: "scheduled" | "live" | "finished" | "cancelled"; host_user_id: string; opponent_user_id: string | null; winner_user_id: string | null; category: string | null; created_at: string; };
type Vote = { id: string; battle_id: string; voter_user_id: string; voted_for_user_id: string; };
type CommentRow = { id: string; user_id: string; body: string; created_at: string; };
type Product = { id: string; title: string; description: string; price_xaf: number | null; image_url: string | null; };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function CommerceBattlePage() {
  const [clientReady, setClientReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [selected, setSelected] = useState<Battle | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [title, setTitle] = useState("Battle of Commerçants");
  const [category, setCategory] = useState("Mode & accessoires");
  const [commentText, setCommentText] = useState("");
  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [opponentId, setOpponentId] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const supabase = useCallback(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createBrowserClient(supabaseUrl, supabaseKey);
  }, []);

  const loadBattles = useCallback(async () => {
    const db = supabase();
    if (!db) { setNotice("La connexion Supabase n’est pas configurée sur cette version."); setLoading(false); return; }
    const { data: auth } = await db.auth.getUser();
    setUserId(auth.user?.id ?? null);
    const { data, error } = await db.from("commerce_battles").select("*").order("created_at", { ascending: false }).limit(30);
    if (error) setNotice("Impossible de charger les battles : " + error.message);
    else {
      const rows = (data ?? []) as Battle[];
      setBattles(rows);
      setSelected(current => current ? rows.find(row => row.id === current.id) ?? current : rows.find(row => row.status === "live") ?? rows[0] ?? null);
    }
    setLoading(false);
  }, [supabase]);

  const loadBattleDetails = useCallback(async (battle: Battle) => {
    const db = supabase(); if (!db) return;
    const [v, c, p] = await Promise.all([
      db.from("commerce_battle_votes").select("id,battle_id,voter_user_id,voted_for_user_id").eq("battle_id", battle.id),
      db.from("commerce_battle_comments").select("id,user_id,body,created_at").eq("battle_id", battle.id).order("created_at", { ascending: true }).limit(100),
      db.from("commerce_battle_products").select("id,title,description,price_xaf,image_url").eq("battle_id", battle.id).order("created_at", { ascending: false }).limit(20)
    ]);
    setVotes((v.data ?? []) as Vote[]);
    setComments((c.data ?? []) as CommentRow[]);
    setProducts((p.data ?? []) as Product[]);
  }, [supabase]);

  useEffect(() => { setClientReady(true); void loadBattles(); return () => { localStreamRef.current?.getTracks().forEach(track => track.stop()); }; }, [loadBattles]);

  useEffect(() => { if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current; }, [cameraEnabled, selected]);

  function toggleMic() {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) { setMediaError("Active d’abord la caméra pour contrôler le micro."); return; }
    track.enabled = !track.enabled;
    setMicEnabled(track.enabled);
    setMediaError("");
  }

  async function toggleCamera() {
    setMediaError("");
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => track.stop()); localStreamRef.current = null; setCameraEnabled(false); setMicEnabled(false); if (localVideoRef.current) localVideoRef.current.srcObject = null; return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true }); localStreamRef.current = stream; if (localVideoRef.current) localVideoRef.current.srcObject = stream; setCameraEnabled(true); setMicEnabled(true); }
    catch { setMediaError("Caméra ou micro indisponible. Autorise leur accès dans les paramètres du navigateur."); }
  }

  async function inviteOpponent(event: FormEvent) {
    event.preventDefault(); const db = supabase(); if (!db || !selected) return;
    if (selected.host_user_id !== userId) return setNotice("Seul l’organisateur peut inviter un commerçant.");
    const target = opponentId.trim(); if (!target) return setNotice("Saisis l’identifiant du compte EMi à inviter.");
    if (target === selected.host_user_id) return setNotice("Tu ne peux pas t’inviter toi-même.");
    setBusy(true); const { error } = await db.from("commerce_battles").update({ opponent_user_id: target }).eq("id", selected.id); setBusy(false);
    if (error) setNotice("Invitation non enregistrée : " + error.message); else { setNotice("Adversaire associé à la battle. L’acceptation d’invitation reste à connecter."); setOpponentId(""); await loadBattles(); }
  }
  useEffect(() => {
    if (!selected) { setVotes([]); setComments([]); setProducts([]); return; }
    void loadBattleDetails(selected);
    const db = supabase(); if (!db) return;
    const channel = db.channel("commerce-battle-" + selected.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "commerce_battle_votes", filter: "battle_id=eq." + selected.id }, () => void loadBattleDetails(selected))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "commerce_battle_comments", filter: "battle_id=eq." + selected.id }, payload => setComments(old => old.some(row => row.id === (payload.new as CommentRow).id) ? old : [...old, payload.new as CommentRow]))
      .on("postgres_changes", { event: "*", schema: "public", table: "commerce_battle_products", filter: "battle_id=eq." + selected.id }, () => void loadBattleDetails(selected))
      .subscribe();
    return () => { void db.removeChannel(channel); };
  }, [selected, supabase, loadBattleDetails]);

  async function createBattle(event: FormEvent) {
    event.preventDefault(); const db = supabase();
    if (!db) return setNotice("Supabase n’est pas configuré.");
    if (!userId) return setNotice("Connecte-toi à EMi pour créer une battle.");
    setBusy(true);
    const { data, error } = await db.from("commerce_battles").insert({ host_user_id: userId, title: title.trim() || "Battle of Commerçants", category, status: "scheduled" }).select("*").single();
    setBusy(false);
    if (error) return setNotice("Création impossible : " + error.message);
    setNotice("Battle créée. Invite un second commerçant depuis son profil ; le live vidéo nécessite encore la configuration du service de streaming.");
    await loadBattles(); if (data) setSelected(data as Battle);
  }

  async function startBattle() {
    const db = supabase(); if (!db || !selected || selected.host_user_id !== userId) return;
    setBusy(true);
    const { error } = await db.from("commerce_battles").update({ status: "live", starts_at: new Date().toISOString() }).eq("id", selected.id);
    setBusy(false);
    if (error) setNotice("Impossible de démarrer : " + error.message);
    else { setNotice("Battle marquée LIVE. La vidéo en direct n’est pas encore activée : les clés serveur du service de streaming doivent être configurées."); await loadBattles(); }
  }

  async function vote(forUser: string) {
    const db = supabase(); if (!db || !selected) return;
    if (!userId) return setNotice("Connecte-toi pour voter.");
    if (selected.status !== "live") return setNotice("Le vote est ouvert uniquement pendant une battle LIVE.");
    setBusy(true);
    const { error } = await db.from("commerce_battle_votes").insert({ battle_id: selected.id, voter_user_id: userId, voted_for_user_id: forUser });
    setBusy(false);
    if (error) setNotice(error.code === "23505" ? "Tu as déjà voté pour cette battle." : "Vote non enregistré : " + error.message);
    else { setNotice("Vote enregistré !"); await loadBattleDetails(selected); }
  }

  async function sendComment(event: FormEvent) {
    event.preventDefault(); const db = supabase(); if (!db || !selected) return;
    if (!userId) return setNotice("Connecte-toi pour commenter.");
    const body = commentText.trim(); if (!body) return;
    const { error } = await db.from("commerce_battle_comments").insert({ battle_id: selected.id, user_id: userId, body });
    if (error) setNotice("Commentaire non envoyé : " + error.message);
    else setCommentText("");
  }

  async function sendDemoGift(recipient: string, giftCode: "applause" | "spark" | "trophy") {
    const db = supabase(); if (!db || !selected) return;
    if (!userId) return setNotice("Connecte-toi pour envoyer une réaction.");
    const { error } = await db.from("commerce_battle_gifts").insert({ battle_id: selected.id, sender_user_id: userId, recipient_user_id: recipient, gift_code: giftCode });
    setNotice(error ? "Réaction non envoyée : " + error.message : "Réaction envoyée. Les cadeaux sont symboliques et gratuits pour le moment.");
  }

  async function addProduct(event: FormEvent) {
    event.preventDefault(); const db = supabase(); if (!db || !selected) return;
    if (!userId || ![selected.host_user_id, selected.opponent_user_id].includes(userId)) return setNotice("Seuls les commerçants de cette battle peuvent ajouter leurs produits.");
    if (!productTitle.trim()) return;
    const { error } = await db.from("commerce_battle_products").insert({ battle_id: selected.id, seller_user_id: userId, title: productTitle.trim(), price_xaf: productPrice ? Number(productPrice) : null });
    if (error) setNotice("Produit non ajouté : " + error.message);
    else { setProductTitle(""); setProductPrice(""); setNotice("Produit ajouté à la vitrine de la battle."); await loadBattleDetails(selected); }
  }

  const voteCount = (id: string) => votes.filter(vote => vote.voted_for_user_id === id).length;
  const winner = [...battles.filter(b => b.status === "finished" && b.winner_user_id)].reduce<Record<string, number>>((acc, b) => { const key = b.winner_user_id as string; acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const leaderboard = Object.entries(winner).sort((a,b) => b[1] - a[1]).slice(0, 10);

  return <main className="emi-battle-page min-h-screen bg-[#050505] px-4 pb-12 text-white">
    <header className="battle-topbar mx-auto flex max-w-5xl items-center justify-between py-5"><Link href="/annonces" className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-amber-200"><ArrowLeft size={17}/> Retour au marché</Link><span className="font-bold tracking-[.2em] text-amber-300">♛ EMi ROYAL</span></header>
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="arena-hero rounded-3xl border border-amber-300/30 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,.18),transparent_55%),linear-gradient(135deg,#17130a,#050505_65%)] p-6 shadow-[0_0_45px_rgba(212,175,55,.08)] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[.3em] text-amber-200">EMi Royal · Commerce en direct</p>
        <h1 className="mt-3 text-3xl font-black sm:text-5xl">Battle of <span className="text-amber-300">Commerçants</span></h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">Des duels de boutiques, des votes, des réactions et des produits présentés pendant le show. Les résultats persistés dans Supabase remplacent les anciens scores simulés.</p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs"><span className="rounded-full border border-amber-300/30 px-3 py-2 text-amber-100"><Radio size={14} className="mr-1 inline"/> Lives & battles</span><span className="rounded-full border border-amber-300/30 px-3 py-2 text-amber-100"><Trophy size={14} className="mr-1 inline"/> Champion hebdomadaire</span><span className="rounded-full border border-amber-300/30 px-3 py-2 text-amber-100"><Gift size={14} className="mr-1 inline"/> Réactions gratuites</span></div>
      </section>

      {notice && <div role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">{notice}</div>}

      <section className="battle-overview grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <form onSubmit={createBattle} className="battle-create space-y-4 rounded-3xl border border-white/10 bg-white/[.035] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Swords className="text-amber-300"/> Créer une battle</h2>
          <label className="block text-sm text-zinc-300">Nom du duel<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-white outline-none focus:border-amber-300"/></label>
          <label className="block text-sm text-zinc-300">Catégorie<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black px-3 py-3 text-white"><option>Mode & accessoires</option><option>Restauration</option><option>Électronique</option><option>Immobilier</option><option>Véhicules</option><option>Services</option><option>Autre</option></select></label>
          <button disabled={busy || !clientReady} className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-600 px-4 py-3 font-bold text-black disabled:opacity-50">{busy ? "Patiente…" : "Créer ma battle"}</button>
          <p className="text-xs leading-5 text-zinc-500">Réservé aux comptes connectés. Crée le duel, associe un adversaire puis teste caméra et micro avant le direct.</p>
        </form>

        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Battles récentes</h2><button onClick={()=>void loadBattles()} className="rounded-lg p-2 text-zinc-300 hover:text-amber-200" aria-label="Actualiser"><RefreshCw size={17}/></button></div>
          {loading ? <p className="text-sm text-zinc-400">Chargement…</p> : battles.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-zinc-400">Aucune battle pour le moment. Crée la première pour commencer le classement.</p> :
            <div className="space-y-2">{battles.map(b=><button key={b.id} onClick={()=>setSelected(b)} className={"battle-list-item w-full rounded-2xl border p-4 text-left transition "+(selected?.id===b.id?"border-amber-300/60 bg-amber-300/10":"border-white/10 bg-black/30 hover:border-amber-300/30")}><span className="flex items-center justify-between gap-3"><strong>{b.title}</strong><span className={"rounded-full px-2 py-1 text-[10px] font-bold "+(b.status==="live"?"bg-red-500/20 text-red-200":"bg-white/10 text-zinc-300")}>{b.status.toUpperCase()}</span></span><span className="mt-1 block text-xs text-zinc-500">{b.category || "Commerce"} · {new Date(b.created_at).toLocaleString("fr-FR")}</span></button>)}</div>}
        </section>
      </section>

      {selected && <section className="battle-detail grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="battle-arena space-y-5 rounded-3xl border border-amber-300/20 bg-gradient-to-br from-[#17130a] to-black p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[.2em] text-amber-200">EMi LIVE ARENA · {selected.category || "Commerce"}</p><h2 className="mt-1 text-2xl font-black">{selected.title}</h2></div>{selected.status==="live" && <span className="animate-pulse rounded-full bg-red-500 px-3 py-1 text-xs font-bold">● LIVE</span>}</div>
          <div className="battle-players grid grid-cols-2 gap-2 sm:gap-3">
            <div className="battle-player battle-player-host relative min-h-[190px] overflow-hidden rounded-2xl border border-amber-300/40 bg-[radial-gradient(ellipse_at_top,rgba(244,205,84,.2),transparent_60%),#071a14] sm:min-h-[280px]">{cameraEnabled && selected.host_user_id===userId ? <video ref={localVideoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover"/> : <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"><span className="text-4xl">♛</span><strong className="mt-3 text-sm sm:text-base">Commerçant A</strong><span className="mt-1 text-xs text-zinc-400">{cameraEnabled ? "Aperçu caméra local" : "Prêt à rejoindre l’arène"}</span></div>}<span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-amber-200">HÔTE · {voteCount(selected.host_user_id)} votes</span></div>
            <div className="battle-player battle-player-opponent relative flex min-h-[190px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.08),transparent_60%),#101010] p-3 text-center sm:min-h-[280px]"><span className="text-4xl">⚡</span><strong className="mt-3 text-sm sm:text-base">Commerçant B</strong><span className="mt-1 text-xs text-zinc-400">{selected.opponent_user_id ? "Adversaire associé" : "En attente d’un adversaire"}</span><span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-amber-200">{voteCount(selected.opponent_user_id || "")} votes</span></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/20 bg-black/40 p-3"><span className="text-xs text-zinc-300"><Timer size={14} className="mr-1 inline text-amber-300"/> Duel communautaire · votes en direct</span><span className="text-xs text-amber-200"><Users size={14} className="mr-1 inline"/>{votes.length} votes enregistrés</span></div>
          <div className="grid grid-cols-2 gap-2"><button onClick={()=>void toggleCamera()} className="rounded-xl border border-amber-300/30 px-3 py-3 text-sm font-bold text-amber-100">{cameraEnabled?<CameraOff size={16} className="mr-2 inline"/>:<Camera size={16} className="mr-2 inline"/>}{cameraEnabled?"Couper caméra":"Tester caméra + micro"}</button><button type="button" onClick={toggleMic} className="rounded-xl border border-white/15 px-3 py-3 text-sm font-bold">{micEnabled?<Mic size={16} className="mr-2 inline"/>:<MicOff size={16} className="mr-2 inline" />}{micEnabled?"Micro activé":"Micro coupé"}</button></div>
          {mediaError && <p role="status" className="rounded-lg bg-red-950/50 p-3 text-xs text-red-200">{mediaError}</p>}
          {selected.host_user_id===userId && !selected.opponent_user_id && <form onSubmit={inviteOpponent} className="flex gap-2"><input value={opponentId} onChange={e=>setOpponentId(e.target.value)} placeholder="ID du commerçant à inviter" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-3 text-xs"/><button disabled={busy} className="rounded-xl bg-amber-300 px-3 text-xs font-black text-black disabled:opacity-50">Inviter</button></form>}
          <div className="grid grid-cols-2 gap-2">{[{id:selected.host_user_id,label:"Voter pour A"},{id:selected.opponent_user_id,label:"Voter pour B"}].map(side=><button key={side.label} disabled={!side.id||busy||side.id===userId} onClick={()=>side.id&&void vote(side.id)} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-600 px-3 py-3 text-xs font-black text-black disabled:opacity-40">{side.label} · {side.id?voteCount(side.id):"—"}</button>)}</div>
          {selected.host_user_id===userId && selected.status==="scheduled" && <button disabled={busy} onClick={()=>void startBattle()} className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-600 px-4 py-3 font-bold text-black disabled:opacity-50"><Radio className="mr-2 inline" size={17}/> Démarrer la battle</button>}
          <div className="rounded-2xl border border-dashed border-amber-300/20 bg-black/40 p-4"><p className="font-semibold text-amber-100"><Sparkles size={16} className="mr-2 inline"/> Prochaine étape : vrai duplex vidéo</p><p className="mt-1 text-sm leading-5 text-zinc-400">L’aperçu caméra et le contrôle micro sont disponibles sur cet appareil. Pour transmettre les deux caméras aux spectateurs, il faut encore configurer un service WebRTC/LiveKit ; cet écran ne prétend pas diffuser un flux réseau réel.</p></div>
        </div>
        <div className="space-y-5">
          <section className="battle-side-card rounded-3xl border border-white/10 bg-white/[.035] p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><MessageCircle className="text-amber-300" size={18}/> Chat en direct</h3><div className="max-h-64 space-y-2 overflow-y-auto">{comments.map(c=><p key={c.id} className="rounded-xl bg-black/40 p-3 text-sm"><span className="mr-2 text-xs text-amber-200">{c.user_id.slice(0,8)}</span>{c.body}</p>)}{comments.length===0&&<p className="text-sm text-zinc-500">Les commentaires apparaîtront ici.</p>}</div><form onSubmit={sendComment} className="mt-3 flex gap-2"><input value={commentText} onChange={e=>setCommentText(e.target.value)} maxLength={500} placeholder="Écrire un commentaire…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-3 text-sm outline-none focus:border-amber-300"/><button className="rounded-xl bg-amber-300 px-4 font-bold text-black">Envoyer</button></form></section>
          <section className="battle-side-card rounded-3xl border border-white/10 bg-white/[.035] p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><ShoppingBag className="text-amber-300" size={18}/> Vitrine de produits</h3><div className="space-y-2">{products.map(p=><article key={p.id} className="rounded-xl border border-white/10 bg-black/40 p-3"><strong className="text-sm">{p.title}</strong>{p.price_xaf!==null&&<p className="mt-1 text-sm text-amber-200">{p.price_xaf.toLocaleString("fr-FR")} FCFA</p>}{p.description&&<p className="mt-1 text-xs text-zinc-400">{p.description}</p>}</article>)}{products.length===0&&<p className="text-sm text-zinc-500">Les produits des commerçants apparaîtront ici.</p>}</div><form onSubmit={addProduct} className="mt-4 space-y-2"><input value={productTitle} onChange={e=>setProductTitle(e.target.value)} maxLength={160} placeholder="Nom du produit" className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"/><input value={productPrice} onChange={e=>setProductPrice(e.target.value)} type="number" min="0" step="1" placeholder="Prix en FCFA (facultatif)" className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"/><button className="w-full rounded-xl border border-amber-300/30 py-2 text-sm font-semibold text-amber-200">Ajouter à la vitrine</button></form></section>
        </div>
      </section>}

      <section className="battle-leaderboard rounded-3xl border border-amber-300/20 bg-white/[.025] p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><Crown className="text-amber-300"/> Champion EMi du Commerce</h2><p className="mt-2 text-sm text-zinc-400">Le classement se basera sur les résultats de battles terminées et validées. Aucun classement n’est inventé si aucun résultat officiel n’est disponible.</p>{leaderboard.length>0?<ol className="mt-4 space-y-2">{leaderboard.map(([id,wins],i)=><li key={id} className="flex justify-between rounded-xl bg-black/40 p-3 text-sm"><span>{i===0?"👑":i===1?"🥈":"🏅"} {id.slice(0,8)}</span><strong className="text-amber-200">{wins} victoire(s)</strong></li>)}</ol>:<p className="mt-3 text-sm text-zinc-500">Le classement officiel apparaîtra après les premières battles terminées et validées.</p>}</section>
      <p className="text-center text-xs leading-5 text-zinc-600">Les réactions actuelles sont symboliques et gratuites. Aucun paiement, achat de cadeaux ou gain financier n’est activé.</p>
    </div>
  </main>;
}
