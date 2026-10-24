"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Camera, Compass, Heart, Home, LogIn, LogOut, MessageCircle, Plus, Search, Send, Settings, Sparkles, UserRound, Video, X, Image as ImageIcon, Clapperboard } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Post = {
  id: string; user_id: string; content: string; created_at: string;
  media_type: string; media_urls: string[]; visibility: string;
  profiles?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};
type Profile = { id: string; email?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; bio?: string | null };
type Story = { id:string; user_id:string; media_url:string; media_type:"image"|"video"; caption:string; visibility:string; created_at:string; expires_at:string; profiles?:{username?:string|null;display_name?:string|null;avatar_url?:string|null}|null };
const supabase = createSupabaseBrowserClient();

export default function HomePage() {
  const [active, setActive] = useState("Accueil");
  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const storyFileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [comments, setComments] = useState<Record<string, {id:string;user_id:string;content:string;created_at:string;profiles?:{username?:string|null;display_name?:string|null}|null}[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string,string>>({});
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [exploreProfiles, setExploreProfiles] = useState<Profile[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [profilePostCount, setProfilePostCount] = useState(0);
  const [profileFollowerCount, setProfileFollowerCount] = useState(0);
  const [profileFollowingCount, setProfileFollowingCount] = useState(0);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileUsernameDraft, setProfileUsernameDraft] = useState("");
  const [profileBioDraft, setProfileBioDraft] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const profileAvatarInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadStories = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("stories")
      .select("id,user_id,media_url,media_type,caption,visibility,created_at,expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(100);
    if (error) { setMessage("Impossible de charger les stories : " + error.message); return; }
    const rows = (data || []) as Story[];
    const ids = [...new Set(rows.map(row => row.user_id))];
    const { data: profiles, error: profileError } = ids.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids)
      : { data: [], error: null };
    if (profileError) { setMessage("Impossible de charger les profils des stories : " + profileError.message); return; }
    const byId = new Map((profiles || []).map(p => [p.id, p]));
    setStories(rows.map(row => ({ ...row, profiles: byId.get(row.user_id) || null })));
  }, []);

  async function publishStory(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) { setStoryComposerOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); return; }
    if (!storyFile) { setMessage("Choisis une photo ou une vidéo pour ta story."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
    if (!allowed.includes(storyFile.type)) { setMessage("Format non pris en charge. Choisis une image ou une vidéo."); return; }
    if (storyFile.size > 50 * 1024 * 1024) { setMessage("La story dépasse 50 Mo."); return; }
    setBusy(true); setMessage("");
    let uploadedPath = "";
    try {
      const ext = storyFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (storyFile.type.startsWith("video/") ? "mp4" : "jpg");
      uploadedPath = user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("story-media").upload(uploadedPath, storyFile, { contentType: storyFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(uploadedPath);
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id, media_url: urlData.publicUrl,
        media_type: storyFile.type.startsWith("video/") ? "video" : "image",
        caption: storyCaption.trim(), visibility: "public", created_at: now.toISOString(), expires_at: expires.toISOString()
      });
      if (insertError) throw insertError;
      setStoryComposerOpen(false); setStoryFile(null); setStoryCaption("");
      setMessage("Story publiée ! Elle sera visible pendant 24 heures.");
      await loadStories();
    } catch (err) {
      if (uploadedPath) await supabase.storage.from("story-media").remove([uploadedPath]).catch(() => undefined);
      setMessage("La story n’a pas pu être publiée : " + (err instanceof Error ? err.message : "erreur inconnue"));
    } finally { setBusy(false); }
  }

  const loadFeed = useCallback(async () => {
    if (!supabase) { setMessage("Connexion Supabase non configurée. Vérifie les variables d’environnement Vercel."); return; }
    const { data, error } = await supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").eq("visibility", "public").order("created_at", { ascending: false }).limit(40);
    if (error) { setMessage("Impossible de charger le fil : " + error.message); return; }
    const rawPosts = (data || []) as unknown as Post[];
    const authorIds = [...new Set(rawPosts.map(post => post.user_id))];
    const { data: authorProfiles, error: profilesError } = authorIds.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").in("id", authorIds)
      : { data: [], error: null };
    if (profilesError) { setMessage("Impossible de charger les profils des auteurs : " + profilesError.message); return; }
    const profilesById = new Map((authorProfiles || []).map(profile => [profile.id, profile]));
    const realPosts = rawPosts.map(post => ({ ...post, profiles: profilesById.get(post.user_id) || null }));
    setPosts(realPosts);
    if (realPosts.length) {
      const ids = realPosts.map(p => p.id);
      const { data: likeRows } = await supabase.from("post_likes").select("post_id,user_id").in("post_id", ids);
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      (likeRows || []).forEach((l: {post_id:string;user_id:string}) => { counts[l.post_id] = (counts[l.post_id] || 0) + 1; if (user?.id === l.user_id) mine.push(l.post_id); });
      setLikes(counts); setLiked(mine);
    } else { setLikes({}); setLiked([]); }
  }, [user?.id]);

  useEffect(() => {
    if (!supabase) { setMessage("La connexion Supabase n’est pas configurée."); return; }
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!alive) return;
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", data.user.id).maybeSingle();
        if (alive) setUser({ id: data.user.id, email: data.user.email, ...(profile || {}) });
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setAuthMethod("email");
        setSignup(false);
        setAuthOpen(true);
        setMessage("Choisis un nouveau mot de passe pour ton compte EMi.");
      }
      if (alive) setUser(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setFollowedIds([]); return; }
    let alive = true;
    supabase.from("follows").select("following_id").eq("follower_id", user.id).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setMessage("Impossible de charger tes abonnements : " + error.message); return; }
      setFollowedIds((data || []).map(row => row.following_id as string));
    });
    return () => { alive = false; };
  }, [user?.id]);

  useEffect(() => { void loadFeed(); void loadStories(); }, [loadFeed, loadStories]);
  useEffect(() => {
    const timer = window.setInterval(() => { void loadStories(); }, 60_000);
    return () => window.clearInterval(timer);
  }, [loadStories]);
  useEffect(() => {
    if (active !== "Reels") return;
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(".reel-video"));
    if (!videos.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
    }, { threshold: [0, 0.25, 0.65, 1] });
    videos.forEach(video => {
      video.preload = "metadata";
      observer.observe(video);
    });
    return () => {
      observer.disconnect();
      videos.forEach(video => video.pause());
    };
  }, [active, filteredPosts.length]);

  useEffect(() => {
    if (!activeStory || activeStory.media_type === "video") return;
    const timer = window.setTimeout(() => {
      const index = stories.findIndex(story => story.id === activeStory.id);
      setActiveStory(index >= 0 && index < stories.length - 1 ? stories[index + 1] : null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [activeStory, stories]);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) { setMessage("Connexion Supabase non configurée. Réessaie plus tard."); return; }
    setBusy(true);
    setMessage("");
    try {
      if (recoveryMode) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setRecoveryMode(false);
        setAuthOpen(false);
        setPassword("");
        setMessage("Ton mot de passe a été modifié avec succès.");
        return;
      }
      if (authMethod === "phone") {
        const cleanPhone = phone.replace(/[\s()-]/g, "");
        if (!/^\+[1-9]\d{7,14}$/.test(cleanPhone)) {
          throw new Error("Saisis ton numéro au format international, par exemple +2376XXXXXXXX.");
        }
        if (!otpSent) {
          const { error } = await supabase.auth.signInWithOtp({ phone: cleanPhone });
          if (error) throw error;
          setPhone(cleanPhone);
          setOtpSent(true);
          setMessage("Code SMS demandé. Saisis le code reçu pour terminer la connexion. Si aucun SMS n’arrive, l’authentification par téléphone ou le fournisseur SMS doit être activé dans Supabase.");
          return;
        }
        const { data, error } = await supabase.auth.verifyOtp({ phone: cleanPhone, token: otpCode.trim(), type: "sms" });
        if (error) throw error;
        if (!data.user) throw new Error("Supabase n’a pas confirmé la connexion par téléphone.");
        const fallbackName = cleanPhone.replace(/[^0-9]/g, "").slice(-8);
        const { data: p, error: profileReadError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", data.user.id).maybeSingle();
        if (profileReadError) throw new Error("Connexion réussie, mais lecture du profil impossible : " + profileReadError.message);
        if (!p) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, username: "membre" + fallbackName, display_name: "Membre " + fallbackName });
          if (profileError) throw new Error("Compte connecté, mais création du profil impossible : " + profileError.message);
        }
        setUser({ id: data.user.id, ...(p || {}), email: data.user.email });
        setAuthOpen(false);
        setOtpSent(false);
        setOtpCode("");
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: "https://emi-nu.vercel.app" }
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setMessage("Demande d’inscription envoyée. Vérifie ta boîte de réception et les courriers indésirables pour confirmer ton adresse e-mail. Si aucun e-mail n’arrive, l’inscription doit être vérifiée dans les réglages Auth de Supabase.");
          setPassword("");
          return;
        }
        if (!data.user) throw new Error("Supabase n’a pas retourné de compte. Vérifie les réglages d’inscription.");
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          username: cleanEmail.split("@")[0],
          display_name: cleanEmail.split("@")[0]
        });
        if (profileError) setMessage("Compte créé, mais le profil n’a pas pu être créé : " + profileError.message);
        setUser({ id: data.user.id, email: cleanEmail });
        setAuthOpen(false);
        setPassword("");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        if (!data.user) throw new Error("Connexion non confirmée par Supabase.");
        const { data: p, error: profileReadError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", data.user.id).maybeSingle();
        if (profileReadError) throw new Error("Connexion réussie, mais lecture du profil impossible : " + profileReadError.message);
        if (!p) {
          const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, username: cleanEmail.split("@")[0], display_name: cleanEmail.split("@")[0] });
          if (profileError) throw new Error("Compte connecté, mais création du profil impossible : " + profileError.message);
        }
        setUser({ id: data.user.id, email: cleanEmail, ...(p || {}) });
        setAuthOpen(false);
        setPassword("");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Inscription/connexion impossible. Vérifie les réglages Auth de Supabase.";
      const normalized = raw.toLowerCase();
      if (normalized.includes("email rate limit exceeded") || normalized.includes("rate limit")) {
        setMessage("Supabase limite temporairement les e-mails d’inscription. Attends avant de réessayer, ou configure un fournisseur SMTP dans Supabase Auth pour recevoir les e-mails de confirmation.");
      } else if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
        setMessage("Cette adresse e-mail possède déjà un compte. Connecte-toi plutôt que de créer un nouveau compte.");
      } else if (normalized.includes("invalid login credentials")) {
        setMessage("Adresse e-mail ou mot de passe incorrect. Vérifie tes informations puis réessaie.");
      } else {
        setMessage(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmationEmail() {
    if (!supabase) { setMessage("Connexion Supabase non configurée."); return; }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setMessage("Saisis ton adresse e-mail dans le champ ci-dessus, puis réessaie."); return; }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: { emailRedirectTo: "https://emi-nu.vercel.app" }
      });
      if (error) throw error;
      setMessage("Si cette adresse correspond à une inscription en attente, un nouveau courriel de confirmation a été envoyé. Vérifie aussi les courriers indésirables.");
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "";
      if (/rate limit|too many requests|email rate/i.test(errorText)) {
        setMessage("Trop de demandes de courriel ont été envoyées. Attends un moment avant de réessayer et vérifie ta boîte de réception ainsi que les courriers indésirables.");
      } else {
        setMessage(errorText || "Impossible de renvoyer le courriel pour le moment.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    if (!supabase) { setMessage("Connexion Supabase non configurée."); return; }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setMessage("Saisis ton adresse e-mail pour recevoir un lien de réinitialisation."); return; }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: "https://emi-nu.vercel.app"
      });
      if (error) throw error;
      setMessage("Si cette adresse est enregistrée, un lien de réinitialisation vient d’être demandé. Vérifie ta boîte de réception et les courriers indésirables.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Impossible d’envoyer le lien de réinitialisation pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault(); if (!supabase) return;
    if (!user) { setComposerOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour publier."); return; }
    if (!caption.trim() && !file) { setMessage("Ajoute un texte ou une photo/vidéo."); return; }
    setBusy(true); setMessage("");
    try {
      let urls: string[] = []; let mediaType = "text";
      if (file) {
        if (!["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"].includes(file.type)) throw new Error("Format non pris en charge. Choisis une image ou une vidéo courante.");
        if (file.size > 50 * 1024 * 1024) throw new Error("Le fichier dépasse 50 Mo.");
        const path = user.id + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("post-media").getPublicUrl(path);
        urls = [publicUrl.publicUrl]; mediaType = file.type.startsWith("video/") ? "video" : "image";
      }
      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: caption.trim(), media_type: mediaType, media_urls: urls, visibility: "public" });
      if (error) throw error;
      setCaption(""); setFile(null); setComposerOpen(false); setMessage("Publication envoyée."); await loadFeed();
    } catch (err) { setMessage(err instanceof Error ? err.message : "La publication a échoué."); }
    finally { setBusy(false); }
  }

  async function loadComments(postId: string) {
    if (!supabase) return;
    const { data, error } = await supabase.from("post_comments").select("id,user_id,content,created_at").eq("post_id", postId).order("created_at", { ascending: true }).limit(100);
    if (error) { setMessage("Impossible de charger les commentaires : " + error.message); return; }
    const rawComments = (data || []) as {id:string;user_id:string;content:string;created_at:string}[];
    const authorIds = [...new Set(rawComments.map(comment => comment.user_id))];
    const { data: authorProfiles, error: profilesError } = authorIds.length
      ? await supabase.from("profiles").select("id,username,display_name").in("id", authorIds)
      : { data: [], error: null };
    if (profilesError) { setMessage("Impossible de charger les profils des commentateurs : " + profilesError.message); return; }
    const profilesById = new Map((authorProfiles || []).map(profile => [profile.id, profile]));
    setComments(old => ({ ...old, [postId]: rawComments.map(comment => ({ ...comment, profiles: profilesById.get(comment.user_id) || null })) }));
  }

  async function addComment(postId: string, e: React.FormEvent) {
    e.preventDefault();
    const content = (commentDrafts[postId] || "").trim();
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour commenter."); return; }
    if (!content) return;
    setBusy(true);
    const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content });
    if (error) setMessage("Impossible d’ajouter le commentaire : " + error.message);
    else { setCommentDrafts(old => ({ ...old, [postId]: "" })); await loadComments(postId); }
    setBusy(false);
  }

  async function loadFollowingFeed() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour voir tes abonnements."); return; }
    const { data: follows, error: followError } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
    if (followError) { setMessage("Impossible de charger les abonnements : " + followError.message); return; }
    const ids = (follows || []).map(row => row.following_id as string);
    setFollowedIds(ids);
    if (!ids.length) { setPosts([]); setActive("Abonnements"); setMessage("Tu ne suis encore personne. Le fil apparaîtra quand tu suivras des membres."); return; }
    const { data, error } = await supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").in("user_id", ids).in("visibility", ["public","followers"]).order("created_at", { ascending: false }).limit(40);
    if (error) { setMessage("Impossible de charger le fil des abonnements : " + error.message); return; }
    const rawPosts = (data || []) as unknown as Post[];
    const authorIds = [...new Set(rawPosts.map(post => post.user_id))];
    const { data: authorProfiles, error: profilesError } = authorIds.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").in("id", authorIds)
      : { data: [], error: null };
    if (profilesError) { setMessage("Impossible de charger les profils des auteurs : " + profilesError.message); return; }
    const profilesById = new Map((authorProfiles || []).map(profile => [profile.id, profile]));
    setPosts(rawPosts.map(post => ({ ...post, profiles: profilesById.get(post.user_id) || null }))); setActive("Abonnements");
  }

  async function loadExploreProfiles() {
    if (!supabase) return;
    setExploreLoading(true);
    try {
      let request = supabase.from("profiles").select("id,username,display_name,avatar_url,bio").limit(60);
      const term = query.trim().replace(/[%,()]/g, "");
      if (term) request = request.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
      const { data, error } = await request;
      if (error) throw error;
      setExploreProfiles(((data || []) as Profile[]).filter(profile => profile.id !== user?.id));
    } catch (err) { setMessage(err instanceof Error ? "Impossible de charger Explorer : " + err.message : "Impossible de charger Explorer."); }
    finally { setExploreLoading(false); }
  }

  async function openProfile(targetId: string) {
    if (!supabase) return;
    setMessage("");
    const { data: profile, error: profileError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", targetId).maybeSingle();
    if (profileError || !profile) { setMessage("Impossible de charger ce profil." + (profileError ? " " + profileError.message : "")); return; }
    const { count: totalPosts } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", targetId).eq("visibility", "public");
    const { count: totalFollowers } = await supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetId);
    const { count: totalFollowing } = await supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", targetId);
    setProfilePostCount(totalPosts || 0); setProfileFollowerCount(totalFollowers || 0); setProfileFollowingCount(totalFollowing || 0);
    const { data: profilePosts, error: postsError } = await supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").eq("user_id", targetId).eq("visibility", "public").order("created_at", { ascending: false }).limit(60);
    if (postsError) { setMessage("Impossible de charger les publications : " + postsError.message); return; }
    const ids = (profilePosts || []).map(p => p.id);
    const { data: likesData } = ids.length ? await supabase.from("post_likes").select("post_id,user_id").in("post_id", ids) : { data: [] };
    const counts: Record<string, number> = {}; const mine: string[] = [];
    (likesData || []).forEach((l: {post_id:string;user_id:string}) => { counts[l.post_id] = (counts[l.post_id] || 0) + 1; if (user?.id === l.user_id) mine.push(l.post_id); });
    setViewingProfile(profile as Profile); setPosts((profilePosts || []).map(p => ({ ...p, profiles: profile as Profile } as Post))); setLikes(counts); setLiked(mine); setActive("Profil");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadProfileConnections(profileId: string, mode: "followers" | "following") {
    if (!supabase) return;
    const column = mode === "followers" ? "follower_id" : "following_id";
    const filterColumn = mode === "followers" ? "following_id" : "follower_id";
    const { data, error } = await supabase.from("follows").select(column).eq(filterColumn, profileId).limit(200);
    if (error) { setMessage("Impossible de charger cette liste : " + error.message); return; }
    const ids = (data || []).map((row: Record<string, unknown>) => row[column] as string);
    if (!ids.length) { setMessage(mode === "followers" ? "Ce membre n’a pas encore d’abonnés." : "Ce membre ne suit encore personne."); return; }
    setMessage((mode === "followers" ? "Liste des abonnés : " : "Liste des abonnements : ") + ids.length + " membre(s).");
  }

  function startProfileEdit() {
    if (!user) { setAuthOpen(true); return; }
    setProfileNameDraft(user.display_name || ""); setProfileUsernameDraft(user.username || ""); setProfileBioDraft(user.bio || ""); setAvatarFile(null); setProfileEditorOpen(true);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); if (!supabase || !user) return;
    const username = profileUsernameDraft.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (username.length < 3) { setMessage("Le nom d’utilisateur doit contenir au moins 3 caractères."); return; }
    setBusy(true); setMessage("");
    try {
      let avatar_url = user.avatar_url || null;
      if (avatarFile) {
        if (!["image/jpeg","image/png","image/webp"].includes(avatarFile.type)) throw new Error("Choisis une photo JPG, PNG ou WebP.");
        if (avatarFile.size > 5 * 1024 * 1024) throw new Error("La photo de profil doit faire moins de 5 Mo.");
        const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const path = user.id + "/avatar-" + Date.now() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (uploadError) throw uploadError;
        avatar_url = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      }
      const updated = { id: user.id, display_name: profileNameDraft.trim().slice(0,80) || username, username, bio: profileBioDraft.trim().slice(0,300), avatar_url };
      const { error } = await supabase.from("profiles").upsert(updated);
      if (error) throw error;
      const nextUser = { ...user, ...updated }; setUser(nextUser);
      if (viewingProfile?.id === user.id) setViewingProfile(nextUser);
      setProfileEditorOpen(false); setAvatarFile(null); setMessage("Ton profil a été mis à jour.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Impossible d’enregistrer le profil."); }
    finally { setBusy(false); }
  }

  async function toggleFollow(targetId: string) {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour suivre un membre."); return; }
    if (targetId === user.id) return;
    const isFollowing = followedIds.includes(targetId);
    const result = isFollowing
      ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId)
      : await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
    if (result.error) { setMessage("Impossible de modifier l’abonnement : " + result.error.message); return; }
    setFollowedIds(old => isFollowing ? old.filter(id => id !== targetId) : [...old, targetId]);
    setMessage(isFollowing ? "Abonnement supprimé." : "Tu suis maintenant ce membre.");
  }

  async function toggleLike(postId: string) {
    if (!supabase) return;
    if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour aimer une publication."); return; }
    const wasLiked = liked.includes(postId);
    setLiked(old => wasLiked ? old.filter(id => id !== postId) : [...old, postId]);
    setLikes(old => ({ ...old, [postId]: Math.max(0, (old[postId] || 0) + (wasLiked ? -1 : 1)) }));
    const result = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    if (result.error) { setMessage("Impossible d’enregistrer le like : " + result.error.message); await loadFeed(); }
  }

  async function logout() { if (supabase) await supabase.auth.signOut(); setUser(null); setActive("Accueil"); }

  const visiblePosts = posts.filter(p => !query || p.content.toLowerCase().includes(query.toLowerCase()) || (p.profiles?.display_name || p.profiles?.username || "").toLowerCase().includes(query.toLowerCase()));
  const displayName = user?.display_name || user?.username || user?.email?.split("@")[0] || "Mon compte";
  const currentProfileName = viewingProfile?.display_name || viewingProfile?.username || "Membre EMi";
  const filteredPosts = viewingProfile ? visiblePosts : active === "Reels" || active === "Vidéos" ? visiblePosts.filter(post => post.media_type === "video") : visiblePosts.filter(post => post.media_type !== "video");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="EMi accueil"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a>
        <button className="profile-mini profile-mini-button" onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><div className="avatar avatar-me">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : user ? displayName.slice(0,2).toUpperCase() : "ME"}</div><div><strong>{user ? displayName : "Bienvenue sur EMi"}</strong><span>{user ? "Voir mon profil" : "Ton espace social"}</span></div></button>
        <nav className="nav-list" aria-label="Navigation principale">
          {[[ "Accueil", Home ], [ "Découvrir", Compass ], [ "Messages", MessageCircle ], [ "Notifications", Bell ], [ "Mon profil", UserRound ]].map(([label, Icon]) => { const title = label as string; const Glyph = Icon as typeof Home; return <button key={title} className={`nav-item ${active === title ? "selected" : ""}`} onClick={() => { setActive(title); if (["Messages","Notifications","Mon profil"].includes(title) && !user) setAuthOpen(true); }}><Glyph size={20}/><span>{title}</span></button>; })}
        </nav>
        <button className="create-button" onClick={() => setComposerOpen(true)}><Plus size={20}/> Créer une publication</button>
        <div className="sidebar-bottom">{user ? <button className="nav-item" onClick={logout}><LogOut size={20}/><span>Se déconnecter</span></button> : <button className="nav-item" onClick={() => setAuthOpen(true)}><LogIn size={20}/><span>Connexion / Inscription</span></button>}<div className="sidebar-note"><Sparkles size={16}/><p>Des moments vrais.<br/><strong>Des liens qui comptent.</strong></p></div><span className="version">EMi · Communauté</span></div>
      </aside>

      <section className="main-column">
        <header className="mobile-header"><a className="brand" href="#"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a><button className="icon-button" aria-label="Compte" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? <LogOut size={21}/> : <UserRound size={21}/>}</button></header>
        {!viewingProfile && !["Découvrir","Messages","Reels","Vidéos"].includes(active) && <section className="welcome-hero" aria-label="Bienvenue sur EMi">
          <img className="welcome-cover" src="https://raw.githubusercontent.com/tchoyieric-hash/Emi/main/emi-cover-3.jpg" alt="Photo de couverture EMi" />
          <div className="welcome-shade" />
          <div className="welcome-content">
            <div className="welcome-brand"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></div>
            <span className="welcome-kicker">TON ESPACE, TES RENCONTRES</span>
            <h2>Bienvenue sur EMi</h2>
            <p>Partage tes moments, découvre de nouvelles histoires et reste proche de ceux qui comptent.</p>
            <div className="welcome-actions"><button onClick={() => setComposerOpen(true)}><Plus size={17}/> Créer une publication</button><button className="welcome-secondary" onClick={() => { setActive("Accueil"); void loadFeed(); document.querySelector(".feed-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Découvrir <Compass size={16}/></button></div>
          </div>
        </section>}
        <div className="feed-header"><div><span className="eyebrow">{viewingProfile ? "EMi · PROFIL PERSONNEL" : "TON UNIVERS, TES LIENS"}</span><h1>{viewingProfile ? currentProfileName : active === "Accueil" ? "Le fil des moments" : active === "Découvrir" ? "Découvrir la communauté" : active === "Reels" || active === "Vidéos" ? "Reels EMi" : active === "Messages" ? "Ta messagerie" : active}</h1><p>{viewingProfile ? "@" + (viewingProfile.username || "membre") : active === "Découvrir" ? "Trouve des membres et découvre leurs publications." : active === "Messages" ? "Retrouve tes conversations au même endroit." : active === "Reels" || active === "Vidéos" ? "Les vidéos de la communauté, dans un fil dédié." : user ? "Connecté en tant que " + displayName : "Découvre les publications publiques."}</p></div><button className="round-action" onClick={() => viewingProfile && user?.id === viewingProfile.id ? startProfileEdit() : setComposerOpen(true)} aria-label="Action profil ou publication">{viewingProfile && user?.id === viewingProfile.id ? <Settings size={22}/> : <Plus size={22}/>}</button></div>
        {viewingProfile && <section className="profile-page"><div className="profile-page-top"><div className="profile-page-avatar">{viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt={"Photo de " + currentProfileName}/> : <span>{currentProfileName.slice(0,2).toUpperCase()}</span>}</div><div className="profile-page-identity"><h2>{currentProfileName}</h2><span>@{viewingProfile.username || "membre"}</span></div></div><p className="profile-bio">{viewingProfile.bio?.trim() || "Bienvenue sur mon profil EMi ✨"}</p><div className="profile-stats"><div><strong>{profilePostCount}</strong><span>publications</span></div><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "followers")}><strong>{profileFollowerCount}</strong><span>abonnés</span></button><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "following")}><strong>{profileFollowingCount}</strong><span>abonnements</span></button></div><div className="profile-page-actions">{user?.id === viewingProfile.id ? <button className="modal-primary" onClick={startProfileEdit}><Settings size={16}/> Modifier le profil</button> : user ? <button className="modal-primary" onClick={() => void toggleFollow(viewingProfile.id)}>{followedIds.includes(viewingProfile.id) ? "Abonné(e)" : "Suivre"}</button> : <button className="modal-primary" onClick={() => setAuthOpen(true)}>Se connecter</button>}<button className="profile-back-button" onClick={() => { setViewingProfile(null); setActive("Accueil"); void loadFeed(); }}>Retour au fil</button></div><div className="profile-posts-heading">Publications</div></section>}
        {!viewingProfile && <>
        <div className="stories-card" style={{display:["Reels","Vidéos","Découvrir","Messages"].includes(active) ? "none" : undefined}}><div className="section-label"><strong>Les stories</strong><button onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}>Partager <span>→</span></button></div><div className="stories-row"><button className="story" onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}><span className="story-ring story-add"><span className="story-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : <Plus size={18}/>}</span><span className="story-plus"><Plus size={13}/></span></span><span className="story-name">Ta story</span></button>{stories.map((story, index) => { const author = story.profiles?.display_name || story.profiles?.username || "Membre EMi"; return <button className="story" key={story.id} onClick={() => setActiveStory(story)} aria-label={"Voir la story de " + author}><span className="story-ring"><span className="story-avatar">{story.profiles?.avatar_url ? <img src={story.profiles.avatar_url} alt=""/> : <img src={story.media_type === "image" ? story.media_url : "/emi-story-video.svg"} alt=""/>}</span></span><span className="story-name">{story.user_id === user?.id ? "Votre story" : author}</span></button>; })}{stories.length === 0 && <span className="stories-empty">Les stories de la communauté apparaîtront ici.</span>}</div></div>
        <div className="feed-tabs" style={{display:["Reels","Découvrir","Messages"].includes(active) ? "none" : undefined}}><button className={active === "Accueil" ? "tab-active" : ""} onClick={() => {setActive("Accueil"); void loadFeed();}}>Publications</button><button className={active === "Abonnements" ? "tab-active" : ""} onClick={() => void loadFollowingFeed()}>Abonnements</button><button className={active === "Vidéos" ? "tab-active" : ""} onClick={() => setActive("Vidéos")}>Vidéos <Video size={14}/></button></div>
        </>}
        {message && <div className="demo-note" role="status"><Sparkles size={16}/><span>{message}</span><button style={{marginLeft:"auto",background:"none",border:0,color:"inherit"}} onClick={() => setMessage("")} aria-label="Fermer"><X size={15}/></button></div>}
        {active === "Découvrir" && !viewingProfile ? <section className="discovery-panel"><label className="discovery-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void loadExploreProfiles(); }} placeholder="Rechercher un nom ou @pseudo…" aria-label="Rechercher des membres"/></label><button className="modal-primary" onClick={() => void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading ? "Recherche…" : "Rechercher"}</button><div className="discovery-list">{exploreProfiles.map(profile => <article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={() => void openProfile(profile.id)}><span className="discovery-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : (profile.display_name || profile.username || "M").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name || profile.username || "Membre EMi"}</strong><small>@{profile.username || "membre"}</small>{profile.bio && <small className="discovery-bio">{profile.bio}</small>}</span></button><button className="profile-back-button" onClick={() => void openProfile(profile.id)}>Voir le profil</button></article>)}{!exploreLoading && exploreProfiles.length === 0 && <div className="empty-feature"><Compass size={30}/><h2>Découvre ta communauté</h2><p>Recherche un nom ou un nom d’utilisateur pour trouver des membres EMi.</p></div>}</div></section> : active === "Messages" && !viewingProfile ? <section className="empty-feature messages-empty"><div className="modal-icon"><MessageCircle size={25}/></div><h2>Ta messagerie EMi</h2><p>Les conversations privées ne sont pas encore reliées à un service de messagerie enregistré. Les messages ne peuvent pas encore être envoyés ni reçus.</p><button className="modal-primary" onClick={() => { if (!user) setAuthOpen(true); else { setActive("Découvrir"); void loadExploreProfiles(); } }}>{user ? "Trouver des membres" : "Se connecter"}</button></section> : !supabase ? <div className="post-card"><h2>Connexion à configurer</h2><p>Les variables d’environnement Supabase sont absentes. Vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel.</p></div> : filteredPosts.length === 0 ? <div className="post-card" style={{padding:28,textAlign:"center"}}><div className="modal-icon" style={{margin:"0 auto 16px"}}><Sparkles size={23}/></div><h2 style={{fontSize:20}}>{query ? "Aucun résultat" : active === "Reels" || active === "Vidéos" ? "Aucun Reel pour le moment" : "Le fil commence ici"}</h2><p style={{color:"#aaa6b7",fontSize:13,lineHeight:1.7}}>{query ? "Essaie un autre mot." : "Aucune publication réelle n’est encore disponible. Sois le premier à partager un moment."}</p><button className="modal-primary" style={{maxWidth:260}} onClick={() => setComposerOpen(true)}>Créer une publication</button></div> :
        <div className="feed-list">{filteredPosts.map(post => { const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi"; return <article className={active === "Reels" && post.media_type === "video" ? "post-card reel-post" : "post-card"} key={post.id}><div className="post-top"><button className="post-avatar-button" onClick={() => void openProfile(post.user_id)} aria-label={"Voir le profil de " + author}><div className="avatar avatar-sunset">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt=""/> : author.slice(0,2).toUpperCase()}</div></button><button className="post-author post-author-button" onClick={() => void openProfile(post.user_id)}><strong>{author}</strong><span>@{post.profiles?.username || "membre"} · {new Date(post.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</span></button>{user && user.id !== post.user_id && <button onClick={() => void toggleFollow(post.user_id)} style={{marginLeft:"auto",border:"1px solid #393643",borderRadius:9,padding:"7px 10px",background:followedIds.includes(post.user_id)?"#282235":"#a78bfa17",color:"#d8c9ff",fontSize:11}}>{followedIds.includes(post.user_id) ? "Suivi" : "Suivre"}</button>}</div>{post.content && <p className="post-caption">{post.content}</p>}{(post.media_urls || []).map((url,i) => post.media_type === "video" ? <video key={url+i} src={url} controls={active !== "Reels"} autoPlay={active === "Reels"} muted={active === "Reels"} loop={active === "Reels"} playsInline preload={active === "Reels" ? "metadata" : "none"} className={active === "Reels" ? "reel-video" : undefined} style={active === "Reels" ? undefined : {width:"100%",maxHeight:560,borderRadius:0,background:"#09090d",objectFit:"contain"}}/> : <img key={url+i} src={url} alt="Publication partagée sur EMi" style={{width:"100%",maxHeight:650,objectFit:"contain",borderRadius:0,background:"#09090d"}}/>)}<div className="post-actions"><button className={liked.includes(post.id) ? "liked" : ""} onClick={() => void toggleLike(post.id)}><Heart size={20} fill={liked.includes(post.id) ? "currentColor" : "none"}/><span>{likes[post.id] || 0}</span></button><button onClick={() => { const isOpen = openComments.includes(post.id); setOpenComments(old => isOpen ? old.filter(id => id !== post.id) : [...old, post.id]); if (!isOpen) void loadComments(post.id); }}><MessageCircle size={20}/><span>Commentaires{comments[post.id]?.length ? ` (${comments[post.id].length})` : ""}</span></button><button onClick={() => { if (navigator.share) void navigator.share({title:"EMi",text:post.content,url:location.href}).catch(()=>{}); else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi."); }}><Send size={19}/><span>Partager</span></button></div>{openComments.includes(post.id) && <div className="comments-panel" style={{borderTop:"1px solid #2b2b35",marginTop:14,paddingTop:12}}><div style={{display:"grid",gap:10,marginBottom:12}}>{(comments[post.id] || []).map(comment => <div key={comment.id} style={{fontSize:12,lineHeight:1.6}}><strong>{comment.profiles?.display_name || comment.profiles?.username || "Membre"} </strong><span style={{color:"#d0ced9",overflowWrap:"anywhere"}}>{comment.content}</span></div>)}{comments[post.id]?.length === 0 && <p style={{fontSize:12,color:"#92919f"}}>Aucun commentaire. Lance la conversation !</p>}</div><form onSubmit={e => void addComment(post.id,e)} style={{display:"flex",gap:8}}><input aria-label="Écrire un commentaire" value={commentDrafts[post.id] || ""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:10,borderRadius:9,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 14px"}}>Envoyer</button></form></div>}</article>; })}</div>}
      </section>

      <aside className="right-column"><div className="right-search"><Search size={18}/><input aria-label="Rechercher" placeholder="Rechercher sur EMi..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires et garde le lien avec ta communauté.</p><button onClick={() => setComposerOpen(true)}>Partager un moment <Plus size={16}/></button></div><div className="suggest-card"><div className="section-label"><strong>Ton compte</strong></div><p style={{fontSize:12,lineHeight:1.7,color:"#aaa6b7"}}>{user ? "Tu es connecté. Tes publications sont enregistrées dans Supabase." : "Connecte-toi pour publier et aimer les moments."}</p><button className="modal-primary" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? "Se déconnecter" : "Connexion / Inscription"}</button></div><div className="right-footer">À propos · Confidentialité · Aide<br/>© 2026 EMi</div></aside>

      <nav className="mobile-nav" aria-label="Navigation mobile"><button className={active === "Accueil" && !viewingProfile ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Home size={20}/><span>Accueil</span></button><button className={active === "Découvrir" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Découvrir");void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}}><Compass size={20}/><span>Explorer</span></button><button className="mobile-create" aria-label="Créer une publication" onClick={() => setComposerOpen(true)}><Plus size={22}/></button><button className={active === "Reels" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Reels");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Clapperboard size={20}/><span>Reels</span></button><button className={active === "Messages" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Messages");window.scrollTo({top:0,behavior:"smooth"});if(!user)setAuthOpen(true);}}><MessageCircle size={20}/><span>Messages</span></button><button className={viewingProfile ? "mobile-active" : ""} onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><UserRound size={20}/><span>Profil</span></button></nav>

      {storyComposerOpen && <div className="modal-backdrop" onClick={() => {setStoryComposerOpen(false);setStoryFile(null);}}><div className="modal-card story-composer-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => setStoryComposerOpen(false)} aria-label="Fermer"><X size={20}/></button><div className="modal-icon"><Camera size={23}/></div><span className="eyebrow">EMi · STORY</span><h2>Partager une story</h2><p>Une photo ou vidéo visible pendant 24 heures.</p><form onSubmit={publishStory}><input ref={storyFileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setStoryFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="nav-item" style={{border:"1px solid #393643",marginBottom:12}} onClick={()=>storyFileInput.current?.click()}><ImageIcon size={18}/><span>{storyFile ? storyFile.name : "Choisir une photo ou vidéo"}</span></button>{storyFile && <div className="story-preview">{storyFile.type.startsWith("video/") ? "Aperçu vidéo sélectionné" : "Photo sélectionnée"} · {(storyFile.size/1024/1024).toFixed(1)} Mo</div>}<textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} rows={3} placeholder="Ajouter un texte (facultatif)…" style={{width:"100%",resize:"vertical",padding:12,margin:"12px 0",borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><p style={{fontSize:11,lineHeight:1.6,color:"#aaa6b7"}}>Formats photo/vidéo courants, jusqu’à 50 Mo. La story expire dans 24 heures.</p><button className="modal-primary" disabled={busy || !storyFile} type="submit">{busy ? "Publication…" : "Publier la story"}</button></form></div></div>}
      {activeStory && <div className="story-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Visionneuse de story" onClick={() => setActiveStory(null)}><div className="story-viewer" onClick={e=>e.stopPropagation()}><div className="story-progress"><span style={{animationDuration:activeStory.media_type === "video" ? "15s" : "6s"}}/></div><header><div className="story-viewer-author">{activeStory.profiles?.avatar_url ? <img src={activeStory.profiles.avatar_url} alt=""/> : <span>{(activeStory.profiles?.display_name || activeStory.profiles?.username || "M").slice(0,1).toUpperCase()}</span>}<strong>{activeStory.profiles?.display_name || activeStory.profiles?.username || "Membre EMi"}</strong><small>{new Date(activeStory.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</small></div><button onClick={() => setActiveStory(null)} aria-label="Fermer la story"><X size={22}/></button></header>{activeStory.media_type === "video" ? <video className="story-viewer-media" src={activeStory.media_url} controls autoPlay playsInline onEnded={() => setActiveStory(null)}/> : <img className="story-viewer-media" src={activeStory.media_url} alt="Story"/>}{activeStory.caption && <p className="story-viewer-caption">{activeStory.caption}</p>}<div className="story-viewer-nav"><button onClick={() => { const i=stories.findIndex(st=>st.id===activeStory.id); if(i>0)setActiveStory(stories[i-1]); else setActiveStory(null); }}>Précédente</button><button onClick={() => { const i=stories.findIndex(st=>st.id===activeStory.id); if(i>=0 && i<stories.length-1)setActiveStory(stories[i+1]); else setActiveStory(null); }}>Suivante</button></div></div></div>}
      {(composerOpen || authOpen || profileEditorOpen) && <div className="modal-backdrop" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}} aria-label="Fermer"><X size={20}/></button>{message && <div role="alert" style={{margin:"12px 0",padding:12,borderRadius:10,border:"1px solid #8d6de0",background:"#282235",color:"#f7f3ff",fontSize:13,lineHeight:1.6,overflowWrap:"anywhere"}}>{message}</div>}{composerOpen ? <><div className="modal-icon"><Camera size={23}/></div><span className="eyebrow">EMi · TON ESPACE</span><h2>Un moment à partager ?</h2><form onSubmit={publish}><textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Qu’as-tu envie de partager ?" maxLength={5000} rows={4} style={{width:"100%",resize:"vertical",padding:12,margin:"12px 0",borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" onClick={()=>fileInput.current?.click()} className="nav-item" style={{border:"1px solid #393643",marginBottom:12}}><ImageIcon size={18}/><span>{file ? file.name : "Ajouter une photo ou vidéo (50 Mo max.)"}</span></button>{file && <button type="button" onClick={()=>setFile(null)} className="nav-item"><X size={16}/> Retirer le fichier</button>}<p style={{fontSize:11,lineHeight:1.6,color:"#aaa6b7"}}>Ta publication sera publique. Publier nécessite un compte connecté.</p><button className="modal-primary" disabled={busy} type="submit">{busy ? "Publication en cours…" : "Publier"}</button></form></> : profileEditorOpen ? <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · PROFIL</span><h2>Personnalise ton profil</h2><form onSubmit={saveProfile}><div className="profile-editor-avatar">{avatarFile ? avatarFile.name : user?.avatar_url ? <img src={user.avatar_url} alt="Photo actuelle"/> : <UserRound size={28}/>}</div><input ref={profileAvatarInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="profile-back-button" onClick={()=>profileAvatarInput.current?.click()}>Choisir une photo de profil</button><label className="profile-field-label">Nom affiché<input value={profileNameDraft} onChange={e=>setProfileNameDraft(e.target.value)} maxLength={80} placeholder="Ton nom"/></label><label className="profile-field-label">Nom d’utilisateur<input value={profileUsernameDraft} onChange={e=>setProfileUsernameDraft(e.target.value)} maxLength={30} placeholder="ex. emi_membre"/></label><label className="profile-field-label">Biographie<textarea value={profileBioDraft} onChange={e=>setProfileBioDraft(e.target.value)} maxLength={300} rows={4} placeholder="Présente-toi en quelques mots…"/></label><button className="modal-primary" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le profil"}</button></form></> : <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · TON COMPTE</span><h2>{recoveryMode ? "Nouveau mot de passe" : signup ? "Créer ton compte" : "Content de te revoir"}</h2><p>{recoveryMode ? "Choisis un mot de passe sûr pour retrouver ton compte." : signup ? "Inscris-toi avec ton adresse e-mail." : "Connecte-toi pour publier et aimer les moments."}</p>{!signup && !recoveryMode && <><div style={{display:"flex",gap:8,margin:"12px 0"}}><button type="button" onClick={()=>{setAuthMethod("email");setOtpSent(false);setOtpCode("");setMessage("");}} style={{flex:1,padding:10,borderRadius:9,border:"1px solid #8d6de0",background:"#302443",color:"#f7f6fb"}}>Connexion par e-mail</button></div><p style={{fontSize:12,lineHeight:1.6,color:"#aaa6b7",margin:"0 0 12px"}}>La connexion par SMS est temporairement indisponible. Utilise ton adresse e-mail et ton mot de passe.</p></>}<form onSubmit={authenticate}>{recoveryMode ? <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/> : authMethod==="phone" && !signup ? <><input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone (ex. +2376XXXXXXXX)" autoComplete="tel" disabled={otpSent} style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>{otpSent && <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="Code reçu par SMS" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}</> : <><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email" style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" autoComplete={signup?"new-password":"current-password"} style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/></>}<button className="modal-primary" disabled={busy} type="submit">{busy ? "Patiente…" : recoveryMode ? "Enregistrer le nouveau mot de passe" : authMethod==="phone" && !signup ? (otpSent ? "Vérifier le code SMS" : "Recevoir un code SMS") : signup ? "Créer mon compte" : "Se connecter"}</button></form>{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void requestPasswordReset()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Mot de passe oublié ?</button>}{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void resendConfirmationEmail()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Renvoyer le courriel de confirmation</button>}{authMethod==="email" && !recoveryMode && <button onClick={()=>setSignup(v=>!v)} style={{width:"100%",marginTop:14,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>{signup ? "J’ai déjà un compte" : "Créer un nouveau compte"}</button>}</>}</div></div>}
    </main>
  );
}
