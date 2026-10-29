"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Heart, MessageCircle, MoreHorizontal, Play, Volume2, VolumeX, Share2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Reel = {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  media_type: string;
  media_urls: string[] | null;
  profiles?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};

const supabase = createSupabaseBrowserClient();
const isReel = (p: Reel) => /^\s*\[EMI_REEL\]/i.test(p.content || "");
const captionOf = (value: string | null) => (value || "").replace(/^\s*\[EMI_REEL\]\s*/i, "").replace(/\[EMI_MUSIC\][\s\S]*?(?:\[\/EMI_MUSIC\]|$)/gi, "").trim();

export default function ImmersiveReelsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const requestedId = params?.id;
  const [items, setItems] = useState<Reel[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const active = items[index];

  const load = useCallback(async () => {
    if (!supabase) { setError("La connexion à Supabase n’est pas configurée."); setLoading(false); return; }
    setLoading(true); setError("");
    const { data, error: queryError } = await supabase.from("posts")
      .select("id,user_id,content,created_at,media_type,media_urls,visibility")
      .eq("visibility", "public").eq("media_type", "video").order("created_at", { ascending: false }).limit(100);
    if (queryError) { setError("Impossible de charger les vidéos : " + queryError.message); setLoading(false); return; }
    const videos = ((data || []) as Reel[]).filter(p => (p.media_urls || []).length > 0);
    const ids = [...new Set(videos.map(p => p.user_id))];
    const { data: profiles } = ids.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids) : { data: [] };
    const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
    const enriched = videos.map(p => ({ ...p, profiles: byId.get(p.user_id) || null }));
    setItems(enriched);
    const requestedIndex = enriched.findIndex(p => p.id === requestedId);
    setIndex(requestedIndex >= 0 ? requestedIndex : 0);
    const postIds = enriched.map(p => p.id);
    if (postIds.length) {
      const { data: likes } = await supabase.from("post_likes").select("post_id,user_id").in("post_id", postIds);
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      (likes || []).forEach((row: any) => { counts[row.post_id] = (counts[row.post_id] || 0) + 1; if (row.user_id) mine.push(row.post_id + ":" + row.user_id); });
      setLikeCounts(counts);
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) setLikedIds(mine.filter(v => v.endsWith(":" + authData.user!.id)).map(v => v.split(":")[0]));
    }
    setLoading(false);
  }, [requestedId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !items.length) return;
    const child = root.querySelector<HTMLElement>('[data-reel-index="' + index + '"]');
    if (child) child.scrollIntoView({ behavior: "auto", block: "start" });
    const post = items[index];
    if (post && window.location.pathname !== "/reels/" + post.id) router.replace("/reels/" + post.id, { scroll: false });
  }, [index, items, router]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const videos = Array.from(root.querySelectorAll<HTMLVideoElement>("video[data-reel-video]"));
    videos.forEach((video, i) => {
      if (i === index) { video.muted = !soundOn; void video.play().catch(() => undefined); }
      else video.pause();
    });
  }, [index, items, soundOn]);

  const move = (direction: number) => setIndex(old => items.length ? (old + direction + items.length) % items.length : 0);

  const toggleLike = async (post: Reel) => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) { setMessage("Connecte-toi pour aimer cette vidéo."); return; }
    const wasLiked = likedIds.includes(post.id);
    setLikedIds(old => wasLiked ? old.filter(id => id !== post.id) : [...old, post.id]);
    setLikeCounts(old => ({ ...old, [post.id]: Math.max(0, (old[post.id] || 0) + (wasLiked ? -1 : 1)) }));
    const result = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      : await supabase.from("post_likes").upsert({ post_id: post.id, user_id: user.id }, { onConflict: "post_id,user_id" });
    if (result.error) {
      setLikedIds(old => wasLiked ? [...old, post.id] : old.filter(id => id !== post.id));
      setLikeCounts(old => ({ ...old, [post.id]: Math.max(0, (old[post.id] || 0) + (wasLiked ? 1 : -1)) }));
      setMessage("Impossible d’enregistrer le J’aime. Réessaie.");
    }
  };

  const share = async (post: Reel) => {
    const url = window.location.origin + "/reels/" + post.id;
    try {
      if (navigator.share) await navigator.share({ title: "Reel EMi", text: captionOf(post.content) || "Regarde cette vidéo sur EMi", url });
      else { await navigator.clipboard.writeText(url); setMessage("Lien du Reel copié."); }
    } catch { /* partage annulé par l’utilisateur */ }
  };

  if (loading) return <main className="emi-immersive-loading"><span className="emi-immersive-spinner" /><p>Préparation de ton flux vidéo…</p></main>;
  if (error) return <main className="emi-immersive-empty"><button onClick={() => router.back()}><ChevronLeft size={20}/> Retour</button><h1>Le lecteur EMi est momentanément indisponible</h1><p>{error}</p><button onClick={() => void load()}>Réessayer</button></main>;
  if (!items.length) return <main className="emi-immersive-empty"><button onClick={() => router.push("/")}><ChevronLeft size={20}/> Accueil</button><h1>Aucune vidéo disponible pour le moment</h1><p>Les vidéos publiques apparaîtront ici dès qu’elles seront publiées.</p></main>;

  return <main className="emi-immersive-shell">
    <div className="emi-immersive-topbar"><button aria-label="Retour" onClick={() => router.push("/")}><ChevronLeft size={24}/></button><strong>EMi <span>REELS</span></strong><span className="emi-immersive-counter">{index + 1} / {items.length}</span></div>
    <div className="emi-immersive-scroller" ref={scrollerRef} onTouchStart={e => { touchStartY.current = e.touches[0]?.clientY ?? null; }} onTouchEnd={e => { if (touchStartY.current === null) return; const delta = touchStartY.current - (e.changedTouches[0]?.clientY ?? touchStartY.current); if (Math.abs(delta) > 45) move(delta > 0 ? 1 : -1); touchStartY.current = null; }} onWheel={e => { if (Math.abs(e.deltaY) > 25) move(e.deltaY > 0 ? 1 : -1); }}>
      {items.map((post, i) => {
        const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi";
        const url = post.media_urls?.[0];
        return <section className="emi-immersive-slide" data-reel-index={i} key={post.id}>
          {url && <video data-reel-video playsInline loop preload={i === index ? "auto" : "metadata"} src={url} muted={i !== index || !soundOn} controls={false} onClick={e => { const v=e.currentTarget; if(v.paused) void v.play().catch(()=>undefined); else v.pause(); }} />}
          <div className="emi-immersive-shade" />
          <div className="emi-immersive-author"><span className="emi-immersive-avatar">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" /> : author.slice(0,1).toUpperCase()}</span><strong>{author}</strong><span className="emi-immersive-follow-label">· EMi</span></div>
          <div className="emi-immersive-caption"><strong>{isReel(post) ? "REEL" : "VIDÉO"}</strong><p>{captionOf(post.content) || "Découvre ce moment sur EMi."}</p></div>
          <div className="emi-immersive-actions">
            <button aria-label={likedIds.includes(post.id) ? "Retirer le J’aime" : "Aimer"} onClick={() => void toggleLike(post)} className={likedIds.includes(post.id) ? "is-liked" : ""}><Heart size={27} fill={likedIds.includes(post.id) ? "currentColor" : "none"}/><span>{likeCounts[post.id] || 0}</span></button>
            <button aria-label="Commentaires" onClick={() => setMessage("Les commentaires seront accessibles depuis la fiche complète de cette vidéo.")}><MessageCircle size={26}/><span>Commenter</span></button>
            <button aria-label="Partager" onClick={() => void share(post)}><Share2 size={25}/><span>Partager</span></button>
            <button aria-label={soundOn ? "Couper le son" : "Activer le son"} onClick={() => setSoundOn(v => !v)}>{soundOn ? <Volume2 size={24}/> : <VolumeX size={24}/>}<span>{soundOn ? "Son" : "Muet"}</span></button>
          </div>
          <button className="emi-immersive-play-hint" aria-label="Lecture / pause" onClick={() => { const v=scrollerRef.current?.querySelector<HTMLVideoElement>('[data-reel-index="' + i + '"] video'); if(v?.paused)void v.play().catch(()=>undefined);else v?.pause(); }}><Play size={24} fill="currentColor"/></button>
        </section>;
      })}
    </div>
    <div className="emi-immersive-nav"><button onClick={() => move(-1)}>↑ Précédente</button><span>SWIPE VERTICAL</span><button onClick={() => move(1)}>Suivante ↓</button></div>
    {message && <button className="emi-immersive-toast" onClick={() => setMessage("")}>{message} <span>×</span></button>}
    <style jsx global>{`
      .emi-immersive-shell{position:fixed;inset:0;z-index:9999;background:#030504;color:#fff;font-family:Arial,sans-serif;display:flex;flex-direction:column;overflow:hidden}
      .emi-immersive-topbar{height:58px;flex:0 0 58px;display:flex;align-items:center;gap:14px;padding:0 16px;background:#07130e;border-bottom:1px solid #bda45a55;z-index:3}
      .emi-immersive-topbar button,.emi-immersive-empty button{border:0;background:transparent;color:#f0d78b;display:flex;align-items:center;gap:5px;padding:8px}
      .emi-immersive-topbar strong{font-size:16px;letter-spacing:2px}.emi-immersive-topbar strong span{color:#e6cb78;font-size:10px;margin-left:5px}.emi-immersive-counter{margin-left:auto;color:#e3d5a4;font-size:12px}
      .emi-immersive-scroller{flex:1;min-height:0;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;scrollbar-width:none}.emi-immersive-scroller::-webkit-scrollbar{display:none}
      .emi-immersive-slide{height:100%;min-height:0;position:relative;scroll-snap-align:start;scroll-snap-stop:always;background:#090b0a;overflow:hidden;isolation:isolate}
      .emi-immersive-slide>video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:-2}
      .emi-immersive-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#0009,transparent 22%,transparent 58%,#000b 100%);z-index:-1}
      .emi-immersive-author{position:absolute;top:22px;left:18px;display:flex;align-items:center;gap:9px;text-shadow:0 2px 8px #000;font-size:14px}.emi-immersive-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#d8bd6e;color:#10140d;border:2px solid #f4df9b;overflow:hidden;font-weight:800}.emi-immersive-avatar img{width:100%;height:100%;object-fit:cover}.emi-immersive-follow-label{color:#e7d59a;font-size:12px}
      .emi-immersive-caption{position:absolute;left:18px;right:86px;bottom:36px;text-shadow:0 2px 8px #000}.emi-immersive-caption>strong{display:inline-block;border:1px solid #e5cc78;border-radius:20px;padding:5px 9px;color:#f0d88c;font-size:10px;letter-spacing:1.5px}.emi-immersive-caption p{font-size:15px;line-height:1.5;margin:10px 0 0;overflow-wrap:anywhere}
      .emi-immersive-actions{position:absolute;right:13px;bottom:42px;display:flex;flex-direction:column;align-items:center;gap:20px}.emi-immersive-actions button{border:0;background:#05070575;color:#fff;border-radius:30px;min-width:50px;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:6px 4px;text-shadow:0 2px 5px #000}.emi-immersive-actions button span{font-size:10px}.emi-immersive-actions button.is-liked{color:#ff4e72}
      .emi-immersive-play-hint{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border:1px solid #ffffff66;border-radius:50%;width:58px;height:58px;display:grid;place-items:center;background:#0005;color:white;opacity:.7}
      .emi-immersive-nav{height:50px;flex:0 0 50px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 12px;background:#07130e;border-top:1px solid #bda45a55;z-index:3}.emi-immersive-nav button{background:#141a14;border:1px solid #c8ac60;border-radius:12px;padding:9px 12px;color:#f1dc9a;font-size:12px}.emi-immersive-nav button:disabled{opacity:.35}.emi-immersive-nav span{font-size:9px;letter-spacing:1.4px;color:#b7a977}
      .emi-immersive-toast{position:absolute;bottom:64px;left:16px;right:16px;border:1px solid #bda45a;background:#101a14;color:white;padding:13px;border-radius:13px;text-align:left;z-index:5}.emi-immersive-toast span{float:right}
      .emi-immersive-loading,.emi-immersive-empty{min-height:100dvh;background:#050806;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;padding:24px;text-align:center}.emi-immersive-empty h1{font-size:23px}.emi-immersive-empty p{color:#b8c1bb;line-height:1.6}.emi-immersive-empty>button:last-child{border:1px solid #bda45a;border-radius:12px;padding:12px 20px}.emi-immersive-spinner{width:32px;height:32px;border:3px solid #354237;border-top-color:#e6cb78;border-radius:50%;animation:emiReelSpin .8s linear infinite}@keyframes emiReelSpin{to{transform:rotate(360deg)}}
      @media(min-width:700px){.emi-immersive-slide{max-width:520px;margin:auto}.emi-immersive-scroller{background:#111}.emi-immersive-topbar,.emi-immersive-nav{padding-left:max(16px,calc((100vw - 520px)/2));padding-right:max(16px,calc((100vw - 520px)/2))}}
    `}</style>
  </main>;
}
