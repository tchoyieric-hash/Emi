"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Heart, MessageCircle, Volume2, VolumeX, Share2 } from "lucide-react";
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
  const [soundOn, setSoundOn] = useState(false);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const active = items[index];

  const load = useCallback(async () => {
    if (!supabase) {
      setError("La connexion à Supabase n’est pas configurée.");
      setLoading(false);
      return;
    }
    setError("");

    // Priorité à la vidéo sélectionnée : ne pas attendre le flux complet pour l'afficher.
    const requestedResult = await supabase.from("posts")
      .select("id,user_id,content,created_at,media_type,media_urls,visibility")
      .eq("id", requestedId).eq("media_type", "video").maybeSingle();

    const requestedPost = requestedResult.data as Reel | null;
    if (requestedPost && Array.isArray(requestedPost.media_urls) && requestedPost.media_urls.length > 0) {
      setItems([requestedPost]);
      setIndex(0);
      setLoading(false);
    }

    // Récupérer ensuite les vidéos publiques, sans bloquer l'affichage initial.
    const feedResult = await supabase.from("posts")
      .select("id,user_id,content,created_at,media_type,media_urls,visibility")
      .eq("visibility", "public").eq("media_type", "video")
      .order("created_at", { ascending: false }).limit(30);

    if (feedResult.error) {
      if (!requestedPost) {
        setError("Impossible de charger les vidéos : " + feedResult.error.message);
        setLoading(false);
      }
      return;
    }

    const videos = ((feedResult.data || []) as Reel[]).filter(p => Array.isArray(p.media_urls) && p.media_urls.length > 0);
    const merged = requestedPost && Array.isArray(requestedPost.media_urls) && requestedPost.media_urls.length > 0
      ? (videos.some(p => p.id === requestedPost.id) ? videos : [requestedPost, ...videos])
      : videos;
    setItems(merged);
    const requestedIndex = merged.findIndex(p => String(p.id) === String(requestedId));
    setIndex(requestedIndex >= 0 ? requestedIndex : 0);
    setLoading(false);

    // Profils, likes et session sont secondaires : les charger après que les vidéos soient visibles.
    const ids = [...new Set(merged.map(p => p.user_id))];
    const postIds = merged.map(p => p.id);
    const [profileResult, likesResult, authResult] = await Promise.all([
      ids.length ? supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from("post_likes").select("post_id,user_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
      supabase.auth.getUser()
    ]);
    const byId = new Map((profileResult.data || []).map((p: any) => [p.id, p]));
    setItems(merged.map(p => ({ ...p, profiles: byId.get(p.user_id) || null })));
    const counts: Record<string, number> = {};
    const mine: string[] = [];
    (likesResult.data || []).forEach((row: any) => {
      counts[row.post_id] = (counts[row.post_id] || 0) + 1;
      if (row.user_id) mine.push(row.post_id + ":" + row.user_id);
    });
    setLikeCounts(counts);
    if (authResult.data.user) setLikedIds(mine.filter(v => v.endsWith(":" + authResult.data.user!.id)).map(v => v.split(":")[0]));
  }, [requestedId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !items.length) return;
    const child = root.querySelector<HTMLElement>('[data-reel-index="' + index + '"]');
    if (child) child.scrollIntoView({ behavior: "auto", block: "start" });
    // Ne pas remplacer l’URL à chaque swipe : cela relançait le chargement complet et bloquait le flux.
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

  const openComments = async (post: Reel) => {
    if (!supabase) { setMessage("Connexion indisponible."); return; }
    setCommentsOpen(true);
    setCommentsLoading(true);
    setComments([]);
    const result = await supabase.from("post_comments")
      .select("id,post_id,user_id,content,created_at")
      .eq("post_id", post.id).order("created_at", { ascending: true }).limit(100);
    if (result.error) {
      setMessage("Impossible de charger les commentaires : " + result.error.message);
      setCommentsLoading(false);
      return;
    }
    const rows = result.data || [];
    const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))];
    const profiles = userIds.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const byId = new Map((profiles.data || []).map((p: any) => [p.id, p]));
    setComments(rows.map((row: any) => ({ ...row, profile: byId.get(row.user_id) || null })));
    setCommentsLoading(false);
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!active || !supabase || !text || commentSending) return;
    setCommentSending(true);
    setMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setMessage("Connecte-toi pour commenter cette vidéo.");
        return;
      }

      // Same write-only insert used by the working Home feed. Avoid chained SELECT,
      // which may fail when row-level security permits INSERT but not SELECT.
      const { error: insertError } = await supabase.from("post_comments").insert({
        post_id: active.id,
        user_id: authData.user.id,
        content: text
      });
      if (insertError) {
        setMessage("Échec de l’envoi : " + insertError.message);
        return;
      }

      const localComment = {
        id: `local-${Date.now()}`,
        post_id: active.id,
        user_id: authData.user.id,
        content: text,
        created_at: new Date().toISOString(),
        profile: {
          display_name: authData.user.user_metadata?.display_name || authData.user.email?.split("@")[0] || "Moi"
        }
      };
      setComments(old => [...old, localComment]);
      setCommentText("");
    } catch {
      setMessage("Erreur réseau pendant l’envoi. Vérifie ta connexion puis réessaie.");
    } finally {
      setCommentSending(false);
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
  if (!items.length) return <main className="emi-immersive-empty"><button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }}><ChevronLeft size={20}/> Accueil</button><h1>Aucune vidéo disponible pour le moment</h1><p>Les vidéos publiques apparaîtront ici dès qu’elles seront publiées.</p></main>;

  return <main className="emi-immersive-shell">
    <div className="emi-immersive-topbar"><button aria-label="Retour" onClick={() => router.push("/")}><ChevronLeft size={24}/></button><strong>EMi <span>REELS</span></strong><span className="emi-immersive-counter">{index + 1} / {items.length}</span></div>
    <div className="emi-immersive-scroller" ref={scrollerRef} onScroll={e => { const root = e.currentTarget; const next = Math.round(root.scrollTop / Math.max(1, root.clientHeight)); setIndex(old => next !== old && next >= 0 && next < items.length ? next : old); }}>
      {items.map((post, i) => {
        const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi";
        const url = post.media_urls?.[0];
        return <section className="emi-immersive-slide" data-reel-index={i} key={post.id}>
          {url && <video data-reel-video playsInline loop preload={i === index ? "auto" : Math.abs(i - index) === 1 ? "metadata" : "none"} src={url} muted={i !== index || !soundOn} controls={false} onClick={e => { const v=e.currentTarget; if(v.paused) void v.play().catch(()=>undefined); else v.pause(); }} />}
          <div className="emi-immersive-shade" />
          <div className="emi-immersive-author"><span className="emi-immersive-avatar">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" /> : author.slice(0,1).toUpperCase()}</span><strong>{author}</strong><span className="emi-immersive-follow-label">· EMi</span></div>
          <div className="emi-immersive-caption"><strong>{isReel(post) ? "REEL" : "VIDÉO"}</strong><p>{captionOf(post.content) || "Découvre ce moment sur EMi."}</p></div>
          <div className="emi-immersive-actions">
            <button aria-label={likedIds.includes(post.id) ? "Retirer le J’aime" : "Aimer"} onClick={() => void toggleLike(post)} className={likedIds.includes(post.id) ? "is-liked" : ""}><Heart size={27} fill={likedIds.includes(post.id) ? "currentColor" : "none"}/><span>{likeCounts[post.id] || 0}</span></button>
            <button aria-label="Commentaires" onClick={() => void openComments(post)}><MessageCircle size={26}/><span>Commenter</span></button>
            <button aria-label="Partager" onClick={() => void share(post)}><Share2 size={25}/><span>Partager</span></button>
            <button aria-label={soundOn ? "Couper le son" : "Activer le son"} onClick={() => setSoundOn(v => !v)}>{soundOn ? <Volume2 size={24}/> : <VolumeX size={24}/>}<span>{soundOn ? "Son" : "Muet"}</span></button>
          </div>
        </section>;
      })}
    </div>
    {commentsOpen && <div className="emi-comments-backdrop" onClick={() => setCommentsOpen(false)}>
      <section className="emi-comments-panel" role="dialog" aria-modal="true" aria-label="Commentaires" onClick={e => e.stopPropagation()}>
        <div className="emi-comments-head"><strong>Commentaires</strong><button aria-label="Fermer les commentaires" onClick={() => setCommentsOpen(false)}>×</button></div>
        <div className="emi-comments-list">
          {commentsLoading ? <p className="emi-comments-muted">Chargement des commentaires…</p> : comments.length === 0 ? <p className="emi-comments-muted">Aucun commentaire pour le moment. Lance la conversation !</p> : comments.map((comment: any) => <article className="emi-comment" key={comment.id}><span className="emi-comment-avatar">{(comment.profile?.display_name || comment.profile?.username || "M").slice(0,1).toUpperCase()}</span><div><strong>{comment.profile?.display_name || comment.profile?.username || "Membre EMi"}</strong><p>{comment.content}</p></div></article>)}
        </div>
        <form className="emi-comment-form" onSubmit={e => { e.preventDefault(); void submitComment(); }}>
          <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Écrire un commentaire…" maxLength={2000} aria-label="Écrire un commentaire" />
          <button type="submit" disabled={!commentText.trim() || commentSending}>{commentSending ? "…" : "Envoyer"}</button>
        </form>
      </section>
    </div>}
    {message && <button className="emi-immersive-toast" onClick={() => setMessage("")}>{message} <span>×</span></button>}
    <style jsx global>{`
      .emi-immersive-shell{position:fixed;inset:0;z-index:9999;background:#030504;color:#fff;font-family:Arial,sans-serif;display:flex;flex-direction:column;overflow:hidden}
      .emi-immersive-topbar{height:48px;flex:0 0 48px;display:flex;align-items:center;gap:14px;padding:0 16px;background:#07130e;border-bottom:1px solid #bda45a55;z-index:3}
      .emi-immersive-topbar button,.emi-immersive-empty button{border:0;background:transparent;color:#f0d78b;display:flex;align-items:center;gap:5px;padding:8px}
      .emi-immersive-topbar strong{font-size:16px;letter-spacing:2px}.emi-immersive-topbar strong span{color:#e6cb78;font-size:10px;margin-left:5px}.emi-immersive-counter{margin-left:auto;color:#e3d5a4;font-size:12px}
      .emi-immersive-scroller{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;scrollbar-width:none;touch-action:pan-y;-webkit-overflow-scrolling:touch}.emi-immersive-scroller::-webkit-scrollbar{display:none}
      .emi-immersive-slide{height:100%;min-height:100%;flex:0 0 100%;position:relative;scroll-snap-align:start;scroll-snap-stop:always;background:#090b0a;overflow:hidden;isolation:isolate}
      .emi-immersive-slide>video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:-2}
      .emi-immersive-shade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#0009,transparent 22%,transparent 58%,#000b 100%);z-index:-1}
      .emi-immersive-author{position:absolute;top:22px;left:18px;display:flex;align-items:center;gap:9px;text-shadow:0 2px 8px #000;font-size:14px}.emi-immersive-avatar{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#d8bd6e;color:#10140d;border:2px solid #f4df9b;overflow:hidden;font-weight:800}.emi-immersive-avatar img{width:100%;height:100%;object-fit:cover}.emi-immersive-follow-label{color:#e7d59a;font-size:12px}
      .emi-immersive-caption{position:absolute;left:18px;right:86px;bottom:36px;text-shadow:0 2px 8px #000}.emi-immersive-caption>strong{display:inline-block;border:1px solid #e5cc78;border-radius:20px;padding:5px 9px;color:#f0d88c;font-size:10px;letter-spacing:1.5px}.emi-immersive-caption p{font-size:15px;line-height:1.5;margin:10px 0 0;overflow-wrap:anywhere}
      .emi-immersive-actions{position:absolute;right:13px;bottom:42px;display:flex;flex-direction:column;align-items:center;gap:20px}.emi-immersive-actions button{border:0;background:#05070575;color:#fff;border-radius:30px;min-width:50px;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:6px 4px;text-shadow:0 2px 5px #000}.emi-immersive-actions button span{font-size:10px}.emi-immersive-actions button.is-liked{color:#ff4e72}
      .emi-comments-backdrop{position:absolute;inset:0;z-index:8;background:#0009;display:flex;align-items:flex-end}
      .emi-comments-panel{width:100%;height:min(70%,620px);background:#101712;border:1px solid #bda45a77;border-radius:22px 22px 0 0;display:flex;flex-direction:column;color:#fff;overflow:hidden;padding-bottom:env(safe-area-inset-bottom)}
      .emi-comments-head{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #ffffff18;position:relative}.emi-comments-head strong{font-size:16px}.emi-comments-head button{position:absolute;right:16px;border:0;background:transparent;color:#f0d78b;font-size:28px}
      .emi-comments-list{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:16px}.emi-comments-muted{color:#b8c1bb;text-align:center;margin:auto;line-height:1.5}
      .emi-comment{display:flex;align-items:flex-start;gap:10px}.emi-comment-avatar{flex:0 0 34px;height:34px;border-radius:50%;background:#d8bd6e;color:#10140d;display:grid;place-items:center;font-weight:800}.emi-comment>div{min-width:0;background:#1a241d;border-radius:14px;padding:9px 12px}.emi-comment strong{font-size:12px;color:#e7d59a}.emi-comment p{font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0 0}
      .emi-comment-form{display:flex;gap:8px;padding:12px;border-top:1px solid #ffffff18}.emi-comment-form input{flex:1;min-width:0;background:#080d09;color:white;border:1px solid #ffffff25;border-radius:22px;padding:12px 14px;outline:none}.emi-comment-form button{border:1px solid #bda45a;border-radius:22px;background:#d8bd6e;color:#11180f;font-weight:700;padding:0 14px}.emi-comment-form button:disabled{opacity:.5}
      .emi-immersive-toast{position:absolute;bottom:64px;left:16px;right:16px;border:1px solid #bda45a;background:#101a14;color:white;padding:13px;border-radius:13px;text-align:left;z-index:5}.emi-immersive-toast span{float:right}
      .emi-immersive-loading,.emi-immersive-empty{min-height:100dvh;background:#050806;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;padding:24px;text-align:center}.emi-immersive-empty h1{font-size:23px}.emi-immersive-empty p{color:#b8c1bb;line-height:1.6}.emi-immersive-empty>button:last-child{border:1px solid #bda45a;border-radius:12px;padding:12px 20px}.emi-immersive-spinner{width:32px;height:32px;border:3px solid #354237;border-top-color:#e6cb78;border-radius:50%;animation:emiReelSpin .8s linear infinite}@keyframes emiReelSpin{to{transform:rotate(360deg)}}
      @media(min-width:700px){.emi-immersive-slide{max-width:520px;margin:auto}.emi-immersive-scroller{background:#111}.emi-immersive-topbar{padding-left:max(16px,calc((100vw - 520px)/2));padding-right:max(16px,calc((100vw - 520px)/2))}}
    `}</style>
  </main>;
}
