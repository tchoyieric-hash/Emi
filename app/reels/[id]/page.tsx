"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Heart, MessageCircle, Volume2, VolumeX, Share2, Home, Compass, Plus, Store, Clapperboard, UserRound, Repeat2, Send } from "lucide-react";
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
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
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
    const commentCountResult = postIds.length ? await supabase.from("post_comments").select("post_id").in("post_id", postIds) : { data: [] as any[] };
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
    const commentTotals: Record<string, number> = {};
    (commentCountResult.data || []).forEach((row: any) => { commentTotals[row.post_id] = (commentTotals[row.post_id] || 0) + 1; });
    setCommentCounts(commentTotals);
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
      setCommentCounts(old => ({ ...old, [active.id]: (old[active.id] || 0) + 1 }));
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
    <header className="emi-immersive-topbar">
      <button aria-label="Retour à l’accueil" onClick={() => router.push("/")}><ChevronLeft size={25}/></button>
      <div className="emi-reels-brand"><strong>EMi<span>.</span></strong><small>REELS</small></div>
      <span className="emi-immersive-counter">{index + 1}<i>/</i>{items.length}</span>
    </header>

    <div className="emi-immersive-scroller" ref={scrollerRef} onScroll={e => {
      const root = e.currentTarget;
      const next = Math.round(root.scrollTop / Math.max(1, root.clientHeight));
      setIndex(old => next !== old && next >= 0 && next < items.length ? next : old);
    }}>
      {items.map((post, i) => {
        const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi";
        const username = post.profiles?.username ? "@" + post.profiles.username : "@membre";
        const url = post.media_urls?.[0];
        const isLiked = likedIds.includes(post.id);
        return <section className="emi-immersive-slide" data-reel-index={i} key={post.id}>
          {url && <video
            data-reel-video
            playsInline
            loop
            preload={i === index ? "auto" : Math.abs(i - index) === 1 ? "metadata" : "none"}
            src={url}
            muted={i !== index || !soundOn}
            controls={false}
            onClick={e => {
              const video = e.currentTarget;
              if (video.paused) void video.play().catch(() => undefined);
              else video.pause();
            }}
          />}
          <div className="emi-immersive-shade" />

          <div className="emi-immersive-author">
            <span className="emi-immersive-avatar">
              {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt={"Photo de " + author}/> : author.slice(0,1).toUpperCase()}
            </span>
            <div className="emi-immersive-author-copy">
              <strong>{author}</strong>
              <span>{username}<i>·</i>{new Date(post.created_at).toLocaleDateString("fr-FR",{day:"2-digit",month:"short"})}</span>
            </div>
            <button className="emi-immersive-more" aria-label="Options de la vidéo" onClick={() => setMessage("Options supplémentaires bientôt disponibles.")}>•••</button>
          </div>

          <button className="emi-immersive-sound" aria-label={soundOn ? "Couper le son" : "Activer le son"} onClick={() => setSoundOn(value => !value)}>
            {soundOn ? <Volume2 size={22}/> : <VolumeX size={22}/>}
          </button>

          <div className="emi-immersive-caption">
            <p>{captionOf(post.content) || "Découvre ce moment sur EMi."}</p>
            <span className="emi-immersive-audio"><span className="emi-audio-dot">♫</span> Audio de la vidéo</span>
          </div>

          <div className="emi-immersive-actions" aria-label="Actions sur la vidéo">
            <button aria-label={isLiked ? "Retirer le J’aime" : "Aimer"} onClick={() => void toggleLike(post)} className={isLiked ? "is-liked" : ""}>
              <span className="emi-action-circle"><Heart size={25} fill={isLiked ? "currentColor" : "none"}/></span>
              <span className="emi-action-count">{likeCounts[post.id] || 0}</span>
            </button>
            <button aria-label={`Commentaires : ${commentCounts[post.id] || 0}`} onClick={() => void openComments(post)}>
              <span className="emi-action-circle"><MessageCircle size={24}/></span>
              <span className="emi-action-count">{commentCounts[post.id] || 0}</span>
            </button>
            <button aria-label="Repartager" onClick={() => void share(post)}>
              <span className="emi-action-circle"><Repeat2 size={24}/></span>
              <span className="emi-action-label">Reposter</span>
            </button>
            <button aria-label="Partager" onClick={() => void share(post)}>
              <span className="emi-action-circle"><Send size={23}/></span>
              <span className="emi-action-label">Partager</span>
            </button>
          </div>
        </section>;
      })}
    </div>

    <form className="emi-quick-comment" onSubmit={e => {
      e.preventDefault();
      if (commentText.trim() && active) {
        if (!commentsOpen) void openComments(active);
        void submitComment();
      }
    }}>
      <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Ajouter un commentaire…" maxLength={2000} aria-label="Ajouter un commentaire"/>
      <button type="button" className="emi-comment-open" aria-label="Voir les commentaires" onClick={() => active && void openComments(active)}><MessageCircle size={20}/></button>
      <button type="submit" className="emi-comment-send" aria-label="Envoyer le commentaire" disabled={!commentText.trim() || commentSending}><Send size={20}/></button>
    </form>

    <nav className="emi-reels-bottom-nav" aria-label="Navigation principale">
      <button onClick={() => router.push("/")}><Home/><span>Accueil</span></button>
      <button onClick={() => router.push("/?tab=explorer")}><Compass/><span>Explorer</span></button>
      <button className="emi-nav-create" aria-label="Créer" onClick={() => router.push("/?create=1")}><Plus/></button>
      <button onClick={() => router.push("/?tab=marche")}><Store/><span>Marché</span></button>
      <button className="active" aria-current="page"><Clapperboard/><span>Reels</span></button>
      <button onClick={() => router.push("/?tab=messages")}><MessageCircle/><span>Messages</span></button>
      <button onClick={() => router.push("/?tab=profil")}><UserRound/><span>Profil</span></button>
    </nav>

    {commentsOpen && <div className="emi-comments-backdrop" onClick={() => setCommentsOpen(false)}>
      <section className="emi-comments-panel" role="dialog" aria-modal="true" aria-label="Commentaires" onClick={e => e.stopPropagation()}>
        <div className="emi-comments-head"><strong>Commentaires <span>{active ? commentCounts[active.id] || 0 : 0}</span></strong><button aria-label="Fermer les commentaires" onClick={() => setCommentsOpen(false)}>×</button></div>
        <div className="emi-comments-list">
          {commentsLoading ? <p className="emi-comments-muted">Chargement des commentaires…</p> : comments.length === 0 ? <p className="emi-comments-muted">Aucun commentaire pour le moment. Lance la conversation !</p> : comments.map((comment: any) => <article className="emi-comment" key={comment.id}><span className="emi-comment-avatar">{(comment.profile?.display_name || comment.profile?.username || "M").slice(0,1).toUpperCase()}</span><div><strong>{comment.profile?.display_name || comment.profile?.username || "Membre EMi"}</strong><p>{comment.content}</p></div></article>)}
        </div>
        <form className="emi-comment-form" onSubmit={e => { e.preventDefault(); void submitComment(); }}>
          <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Écrire un commentaire…" maxLength={2000} aria-label="Écrire un commentaire"/>
          <button type="submit" disabled={!commentText.trim() || commentSending}>{commentSending ? "…" : "Envoyer"}</button>
        </form>
      </section>
    </div>}
    {message && <button className="emi-immersive-toast" onClick={() => setMessage("")}>{message}<span>×</span></button>}

    <style jsx global>{`
      .emi-immersive-shell{position:fixed;inset:0;z-index:9999;overflow:hidden;background:#050b13;color:#f3f7fb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding-bottom:env(safe-area-inset-bottom);isolation:isolate}
      .emi-immersive-topbar{position:absolute;z-index:5;top:0;left:0;right:0;height:62px;padding:0 16px;display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(5,11,19,.96),rgba(5,11,19,.72));border-bottom:1px solid rgba(132,174,201,.13);backdrop-filter:blur(18px)}
      .emi-immersive-topbar>button{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(132,174,201,.22);border-radius:50%;background:rgba(13,28,42,.82);color:#e9f6fc}
      .emi-reels-brand{display:flex;align-items:baseline;gap:9px}.emi-reels-brand strong{font-size:22px;letter-spacing:-1px;font-weight:850;color:#f3f7fb}.emi-reels-brand strong span{color:#55cde8}.emi-reels-brand small{font-size:10px;letter-spacing:2.5px;color:#9db7c7;font-weight:800}
      .emi-immersive-counter{margin-left:auto;display:flex;align-items:center;gap:7px;color:#e5f3f9;font-size:13px;font-weight:700}.emi-immersive-counter i{font-style:normal;color:#7892a5}
      .emi-immersive-scroller{position:absolute;inset:62px 0 calc(68px + env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;overscroll-behavior-y:contain;scrollbar-width:none;touch-action:pan-y;-webkit-overflow-scrolling:touch;background:#050b13}.emi-immersive-scroller::-webkit-scrollbar{display:none}
      .emi-immersive-slide{height:100%;min-height:100%;width:100%;position:relative;scroll-snap-align:start;scroll-snap-stop:always;overflow:hidden;isolation:isolate;background:radial-gradient(ellipse at 50% 45%,#14283a 0%,#081321 58%,#050b13 100%)}
      .emi-immersive-slide>video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;background:transparent;z-index:0}
      .emi-immersive-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(3,9,16,.58) 0%,rgba(3,9,16,.08) 20%,transparent 48%,rgba(3,9,16,.12) 66%,rgba(3,9,16,.86) 100%)}
      .emi-immersive-author{position:absolute;z-index:3;top:14px;left:14px;right:72px;min-height:62px;padding:8px 10px;display:flex;align-items:center;gap:10px;border:1px solid rgba(132,174,201,.23);border-radius:18px;background:rgba(7,19,31,.82);box-shadow:0 8px 26px rgba(0,0,0,.2);backdrop-filter:blur(18px)}
      .emi-immersive-avatar{width:43px;height:43px;flex:0 0 43px;display:grid;place-items:center;border-radius:50%;overflow:hidden;background:#17384d;border:1.5px solid #55cde8;color:#e9faff;font-size:16px;font-weight:800}.emi-immersive-avatar img{width:100%;height:100%;object-fit:cover}
      .emi-immersive-author-copy{min-width:0;display:flex;flex-direction:column;gap:4px}.emi-immersive-author-copy strong{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f3f7fb;font-size:15px;font-weight:780;letter-spacing:-.2px}.emi-immersive-author-copy>span{display:flex;align-items:center;gap:6px;min-width:0;color:#a5b6c5;font-size:11px;white-space:nowrap}.emi-immersive-author-copy i{font-style:normal;color:#6f8799}
      .emi-immersive-more{margin-left:auto;width:34px;height:34px;flex:0 0 34px;border:1px solid rgba(132,174,201,.25);border-radius:50%;background:rgba(16,34,53,.8);color:#d7eff8;font-size:15px;font-weight:900;letter-spacing:1px}
      .emi-immersive-sound{position:absolute;z-index:3;top:91px;right:15px;width:43px;height:43px;display:grid;place-items:center;border:1px solid rgba(210,231,241,.3);border-radius:50%;background:rgba(6,15,25,.62);color:#d8f3fa;backdrop-filter:blur(12px)}
      .emi-immersive-actions{position:absolute;z-index:3;right:12px;top:34%;display:flex;flex-direction:column;align-items:center;gap:13px}
      .emi-immersive-actions button{min-width:46px;padding:0;border:0;background:transparent;color:#f3f7fb;display:flex;flex-direction:column;align-items:center;gap:4px;text-shadow:0 2px 8px rgba(0,0,0,.6)}
      .emi-action-circle{width:43px;height:43px;display:grid;place-items:center;border:1px solid rgba(220,237,245,.35);border-radius:50%;background:rgba(5,15,25,.56);backdrop-filter:blur(12px);box-shadow:0 5px 16px rgba(0,0,0,.15)}
      .emi-action-count{font-size:11px;line-height:1.1;font-weight:750;color:#f4f8fb}.emi-action-label{font-size:10px;font-weight:700;color:#e3edf3}.emi-immersive-actions button.is-liked{color:#ff718b}.emi-immersive-actions button.is-liked .emi-action-circle{border-color:rgba(255,113,139,.6);background:rgba(255,113,139,.12)}
      .emi-immersive-caption{position:absolute;z-index:3;left:18px;right:78px;bottom:102px;text-shadow:0 2px 10px rgba(0,0,0,.7)}.emi-immersive-caption p{margin:0;color:#f5f8fa;font-size:15px;line-height:1.42;font-weight:650;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.emi-immersive-audio{display:inline-flex;align-items:center;gap:7px;margin-top:9px;color:#c0d2df;font-size:11px;font-weight:600}.emi-audio-dot{width:19px;height:19px;display:grid;place-items:center;border-radius:50%;background:rgba(85,205,232,.17);color:#76def1;font-size:14px}
      .emi-quick-comment{position:absolute;z-index:6;left:14px;right:14px;bottom:calc(68px + env(safe-area-inset-bottom) + 9px);height:52px;display:flex;align-items:center;gap:7px;padding:5px 6px 5px 17px;border:1px solid rgba(132,174,201,.34);border-radius:28px;background:rgba(9,24,38,.94);box-shadow:0 8px 26px rgba(0,0,0,.28);backdrop-filter:blur(22px)}
      .emi-quick-comment input{flex:1;min-width:0;height:100%;padding:0;border:0;outline:none;background:transparent;color:#f3f7fb;font-size:13px}.emi-quick-comment input::placeholder{color:#9db0be}
      .emi-quick-comment button{width:39px;height:39px;flex:0 0 39px;display:grid;place-items:center;border:1px solid rgba(132,174,201,.22);border-radius:50%;background:#10283b;color:#bfeefa}.emi-quick-comment .emi-comment-send{background:linear-gradient(145deg,#b8f1fa,#4ac8e5);border-color:rgba(126,229,245,.65);color:#061521}.emi-quick-comment button:disabled{opacity:.42}
      .emi-reels-bottom-nav{position:absolute;z-index:5;bottom:0;left:0;right:0;height:calc(68px + env(safe-area-inset-bottom));padding:5px 3px env(safe-area-inset-bottom);display:flex;align-items:center;justify-content:space-around;background:rgba(5,13,22,.97);border-top:1px solid rgba(132,174,201,.2);backdrop-filter:blur(22px) saturate(145%)}
      .emi-reels-bottom-nav button{flex:1;min-width:0;height:100%;border:0;background:transparent;color:#91a7b8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-size:9px;font-weight:600;padding:2px 0}.emi-reels-bottom-nav button svg{width:21px;height:21px;stroke-width:1.9}.emi-reels-bottom-nav button.active{color:#69d7ed}.emi-reels-bottom-nav button.active:after{content:"";width:20px;height:2px;border-radius:2px;background:#55cde8;margin-top:1px}
      .emi-reels-bottom-nav .emi-nav-create{flex:0 0 44px;width:44px;height:44px;border-radius:15px;margin:0 3px;background:linear-gradient(145deg,#b8f1fa,#45c8e7 62%,#248eb8);color:#061522;box-shadow:0 5px 16px rgba(42,187,220,.18)}.emi-reels-bottom-nav .emi-nav-create svg{width:25px;height:25px;stroke-width:2.2}
      .emi-comments-backdrop{position:absolute;inset:0;z-index:10;background:rgba(0,5,12,.76);backdrop-filter:blur(8px);display:flex;align-items:flex-end}
      .emi-comments-panel{width:100%;height:min(72dvh,650px);background:linear-gradient(160deg,#102235,#071421);border:1px solid rgba(132,174,201,.28);border-radius:24px 24px 0 0;display:flex;flex-direction:column;color:#f3f7fb;overflow:hidden;padding-bottom:env(safe-area-inset-bottom);box-shadow:0 -18px 55px rgba(0,0,0,.35)}
      .emi-comments-head{height:58px;flex:0 0 58px;display:flex;align-items:center;justify-content:center;border-bottom:1px solid rgba(132,174,201,.17);position:relative}.emi-comments-head strong{font-size:15px}.emi-comments-head strong span{margin-left:6px;color:#55cde8}.emi-comments-head button{position:absolute;right:16px;width:34px;height:34px;border:1px solid rgba(132,174,201,.2);border-radius:50%;background:#10283b;color:#eaf8fc;font-size:24px;line-height:1}
      .emi-comments-list{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:15px}.emi-comments-muted{color:#a5b6c5;text-align:center;margin:auto;line-height:1.5;font-size:13px}
      .emi-comment{display:flex;align-items:flex-start;gap:10px}.emi-comment-avatar{flex:0 0 34px;height:34px;border-radius:50%;background:#17405a;color:#dff8ff;display:grid;place-items:center;font-weight:800}.emi-comment>div{min-width:0;background:#13283a;border:1px solid rgba(132,174,201,.14);border-radius:14px;padding:9px 12px}.emi-comment strong{font-size:12px;color:#d9f3fa}.emi-comment p{font-size:14px;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0 0;color:#eaf1f5}
      .emi-comment-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(132,174,201,.17)}.emi-comment-form input{flex:1;min-width:0;background:#071522;color:#f3f7fb;border:1px solid rgba(132,174,201,.22);border-radius:22px;padding:12px 14px;outline:none}.emi-comment-form button{border:0;border-radius:22px;background:linear-gradient(110deg,#b8f1fa,#4ac8e5);color:#061521;font-weight:750;padding:0 16px}.emi-comment-form button:disabled{opacity:.5}
      .emi-immersive-toast{position:absolute;z-index:12;bottom:calc(150px + env(safe-area-inset-bottom));left:16px;right:16px;border:1px solid rgba(132,174,201,.3);background:#102235;color:#f3f7fb;padding:13px 15px;border-radius:14px;text-align:left;box-shadow:0 8px 25px rgba(0,0,0,.3)}.emi-immersive-toast span{float:right;color:#55cde8}
      .emi-immersive-loading,.emi-immersive-empty{min-height:100dvh;background:#050b13;color:#f3f7fb;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;padding:24px;text-align:center}.emi-immersive-empty h1{font-size:23px}.emi-immersive-empty p{color:#a5b6c5;line-height:1.6}.emi-immersive-empty>button:last-child{border:1px solid rgba(132,174,201,.3);border-radius:12px;padding:12px 20px;background:#102235;color:#eaf8fc}.emi-immersive-spinner{width:32px;height:32px;border:3px solid #263c4e;border-top-color:#55cde8;border-radius:50%;animation:emiReelSpin .8s linear infinite}@keyframes emiReelSpin{to{transform:rotate(360deg)}}
      @media(min-width:700px){.emi-immersive-slide{max-width:520px;margin:auto}.emi-immersive-scroller{background:#020811}.emi-immersive-topbar{padding-left:max(16px,calc((100vw - 520px)/2));padding-right:max(16px,calc((100vw - 520px)/2))}.emi-quick-comment{max-width:488px;margin:auto}}
      @media(max-height:700px){.emi-immersive-actions{top:31%;gap:8px}.emi-action-circle{width:39px;height:39px}.emi-immersive-caption{bottom:91px}.emi-quick-comment{height:48px}.emi-quick-comment button{width:35px;height:35px;flex-basis:35px}}
      @media(prefers-reduced-motion:reduce){.emi-immersive-shell *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
    `}</style>
  </main>;
}
