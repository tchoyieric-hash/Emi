"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft, Heart, MessageCircle, Volume2, VolumeX, Send, Repeat2,
  Home, Compass, Plus, Store, Clapperboard, UserRound, Bookmark, MoreHorizontal
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
                <button className="emi-reel-sound" aria-label={soundOn ? "Couper le son" : "Activer le son"} onClick={() => setSoundOn(value => !value)}>{soundOn ? <Volume2/> : <VolumeX/>}</button>
              </div>

              <div className="emi-reel-caption"><p>{captionOf(post.content)}</p></div>
              <button className={"emi-reel-save " + (saved ? "saved" : "")} aria-label={saved ? "Retirer des enregistrements" : "Enregistrer"} onClick={() => {
                setSavedIds(old => saved ? old.filter(id => id !== post.id) : [...old, post.id]);
                setNotice(saved ? "Retiré des éléments enregistrés sur cet appareil." : "Enregistré sur cet appareil.");
              }}><Bookmark fill={saved ? "currentColor" : "none"}/></button>
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

      <style jsx global>{`
        .emi-reels-page{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#000;color:#fff;font-family:Roboto,system-ui,-apple-system,sans-serif;isolation:isolate}
        .emi-reels-feed{position:absolute;inset:0 0 calc(78px + env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;background:#000}
        .emi-reels-feed::-webkit-scrollbar{display:none}
        .emi-reel-slide{position:relative;width:100%;height:100%;min-height:100%;overflow:hidden;scroll-snap-align:start;scroll-snap-stop:always;background:#000;isolation:isolate}
        .emi-reel-slide>video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;background:#000}
        .emi-reel-slide>video.emi-reel-landscape{object-fit:contain;object-position:center;background:#000}
        .emi-reel-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.12),transparent 35%,rgba(0,0,0,.08) 56%,rgba(0,0,0,.62) 100%)}
        .emi-reel-author{position:absolute;z-index:3;left:22px;right:88px;bottom:77px;min-height:54px;padding:0;display:flex;align-items:center;gap:10px;background:transparent;border:0;border-radius:0;backdrop-filter:none}
        .emi-reel-avatar{width:48px;height:48px;flex:0 0 48px;border-radius:50%;padding:2px;background:linear-gradient(145deg,#f7d774,#b8862b);display:grid;place-items:center;color:#211905;font-weight:900;overflow:hidden}
        .emi-reel-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #050806}
        .emi-reel-author-copy{min-width:0;display:flex;flex-direction:column;gap:3px;max-width:calc(100% - 130px)}
        .emi-reel-author-copy strong{font-size:15px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 2px 5px #000}
        .emi-reel-author-copy span{display:none}
        .emi-reel-follow{height:40px;padding:0 16px;border:1.5px solid #fff;border-radius:9px;background:rgba(0,0,0,.18);color:#fff;font-size:14px;font-weight:750;white-space:nowrap}
        .emi-reel-actions{position:absolute;z-index:4;right:17px;top:39%;display:flex;flex-direction:column;align-items:center;gap:14px}
        .emi-reel-actions>button{min-width:48px;display:flex;flex-direction:column;align-items:center;gap:4px;color:#fff;text-shadow:0 2px 5px #000}
        .emi-reel-action-circle{width:46px;height:46px;display:grid;place-items:center;border-radius:50%;border:0;background:transparent;backdrop-filter:none}
        .emi-reel-action-circle svg{width:29px;height:29px;stroke-width:2.15;filter:drop-shadow(0 1px 3px #000)}
        .emi-reel-actions b{font-size:12px;font-weight:800}
        .emi-reel-actions>button.liked{color:#ff5472}
        .emi-reel-actions>button.liked .emi-reel-action-circle{background:transparent}
        .emi-reel-actions .emi-reel-sound{width:38px;height:38px;min-width:38px;margin-top:3px;border:1px solid rgba(255,255,255,.8);border-radius:50%;background:rgba(0,0,0,.42);color:#fff;display:grid;place-items:center}
        .emi-reel-actions .emi-reel-sound svg{width:20px;height:20px}
        .emi-reel-caption{position:absolute;z-index:3;left:30px;right:92px;bottom:29px;text-shadow:0 2px 7px #000}
        .emi-reel-caption p{margin:0;font-size:14px;line-height:1.4;font-weight:550;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .emi-reel-save{position:absolute;z-index:4;right:19px;bottom:117px;width:42px;height:42px;border:0;border-radius:50%;background:transparent;color:#fff;display:grid;place-items:center}
        .emi-reel-save svg{width:28px;height:28px;filter:drop-shadow(0 1px 3px #000)}
        .emi-reel-save.saved{color:#f7d774}
        .emi-reels-comment{position:absolute;z-index:7;left:16px;right:16px;bottom:calc(9px + env(safe-area-inset-bottom));height:62px;display:flex;align-items:center;gap:8px;padding:5px 8px 5px 20px;border:0;border-radius:34px;background:#25282d;backdrop-filter:none}
        .emi-reels-comment input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#fff;font-size:15px}
        .emi-reels-comment input::placeholder{color:#e0e1e4}
        .emi-reels-comment button{width:40px;height:40px;flex:0 0 40px;display:grid;place-items:center;border-radius:50%;background:transparent;color:#fff}
        .emi-reels-comment button svg{width:19px}
        .emi-reels-comment button:disabled{opacity:0}
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
        .emi-reels-notice{position:absolute;z-index:15;left:15px;right:15px;bottom:calc(90px + env(safe-area-inset-bottom));padding:13px 15px;border:1px solid #e8b94a66;border-radius:14px;background:#102019;color:#fff;text-align:left;box-shadow:0 8px 25px #0008}
        .emi-reels-notice span{float:right;color:#f7d774}
        .emi-reels-state{min-height:100dvh;background:#050806;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
        .emi-reels-state button{display:flex;align-items:center;gap:7px;border:1px solid #e8b94a;border-radius:24px;padding:11px 17px;color:#f7d774}
        .emi-reels-spinner{width:32px;height:32px;border:3px solid #34443a;border-top-color:#f7d774;border-radius:50%;animation:emiReelSpin .8s linear infinite}
        @keyframes emiReelSpin{to{transform:rotate(360deg)}}
        @media(min-width:700px){.emi-reels-page{max-width:480px;left:50%;right:auto;width:100%;transform:translateX(-50%);border-left:1px solid #ffffff16;border-right:1px solid #ffffff16}}
        @media(max-height:720px){.emi-reel-actions{top:34%;gap:9px}.emi-reel-action-circle{width:40px;height:40px}.emi-reel-author{bottom:72px}.emi-reel-caption{bottom:24px}}
        @media(max-width:380px){.emi-reel-actions{right:10px;gap:10px}.emi-reel-action-circle{width:42px;height:42px}.emi-reel-author{left:14px;right:76px}.emi-reel-caption{left:18px;right:76px}}
        @media(prefers-reduced-motion:reduce){.emi-reels-page *{animation:none!important;scroll-behavior:auto!important}}
      `}</style>
    </main>
  );
}
