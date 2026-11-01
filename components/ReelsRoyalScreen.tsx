"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Check, Heart, MessageCircle, Search, Send, Volume2, VolumeX, Repeat2, Crown, Play, Clapperboard } from "lucide-react";

export type RoyalReelPost = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_type: string;
  media_urls: string[];
  profiles?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};

type Props = {
  posts: RoyalReelPost[];
  userId?: string;
  liked: string[];
  likes: Record<string, number>;
  commentCounts: Record<string, number>;
  repostCounts: Record<string, number>;
  reposted: string[];
  savedPostIds: string[];
  followedIds: string[];
  followPendingIds: string[];
  onLike: (id: string) => void;
  onComments: (post: RoyalReelPost) => void;
  onRepost: (id: string) => void;
  onShare: (post: RoyalReelPost) => void;
  onSave: (id: string) => void;
  onFollow: (id: string) => void;
  onProfile: (id: string) => void;
  onDiscover: () => void;
  onClose: () => void;
  formatCount: (value: number) => string;
};

const cleanCaption = (value: string) => value
  .replace(/^\\s*\\[EMI_REEL\\]\\s*/i, "")
  .replace(/\\[EMI_MUSIC\\][\\s\\S]*?(?:\\[\\/EMI_MUSIC\\]|$)/gi, "")
  .trim();

export default function ReelsRoyalScreen(props: Props) {
  const {
    posts, userId, liked, likes, commentCounts, repostCounts, reposted, savedPostIds,
    followedIds, followPendingIds, onLike, onComments, onRepost, onShare, onSave,
    onFollow, onProfile, onDiscover, onClose, formatCount
  } = props;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [tab, setTab] = useState<"for-you" | "following">("for-you");
  const [activeId, setActiveId] = useState<string | null>(null);
  const videos = useMemo(() => posts.filter(post => post.media_type === "video" && post.media_urls?.[0]), [posts]);
  const visibleVideos = useMemo(
    () => tab === "following" ? videos.filter(post => followedIds.includes(post.user_id)) : videos,
    [videos, tab, followedIds]
  );

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !visibleVideos.length) return;
    const nodes = Array.from(root.querySelectorAll<HTMLVideoElement>(".emi-royal-reel-video"));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.72) {
          setActiveId(video.dataset.reelId || null);
          video.muted = !soundOn;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
    }, { root, threshold: [0, 0.35, 0.72, 1] });
    nodes.forEach(video => observer.observe(video));
    return () => {
      observer.disconnect();
      nodes.forEach(video => video.pause());
    };
  }, [visibleVideos, soundOn]);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || !visibleVideos.length) return;
    const current = root.querySelector<HTMLElement>(`[data-reel-card="${visibleVideos[0].id}"]`);
    if (current) current.scrollIntoView({ block: "start" });
  }, [tab, visibleVideos]);

  useEffect(() => {
    const handleVisibility = () => {
      const root = scrollerRef.current;
      if (!root) return;
      root.querySelectorAll<HTMLVideoElement>(".emi-royal-reel-video").forEach(video => {
        if (document.hidden) video.pause();
        else if (video.dataset.reelId === activeId) void video.play().catch(() => undefined);
      });
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeId]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    const root = scrollerRef.current;
    root?.querySelectorAll<HTMLVideoElement>(".emi-royal-reel-video").forEach(video => {
      video.muted = !next;
      if (video.dataset.reelId === activeId) void video.play().catch(() => undefined);
    });
  };

  return (
    <section className="emi-reels-screen" aria-label="EMi Reels Royal">
      <div className="emi-reels-topbar">
        <button type="button" className="emi-reels-brand" onClick={onClose} aria-label="Retour à EMi">
          <span className="emi-reels-crown"><Crown size={21}/></span>
          <span><strong>EMi<span>.</span></strong><small>REELS ROYAL</small></span>
        </button>
        <div className="emi-reels-top-actions">
          <button type="button" aria-label="Rechercher des vidéos" onClick={onDiscover}><Search size={21}/></button>
          <button type="button" aria-label={soundOn ? "Couper le son" : "Activer le son"} onClick={toggleSound}>{soundOn ? <Volume2 size={21}/> : <VolumeX size={21}/>}</button>
          <button type="button" aria-label="Fermer Reels" onClick={onClose}><ArrowLeft size={21}/></button>
        </div>
      </div>

      <div className="emi-reels-tabs" role="tablist" aria-label="Flux vidéo">
        <button type="button" role="tab" aria-selected={tab === "for-you"} className={tab === "for-you" ? "is-active" : ""} onClick={() => setTab("for-you")}>Pour toi</button>
        <button type="button" role="tab" aria-selected={tab === "following"} className={tab === "following" ? "is-active" : ""} onClick={() => setTab("following")}>Suivis</button>
        <span className="emi-reels-live-label"><i/> EMi ROYAL</span>
      </div>

      {visibleVideos.length > 0 ? (
        <div className="emi-reels-scroller" ref={scrollerRef}>
          {visibleVideos.map(post => {
            const name = post.profiles?.display_name || post.profiles?.username || "Membre EMi";
            const username = post.profiles?.username || "membre";
            const isOwn = userId === post.user_id;
            const isFollowing = followedIds.includes(post.user_id);
            const caption = cleanCaption(post.content);
            return (
              <article className="emi-royal-reel-card" data-reel-card={post.id} key={post.id}>
                <video
                  className="emi-royal-reel-video"
                  data-reel-id={post.id}
                  src={post.media_urls[0]}
                  playsInline
                  muted={!soundOn}
                  loop
                  preload="metadata"
                  onClick={toggleSound}
                  aria-label={"Vidéo de " + name}
                />
                <div className="emi-reels-video-shade"/>
                <div className="emi-reels-author">
                  <button type="button" className="emi-reels-avatar" onClick={() => onProfile(post.user_id)}>
                    {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt=""/> : <span>{name.slice(0, 1).toUpperCase()}</span>}
                  </button>
                  <button type="button" className="emi-reels-author-name" onClick={() => onProfile(post.user_id)}>
                    <strong>{name}</strong><small>@{username}</small>
                  </button>
                  {!isOwn && <button type="button" className={"emi-reels-follow " + (isFollowing ? "is-following" : "")} disabled={followPendingIds.includes(post.user_id)} onClick={() => onFollow(post.user_id)}>
                    {followPendingIds.includes(post.user_id) ? "…" : isFollowing ? <><Check size={14}/> Suivi</> : "Suivre"}
                  </button>}
                </div>

                <div className="emi-reels-action-rail" aria-label="Actions vidéo">
                  <button type="button" className={liked.includes(post.id) ? "is-liked" : ""} onClick={() => onLike(post.id)} aria-label="J'aime">
                    <Heart size={27} fill={liked.includes(post.id) ? "currentColor" : "none"}/><span>{formatCount(likes[post.id] || 0)}</span>
                  </button>
                  <button type="button" onClick={() => onComments(post)} aria-label="Commentaires">
                    <MessageCircle size={27}/><span>{formatCount(commentCounts[post.id] || 0)}</span>
                  </button>
                  <button type="button" className={reposted.includes(post.id) ? "is-reposted" : ""} onClick={() => onRepost(post.id)} aria-label="Repartager">
                    <Repeat2 size={26}/><span>{formatCount(repostCounts[post.id] || 0)}</span>
                  </button>
                  <button type="button" onClick={() => onShare(post)} aria-label="Partager">
                    <Send size={25}/><span>Partager</span>
                  </button>
                  <button type="button" className={savedPostIds.includes(post.id) ? "is-saved" : ""} onClick={() => onSave(post.id)} aria-label="Enregistrer">
                    <Bookmark size={25} fill={savedPostIds.includes(post.id) ? "currentColor" : "none"}/><span>Enregistrer</span>
                  </button>
                </div>

                <div className="emi-reels-caption">
                  {caption && <p>{caption}</p>}
                  <small><Play size={12} fill="currentColor"/> Vidéo de la communauté EMi</small>
                </div>
                <button type="button" className="emi-reels-comment-entry" onClick={() => onComments(post)}>
                  <MessageCircle size={19}/><span>Ajouter un commentaire…</span><Send size={18}/>
                </button>
                <span className="emi-reels-position" aria-hidden="true">{activeId === post.id ? "EN LECTURE" : "EMi REELS"}</span>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="emi-reels-empty">
          <span className="emi-reels-empty-icon"><Clapperboard size={32}/></span>
          <span className="emi-reels-empty-kicker">EMi · REELS ROYAL</span>
          <h2>{tab === "following" ? "Ton cercle, en vidéo." : "Le prochain moment commence ici."}</h2>
          <p>{tab === "following" ? "Les vidéos des membres que tu suis apparaîtront ici." : "Les vidéos publiées par la communauté seront présentées dans ce flux immersif."}</p>
          <button type="button" onClick={tab === "following" ? () => setTab("for-you") : onDiscover}>{tab === "following" ? "Découvrir les vidéos" : "Découvrir la communauté"}</button>
        </div>
      )}
    </section>
  );
}
