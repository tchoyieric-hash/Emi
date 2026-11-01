"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, Heart, MessageCircle, Volume2, VolumeX, Send, Repeat2,
  Home, Compass, Plus, Store, Clapperboard, UserRound, Bookmark, Crown, Search, Bell
} from "lucide-react";
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
const captionOf = (value: string | null) =>
  (value || "").replace(/^\s*\[EMI_REEL\]\s*/i, "")
    .replace(/\[EMI_MUSIC\][\s\S]*?(?:\[\/EMI_MUSIC\]|$)/gi, "").trim();
const formatCount = (value: number) =>
  value >= 1_000_000 ? (value / 1_000_000).toFixed(1).replace(/\.0$/, "") + " M"
    : value >= 1_000 ? (value / 1_000).toFixed(1).replace(/\.0$/, "") + " K"
      : String(value);

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
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);
  const [notice, setNotice] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const active = items[index];

  const load = useCallback(async () => {
    if (!supabase) {
      setError("La connexion à Supabase n’est pas configurée.");
      setLoading(false);
      return;
    }
    setError("");
    const requestedResult = await supabase.from("posts")
      .select("id,user_id,content,created_at,media_type,media_urls,visibility")
      .eq("id", requestedId).eq("media_type", "video").maybeSingle();
    const requestedPost = requestedResult.data as Reel | null;
    if (requestedPost?.media_urls?.length) {
      setItems([requestedPost]);
      setIndex(0);
      setLoading(false);
    }

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
    const videos = ((feedResult.data || []) as Reel[])
      .filter(post => Array.isArray(post.media_urls) && post.media_urls.length > 0);
    const merged = requestedPost?.media_urls?.length
      ? (videos.some(post => post.id === requestedPost.id) ? videos : [requestedPost, ...videos])
      : videos;
    const requestedIndex = merged.findIndex(post => String(post.id) === String(requestedId));
    setItems(merged);
    setIndex(requestedIndex >= 0 ? requestedIndex : 0);
    setLoading(false);

    const userIds = [...new Set(merged.map(post => post.user_id))];
    const postIds = merged.map(post => post.id);
    const [profileResult, likesResult, commentResult, authResult] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from("post_likes").select("post_id,user_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
      postIds.length ? supabase.from("post_comments").select("post_id").in("post_id", postIds) : Promise.resolve({ data: [] as any[] }),
      supabase.auth.getUser()
    ]);
    const profiles = new Map((profileResult.data || []).map((profile: any) => [profile.id, profile]));
    setItems(merged.map(post => ({ ...post, profiles: profiles.get(post.user_id) || null })));
    const likes: Record<string, number> = {};
    const mine: string[] = [];
    (likesResult.data || []).forEach((row: any) => {
      likes[row.post_id] = (likes[row.post_id] || 0) + 1;
      if (authResult.data.user?.id === row.user_id) mine.push(row.post_id);
    });
    const commentTotals: Record<string, number> = {};
    (commentResult.data || []).forEach((row: any) => {
      commentTotals[row.post_id] = (commentTotals[row.post_id] || 0) + 1;
    });
    setLikeCounts(likes);
    setLikedIds(mine);
    setCommentCounts(commentTotals);
  }, [requestedId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !items.length) return;
    root.querySelector<HTMLElement>('[data-reel-index="' + index + '"]')
      ?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [index, items]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLVideoElement>("video[data-reel-video]").forEach((video, i) => {
      if (i === index) {
        video.muted = !soundOn;
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [index, items, soundOn]);

  const toggleLike = async (post: Reel) => {
    if (!supabase) return;
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setNotice("Connecte-toi pour aimer cette vidéo."); return; }
    const wasLiked = likedIds.includes(post.id);
    setLikedIds(old => wasLiked ? old.filter(id => id !== post.id) : [...old, post.id]);
    setLikeCounts(old => ({ ...old, [post.id]: Math.max(0, (old[post.id] || 0) + (wasLiked ? -1 : 1)) }));
    const result = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", data.user.id)
      : await supabase.from("post_likes").upsert({ post_id: post.id, user_id: data.user.id }, { onConflict: "post_id,user_id" });
    if (result.error) {
      setLikedIds(old => wasLiked ? [...old, post.id] : old.filter(id => id !== post.id));
      setLikeCounts(old => ({ ...old, [post.id]: Math.max(0, (old[post.id] || 0) + (wasLiked ? 1 : -1)) }));
      setNotice("Le J’aime n’a pas pu être enregistré. Réessaie.");
    }
  };

  const openComments = async (post: Reel) => {
    if (!supabase) return;
    setCommentsOpen(true);
    setCommentsLoading(true);
    const result = await supabase.from("post_comments")
      .select("id,post_id,user_id,content,created_at")
      .eq("post_id", post.id).order("created_at", { ascending: true }).limit(100);
    if (result.error) {
      setNotice("Impossible de charger les commentaires.");
      setCommentsLoading(false);
      return;
    }
    const rows = result.data || [];
    const userIds = [...new Set(rows.map((row: any) => row.user_id).filter(Boolean))];
    const profileResult = userIds.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds)
      : { data: [] as any[] };
    const profiles = new Map((profileResult.data || []).map((profile: any) => [profile.id, profile]));
    setComments(rows.map((row: any) => ({ ...row, profile: profiles.get(row.user_id) || null })));
    setCommentsLoading(false);
  };

  const submitComment = async () => {
    const value = commentText.trim();
    if (!active || !supabase || !value || commentSending) return;
    setCommentSending(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setNotice("Connecte-toi pour commenter cette vidéo."); return; }
      const { error: insertError } = await supabase.from("post_comments").insert({
        post_id: active.id, user_id: auth.user.id, content: value
      });
      if (insertError) { setNotice("Échec de l’envoi du commentaire."); return; }
      const local = {
        id: "local-" + Date.now(), post_id: active.id, user_id: auth.user.id,
        content: value, created_at: new Date().toISOString(),
        profile: { display_name: auth.user.user_metadata?.display_name || auth.user.email?.split("@")[0] || "Moi" }
      };
      setComments(old => [...old, local]);
      setCommentCounts(old => ({ ...old, [active.id]: (old[active.id] || 0) + 1 }));
      setCommentText("");
    } catch {
      setNotice("Erreur réseau. Réessaie lorsque la connexion sera rétablie.");
    } finally {
      setCommentSending(false);
    }
  };

  const share = async (post: Reel) => {
    const url = window.location.origin + "/reels/" + post.id;
    try {
      if (navigator.share) await navigator.share({ title: "Reel EMi", text: captionOf(post.content) || "Regarde cette vidéo sur EMi", url });
      else { await navigator.clipboard.writeText(url); setNotice("Lien du Reel copié."); }
    } catch { /* partage annulé */ }
  };

  if (loading) return <main className="emi-reels-state"><span className="emi-reels-spinner"/><p>Préparation de ton flux vidéo…</p></main>;
  if (error) return <main className="emi-reels-state"><button onClick={() => router.back()}><ChevronLeft/> Retour</button><h1>Le lecteur EMi est indisponible</h1><p>{error}</p><button onClick={() => void load()}>Réessayer</button></main>;
  if (!items.length) return <main className="emi-reels-state"><h1>Aucune vidéo disponible</h1><p>Les vidéos publiques apparaîtront ici dès leur publication.</p><button onClick={() => router.push("/")}>Retour à l’accueil</button></main>;

  return (
    <main className="emi-reels-page">
      <div className="emi-reels-feed" ref={scrollerRef} onScroll={event => {
        const root = event.currentTarget;
        const next = Math.round(root.scrollTop / Math.max(1, root.clientHeight));
        setIndex(old => next !== old && next >= 0 && next < items.length ? next : old);
      }}>
        {items.map((post, i) => {
          const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi";
          const username = post.profiles?.username ? "@" + post.profiles.username : "@membre";
          const liked = likedIds.includes(post.id);
          const saved = savedIds.includes(post.id);
          const mediaUrl = post.media_urls?.[0];
          return (
            <section className="emi-reel-slide" data-reel-index={i} key={post.id}>
              {mediaUrl && <video
                data-reel-video src={mediaUrl} playsInline loop preload={i === index ? "auto" : Math.abs(i-index) === 1 ? "metadata" : "none"}
                muted={!soundOn || i !== index} controls={false}
                onClick={event => { const video = event.currentTarget; if (video.paused) void video.play().catch(() => undefined); else video.pause(); }}
                onLoadedMetadata={event => event.currentTarget.classList.toggle("emi-reel-landscape", event.currentTarget.videoWidth > event.currentTarget.videoHeight)}
              />}
              <div className="emi-reel-shade"/>
              <div className="emi-reel-author">
                <span className="emi-reel-avatar">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt={author}/> : author.slice(0,1).toUpperCase()}</span>
                <div className="emi-reel-author-copy"><strong>{author}</strong><span>{username} · {new Date(post.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span></div>
                <button className="emi-reel-follow" onClick={() => setNotice("Le suivi reste géré par ton profil EMi.")}>Suivre</button>
              </div>

              <div className="emi-reel-actions">
                <button className={liked ? "liked" : ""} aria-label="J’aime" onClick={() => void toggleLike(post)}><span className="emi-reel-action-circle"><Heart fill={liked ? "currentColor" : "none"}/></span><b>{formatCount(likeCounts[post.id] || 0)}</b></button>
                <button aria-label="Commentaires" onClick={() => void openComments(post)}><span className="emi-reel-action-circle"><MessageCircle/></span><b>{formatCount(commentCounts[post.id] || 0)}</b></button>
                <button aria-label="Repartager" onClick={() => void share(post)}><span className="emi-reel-action-circle"><Repeat2/></span><b>0</b></button>
                <button aria-label="Partager" onClick={() => void share(post)}><span className="emi-reel-action-circle"><Send/></span><b>Partager</b></button>
                <button className={saved ? "saved" : ""} aria-label={saved ? "Retirer des enregistrements" : "Enregistrer"} onClick={() => {
                  setSavedIds(old => saved ? old.filter(id => id !== post.id) : [...old, post.id]);
                  setNotice(saved ? "Retiré des éléments enregistrés sur cet appareil." : "Enregistré sur cet appareil.");
                }}><span className="emi-reel-action-circle"><Bookmark fill={saved ? "currentColor" : "none"}/></span></button>
                <button className="emi-reel-sound" aria-label={soundOn ? "Couper le son" : "Activer le son"} onClick={() => setSoundOn(value => !value)}>{soundOn ? <Volume2/> : <VolumeX/>}</button>
              </div>

              <div className="emi-reel-caption"><p>{captionOf(post.content)}</p></div>
            </section>
          );
        })}
      </div>

      <form className="emi-reels-comment" onSubmit={event => { event.preventDefault(); if (commentText.trim() && active) { if (!commentsOpen) void openComments(active); void submitComment(); } }}>
        <input value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Ajouter un commentaire…" aria-label="Ajouter un commentaire" maxLength={2000}/>
        <button type="submit" aria-label="Envoyer" disabled={!commentText.trim() || commentSending}><Send/></button>
      </form>


      {commentsOpen && <div className="emi-reels-backdrop" onClick={() => setCommentsOpen(false)}>
        <section className="emi-reels-comments" role="dialog" aria-modal="true" aria-label="Commentaires" onClick={event => event.stopPropagation()}>
          <div className="emi-reels-comments-head"><strong>Commentaires <span>{active ? commentCounts[active.id] || 0 : 0}</span></strong><button onClick={() => setCommentsOpen(false)} aria-label="Fermer">×</button></div>
          <div className="emi-reels-comments-list">
            {commentsLoading ? <p className="muted">Chargement…</p> : comments.length === 0 ? <p className="muted">Aucun commentaire pour le moment. Lance la conversation !</p> : comments.map((comment: any) => <article key={comment.id}><span className="comment-avatar">{(comment.profile?.display_name || comment.profile?.username || "M").slice(0,1).toUpperCase()}</span><div><strong>{comment.profile?.display_name || comment.profile?.username || "Membre EMi"}</strong><p>{comment.content}</p></div></article>)}
          </div>
          <form className="emi-reels-comment-form" onSubmit={event => { event.preventDefault(); void submitComment(); }}><input value={commentText} onChange={event => setCommentText(event.target.value)} placeholder="Écrire un commentaire…"/><button disabled={!commentText.trim() || commentSending}>Envoyer</button></form>
        </section>
      </div>}
      {notice && <button className="emi-reels-notice" onClick={() => setNotice("")}>{notice}<span>×</span></button>}

      <style jsx global>{\`
        .emi-reels-page{position:fixed;inset:0;z-index:9999;width:100%;height:100dvh;overflow:hidden;background:#020a06;color:#fff;font-family:'DM Sans',Roboto,system-ui,sans-serif;isolation:isolate}
        .emi-reels-feed{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:#000}
        .emi-reels-feed::-webkit-scrollbar{display:none}
        .emi-reel-slide{position:relative;width:100%;height:100dvh;min-height:100dvh;overflow:hidden;scroll-snap-align:start;scroll-snap-stop:always;background:#000;isolation:isolate}
        .emi-reel-slide>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;background:#000}
        .emi-reel-slide>video.emi-reel-landscape{object-fit:contain;object-position:center;background:#000}
        .emi-reel-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,12,7,.78) 0%,rgba(0,0,0,.04) 20%,transparent 49%,rgba(0,0,0,.12) 65%,rgba(0,0,0,.72) 100%)}
        .emi-reels-topbar{position:absolute;z-index:8;top:0;left:0;right:0;height:calc(76px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 17px 0;display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(180deg,rgba(0,13,7,.82),rgba(0,13,7,.44));border-bottom:1px solid rgba(224,190,91,.24);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
        .emi-reels-brand{display:flex;align-items:center;gap:7px;flex:0 0 auto;color:#f6d66d;background:none;border:0;padding:0}
        .emi-reels-brand>span{font-family:Manrope,'DM Sans',sans-serif;font-size:26px;line-height:.9;font-weight:900;letter-spacing:-1.4px;color:#f8d66e}
        .emi-reels-brand small{display:block;margin-top:5px;font-size:7px;letter-spacing:1.1px;font-weight:900;color:#f8e9b5;white-space:nowrap}
        .emi-reels-tabs{display:flex;align-items:center;justify-content:center;gap:0;min-width:0;padding:4px;border:1px solid rgba(232,199,105,.3);border-radius:28px;background:rgba(0,0,0,.28)}
        .emi-reels-tabs button{padding:9px 11px;border:0;border-radius:22px;background:transparent;color:#e8e8df;font-size:12px;font-weight:700;white-space:nowrap}
        .emi-reels-tabs button.active{background:linear-gradient(135deg,#f6df88,#b98a24);color:#172016;box-shadow:0 3px 13px #d9ac3d40}
        .emi-reels-top-actions{display:flex;align-items:center;gap:9px}
        .emi-reels-top-actions button{position:relative;width:34px;height:38px;display:grid;place-items:center;border:0;background:none;color:#f4d66e}
        .emi-reels-top-actions svg{width:23px;height:23px;stroke-width:2}
        .emi-reel-author{position:absolute;z-index:3;left:19px;right:91px;bottom:calc(164px + env(safe-area-inset-bottom));min-height:52px;padding:0;display:flex;align-items:center;gap:9px;background:transparent;border:0;border-radius:0}
        .emi-reel-avatar{width:47px;height:47px;flex:0 0 47px;border-radius:50%;padding:2px;background:linear-gradient(145deg,#fff0a9,#d4a735,#fff0a9);display:grid;place-items:center;color:#211905;font-weight:900;overflow:hidden;box-shadow:0 0 0 2px rgba(9,40,23,.9)}
        .emi-reel-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #07150d}
        .emi-reel-author-copy{min-width:0;display:flex;flex-direction:column;gap:3px;max-width:calc(100% - 115px)}
        .emi-reel-author-copy strong{font-size:14px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 7px #000}
        .emi-reel-author-copy span{display:block;font-size:11px;color:#f0eee5;text-shadow:0 1px 5px #000}
        .emi-reel-follow{height:37px;padding:0 14px;border:1px solid #e9c65c;border-radius:22px;background:rgba(0,0,0,.24);color:#ffe18a;font-size:12px;font-weight:800;white-space:nowrap}
        .emi-reel-actions{position:absolute;z-index:4;right:12px;top:39%;display:flex;flex-direction:column;align-items:center;gap:8px}
        .emi-reel-actions>button{min-width:42px;display:flex;flex-direction:column;align-items:center;gap:3px;color:#fff;text-shadow:0 2px 6px #000}
        .emi-reel-action-circle{width:42px;height:42px;display:grid;place-items:center;border-radius:50%;border:0;background:rgba(0,0,0,.17)}
        .emi-reel-action-circle svg{width:26px;height:26px;stroke-width:2.05;filter:drop-shadow(0 1px 3px #000)}
        .emi-reel-actions b{font-size:11px;font-weight:800}
        .emi-reel-actions>button.liked{color:#ff5572}
        .emi-reel-actions>button.saved{color:#f8d66e}
        .emi-reel-actions .emi-reel-sound{width:43px;height:43px;min-width:43px;margin-top:3px;border:1.5px solid #e7c45b;border-radius:50%;background:rgba(0,12,7,.75);color:#f8d66e;display:grid;place-items:center;box-shadow:0 0 15px #d6a93625}
        .emi-reel-actions .emi-reel-sound svg{width:21px;height:21px}
        .emi-reel-caption{position:absolute;z-index:3;left:20px;right:84px;bottom:calc(119px + env(safe-area-inset-bottom));text-shadow:0 2px 8px #000}
        .emi-reel-caption p{margin:0;font-size:14px;line-height:1.4;font-weight:650;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .emi-reels-comment{position:absolute;z-index:9;left:14px;right:14px;bottom:calc(78px + env(safe-area-inset-bottom));height:58px;display:flex;align-items:center;gap:8px;padding:5px 8px 5px 17px;border:1px solid #e5c15b;border-radius:32px;background:rgba(2,15,8,.91);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 4px 24px #0006}
        .emi-reels-comment input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:14px}
        .emi-reels-comment input::placeholder{color:#d0d2cc}
        .emi-reels-comment button{width:42px;height:42px;flex:0 0 42px;display:grid;place-items:center;border-radius:50%;background:linear-gradient(135deg,#ffe98b,#d2a32e);color:#142016}
        .emi-reels-comment button svg{width:20px}
        .emi-reels-comment button:disabled{opacity:.4}
        .emi-reels-bottomnav{position:absolute;z-index:10;left:0;right:0;bottom:0;height:calc(76px + env(safe-area-inset-bottom));padding:7px 8px env(safe-area-inset-bottom);display:flex;align-items:center;justify-content:space-around;gap:2px;background:rgba(0,13,7,.96);border-top:1px solid rgba(228,192,86,.48);box-shadow:0 -8px 25px #0006;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .emi-reels-bottomnav>button{height:57px;min-width:0;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:0;background:transparent;color:#d6ddd5;font-size:10px;font-weight:600;white-space:nowrap}
        .emi-reels-bottomnav>button svg{width:21px;height:21px;stroke-width:1.9}
        .emi-reels-bottomnav>button.selected{color:#f7d66e}
        .emi-reels-bottomnav>button.selected svg{filter:drop-shadow(0 0 6px #e8bd4d80)}
        .emi-reels-bottomnav>button.emi-reels-create{flex:0 0 57px;width:57px;height:57px;border-radius:50%;background:linear-gradient(145deg,#fff0a2,#e2b53d 68%,#a8791b);color:#172016;border:2px solid #ffeb9a;box-shadow:0 0 0 4px rgba(221,178,61,.13),0 4px 16px #d4a43155}
        .emi-reels-bottomnav>button.emi-reels-create svg{width:29px;height:29px;stroke-width:2.5}
        .emi-reels-backdrop{position:absolute;inset:0;z-index:12;background:#000b;display:flex;align-items:flex-end;backdrop-filter:blur(6px)}
        .emi-reels-comments{width:100%;height:min(72dvh,650px);display:flex;flex-direction:column;background:linear-gradient(160deg,#102019,#050806);border:1px solid #e8b94a55;border-radius:23px 23px 0 0;padding-bottom:env(safe-area-inset-bottom);overflow:hidden}
        .emi-reels-comments-head{height:56px;flex:0 0 56px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #ffffff20;position:relative}
        .emi-reels-comments-head strong{font-size:15px}.emi-reels-comments-head strong span{color:#f7d774;margin-left:5px}
        .emi-reels-comments-head button{position:absolute;right:14px;width:34px;height:34px;border:1px solid #ffffff30;border-radius:50%;font-size:23px;color:#fff}
        .emi-reels-comments-list{flex:1;overflow-y:auto;padding:15px;display:flex;flex-direction:column;gap:13px}
        .emi-reels-comments-list .muted{margin:auto;color:#aeb7b3;text-align:center;font-size:13px}
        .emi-reels-comments-list article{display:flex;gap:9px;align-items:flex-start}
        .emi-reels-comments-list article>div{padding:9px 12px;border-radius:13px;background:#ffffff10;min-width:0}
        .emi-reels-comments-list article strong{font-size:12px;color:#f7d774}
        .emi-reels-comments-list article p{margin:4px 0 0;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere}
        .comment-avatar{width:34px;height:34px;flex:0 0 34px;border-radius:50%;display:grid;place-items:center;background:#183c2d;color:#f7d774;font-weight:800}
        .emi-reels-comment-form{display:flex;gap:8px;padding:11px;border-top:1px solid #ffffff20}
        .emi-reels-comment-form input{flex:1;min-width:0;border:1px solid #ffffff30;border-radius:22px;background:#ffffff0d;color:#fff;padding:11px 14px;outline:0}
        .emi-reels-comment-form button{border-radius:22px;padding:0 15px;background:#e8b94a;color:#211905;font-weight:800}
        .emi-reels-comment-form button:disabled{opacity:.45}
        .emi-reels-notice{position:absolute;z-index:15;left:15px;right:15px;bottom:calc(165px + env(safe-area-inset-bottom));padding:13px 15px;border:1px solid #e8b94a66;border-radius:14px;background:#102019;color:#fff;text-align:left;box-shadow:0 8px 25px #0008}
        .emi-reels-notice span{float:right;color:#f7d774}
        .emi-reels-state{min-height:100dvh;background:#050806;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
        .emi-reels-state button{display:flex;align-items:center;gap:7px;border:1px solid #e8b94a;border-radius:24px;padding:11px 17px;color:#f7d774}
        .emi-reels-spinner{width:32px;height:32px;border:3px solid #34443a;border-top-color:#f7d774;border-radius:50%;animation:emiReelSpin .8s linear infinite}
        @keyframes emiReelSpin{to{transform:rotate(360deg)}}
        @media(min-width:700px){.emi-reels-page{max-width:480px;left:50%;right:auto;width:100%;transform:translateX(-50%);border-left:1px solid #ffffff16;border-right:1px solid #ffffff16}}
        @media(max-width:390px){.emi-reels-brand>span{font-size:22px}.emi-reels-brand small{font-size:6px}.emi-reels-brand>svg{width:27px}.emi-reels-tabs button{padding:8px 8px;font-size:11px}.emi-reels-top-actions{gap:2px}.emi-reels-top-actions button{width:29px}.emi-reel-actions{right:8px;gap:6px}.emi-reel-action-circle{width:39px;height:39px}.emi-reel-author{left:13px;right:77px}.emi-reel-caption{left:16px;right:76px}}
        @media(max-height:720px){.emi-reel-actions{top:36%;gap:5px}.emi-reel-action-circle{width:38px;height:38px}.emi-reel-author{bottom:calc(153px + env(safe-area-inset-bottom))}.emi-reel-caption{bottom:calc(112px + env(safe-area-inset-bottom))}}
        @media(prefers-reduced-motion:reduce){.emi-reels-page *{animation:none!important;scroll-behavior:auto!important}}
      \`}</style>
    </main>
  );
}
