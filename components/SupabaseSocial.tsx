"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Bell, Camera, Heart, Home, ImagePlus, LogIn, MessageCircle, Plus, Send, Sparkles, UserRound, Video, X } from "lucide-react";

type Profile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };
type Post = { id: string; user_id: string; content: string; media_type: string; media_urls: string[]; created_at: string; profile?: Profile; likes: number; liked: boolean; comments: number };

export default function SupabaseSocial() {
  const supabase = createSupabaseBrowserClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Record<string, { id: string; content: string; user_id: string; created_at: string }[]>>({});

  const loadFeed = useCallback(async (uid: string | null) => {
    if (!supabase) return;
    const { data, error } = await supabase.from("posts").select("id,user_id,content,media_type,media_urls,created_at").eq("visibility", "public").order("created_at", { ascending: false }).limit(30);
    if (error) { setNotice("Impossible de charger le fil. Vérifie la configuration Supabase et les règles d’accès."); return; }
    const rows = data ?? [];
    const ids = [...new Set(rows.map((p) => p.user_id))];
    const [{ data: profiles }, { data: likes }, { data: allComments }] = await Promise.all([
      ids.length ? supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids) : Promise.resolve({ data: [] as Profile[] }),
      rows.length ? supabase.from("post_likes").select("post_id,user_id").in("post_id", rows.map((p) => p.id)) : Promise.resolve({ data: [] as { post_id: string; user_id: string }[] }),
      rows.length ? supabase.from("post_comments").select("post_id").in("post_id", rows.map((p) => p.id)) : Promise.resolve({ data: [] as { post_id: string }[] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));
    setPosts(rows.map((p) => ({
      ...p,
      media_urls: Array.isArray(p.media_urls) ? p.media_urls as string[] : [],
      profile: profileMap.get(p.user_id),
      likes: (likes ?? []).filter((l) => l.post_id === p.id).length,
      liked: Boolean(uid && (likes ?? []).some((l) => l.post_id === p.id && l.user_id === uid)),
      comments: (allComments ?? []).filter((c) => c.post_id === p.id).length,
    })));
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      void loadFeed(uid);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      void loadFeed(uid);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, [supabase, loadFeed]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true); setNotice("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    setNotice(error ? "Connexion impossible : vérifie l’adresse et la configuration Auth de Supabase." : "Lien de connexion envoyé par e-mail. Ouvre-le sur cet appareil pour te connecter.");
  }

  async function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.some((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"))) {
      setNotice("Choisis uniquement des photos ou des vidéos."); return;
    }
    if (selected.some((file) => file.size > 100 * 1024 * 1024)) {
      setNotice("Chaque fichier doit faire 100 Mo maximum."); return;
    }
    setFiles(selected.slice(0, 10));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (!userId) { setAuthOpen(true); setNotice("Connecte-toi par e-mail pour publier."); return; }
    if (!caption.trim() && files.length === 0) { setNotice("Ajoute un texte ou choisis une photo/vidéo."); return; }
    setBusy(true); setNotice("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file, { upsert: false, contentType: file.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("post-media").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      const mediaType = files.length === 0 ? "text" : files.some((f) => f.type.startsWith("video/")) ? "video" : "image";
      const { error } = await supabase.from("posts").insert({ user_id: userId, content: caption.trim(), media_type: mediaType, media_urls: uploaded, visibility: "public" });
      if (error) throw error;
      setCaption(""); setFiles([]); setComposerOpen(false);
      await loadFeed(userId);
      setNotice("Publication envoyée avec succès.");
    } catch {
      setNotice("La publication a échoué. Vérifie les droits d’accès Supabase et le stockage post-media, puis réessaie.");
    } finally { setBusy(false); }
  }

  async function toggleLike(post: Post) {
    if (!supabase) return;
    if (!userId) { setAuthOpen(true); setNotice("Connecte-toi pour aimer une publication."); return; }
    const previous = posts;
    setPosts((current) => current.map((p) => p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
    const result = post.liked
      ? await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId)
      : await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
    if (result.error) { setPosts(previous); setNotice("Impossible d’enregistrer le J’aime. Connecte-toi puis réessaie."); }
  }

  async function openComments(postId: string) {
    setCommentsFor(postId);
    if (!supabase) return;
    const { data, error } = await supabase.from("post_comments").select("id,content,user_id,created_at").eq("post_id", postId).order("created_at", { ascending: true }).limit(100);
    if (!error) setComments((old) => ({ ...old, [postId]: data ?? [] }));
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !commentsFor || !commentText.trim()) return;
    if (!userId) { setAuthOpen(true); setNotice("Connecte-toi pour commenter."); return; }
    const { error } = await supabase.from("post_comments").insert({ post_id: commentsFor, user_id: userId, content: commentText.trim() });
    if (error) { setNotice("Commentaire non envoyé. Vérifie ta connexion puis réessaie."); return; }
    setCommentText(""); await openComments(commentsFor); await loadFeed(userId);
  }

  if (!supabase) return <main className="app-shell"><section className="main-column"><div className="welcome-card"><span className="eyebrow">EMi · CONFIGURATION</span><h1>Connexion Supabase à terminer</h1><p>Ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans les variables Preview de Vercel pour cette branche, puis relance la prévisualisation.</p></div></section></main>;

  return <main className="app-shell">
    <aside className="sidebar"><a className="brand" href="#"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a>
      <div className="profile-mini"><div className="avatar avatar-me">{userId ? "ME" : "EM"}</div><div><strong>{userId ? "Connecté à EMi" : "Bienvenue sur EMi"}</strong><span>{userId ? "Ton espace social" : "Connecte-toi pour publier"}</span></div></div>
      <nav className="nav-list"><button className="nav-item selected"><Home size={20}/><span>Accueil</span></button><button className="nav-item" onClick={() => setNotice("La découverte des créateurs sera activée dans une prochaine étape.")}><Sparkles size={20}/><span>Découvrir</span></button><button className="nav-item" onClick={() => setNotice("La messagerie sera activée après le fil de publications.")}><MessageCircle size={20}/><span>Messages</span></button><button className="nav-item" onClick={() => setNotice("Les notifications seront activées dans une prochaine étape.")}><Bell size={20}/><span>Notifications</span></button><button className="nav-item" onClick={() => userId ? setNotice("Ton profil est lié à ton compte Supabase.") : setAuthOpen(true)}><UserRound size={20}/><span>Mon profil</span></button></nav>
      <button className="create-button" onClick={() => userId ? setComposerOpen(true) : setAuthOpen(true)}><Plus size={20}/> Créer une publication</button>
      <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={16}/><p>Des moments vrais.<br/><strong>Des liens qui comptent.</strong></p></div><span className="version">EMi · Supabase</span></div>
    </aside>
    <section className="main-column">
      <header className="mobile-header"><a className="brand" href="#"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a><button className="icon-button" onClick={() => userId ? setNotice("Tu es connecté à EMi.") : setAuthOpen(true)} aria-label="Compte"><UserRound size={21}/></button></header>
      <div className="feed-header"><div><span className="eyebrow">TON UNIVERS, TES LIENS</span><h1>Le fil des moments</h1><p>Retrouve ce qui compte pour toi.</p></div><button className="round-action" onClick={() => userId ? setComposerOpen(true) : setAuthOpen(true)} aria-label="Créer une publication"><Plus size={22}/></button></div>
      <div className="stories-card"><div className="section-label"><strong>Les moments</strong><span>Photos · vidéos · textes</span></div><div className="stories-row"><button className="story" onClick={() => userId ? setComposerOpen(true) : setAuthOpen(true)}><span className="story-ring story-add"><span className="story-avatar">+</span></span><span className="story-name">Ajouter</span></button></div></div>
      {notice && <div className="demo-note" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fermer"><X size={15}/></button></div>}
      {!posts.length && <div className="post-card"><div className="modal-icon"><ImagePlus size={23}/></div><h2>Ton fil commence ici</h2><p>Les publications réelles apparaîtront ici après leur envoi.</p><button className="modal-primary" onClick={() => userId ? setComposerOpen(true) : setAuthOpen(true)}>{userId ? "Créer la première publication" : "Se connecter"}</button></div>}
      <div className="feed-list">{posts.map((post) => (<article className="post-card" key={post.id}><div className="post-top"><div className="avatar avatar-sunset">{(post.profile?.display_name || post.profile?.username || "EM").slice(0,2).toUpperCase()}</div><div className="post-author"><strong>{post.profile?.display_name || post.profile?.username || "Membre EMi"}</strong><span>@{post.profile?.username || "membre"} · {new Date(post.created_at).toLocaleString("fr-FR")}</span></div></div>{post.content && <p className="post-caption">{post.content}</p>}{post.media_urls.map((url, i) => <div className="post-visual" key={url + i} style={{ height: "auto", minHeight: 180, padding: 0, background: "#17171e" }}>{post.media_type === "video" ? <video src={url} controls playsInline style={{ width: "100%", maxHeight: 520, display: "block" }} /> : <img src={url} alt="Publication EMi" loading="lazy" style={{ width: "100%", maxHeight: 520, objectFit: "contain", display: "block" }} />}</div>}<div className="post-actions"><button className={post.liked ? "liked" : ""} onClick={() => void toggleLike(post)}><Heart size={20} fill={post.liked ? "currentColor" : "none"}/><span>{post.likes}</span></button><button onClick={() => void openComments(post.id)}><MessageCircle size={20}/><span>{post.comments}</span></button><button onClick={() => { void navigator.clipboard?.writeText(window.location.href); setNotice("Lien de la page copié si ton navigateur autorise le presse-papiers."); }}><Send size={19}/><span>Partager</span></button></div>{commentsFor === post.id && <div className="comments-panel">{(comments[post.id] ?? []).map((c) => <p key={c.id}><strong>Membre</strong> {c.content}</p>)}<form onSubmit={addComment} className="comment-form"><input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Écrire un commentaire…" maxLength={1000}/><button type="submit" disabled={busy}>Envoyer</button></form></div>}</article>))}</div>
      <div className="demo-note"><Sparkles size={16}/><span>Les publications, J’aime et commentaires de ce fil utilisent la base Supabase connectée.</span></div>
    </section>
    <aside className="right-column"><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires, découvre des talents et garde le lien avec ta communauté.</p><button onClick={() => userId ? setComposerOpen(true) : setAuthOpen(true)}>Partager un moment <Plus size={16}/></button></div><div className="suggest-card"><div className="section-label"><strong>À découvrir</strong></div><p className="post-caption">La communauté EMi se construit avec tes premiers moments.</p></div></aside>
    <nav className="mobile-nav"><button className="mobile-active"><Home size={21}/><span>Accueil</span></button><button onClick={() => setNotice("La découverte arrive bientôt.")}><Sparkles size={21}/><span>Explorer</span></button><button className="mobile-create" onClick={() => userId ? setComposerOpen(true) : setAuthOpen(true)}><Plus size={23}/></button><button onClick={() => setNotice("Les vidéos apparaîtront dans le fil.")}><Video size={21}/><span>Vidéos</span></button><button onClick={() => userId ? setNotice("Profil connecté.") : setAuthOpen(true)}><UserRound size={21}/><span>Profil</span></button></nav>
    {(composerOpen || authOpen) && <div className="modal-backdrop" onClick={() => { setComposerOpen(false); setAuthOpen(false); }}><div className="modal-card" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => { setComposerOpen(false); setAuthOpen(false); }} aria-label="Fermer"><X size={20}/></button>{authOpen ? <><div className="modal-icon"><LogIn size={23}/></div><span className="eyebrow">EMi · CONNEXION SÉCURISÉE</span><h2>Rejoins ton espace</h2><p>Entre ton e-mail. Supabase t’enverra un lien de connexion sans mot de passe.</p><form onSubmit={signIn} className="publish-form"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.com"/><button className="modal-primary" disabled={busy}>{busy ? "Envoi…" : "Recevoir mon lien"}</button></form></> : <><div className="modal-icon"><Camera size={23}/></div><span className="eyebrow">EMi · TON ESPACE</span><h2>Un moment à partager ?</h2><form onSubmit={publish} className="publish-form"><textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Qu’as-tu envie de partager ?" rows={4} maxLength={5000}/><label className="file-picker"><ImagePlus size={18}/> Ajouter photos ou vidéos<input type="file" accept="image/*,video/*" multiple onChange={(e) => void chooseFiles(e)} /></label>{files.length > 0 && <p>{files.length} fichier(s) sélectionné(s) : {files.map((f) => f.name).join(", ")}</p>}<button className="modal-primary" disabled={busy}>{busy ? "Publication…" : "Publier maintenant"}</button></form></>}</div></div>}
  </main>;
}
