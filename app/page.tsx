"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Camera, ChevronLeft, Compass, Heart, Home, Repeat2, LogIn, LogOut, MessageCircle, Plus, Search, Send, Settings, Sparkles, UserRound, Video, X, Image as ImageIcon, Clapperboard, ShieldCheck, LockKeyhole, Bookmark, Archive, Languages, Palette, CircleHelp, Ban, Eye, SlidersHorizontal, Smartphone, ChevronRight, Clock3, Share2, UserRoundCog, Music2, Play, Headphones, TrendingUp, Mic2, Disc3 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Post = {
  id: string; user_id: string; content: string; created_at: string;
  media_type: string; media_urls: string[]; visibility: string;
  profiles?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};
type Profile = { id: string; email?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; bio?: string | null };
type Story = { id:string; user_id:string; media_url:string; media_type:"image"|"video"; caption:string; music_url?:string|null; music_title?:string|null; visibility:string; created_at:string; expires_at:string; profiles?:{username?:string|null;display_name?:string|null;avatar_url?:string|null}|null };
const supabase = createSupabaseBrowserClient();

export default function HomePage() {
  const [active, setActive] = useState("Accueil");
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [vibesTab, setVibesTab] = useState("Pour toi");
  const [vibesSearch, setVibesSearch] = useState("");
  const [privateAccount, setPrivateAccount] = useState(false);
  const [hideLikeCounts, setHideLikeCounts] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sharedPosts, setSharedPosts] = useState<Post[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<string[]>([]);
  const [reposted, setReposted] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [createStudioOpen, setCreateStudioOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState("");
  const [cameraRecording, setCameraRecording] = useState(false);
  const [cameraMode, setCameraMode] = useState<"photo" | "video" | "text">("photo");
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [authOpen, setAuthOpen] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
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
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState("");
  const musicInput = useRef<HTMLInputElement>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [storyMusicFile, setStoryMusicFile] = useState<File | null>(null);
  const [storyMusicTitle, setStoryMusicTitle] = useState("");
  const storyMusicInput = useRef<HTMLInputElement>(null);
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
  const [profileTab, setProfileTab] = useState<"posts" | "reels" | "shared" | "tagged">("posts");
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionTitle, setConnectionTitle] = useState("Abonnés");
  const [connectionProfiles, setConnectionProfiles] = useState<Profile[]>([]);
  const [exploreProfiles, setExploreProfiles] = useState<Profile[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [profilePostCount, setProfilePostCount] = useState(0);
  const [profileFollowerCount, setProfileFollowerCount] = useState(0);
  const [profileFollowingCount, setProfileFollowingCount] = useState(0);
  const [conversations, setConversations] = useState<{id:string; title:string; is_group:boolean; other?:Profile; lastMessage?:string; created_at:string}[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{id:string;conversation_id:string;sender_id:string;content:string;media_url?:string|null;media_type?:string|null;created_at:string}[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMediaFile, setChatMediaFile] = useState<File | null>(null);
  const chatMediaInput = useRef<HTMLInputElement>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [notifications, setNotifications] = useState<{id:string;actor_id:string|null;type:string;entity_id:string|null;content:string;is_read:boolean;created_at:string;actor?:Profile|null}[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

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
      .select("id,user_id,media_url,media_type,caption,music_url,music_title,visibility,created_at,expires_at")
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


  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach(track => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraRecording(false);
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = cameraFacing) => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("La caméra n’est pas disponible dans ce navigateur. Vérifie les autorisations ou utilise la galerie.");
      return;
    }
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } }
      });
      cameraStreamRef.current = stream;
      setCameraFacing(facing);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => undefined);
      }
    } catch (err) {
      setCameraError(err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
        ? "Autorise l’accès à la caméra et au micro dans les réglages du navigateur, puis réessaie."
        : "Impossible d’ouvrir la caméra. Vérifie qu’elle n’est pas déjà utilisée et réessaie.");
    }
  }, [cameraFacing, stopCamera]);

  function captureCameraPhoto() {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("La caméra démarre encore. Attends un instant et réessaie.");
      return;
    }
    const canvas = document.createElement("canvas");
    const maxWidth = 1440;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) { setCameraError("La photo n’a pas pu être capturée."); return; }
    if (cameraFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setCameraError("La photo n’a pas pu être enregistrée."); return; }
      setFile(new File([blob], "emi-photo-" + Date.now() + ".jpg", { type: "image/jpeg" }));
      stopCamera();
      setCameraOpen(false);
      setCreateStudioOpen(false);
      setComposerOpen(true);
      setMessage("Photo capturée ! Ajoute une légende avant de publier.");
    }, "image/jpeg", 0.9);
  }

  function toggleVideoRecording() {
    if (cameraRecording) {
      mediaRecorderRef.current?.stop();
      setCameraRecording(false);
      return;
    }
    const stream = cameraStreamRef.current;
    if (!stream) { setCameraError("Ouvre d’abord la caméra."); return; }
    if (typeof MediaRecorder === "undefined") {
      setCameraError("L’enregistrement vidéo n’est pas pris en charge par ce navigateur. Tu peux choisir une vidéo dans la galerie.");
      return;
    }
    try {
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) recordedChunksRef.current.push(event.data); };
      recorder.onerror = () => setCameraError("L’enregistrement a rencontré une erreur.");
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (!blob.size) { setCameraError("Aucune vidéo n’a été enregistrée."); return; }
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        setFile(new File([blob], "emi-video-" + Date.now() + "." + ext, { type: blob.type }));
        stopCamera();
        setCameraOpen(false);
        setCreateStudioOpen(false);
        setComposerOpen(true);
        setMessage("Vidéo capturée ! Ajoute une légende avant de publier.");
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setCameraRecording(true);
      setCameraError("Enregistrement en cours… Appuie sur le bouton rouge pour terminer.");
    } catch {
      setCameraError("Impossible de démarrer l’enregistrement sur cet appareil.");
    }
  }

  function openCamera(mode: "photo" | "video" | "text" = "photo") {
    setCreateStudioOpen(false);
    if (mode === "text") {
      setCameraMode("text");
      setCaption("");
      setFile(null);
      setComposerOpen(true);
      return;
    }
    setCameraMode(mode);
    setCameraOpen(true);
    void startCamera();
  }

  async function publishStory(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user) { setStoryComposerOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); return; }
    if (!storyFile) { setMessage("Choisis une photo ou une vidéo pour ta story."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
    if (!allowed.includes(storyFile.type)) { setMessage("Format non pris en charge. Choisis une image ou une vidéo."); return; }
    if (storyFile.size > 50 * 1024 * 1024) { setMessage("La story dépasse 50 Mo."); return; }
    const allowedAudio = ["audio/mpeg","audio/mp3","audio/mp4","audio/aac","audio/ogg","audio/wav","audio/x-wav","audio/webm","audio/x-m4a","audio/flac"];
    if (storyMusicFile && !allowedAudio.includes(storyMusicFile.type)) { setMessage("Format audio non pris en charge."); return; }
    if (storyMusicFile && storyMusicFile.size > 15 * 1024 * 1024) { setMessage("La musique doit faire moins de 15 Mo."); return; }
    setBusy(true); setMessage("");
    let uploadedPath = "";
    let uploadedMusicPath = "";
    try {
      const ext = storyFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (storyFile.type.startsWith("video/") ? "mp4" : "jpg");
      uploadedPath = user.id + "/" + crypto.randomUUID() + "." + ext;
      const { error: uploadError } = await supabase.storage.from("story-media").upload(uploadedPath, storyFile, { contentType: storyFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("story-media").getPublicUrl(uploadedPath);
      let musicUrl: string | null = null;
      if (storyMusicFile) {
        const musicExt = storyMusicFile.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "mp3";
        uploadedMusicPath = user.id + "/music-" + crypto.randomUUID() + "." + musicExt;
        const { error: musicError } = await supabase.storage.from("story-media").upload(uploadedMusicPath, storyMusicFile, { contentType: storyMusicFile.type, upsert: false });
        if (musicError) throw musicError;
        musicUrl = supabase.storage.from("story-media").getPublicUrl(uploadedMusicPath).data.publicUrl;
      }
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const { error: insertError } = await supabase.from("stories").insert({
        user_id: user.id, media_url: urlData.publicUrl,
        media_type: storyFile.type.startsWith("video/") ? "video" : "image",
        caption: storyCaption.trim(), music_url: musicUrl,
        music_title: musicUrl ? (storyMusicTitle.trim() || storyMusicFile?.name.replace(/\.[^.]+$/, "") || "Ma musique") : null,
        visibility: "public", created_at: now.toISOString(), expires_at: expires.toISOString()
      });
      if (insertError) throw insertError;
      setStoryComposerOpen(false); setStoryFile(null); setStoryCaption(""); setStoryMusicFile(null); setStoryMusicTitle("");
      setMessage("EMi Moment publié ! Il sera visible pendant 24 heures.");
      await loadStories();
    } catch (err) {
      const paths = [uploadedPath, uploadedMusicPath].filter(Boolean);
      if (paths.length) await supabase.storage.from("story-media").remove(paths).catch(() => undefined);
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
  }, [active, posts.length]);

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
    if (musicFile && !file) { setMessage("Ajoute une photo ou une vidéo pour accompagner ta musique."); return; }
    if (musicFile && !musicFile.type.startsWith("audio/")) { setMessage("Choisis un fichier audio valide."); return; }
    if (musicFile && musicFile.size > 15 * 1024 * 1024) { setMessage("Le fichier audio doit faire moins de 15 Mo."); return; }
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
      let musicUrl = "";
      if (musicFile) {
        const musicPath = user.id + "/music-" + crypto.randomUUID() + "-" + musicFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: musicUploadError } = await supabase.storage.from("post-media").upload(musicPath, musicFile, { contentType: musicFile.type, upsert: false });
        if (musicUploadError) throw new Error("Impossible d’ajouter ce fichier audio. Vérifie la configuration du stockage.");
        musicUrl = supabase.storage.from("post-media").getPublicUrl(musicPath).data.publicUrl;
      }
      const postContent = caption.trim() + (musicUrl ? "\
\
[EMI_MUSIC]" + JSON.stringify({url:musicUrl,title:musicTitle.trim() || musicFile?.name || "Ma musique"}) + "[/EMI_MUSIC]" : "");
      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: postContent, media_type: mediaType, media_urls: urls, visibility: "public" });
      if (error) throw error;
      setCaption(""); setFile(null); setMusicFile(null); setMusicTitle(""); setComposerOpen(false); setMessage("Publication envoyée."); await loadFeed();
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


  async function loadConversations() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour utiliser la messagerie."); return; }
    setChatLoading(true);
    try {
      const { data: memberships, error: memberError } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", user.id).order("joined_at", { ascending: false });
      if (memberError) throw memberError;
      const ids = (memberships || []).map(row => row.conversation_id as string);
      if (!ids.length) { setConversations([]); setActiveConversation(null); return; }
      const { data: convs, error: convError } = await supabase.from("conversations").select("id,title,is_group,created_at").in("id", ids).order("updated_at", { ascending: false });
      if (convError) throw convError;
      const { data: participants, error: partError } = await supabase.from("conversation_participants").select("conversation_id,user_id").in("conversation_id", ids);
      if (partError) throw partError;
      const otherIds = [...new Set((participants || []).filter(p => p.user_id !== user.id).map(p => p.user_id as string))];
      const { data: profiles, error: profileError } = otherIds.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", otherIds) : {data:[],error:null};
      if (profileError) throw profileError;
      const { data: recent, error: msgError } = await supabase.from("messages").select("id,conversation_id,sender_id,content,created_at").in("conversation_id", ids).order("created_at", {ascending:false}).limit(100);
      if (msgError) throw msgError;
      const pMap = new Map((profiles || []).map(p => [p.id,p as Profile]));
      const result = (convs || []).map(conv => {
        const member = (participants || []).find(p => p.conversation_id === conv.id && p.user_id !== user.id);
        const last = (recent || []).find(m => m.conversation_id === conv.id);
        return {...conv, other: member ? pMap.get(member.user_id) : undefined, lastMessage: last?.content || (last ? "Média partagé" : "Commence la conversation")};
      });
      setConversations(result);
      if (activeConversation && !ids.includes(activeConversation)) setActiveConversation(null);
    } catch (err) { setMessage(err instanceof Error ? "Messagerie : " + err.message : "Impossible de charger les conversations."); }
    finally { setChatLoading(false); }
  }

  async function openConversation(conversationId: string) {
    if (!supabase || !user) { setAuthOpen(true); return; }
    setActiveConversation(conversationId);
    const { data, error } = await supabase.from("messages").select("id,conversation_id,sender_id,content,media_url,media_type,created_at").eq("conversation_id", conversationId).order("created_at", {ascending:false}).limit(200);
    if (error) { setMessage("Impossible d’ouvrir cette conversation : " + error.message); return; }
    setChatMessages(((data || []).reverse()) as typeof chatMessages);
    await supabase.from("conversation_participants").update({last_read_at:new Date().toISOString()}).eq("conversation_id",conversationId).eq("user_id",user.id);
  }

  async function createGroupConversation() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour créer un groupe."); return; }
    const title = window.prompt("Nom du groupe EMi :")?.trim();
    if (!title) return;
    if (title.length > 80) { setMessage("Le nom du groupe doit faire 80 caractères maximum."); return; }
    const usernamesInput = window.prompt("Pseudo(s) des membres à ajouter, séparés par des virgules (sans @) :");
    if (!usernamesInput?.trim()) { setMessage("Ajoute au moins un membre pour créer le groupe."); return; }
    const usernames = [...new Set(usernamesInput.split(",").map(name => name.trim().replace(/^@/, "").toLowerCase()).filter(Boolean))];
    if (!usernames.length) { setMessage("Saisis au moins un pseudo valide."); return; }
    setChatLoading(true);
    try {
      const { data: people, error: peopleError } = await supabase.from("profiles")
        .select("id,username,display_name,avatar_url").in("username", usernames);
      if (peopleError) throw peopleError;
      const found = (people || []) as Profile[];
      const notFound = usernames.filter(name => !found.some(person => person.username?.toLowerCase() === name));
      if (notFound.length) throw new Error("Pseudo(s) introuvable(s) : " + notFound.map(name => "@" + name).join(", "));
      const members = found.filter(person => person.id !== user.id);
      if (!members.length) throw new Error("Choisis au moins un autre membre.");
      const { data: conv, error: createError } = await supabase.from("conversations")
        .insert({created_by:user.id,is_group:true,title}).select("id").single();
      if (createError) throw createError;
      const rows = [{conversation_id:conv.id,user_id:user.id}, ...members.map(person => ({conversation_id:conv.id,user_id:person.id}))];
      const { error: participantError } = await supabase.from("conversation_participants").insert(rows);
      if (participantError) {
        await supabase.from("conversations").delete().eq("id",conv.id);
        throw participantError;
      }
      await loadConversations();
      setActive("Messages");
      await openConversation(conv.id);
      setMessage("Groupe créé : " + title);
    } catch (err) {
      setMessage(err instanceof Error ? "Création du groupe impossible : " + err.message : "Création du groupe impossible.");
    } finally { setChatLoading(false); }
  }

  async function addGroupMembers() {
    if (!supabase || !user || !activeConversation) return;
    const current = conversations.find(c => c.id === activeConversation);
    if (!current?.is_group) return;
    const input = window.prompt("Pseudo(s) des membres à ajouter, séparés par des virgules (sans @) :");
    if (!input?.trim()) return;
    const usernames = [...new Set(input.split(",").map(name => name.trim().replace(/^@/, "").toLowerCase()).filter(Boolean))];
    if (!usernames.length) return;
    setChatLoading(true);
    try {
      const { data: people, error } = await supabase.from("profiles").select("id,username").in("username", usernames);
      if (error) throw error;
      const found = people || [];
      const missing = usernames.filter(name => !found.some(p => (p.username || "").toLowerCase() === name));
      if (missing.length) throw new Error("Pseudo(s) introuvable(s) : " + missing.map(name => "@" + name).join(", "));
      const { data: existing, error: existingError } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", activeConversation);
      if (existingError) throw existingError;
      const existingIds = new Set((existing || []).map(p => p.user_id));
      const rows = found.filter(p => !existingIds.has(p.id)).map(p => ({conversation_id:activeConversation,user_id:p.id}));
      if (!rows.length) { setMessage("Ces membres sont déjà dans le groupe."); return; }
      const { error: insertError } = await supabase.from("conversation_participants").insert(rows);
      if (insertError) throw insertError;
      await loadConversations();
      setMessage(rows.length === 1 ? "Membre ajouté au groupe." : rows.length + " membres ajoutés au groupe.");
    } catch (err) {
      setMessage(err instanceof Error ? "Ajout impossible : " + err.message : "Impossible d’ajouter ces membres.");
    } finally { setChatLoading(false); }
  }

  async function leaveGroupConversation() {
    if (!supabase || !user || !activeConversation) return;
    const current = conversations.find(c => c.id === activeConversation);
    if (!current?.is_group) return;
    if (!window.confirm("Quitter le groupe « " + current.title + " » ?")) return;
    setChatLoading(true);
    try {
      const { error } = await supabase.from("conversation_participants").delete().eq("conversation_id", activeConversation).eq("user_id", user.id);
      if (error) throw error;
      setActiveConversation(null);
      setChatMessages([]);
      await loadConversations();
      setMessage("Tu as quitté le groupe.");
    } catch (err) {
      setMessage(err instanceof Error ? "Impossible de quitter le groupe : " + err.message : "Impossible de quitter le groupe.");
    } finally { setChatLoading(false); }
  }

  async function startConversation(target: Profile) {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour envoyer un message."); return; }
    if (target.id === user.id) return;
    setChatLoading(true);
    try {
      const { data: memberships, error: membershipError } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id",user.id);
      if (membershipError) throw membershipError;
      const ids = (memberships || []).map(row => row.conversation_id as string);
      if (ids.length) {
        const { data: participants, error } = await supabase.from("conversation_participants").select("conversation_id,user_id").in("conversation_id",ids).eq("user_id",target.id);
        if (error) throw error;
        if (participants?.length) { await loadConversations(); setActive("Messages"); await openConversation(participants[0].conversation_id); return; }
      }
      const { data: conv, error: createError } = await supabase.from("conversations").insert({created_by:user.id,is_group:false,title:""}).select("id").single();
      if (createError) throw createError;
      const { error: participantError } = await supabase.from("conversation_participants").insert([{conversation_id:conv.id,user_id:user.id},{conversation_id:conv.id,user_id:target.id}]);
      if (participantError) throw participantError;
      await loadConversations(); setActive("Messages"); await openConversation(conv.id);
    } catch (err) { setMessage(err instanceof Error ? "Impossible de démarrer la conversation : " + err.message : "Impossible de démarrer la conversation."); }
    finally { setChatLoading(false); }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = chatDraft.trim();
    if (!supabase || !user || !activeConversation || (!content && !chatMediaFile)) return;
    if (content.length > 5000) { setMessage("Le message est trop long (5 000 caractères maximum)."); return; }
    let mediaUrl: string | null = null;
    let mediaType: string | null = null;
    setChatLoading(true);
    try {
      if (chatMediaFile) {
        const file = chatMediaFile;
        if (!["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"].includes(file.type)) throw new Error("Format non pris en charge. Choisis une image ou une vidéo.");
        if (file.size > 25 * 1024 * 1024) throw new Error("Un média de messagerie doit faire moins de 25 Mo.");
        const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"") || "bin";
        const path = user.id + "/chat/" + crypto.randomUUID() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path,file,{contentType:file.type,upsert:false});
        if (uploadError) throw uploadError;
        mediaUrl = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
        mediaType = file.type.startsWith("video/") ? "video" : "image";
      }
      const { data, error } = await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:user.id,content,media_url:mediaUrl,media_type:mediaType}).select("id,conversation_id,sender_id,content,media_url,media_type,created_at").single();
      if (error) throw error;
      setChatDraft(""); setChatMediaFile(null);
      setChatMessages(old => old.some(m => m.id === data.id) ? old : [...old, data as typeof chatMessages[number]]);
      await supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",activeConversation);
      void loadConversations();
    } catch (err) {
      setMessage(err instanceof Error ? "Envoi impossible : " + err.message : "Envoi impossible.");
    } finally { setChatLoading(false); }
  }

  useEffect(() => {
    if (active !== "Messages" || !user || !supabase) return;
    void loadConversations();
  }, [active, user?.id]);

  useEffect(() => {
    if (!activeConversation || !supabase) return;
    const channel = supabase.channel("emi-chat-" + activeConversation)
      .on("postgres_changes", {event:"INSERT",schema:"public",table:"messages",filter:"conversation_id=eq." + activeConversation}, payload => {
        const row = payload.new as typeof chatMessages[number];
        setChatMessages(old => old.some(message => message.id === row.id) ? old : [...old,row]);
        void loadConversations();
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [activeConversation]);

  async function loadNotifications() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour consulter tes notifications."); return; }
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase.from("notifications").select("id,actor_id,type,entity_id,content,is_read,created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []) as {id:string;actor_id:string|null;type:string;entity_id:string|null;content:string;is_read:boolean;created_at:string}[];
      const actorIds = [...new Set(rows.map(row => row.actor_id).filter((id): id is string => !!id))];
      const { data: people, error: peopleError } = actorIds.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", actorIds) : { data: [], error: null };
      if (peopleError) throw peopleError;
      const peopleById = new Map((people || []).map(person => [person.id, person as Profile]));
      setNotifications(rows.map(row => ({ ...row, actor: row.actor_id ? peopleById.get(row.actor_id) || null : null })));
      const unreadIds = rows.filter(row => !row.is_read).map(row => row.id);
      if (unreadIds.length) {
        const { error: readError } = await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds).eq("recipient_id", user.id);
        if (!readError) setNotifications(old => old.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) { setMessage(err instanceof Error ? "Notifications : " + err.message : "Impossible de charger les notifications."); }
    finally { setNotificationsLoading(false); }
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

  function goBack() {
    if (viewingProfile) {
      setViewingProfile(null);
      setProfileTab("posts");
      setActive("Accueil");
      void loadFeed();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (active !== "Accueil") {
      setActive("Accueil");
      setQuery("");
      void loadFeed();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function openProfile(targetId: string) {
    if (!supabase) return;
    setMessage("");
    // Charger immédiatement les données indépendantes en parallèle pour réduire l'attente.
    const [{ data: profile, error: profileError }, postsResult, postsCountResult, followersResult, followingResult] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url,bio").eq("id", targetId).maybeSingle(),
      supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").eq("user_id", targetId).eq("visibility", "public").order("created_at", { ascending: false }).limit(60),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", targetId).eq("visibility", "public"),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", targetId),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", targetId)
    ]);
    if (profileError || !profile) { setMessage("Impossible de charger ce profil." + (profileError ? " " + profileError.message : "")); return; }
    if (postsResult.error) { setMessage("Impossible de charger les publications : " + postsResult.error.message); return; }
    const profilePosts = postsResult.data || [];
    const ids = profilePosts.map(p => p.id);
    const { data: likesData, error: likesError } = ids.length
      ? await supabase.from("post_likes").select("post_id,user_id").in("post_id", ids)
      : { data: [], error: null };
    if (likesError) console.warn("Impossible de charger les mentions J’aime du profil :", likesError.message);
    const counts: Record<string, number> = {};
    const mine: string[] = [];
    (likesData || []).forEach((l: {post_id:string;user_id:string}) => {
      counts[l.post_id] = (counts[l.post_id] || 0) + 1;
      if (user?.id === l.user_id) mine.push(l.post_id);
    });
    setProfilePostCount(postsCountResult.count || 0);
    setProfileFollowerCount(followersResult.count || 0);
    setProfileFollowingCount(followingResult.count || 0);
    setViewingProfile(profile as Profile);
    setPosts(profilePosts.map(p => ({ ...p, profiles: profile as Profile } as Post)));
    setLikes(counts);
    setLiked(mine);
    setActive("Profil");
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
    const { data: people, error: peopleError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio").in("id", ids);
    if (peopleError) { setMessage("Impossible de charger les profils : " + peopleError.message); return; }
    setConnectionProfiles((people || []) as Profile[]);
    setConnectionTitle(mode === "followers" ? "Abonnés" : "Abonnements");
    setConnectionsOpen(true);
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

  useEffect(() => {
    let cancelled = false;
    async function loadReposts() {
      if (!supabase || !user) { setReposted([]); return; }
      const { data, error } = await supabase.from("post_reposts").select("post_id").eq("user_id", user.id);
      if (!cancelled && !error) setReposted((data || []).map(row => row.post_id));
    }
    void loadReposts();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    async function loadSharedPosts() {
      if (!supabase || !viewingProfile || profileTab !== "shared") return;
      const { data: repostRows, error: repostError } = await supabase.from("post_reposts").select("post_id,created_at").eq("user_id", viewingProfile.id).order("created_at", { ascending: false }).limit(60);
      if (repostError) { if (!cancelled) setMessage("Impossible de charger les repartages : " + repostError.message); return; }
      const ids = (repostRows || []).map(row => row.post_id);
      if (!ids.length) { if (!cancelled) setSharedPosts([]); return; }
      const { data: originalPosts, error: postsError } = await supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").in("id", ids).eq("visibility", "public");
      if (postsError) { if (!cancelled) setMessage("Impossible de charger les publications repartagées : " + postsError.message); return; }
      const rows = originalPosts || [];
      const authorIds = [...new Set(rows.map(post => post.user_id))];
      const { data: authorProfiles, error: profileError } = authorIds.length
        ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", authorIds)
        : { data: [], error: null };
      if (profileError) { if (!cancelled) setMessage("Impossible de charger les auteurs : " + profileError.message); return; }
      const byId = new Map((authorProfiles || []).map(profile => [profile.id, profile]));
      const ordered = ids.map(id => rows.find(post => post.id === id)).filter(Boolean).map(post => ({ ...post!, profiles: byId.get(post!.user_id) || null } as Post));
      const { data: likesData } = await supabase.from("post_likes").select("post_id,user_id").in("post_id", ids);
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      (likesData || []).forEach((like: {post_id:string;user_id:string}) => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1;
        if (user?.id === like.user_id) mine.push(like.post_id);
      });
      if (!cancelled) {
        setSharedPosts(ordered);
        setLikes(old => ({ ...old, ...counts }));
        setLiked(old => [...new Set([...old, ...mine])]);
      }
    }
    void loadSharedPosts();
    return () => { cancelled = true; };
  }, [viewingProfile?.id, profileTab, user?.id]);

  async function toggleRepost(postId: string) {
    if (!supabase) return;
    if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour repartager une publication."); return; }
    const wasReposted = reposted.includes(postId);
    setReposted(old => wasReposted ? old.filter(id => id !== postId) : [...old, postId]);
    const result = wasReposted
      ? await supabase.from("post_reposts").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("post_reposts").insert({ post_id: postId, user_id: user.id });
    if (result.error) {
      setReposted(old => wasReposted ? [...old, postId] : old.filter(id => id !== postId));
      setMessage("Impossible d’enregistrer le repartage : " + result.error.message);
    } else {
      setMessage(wasReposted ? "Repartage retiré." : "Publication repartagée.");
    }
  }

  async function deletePost(post: Post) {
    if (!supabase || !user || post.user_id !== user.id) return;
    if (!window.confirm("Supprimer définitivement cette publication ? Cette action est irréversible.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", user.id);
    if (error) { setMessage("Suppression impossible : " + error.message); return; }
    setPosts(old => old.filter(item => item.id !== post.id));
    setSharedPosts(old => old.filter(item => item.id !== post.id));
    setLikes(old => { const next = {...old}; delete next[post.id]; return next; });
    setLiked(old => old.filter(id => id !== post.id));
    setReposted(old => old.filter(id => id !== post.id));
    setMessage("Publication supprimée.");
  }

  async function deleteChatMessage(msg: {id:string;sender_id:string;media_url?:string|null}) {
    if (!supabase || !user || msg.sender_id !== user.id) return;
    if (!window.confirm("Supprimer ce message pour tous les participants ?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", msg.id).eq("sender_id", user.id);
    if (error) { setMessage("Suppression du message impossible : " + error.message); return; }
    setChatMessages(old => old.filter(item => item.id !== msg.id));
    setMessage("Message supprimé.");
  }

  async function deleteStory(story: Story) {
    if (!supabase || !user || story.user_id !== user.id) return;
    if (!window.confirm("Supprimer définitivement ce statut ?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id).eq("user_id", user.id);
    if (error) { setMessage("Suppression du statut impossible : " + error.message); return; }
    setStories(old => old.filter(item => item.id !== story.id));
    setActiveStory(current => current?.id === story.id ? null : current);
    setMessage("Statut supprimé.");
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
  const filteredPosts = viewingProfile ? (profileTab === "shared" ? sharedPosts.filter(p => !query || p.content.toLowerCase().includes(query.toLowerCase())) : visiblePosts) : active === "Reels" || active === "Vidéos" ? visiblePosts.filter(post => post.media_type === "video") : visiblePosts.filter(post => post.media_type !== "video");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="EMi accueil"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a>
        <button className="profile-mini profile-mini-button" onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><div className="avatar avatar-me">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : user ? displayName.slice(0,2).toUpperCase() : "ME"}</div><div><strong>{user ? displayName : "Bienvenue sur EMi"}</strong><span>{user ? "Voir mon profil" : "Ton espace social"}</span></div></button>
        <nav className="nav-list" aria-label="Navigation principale">
          {[[ "Accueil", Home ], [ "Découvrir", Compass ], [ "Messages", MessageCircle ], [ "Notifications", Bell ], [ "Mon profil", UserRound ]].map(([label, Icon]) => { const title = label as string; const Glyph = Icon as typeof Home; return <button key={title} className={`nav-item ${active === title ? "selected" : ""}`} onClick={() => { setActive(title); if (title === "Notifications") void loadNotifications(); if (["Messages","Notifications","Mon profil"].includes(title) && !user) setAuthOpen(true); }}><Glyph size={20}/><span>{title}</span></button>; })}
        </nav>
        <button className="create-button" onClick={() => setCreateStudioOpen(true)}><Plus size={20}/> Créer</button>
        <div className="sidebar-bottom">{user ? <button className="nav-item" onClick={logout}><LogOut size={20}/><span>Se déconnecter</span></button> : <button className="nav-item" onClick={() => setAuthOpen(true)}><LogIn size={20}/><span>Connexion / Inscription</span></button>}<div className="sidebar-note"><Sparkles size={16}/><p>Des moments vrais.<br/><strong>Des liens qui comptent.</strong></p></div><span className="version">EMi · Communauté</span></div>
      </aside>

      <section className="main-column">
        <header className="mobile-header">{(viewingProfile || active !== "Accueil") && <button className="icon-button back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={23}/></button>}<a className="brand" href="#" onClick={e => { e.preventDefault(); goBack(); }}><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a><button className="icon-button" aria-label="Compte" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? <LogOut size={21}/> : <UserRound size={21}/>}</button></header>
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
        <div className="feed-header">{(viewingProfile || active !== "Accueil") && <button className="icon-button desktop-back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={22}/></button>}<div><span className="eyebrow">{viewingProfile ? "EMi · PROFIL PERSONNEL" : "TON UNIVERS, TES LIENS"}</span><h1>{viewingProfile ? currentProfileName : active === "Accueil" ? "Le fil des moments" : active === "Découvrir" ? "Découvrir la communauté" : active === "Reels" || active === "Vidéos" ? "Reels EMi" : active === "Messages" ? "Ta messagerie" : active === "Paramètres" ? "Paramètres et activité" : active}</h1><p>{viewingProfile ? "@" + (viewingProfile.username || "membre") : active === "Découvrir" ? "Trouve des membres et découvre leurs publications." : active === "Messages" ? "Retrouve tes conversations au même endroit." : active === "Reels" || active === "Vidéos" ? "Les vidéos de la communauté, dans un fil dédié." : user ? "Connecté en tant que " + displayName : "Découvre les publications publiques."}</p></div><button className="round-action" onClick={() => viewingProfile && user?.id === viewingProfile.id ? startProfileEdit() : setCreateStudioOpen(true)} aria-label="Action profil ou publication">{viewingProfile && user?.id === viewingProfile.id ? <Settings size={22}/> : <Plus size={22}/>}</button></div>
        {viewingProfile && <section className="profile-page"><div className="profile-page-top"><div className="profile-page-avatar-wrap"><div className="profile-page-avatar">{viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt={"Photo de " + currentProfileName}/> : <span>{currentProfileName.slice(0,2).toUpperCase()}</span>}</div></div><div className="profile-page-identity"><h2>{currentProfileName}</h2><span className="profile-username">@{viewingProfile.username || "membre"}</span><div className="profile-stats"><div><strong>{profilePostCount}</strong><span>publications</span></div><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "followers")}><strong>{profileFollowerCount}</strong><span>abonnés</span></button><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "following")}><strong>{profileFollowingCount}</strong><span>abonnements</span></button></div></div></div><p className="profile-bio">{viewingProfile.bio?.trim() || "Bienvenue sur mon profil EMi ✨"}</p><div className="profile-page-actions">{user?.id === viewingProfile.id ? <><button className="modal-primary" onClick={startProfileEdit}><Settings size={16}/> Modifier le profil</button><button className="profile-back-button" aria-label="Paramètres et activité" onClick={() => {setViewingProfile(null);setActive("Paramètres");setSettingsSection(null);window.scrollTo({top:0,behavior:"smooth"});}}><Settings size={17}/> Paramètres</button></> : user ? <button className="modal-primary" onClick={() => void toggleFollow(viewingProfile.id)}>{followedIds.includes(viewingProfile.id) ? "Abonné(e)" : "Suivre"}</button> : <button className="modal-primary" onClick={() => setAuthOpen(true)}>Se connecter</button>}<button className="profile-back-button" onClick={() => { setViewingProfile(null); setActive("Accueil"); void loadFeed(); }}>Partager le profil</button><button className="profile-back-button profile-more-action" onClick={() => setCreateStudioOpen(true)} aria-label="Plus d’actions">•••</button></div><div className="profile-tabs" role="tablist" aria-label="Contenus du profil"><button role="tab" aria-selected={profileTab==="posts"} className={profileTab==="posts"?"selected":""} onClick={()=>setProfileTab("posts")} aria-label="Publications"><span>▦</span></button><button role="tab" aria-selected={profileTab==="reels"} className={profileTab==="reels"?"selected":""} onClick={()=>setProfileTab("reels")} aria-label="Reels"><Clapperboard size={19}/></button><button role="tab" aria-selected={profileTab==="shared"} className={profileTab==="shared"?"selected":""} onClick={()=>setProfileTab("shared")} aria-label="Repartages"><span>↻</span></button><button role="tab" aria-selected={profileTab==="tagged"} className={profileTab==="tagged"?"selected":""} onClick={()=>setProfileTab("tagged")} aria-label="Identifications"><UserRound size={19}/></button></div></section>}
        {!viewingProfile && <>
        <div className="stories-card" style={{display:["Reels","Vidéos","Découvrir","Messages"].includes(active) ? "none" : undefined}}><div className="section-label"><strong>Les stories</strong><button onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}>Partager <span>→</span></button></div><div className="stories-row"><button className="story" onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}><span className="story-ring story-add"><span className="story-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : <Plus size={18}/>}</span><span className="story-plus"><Plus size={13}/></span></span><span className="story-name">Ta story</span></button>{stories.map((story, index) => { const author = story.profiles?.display_name || story.profiles?.username || "Membre EMi"; return <button className="story" key={story.id} onClick={() => setActiveStory(story)} aria-label={"Voir la story de " + author}><span className="story-ring story-media-ring"><span className="story-avatar story-media-thumb">{story.media_type === "image" ? <img src={story.media_url} alt="Aperçu du statut"/> : <span className="story-video-thumb"><img src="/emi-story-video.svg" alt="Vidéo"/><Video size={16}/></span>}</span></span><span className="story-name">{story.user_id === user?.id ? "Votre story" : author}</span></button>; })}{stories.length === 0 && <span className="stories-empty">Les stories de la communauté apparaîtront ici.</span>}</div></div>
        <div className="feed-tabs" style={{display:["Reels","Découvrir","Messages"].includes(active) ? "none" : undefined}}><button className={active === "Accueil" ? "tab-active" : ""} onClick={() => {setActive("Accueil"); void loadFeed();}}>Publications</button><button className={active === "Abonnements" ? "tab-active" : ""} onClick={() => void loadFollowingFeed()}>Abonnements</button><button className={active === "Vidéos" ? "tab-active" : ""} onClick={() => setActive("Vidéos")}>Vidéos <Video size={14}/></button></div>
        </>}

        {active === "Paramètres" && !viewingProfile && <section className="emi-settings-page">
          {!settingsSection ? <><div className="emi-settings-hero"><span className="emi-settings-crest"><Settings size={24}/></span><div><span className="eyebrow">EMi · ESPACE PERSONNEL</span><h2>Paramètres et activité</h2><p>Ton compte, tes choix, tes règles.</p></div></div><div className="emi-settings-groups">
            {([{title:"MON COMPTE",items:[["Informations personnelles","Gère les informations de ton profil","user"],["Modifier mon profil","Photo, nom, pseudo et biographie","edit"],["Sécurité et mot de passe","Protège l’accès à ton compte","security"],["Désactivation et suppression","Gérer ton compte EMi","account"]]}, {title:"CONFIDENTIALITÉ",items:[["Confidentialité du compte","Choisis qui peut voir ton contenu","privacy"],["Comptes bloqués","Gère les membres bloqués","blocked"],["Messages et commentaires","Contrôle les interactions","interactions"],["Stories, mentions et partages","Choisis comment ton contenu circule","sharing"]]}, {title:"NOTIFICATIONS",items:[["Préférences de notifications","Choisis les alertes que tu reçois","notifications"],["Ne pas déranger","Gère tes moments de tranquillité","quiet"]]}, {title:"MON UNIVERS",items:[["Contenus enregistrés","Retrouve tes publications sauvegardées","saved"],["Archives et souvenirs","Retrouve tes stories archivées","archive"],["Préférences de contenu","Personnalise ce que tu découvres","content"]]}, {title:"APPLICATION",items:[["Apparence et thème","Personnalise l’expérience EMi","appearance"],["Langue et accessibilité","Rends EMi plus confortable","language"],["Données et stockage","Gère la qualité et les données","data"]]}, {title:"AIDE ET INFORMATIONS",items:[["Centre d’aide","Obtiens de l’assistance","help"],["Confidentialité et conditions","Découvre les règles d’EMi","legal"],["À propos d’EMi","Version et informations","about"]]}] as {title:string;items:string[][]}[]).map(group=><div className="emi-settings-group" key={group.title}><h3>{group.title}</h3>{group.items.map(([label,desc,key])=><button className="emi-settings-row" key={key} onClick={()=>{setSettingsSection(key);setSettingsNotice("");}}><span className="emi-settings-row-icon">{key==="security"?<ShieldCheck/>:key==="privacy"?<LockKeyhole/>:key==="saved"?<Bookmark/>:key==="archive"?<Archive/>:key==="notifications"?<Bell/>:key==="appearance"?<Palette/>:key==="language"?<Languages/>:key==="blocked"?<Ban/>:key==="sharing"?<Share2/>:key==="data"?<Smartphone/>:key==="help"||key==="legal"?<CircleHelp/>:key==="interactions"?<Eye/>:key==="quiet"?<Clock3/>:key==="content"?<SlidersHorizontal/>:<UserRoundCog/>}</span><span className="emi-settings-row-copy"><strong>{label}</strong><small>{desc}</small></span><ChevronRight size={19}/></button>)}</div>)}
          </div>{user && <div className="emi-settings-logout-wrap"><div className="emi-settings-logout-label">SESSION</div><button className="emi-settings-logout" onClick={() => {setSettingsSection(null);void logout();}}><LogOut size={18}/><span><strong>Se déconnecter</strong><small>Fermer ta session EMi sur cet appareil</small></span><ChevronRight size={18}/></button></div>}
          </> : <><header className="emi-settings-subhead"><button className="profile-back-button" onClick={()=>setSettingsSection(null)}><ChevronLeft size={19}/> Retour</button><span className="eyebrow">PARAMÈTRES EMi</span></header><h2 className="emi-settings-subtitle">({({user:"Informations personnelles",edit:"Modifier mon profil",security:"Sécurité et mot de passe",account:"Désactivation et suppression",privacy:"Confidentialité du compte",blocked:"Comptes bloqués",interactions:"Messages et commentaires",sharing:"Stories, mentions et partages",notifications:"Préférences de notifications",quiet:"Ne pas déranger",saved:"Contenus enregistrés",archive:"Archives et souvenirs",content:"Préférences de contenu",appearance:"Apparence et thème",language:"Langue et accessibilité",data:"Données et stockage",help:"Centre d’aide",legal:"Confidentialité et conditions",about:"À propos d’EMi"} as Record<string,string>)[settingsSection] || "Paramètres"}</h2><div className="emi-settings-detail">
            {settingsSection==="privacy" ? <><p>Choisis la visibilité de ton compte. Les changements ne s’appliqueront pleinement que lorsque la confidentialité sera reliée aux règles serveur.</p><label className="emi-setting-toggle"><span><strong>Compte privé</strong><small>Autoriser uniquement les abonnés approuvés à voir tes contenus.</small></span><input type="checkbox" checked={privateAccount} onChange={e=>{setPrivateAccount(e.target.checked);setSettingsNotice("Préférence modifiée sur cet écran. La protection serveur doit encore être connectée.");}}/></label><label className="emi-setting-toggle"><span><strong>Masquer les compteurs de J’aime</strong><small>Masquer les nombres de J’aime et de partages lorsque cette option sera prise en charge.</small></span><input type="checkbox" checked={hideLikeCounts} onChange={e=>{setHideLikeCounts(e.target.checked);setSettingsNotice("Préférence modifiée sur cet écran.");}}/></label></> : settingsSection==="edit" ? <><p>Modifie les informations visibles sur ton profil.</p><button className="modal-primary emi-settings-action" onClick={()=>{setSettingsSection(null);startProfileEdit();}}>Ouvrir la modification du profil</button></> : settingsSection==="security" ? <><p>Protège ton compte EMi.</p><button className="emi-settings-action" onClick={()=>{setAuthOpen(true);setRecoveryMode(true);setSettingsNotice("Suis les étapes de récupération pour définir un nouveau mot de passe.");}}>Récupérer ou modifier mon mot de passe</button><p className="emi-settings-note">La gestion des appareils connectés et la vérification renforcée seront ajoutées dans une prochaine étape.</p></> : settingsSection==="blocked" ? <p>La gestion complète des comptes bloqués sera ajoutée avec les règles de confidentialité et de modération.</p> : settingsSection==="notifications"||settingsSection==="quiet" ? <p>Les préférences détaillées de notifications et les horaires « Ne pas déranger » seront connectés au système de notifications EMi.</p> : settingsSection==="saved" ? <p>Les publications enregistrées seront accessibles ici lorsque la liste des favoris sera reliée à ton profil.</p> : settingsSection==="appearance" ? <><p>Choisis l’apparence de ton univers EMi.</p><div className="emi-theme-preview"><span/> <div><strong>Royal futuriste</strong><small>Violet profond · Or champagne</small></div><span className="emi-theme-current">Actuel</span></div></> : settingsSection==="language" ? <p>Langue actuelle : Français. D’autres langues et options d’accessibilité seront ajoutées progressivement.</p> : settingsSection==="about" ? <><p>EMi — des moments vrais, des liens qui rapprochent.</p><p className="emi-settings-note">Application en évolution · Version publique</p></> : <p>Cette rubrique est prévue dans la feuille de route EMi. Nous la connecterons à des fonctionnalités réelles avant d’activer ses commandes.</p>}
            {settingsNotice && <p className="emi-settings-note" role="status">{settingsNotice}</p>}
          </div></>}
        </section>}
        {active === "Notifications" && !viewingProfile && <section className="discovery-panel">
          <div className="section-label"><strong>Notifications</strong><button onClick={() => void loadNotifications()}>Actualiser ↻</button></div>
          {notificationsLoading && <p className="chat-empty">Chargement des notifications…</p>}
          <div className="discovery-list">{notifications.map(note => <article key={note.id} className="discovery-person" style={{opacity:note.is_read?0.72:1,borderColor:note.is_read?"var(--line)":"#8d6de0"}}>
            <span className="discovery-avatar">{note.actor?.avatar_url?<img src={note.actor.avatar_url} alt=""/>:(note.actor?.display_name||note.actor?.username||"EM").slice(0,2).toUpperCase()}</span>
            <button className="discovery-person-main" onClick={() => note.actor_id ? void openProfile(note.actor_id) : undefined}><span><strong>{note.actor?.display_name||note.actor?.username||"EMi"}</strong><small>{note.content}</small><small>{new Date(note.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></span></button>
            {!note.is_read && <span className="notification-unread-dot" aria-label="Non lue"/>}
          </article>)}
          {!notificationsLoading && notifications.length===0 && <div className="empty-feature"><Bell size={28}/><h2>Tu es à jour</h2><p>Les nouveaux abonnements, likes et commentaires apparaîtront ici.</p></div>}</div>
        </section>}
        {active === "Messages" && !viewingProfile && <section className="chat-shell">
          <aside className="chat-sidebar">
            <label className="discovery-search"><Search size={17}/><input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Rechercher une conversation…" aria-label="Rechercher une conversation"/></label>
            <div className="chat-list">
              {conversations.filter(conv => ((conv.is_group ? conv.title || "Groupe EMi" : conv.other?.display_name || conv.other?.username || conv.title || "Conversation").toLowerCase().includes(chatSearch.toLowerCase()))).map(conv => <button key={conv.id} className={"chat-list-item "+(activeConversation===conv.id?"chat-selected":"")} onClick={()=>void openConversation(conv.id)}><span className="chat-avatar">{conv.other?.avatar_url?<img src={conv.other.avatar_url} alt=""/>:(conv.other?.display_name||conv.other?.username||conv.title||"EM").slice(0,2).toUpperCase()}</span><span className="chat-list-copy"><strong>{conv.is_group ? conv.title || "Groupe EMi" : conv.other?.display_name||conv.other?.username||conv.title||"Conversation"}</strong><small>{conv.lastMessage}</small></span></button>)}
              {!conversations.length && <p className="chat-empty">{chatLoading?"Chargement…":"Pas encore de conversation. Va dans Découvrir et choisis un membre pour lui écrire."}</p>}
            </div>
            <button className="modal-primary" style={{width:"100%",marginTop:10}} onClick={()=>void createGroupConversation()} disabled={chatLoading}>+ Créer un groupe</button>
            <button className="profile-back-button" onClick={()=>{setActive("Découvrir");void loadExploreProfiles();}}>Trouver des membres</button>
          </aside>
          <section className="chat-window">
            {!activeConversation ? <div className="chat-welcome"><MessageCircle size={30}/><h2>Ta messagerie EMi</h2><p>Choisis une conversation ou découvre un membre pour envoyer un message privé.</p><button className="modal-primary" onClick={()=>{setActive("Découvrir");void loadExploreProfiles();}}>Découvrir des membres</button></div> : <>
              <div className="chat-topbar"><button className="profile-back-button" onClick={()=>setActiveConversation(null)}>← Conversations</button><strong>{conversations.find(conv=>conv.id===activeConversation)?.is_group ? conversations.find(conv=>conv.id===activeConversation)?.title || "Groupe EMi" : conversations.find(conv=>conv.id===activeConversation)?.other?.display_name || conversations.find(conv=>conv.id===activeConversation)?.other?.username || "Conversation privée"}</strong><span className="chat-secure-label">{conversations.find(c => c.id === activeConversation)?.is_group ? "Groupe · temps réel" : "Privé · temps réel"}</span>{conversations.find(c => c.id === activeConversation)?.is_group && <div className="chat-group-actions"><button className="profile-back-button" onClick={() => void addGroupMembers()} disabled={chatLoading}>+ Ajouter membres</button><button className="profile-back-button" onClick={() => void leaveGroupConversation()} disabled={chatLoading}>Quitter</button></div>}</div>
              <div className="chat-messages" aria-live="polite">{chatMessages.map(msg=><div key={msg.id} className={"chat-bubble "+(msg.sender_id===user?.id?"chat-mine":"chat-theirs")}><p>{msg.content}</p>{msg.media_url && (msg.media_type === "video" ? <video src={msg.media_url} controls playsInline className="chat-media"/> : <img src={msg.media_url} alt="Média partagé" className="chat-media"/>)}<time>{new Date(msg.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</time>{msg.sender_id===user?.id && <button type="button" className="chat-delete-message" onClick={()=>void deleteChatMessage(msg)} aria-label="Supprimer ce message" title="Supprimer ce message"><X size={14}/></button>}</div>)}</div>
              <form className="chat-compose" onSubmit={sendChatMessage}><input ref={chatMediaInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setChatMediaFile(e.target.files?.[0]||null)} hidden/><button type="button" className="profile-back-button" aria-label="Joindre une image ou vidéo" onClick={()=>chatMediaInput.current?.click()}><ImageIcon size={17}/></button><input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={5000} placeholder={chatMediaFile ? chatMediaFile.name : "Écris un message…"} aria-label="Écris un message" disabled={!user}/><button className="modal-primary" type="submit" disabled={!chatDraft.trim()&&!chatMediaFile||chatLoading}><Send size={17}/> Envoyer</button></form>
            </>}
          </section>
        </section>}
        {message && <div className="demo-note" role="status"><Sparkles size={16}/><span>{message}</span><button style={{marginLeft:"auto",background:"none",border:0,color:"inherit"}} onClick={() => setMessage("")} aria-label="Fermer"><X size={15}/></button></div>}
        {active === "VIBES" && !viewingProfile && <section className="emi-vibes-page">
          <header className="emi-vibes-hero"><div className="emi-vibes-orb"><Music2 size={30}/></div><span className="eyebrow">EMi · MUSIC CULTURE</span><h2>Le son qui rassemble.</h2><p>Découvre les vibes, les talents et les sons qui feront demain.</p><div className="emi-vibes-badges"><span><Headphones size={13}/> Culture urbaine</span><span><Sparkles size={13}/> Made for Africa</span></div></header>
          <div className="emi-vibes-search"><Search size={18}/><input value={vibesSearch} onChange={e=>setVibesSearch(e.target.value)} placeholder="Rechercher un titre ou un artiste…" aria-label="Rechercher un titre ou un artiste"/></div>
          <div className="emi-vibes-tabs">{["Pour toi","Hits","Cameroun 🇨🇲","Afrobeats","Indépendants"].map(tab=><button key={tab} className={vibesTab===tab?"selected":""} onClick={()=>setVibesTab(tab)}>{tab}</button>)}</div>
          <div className="emi-vibes-section-head"><div><span className="eyebrow">DÉCOUVERTE MUSICALE</span><h3>{vibesTab==="Hits"?"Hits du moment":vibesTab==="Cameroun 🇨🇲"?"La scène camerounaise":vibesTab==="Afrobeats"?"Afrobeats & vibes":vibesTab==="Indépendants"?"Talents indépendants":"À découvrir"}</h3></div><span className="emi-vibes-live"><span/> Catalogue en préparation</span></div>
          <div className="emi-vibes-feature"><div className="emi-vibes-feature-art"><Disc3 size={44}/><span>EMi<br/>VIBES</span></div><div><span className="eyebrow">BIENTÔT SUR EMi</span><h3>Les sons qui te ressemblent.</h3><p>Les hits autorisés et les artistes indépendants réunis dans un même espace.</p></div></div>
          <div className="emi-vibes-empty"><div className="emi-vibes-empty-icon"><Mic2 size={26}/></div><h3>{vibesSearch?"Recherche musicale bientôt disponible":"La scène est à toi."}</h3><p>{vibesTab==="Indépendants"?"Nous préparons un espace pour les artistes qui souhaitent proposer leurs morceaux avec les autorisations nécessaires.":"Le catalogue musical et les tendances seront activés après la connexion d’une source autorisée. Nous n’affichons pas de faux hits ni de fausses statistiques."}</p><button onClick={()=>{setVibesTab("Indépendants");setVibesSearch("");}}>Découvrir l’espace artistes <ChevronRight size={16}/></button></div>
          <div className="emi-vibes-note"><ShieldCheck size={16}/><span>EMi vérifiera les autorisations nécessaires avant de proposer un morceau à l’écoute ou à l’utilisation dans une publication.</span></div>
        </section>}
        {active === "VIBES" ? null : active === "Paramètres" ? null : active === "Découvrir" && !viewingProfile ? <section className="discovery-panel"><label className="discovery-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void loadExploreProfiles(); }} placeholder="Rechercher un nom ou @pseudo…" aria-label="Rechercher des membres"/></label><button className="modal-primary" onClick={() => void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading ? "Recherche…" : "Rechercher"}</button><div className="discovery-list">{exploreProfiles.map(profile => <article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={() => void openProfile(profile.id)}><span className="discovery-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : (profile.display_name || profile.username || "M").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name || profile.username || "Membre EMi"}</strong><small>@{profile.username || "membre"}</small>{profile.bio && <small className="discovery-bio">{profile.bio}</small>}</span></button><div className="discovery-person-actions"><button className="profile-back-button" onClick={() => void openProfile(profile.id)}>Voir le profil</button>{user && <button className="modal-primary" onClick={() => void startConversation(profile)}>Message</button>}</div></article>)}{!exploreLoading && exploreProfiles.length === 0 && <div className="empty-feature"><Compass size={30}/><h2>Découvre ta communauté</h2><p>Recherche un nom ou un nom d’utilisateur pour trouver des membres EMi.</p></div>}</div></section> : active === "Messages" && !viewingProfile ? null: !supabase ? <div className="post-card"><h2>Connexion à configurer</h2><p>Les variables d’environnement Supabase sont absentes. Vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel.</p></div> : (filteredPosts.length === 0 || (viewingProfile && (profileTab === "tagged" || (profileTab === "reels" && !filteredPosts.some(post => post.media_type === "video"))))) ? <div className="post-card profile-tab-empty" style={{padding:28,textAlign:"center"}}><div className="modal-icon" style={{margin:"0 auto 16px"}}><Sparkles size={23}/></div><h2 style={{fontSize:20}}>{viewingProfile && profileTab === "shared" ? "Aucun repartage pour le moment" : viewingProfile && profileTab === "tagged" ? "Aucune identification pour le moment" : query ? "Aucun résultat" : viewingProfile && profileTab === "reels" ? "Aucun Reel sur ce profil" : active === "Reels" || active === "Vidéos" ? "Aucun Reel pour le moment" : viewingProfile ? "Aucune publication pour le moment" : "Le fil commence ici"}</h2><p style={{color:"#aaa6b7",fontSize:13,lineHeight:1.7}}>{viewingProfile && profileTab === "shared" ? "Les publications que ce membre a repartagées apparaîtront ici." : viewingProfile && profileTab === "tagged" ? "Les publications qui identifient ce membre apparaîtront ici lorsque cette fonction sera disponible." : query ? "Essaie un autre mot." : viewingProfile && profileTab === "reels" ? "Les vidéos publiées par ce membre apparaîtront ici." : viewingProfile ? "Les moments partagés par ce membre apparaîtront ici." : "Aucune publication réelle n’est encore disponible. Sois le premier à partager un moment."}</p>{(!viewingProfile || (user?.id === viewingProfile.id && profileTab === "posts")) && <button className="modal-primary" style={{maxWidth:260}} onClick={() => setComposerOpen(true)}>Créer une publication</button>}</div> :
        <div className={"feed-list" + (viewingProfile ? " profile-media-grid" : "")}>{(viewingProfile && profileTab === "reels" ? filteredPosts.filter(post => post.media_type === "video") : viewingProfile && profileTab === "tagged" ? [] : filteredPosts).map(post => { const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi"; return <article className={(active === "Reels" && post.media_type === "video" ? "post-card reel-post" : "post-card") + (viewingProfile ? " profile-grid-post" : "")} key={post.id}><div className="post-top"><button className="post-avatar-button" onClick={() => void openProfile(post.user_id)} aria-label={"Voir le profil de " + author}><div className="avatar avatar-sunset">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt=""/> : author.slice(0,2).toUpperCase()}</div></button><button className="post-author post-author-button" onClick={() => void openProfile(post.user_id)}><strong>{author}</strong><span>@{post.profiles?.username || "membre"} · {new Date(post.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</span></button>{user && user.id !== post.user_id && <button onClick={() => void toggleFollow(post.user_id)} style={{marginLeft:"auto",border:"1px solid #393643",borderRadius:9,padding:"7px 10px",background:followedIds.includes(post.user_id)?"#282235":"#a78bfa17",color:"#d8c9ff",fontSize:11}}>{followedIds.includes(post.user_id) ? "Suivi" : "Suivre"}</button>}</div>{post.content && <><p className="post-caption">{post.content.split("[EMI_MUSIC]")[0].trim()}</p>{post.content.includes("[EMI_MUSIC]") && (()=>{try{const track=JSON.parse(post.content.split("[EMI_MUSIC]")[1].split("[/EMI_MUSIC]")[0]) as {url:string;title:string};const audioId="emi-track-"+post.id;const hasVideo=post.media_type==="video";return <div className="emi-post-music"><span className="emi-post-music-icon"><Music2 size={17}/></span><span className="emi-post-music-title"><strong>{track.title}</strong><small>{hasVideo ? "Musique synchronisée avec la vidéo" : "Musique ajoutée à cette publication"}</small></span><audio id={audioId} controls={!hasVideo} preload="none" src={track.url} aria-label={"Écouter "+track.title}/></div>}catch{return null}})()}</>}{(post.media_urls || []).map((url,i) => post.media_type === "video" ? <video key={url+i} src={url} controls autoPlay={active === "Reels"} muted={false} loop={active === "Reels"} playsInline preload={active === "Reels" ? "metadata" : "none"} className={active === "Reels" ? "reel-video" : undefined} onPlay={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.currentTime=video.currentTime;void audio.play().catch(()=>undefined);}}} onPause={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.pause();}} onSeeking={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.currentTime=e.currentTarget.currentTime;}} onTimeUpdate={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio&&Math.abs(audio.currentTime-video.currentTime)>0.35)audio.currentTime=video.currentTime;}} onEnded={()=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.pause();audio.currentTime=0;}}} style={active === "Reels" ? undefined : {width:"100%",maxHeight:560,borderRadius:0,background:"#09090d",objectFit:"contain"}}/> : <img key={url+i} src={url} alt="Publication partagée sur EMi" loading="lazy" decoding="async" style={{width:"100%",maxHeight:650,objectFit:"contain",borderRadius:0,background:"#09090d"}}/>)}<div className="post-actions">{post.user_id === user?.id && <button onClick={() => void deletePost(post)} aria-label="Supprimer cette publication" title="Supprimer la publication"><X size={19}/><span>Supprimer</span></button>}<button className={liked.includes(post.id) ? "liked" : ""} onClick={() => void toggleLike(post.id)}><Heart size={20} fill={liked.includes(post.id) ? "currentColor" : "none"}/><span>{likes[post.id] || 0}</span></button><button onClick={() => { const isOpen = openComments.includes(post.id); setOpenComments(old => isOpen ? old.filter(id => id !== post.id) : [...old, post.id]); if (!isOpen) void loadComments(post.id); }}><MessageCircle size={20}/><span>Commentaires{comments[post.id]?.length ? ` (${comments[post.id].length})` : ""}</span></button><button className={reposted.includes(post.id) ? "liked" : ""} onClick={() => void toggleRepost(post.id)} aria-label={reposted.includes(post.id) ? "Annuler le repartage" : "Repartager"}><Repeat2 size={19}/><span>{reposted.includes(post.id) ? "Repartagé" : "Repartager"}</span></button><button onClick={() => { if (navigator.share) void navigator.share({title:"EMi",text:post.content,url:location.href}).catch(()=>{}); else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi."); }}><Send size={19}/><span>Partager</span></button></div>{openComments.includes(post.id) && <div className="comments-panel" style={{borderTop:"1px solid #2b2b35",marginTop:14,paddingTop:12}}><div style={{display:"grid",gap:10,marginBottom:12}}>{(comments[post.id] || []).map(comment => <div key={comment.id} style={{fontSize:12,lineHeight:1.6}}><strong>{comment.profiles?.display_name || comment.profiles?.username || "Membre"} </strong><span style={{color:"#d0ced9",overflowWrap:"anywhere"}}>{comment.content}</span></div>)}{comments[post.id]?.length === 0 && <p style={{fontSize:12,color:"#92919f"}}>Aucun commentaire. Lance la conversation !</p>}</div><form onSubmit={e => void addComment(post.id,e)} style={{display:"flex",gap:8}}><input aria-label="Écrire un commentaire" value={commentDrafts[post.id] || ""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:10,borderRadius:9,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 14px"}}>Envoyer</button></form></div>}</article>; })}</div>
      }
      </section>

      <aside className="right-column"><div className="right-search"><Search size={18}/><input aria-label="Rechercher" placeholder="Rechercher sur EMi..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires et garde le lien avec ta communauté.</p><button onClick={() => setComposerOpen(true)}>Partager un moment <Plus size={16}/></button></div><div className="emi-values-card"><div className="emi-values-icon"><Heart size={18} fill="currentColor"/></div><span className="eyebrow">L’ESPRIT EMi</span><h3>La bonté laisse une trace.</h3><p>Un geste, une écoute, un peu d’aide : ce que nous partageons peut éclairer la journée de quelqu’un.</p><div className="emi-values-tags"><span>Bienveillance</span><span>Partage</span><span>Lien</span></div></div><div className="suggest-card"><div className="section-label"><strong>Ton compte</strong></div><p style={{fontSize:12,lineHeight:1.7,color:"#aaa6b7"}}>{user ? "Tu es connecté. Tes publications sont enregistrées dans Supabase." : "Connecte-toi pour publier et aimer les moments."}</p><button className="modal-primary" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? "Se déconnecter" : "Connexion / Inscription"}</button></div><div className="right-footer">À propos · Confidentialité · Aide<br/>© 2026 EMi</div></aside>

      <nav className="mobile-nav" aria-label="Navigation mobile"><button className={active === "Accueil" && !viewingProfile ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Home size={20}/><span>Accueil</span></button><button className={active === "Découvrir" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Découvrir");void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}}><Compass size={20}/><span>Explorer</span></button><button className="mobile-create" aria-label="Ouvrir le studio de création" onClick={() => setCreateStudioOpen(true)}><Plus size={22}/></button><button className={active === "VIBES" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("VIBES");window.scrollTo({top:0,behavior:"smooth"});}}><Music2 size={20}/><span>VIBES</span></button><button className={active === "Reels" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Reels");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Clapperboard size={20}/><span>Reels</span></button><button className={active === "Messages" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Messages");window.scrollTo({top:0,behavior:"smooth"});if(!user)setAuthOpen(true);}}><MessageCircle size={20}/><span>Messages</span></button><button className={viewingProfile ? "mobile-active" : ""} onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><UserRound size={20}/><span>Profil</span></button><button className={active === "Paramètres" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Paramètres");setSettingsSection(null);window.scrollTo({top:0,behavior:"smooth"});}}><Settings size={20}/><span>Réglages</span></button></nav>

      {createStudioOpen && <div className="modal-backdrop create-studio-backdrop" onClick={() => setCreateStudioOpen(false)}><section className="create-studio" role="dialog" aria-modal="true" aria-label="Studio de création EMi" onClick={e => e.stopPropagation()}><header className="create-studio-header"><div><span className="eyebrow">EMi · CRÉATION</span><h2>Que veux-tu partager ?</h2><p>Un instant, une histoire, une vidéo : à toi de jouer.</p></div><button className="modal-close" onClick={() => setCreateStudioOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="create-studio-preview"><div className="studio-glow studio-glow-one"/><div className="studio-glow studio-glow-two"/><div className="studio-preview-icon"><Sparkles size={30}/></div><strong>Chaque moment mérite d’exister.</strong><span>Ton espace créatif, signé EMi</span></div><div className="create-studio-options"><button className="studio-option studio-option-story" onClick={() => { if (!user) { setCreateStudioOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else openCamera("photo"); }}><span className="studio-option-icon"><Camera size={23}/></span><span><strong>Story</strong><small>Photo ou vidéo · 24 h</small></span><span className="studio-option-arrow">↗</span></button><button className="studio-option studio-option-post" onClick={() => openCamera("photo")}><span className="studio-option-icon"><ImageIcon size={23}/></span><span><strong>Publication</strong><small>Photo, vidéo et légende</small></span><span className="studio-option-arrow">↗</span></button><button className="studio-option studio-option-reel" onClick={() => openCamera("video")}><span className="studio-option-icon"><Clapperboard size={23}/></span><span><strong>Reel / vidéo</strong><small>Partage un moment en mouvement</small></span><span className="studio-option-arrow">↗</span></button><button className="studio-option studio-option-text" onClick={() => openCamera("text")}><span className="studio-option-icon"><span className="studio-text-icon">T</span></span><span><strong>Texte</strong><small>Une pensée, une annonce, une idée</small></span><span className="studio-option-arrow">↗</span></button></div><footer className="create-studio-footer"><span><Sparkles size={14}/> Créé avec EMi</span><span>Partage à ta façon</span></footer></section></div>}
      {cameraOpen && <div className="camera-studio-backdrop" role="dialog" aria-modal="true" aria-label="Caméra EMi"><section className="camera-studio"><video ref={cameraVideoRef} className={"camera-live-preview" + (cameraFacing === "user" ? " camera-selfie" : "")} autoPlay muted playsInline/><div className="camera-preview-shade"/><header className="camera-studio-top"><button onClick={() => { stopCamera(); setCameraOpen(false); }} aria-label="Fermer la caméra"><X size={25}/></button><span>EMi <small>STUDIO</small></span><button onClick={() => void startCamera(cameraFacing === "user" ? "environment" : "user")} aria-label="Changer de caméra"><span className="camera-flip-symbol">↻</span></button></header>{cameraError && <div className={"camera-status" + (cameraRecording ? " recording" : "")} role="status">{cameraError}</div>}{!cameraError && <div className="camera-tip">Place-toi dans le cadre et crée ton moment ✨</div>}<div className="camera-tools"><button onClick={() => { const input=document.getElementById("emi-camera-gallery") as HTMLInputElement|null; input?.click(); }}><ImageIcon size={22}/><small>Galerie</small></button><button className={"camera-shutter" + (cameraRecording ? " is-recording" : "")} onClick={() => cameraMode === "photo" ? captureCameraPhoto() : toggleVideoRecording()} aria-label={cameraMode === "photo" ? "Prendre une photo" : cameraRecording ? "Arrêter la vidéo" : "Démarrer la vidéo"}><span/></button><button onClick={() => { stopCamera(); setCameraOpen(false); setCreateStudioOpen(true); }}><Sparkles size={22}/><small>Modes</small></button></div><div className="camera-mode-switch"><button className={cameraMode === "photo" ? "selected" : ""} onClick={() => setCameraMode("photo")}>PHOTO</button><button className={cameraMode === "video" ? "selected" : ""} onClick={() => setCameraMode("video")}>VIDÉO</button><button onClick={() => { stopCamera(); setCameraOpen(false); openCamera("text"); }}>TEXTE</button></div><input id="emi-camera-gallery" type="file" accept="image/*,video/*" capture="environment" onChange={e => { const selected=e.target.files?.[0]; if(selected){setFile(selected);stopCamera();setCameraOpen(false);setComposerOpen(true);setMessage("Média sélectionné ! Ajoute une légende avant de publier.");} e.currentTarget.value=""; }} hidden/></section></div>}
      {connectionsOpen && <div className="modal-backdrop" onClick={() => setConnectionsOpen(false)}><section className="connections-modal" role="dialog" aria-modal="true" aria-label={connectionTitle} onClick={e => e.stopPropagation()}><header><h2>{connectionTitle}</h2><button className="modal-close" onClick={() => setConnectionsOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="connections-list">{connectionProfiles.map(person => <button className="connections-person" key={person.id} onClick={() => { setConnectionsOpen(false); void openProfile(person.id); }}><span className="connections-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : (person.display_name || person.username || "EM").slice(0,2).toUpperCase()}</span><span><strong>{person.display_name || person.username || "Membre EMi"}</strong><small>@{person.username || "membre"}</small></span><span className="connections-chevron">›</span></button>)}</div>{connectionProfiles.length===0 && <p className="connections-empty">Aucun membre à afficher.</p>}</section></div>}
      {storyComposerOpen && <div className="modal-backdrop" onClick={() => {setStoryComposerOpen(false);setStoryFile(null);}}><div className="modal-card story-composer-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => setStoryComposerOpen(false)} aria-label="Fermer"><X size={20}/></button><div className="modal-icon"><Camera size={23}/></div><span className="eyebrow">EMi · STORY</span><h2>Partager une story</h2><p>Une photo ou vidéo, avec ta musique, visible pendant 24 heures.</p><form onSubmit={publishStory}><input ref={storyFileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setStoryFile(e.target.files?.[0] || null)} style={{display:"none"}}/><input ref={storyMusicInput} type="file" accept="audio/*" onChange={e=>setStoryMusicFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="nav-item" style={{border:"1px solid #393643",marginBottom:12}} onClick={()=>storyFileInput.current?.click()}><ImageIcon size={18}/><span>{storyFile ? storyFile.name : "Choisir une photo ou vidéo"}</span></button><button type="button" className="nav-item" style={{border:"1px solid #393643",marginBottom:12}} onClick={()=>storyMusicInput.current?.click()}><Music2 size={18}/><span>{storyMusicFile ? storyMusicFile.name : "Ajouter une musique (facultatif)"}</span></button>{storyMusicFile && <input value={storyMusicTitle} onChange={e=>setStoryMusicTitle(e.target.value)} maxLength={100} placeholder="Titre de la musique" style={{width:"100%",padding:12,marginBottom:12,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}{storyFile && <div className="story-preview">{storyFile.type.startsWith("video/") ? "Aperçu vidéo sélectionné" : "Photo sélectionnée"} · {(storyFile.size/1024/1024).toFixed(1)} Mo</div>}<textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} rows={3} placeholder="Ajouter un texte (facultatif)…" style={{width:"100%",resize:"vertical",padding:12,margin:"12px 0",borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><p style={{fontSize:11,lineHeight:1.6,color:"#aaa6b7"}}>Formats photo/vidéo courants, jusqu’à 50 Mo. La story expire dans 24 heures.</p><button className="modal-primary" disabled={busy || !storyFile} type="submit">{busy ? "Publication…" : "Publier la story"}</button></form></div></div>}
      {activeStory && <div className="story-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Visionneuse de story" onClick={() => setActiveStory(null)}><div className="story-viewer" onClick={e=>e.stopPropagation()}><div className="story-progress"><span style={{animationDuration:activeStory.media_type === "video" ? "15s" : "6s"}}/></div><header><div className="story-viewer-author">{activeStory.profiles?.avatar_url ? <img src={activeStory.profiles.avatar_url} alt=""/> : <span>{(activeStory.profiles?.display_name || activeStory.profiles?.username || "M").slice(0,1).toUpperCase()}</span>}<strong>{activeStory.profiles?.display_name || activeStory.profiles?.username || "Membre EMi"}</strong><small>{new Date(activeStory.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</small></div>{activeStory.user_id === user?.id && <button onClick={() => void deleteStory(activeStory)} aria-label="Supprimer ce statut" title="Supprimer ce statut"><span style={{fontSize:12}}>Supprimer</span></button>}<button onClick={() => setActiveStory(null)} aria-label="Fermer la story"><X size={22}/></button></header>{activeStory.media_type === "video" ? <video className="story-viewer-media" src={activeStory.media_url} controls autoPlay playsInline onEnded={() => setActiveStory(null)}/> : <img className="story-viewer-media" src={activeStory.media_url} alt="Story"/>}{activeStory.caption && <p className="story-viewer-caption">{activeStory.caption}</p>}{activeStory.music_url && <div className="emi-story-music"><Music2 size={18}/><span>{activeStory.music_title || "Musique du moment"}</span><audio controls preload="none" src={activeStory.music_url} aria-label={"Écouter " + (activeStory.music_title || "la musique de la story")}/></div>}<div className="story-viewer-nav"><button onClick={() => { const i=stories.findIndex(st=>st.id===activeStory.id); if(i>0)setActiveStory(stories[i-1]); else setActiveStory(null); }}>Précédente</button><button onClick={() => { const i=stories.findIndex(st=>st.id===activeStory.id); if(i>=0 && i<stories.length-1)setActiveStory(stories[i+1]); else setActiveStory(null); }}>Suivante</button></div></div></div>}
      {!user && !authOpen && !welcomeDismissed && <section className="emi-welcome-screen" aria-label="Bienvenue sur EMi">
        <div className="emi-welcome-stars" aria-hidden="true"><span/><span/><span/><span/><span/></div>
        <div className="emi-welcome-orbit emi-orbit-one" aria-hidden="true"/><div className="emi-welcome-orbit emi-orbit-two" aria-hidden="true"/>
        <div className="emi-welcome-panel">
          <div className="emi-welcome-logo"><span className="emi-logo-glyph">e</span><span>EMi<span className="emi-logo-dot">.</span></span></div>
          <div className="emi-welcome-emblem" aria-hidden="true"><div className="emi-emblem-ring"><span>e</span></div><i className="emi-emblem-spark">✦</i></div>
          <span className="emi-welcome-overline"><Sparkles size={13}/> UN NOUVEL UNIVERS DE LIENS</span>
          <h1>Bienvenue dans<br/><span>ton univers.</span></h1>
          <p>Des moments vrais. Des rencontres inspirantes. Une communauté qui rapproche les cœurs.</p>
          <div className="emi-welcome-cta">
            <button className="emi-cta-primary" onClick={() => { setSignup(true); setRecoveryMode(false); setAuthOpen(true); setWelcomeDismissed(true); setMessage(""); }}>Créer mon compte <span aria-hidden="true">↗</span></button>
            <button className="emi-cta-secondary" onClick={() => { setSignup(false); setRecoveryMode(false); setAuthOpen(true); setWelcomeDismissed(true); setMessage(""); }}>J’ai déjà un compte <span aria-hidden="true">→</span></button>
          </div>
          <button className="emi-discover-link" onClick={() => setWelcomeDismissed(true)}>Explorer EMi d’abord <span aria-hidden="true">↓</span></button>
          <div className="emi-welcome-footer"><span><i/> VOTRE ESPACE. VOS HISTOIRES.</span><span>EMi © 2026</span></div>
        </div>
        <div className="emi-welcome-caption" aria-hidden="true"><span>CONNECTER</span><b>·</b><span>PARTAGER</span><b>·</b><span>APPARTENIR</span></div>
      </section>}
      {(composerOpen || authOpen || profileEditorOpen) && <div className="modal-backdrop" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}} aria-label="Fermer"><X size={20}/></button>{message && <div role="alert" style={{margin:"12px 0",padding:12,borderRadius:10,border:"1px solid #8d6de0",background:"#282235",color:"#f7f3ff",fontSize:13,lineHeight:1.6,overflowWrap:"anywhere"}}>{message}</div>}{composerOpen ? <><div className="modal-icon"><Camera size={23}/></div><span className="eyebrow">EMi · TON ESPACE</span><h2>Un moment à partager ?</h2><form onSubmit={publish}><textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Qu’as-tu envie de partager ?" maxLength={5000} rows={4} style={{width:"100%",resize:"vertical",padding:12,margin:"12px 0",borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" onClick={()=>fileInput.current?.click()} className="nav-item" style={{border:"1px solid #393643",marginBottom:12}}><ImageIcon size={18}/><span>{file ? file.name : "Ajouter une photo ou vidéo (50 Mo max.)"}</span></button>{file && <button type="button" onClick={()=>setFile(null)} className="nav-item"><X size={16}/> Retirer le fichier</button>}{file?.type.startsWith("image/") && <div className="emi-compose-music"><div className="emi-compose-music-head"><span className="emi-compose-music-icon"><Music2 size={18}/></span><span><strong>Ajouter une musique</strong><small>Accompagne ta photo avec un son que tu as le droit d’utiliser.</small></span></div><input ref={musicInput} type="file" accept="audio/*" onChange={e=>setMusicFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="emi-compose-music-pick" onClick={()=>musicInput.current?.click()}><Music2 size={16}/>{musicFile ? musicFile.name : "Choisir un fichier audio"}<ChevronRight size={16}/></button>{musicFile && <><label className="emi-compose-music-label">Titre du son<input value={musicTitle} onChange={e=>setMusicTitle(e.target.value)} placeholder="Titre ou nom de l’artiste" maxLength={100}/></label><audio controls preload="metadata" src={URL.createObjectURL(musicFile)} className="emi-compose-audio-preview"/><button type="button" className="emi-compose-music-remove" onClick={()=>{setMusicFile(null);setMusicTitle("");}}>Retirer la musique</button></>}</div>}<p style={{fontSize:11,lineHeight:1.6,color:"#aaa6b7"}}>Ta publication sera publique. Publier nécessite un compte connecté.</p><button className="modal-primary" disabled={busy} type="submit">{busy ? "Publication en cours…" : "Publier"}</button></form></> : profileEditorOpen ? <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · PROFIL</span><h2>Personnalise ton profil</h2><form onSubmit={saveProfile}><div className="profile-editor-avatar">{avatarFile ? avatarFile.name : user?.avatar_url ? <img src={user.avatar_url} alt="Photo actuelle"/> : <UserRound size={28}/>}</div><input ref={profileAvatarInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="profile-back-button" onClick={()=>profileAvatarInput.current?.click()}>Choisir une photo de profil</button><label className="profile-field-label">Nom affiché<input value={profileNameDraft} onChange={e=>setProfileNameDraft(e.target.value)} maxLength={80} placeholder="Ton nom"/></label><label className="profile-field-label">Nom d’utilisateur<input value={profileUsernameDraft} onChange={e=>setProfileUsernameDraft(e.target.value)} maxLength={30} placeholder="ex. emi_membre"/></label><label className="profile-field-label">Biographie<textarea value={profileBioDraft} onChange={e=>setProfileBioDraft(e.target.value)} maxLength={300} rows={4} placeholder="Présente-toi en quelques mots…"/></label><button className="modal-primary" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le profil"}</button></form></> : <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · TON COMPTE</span><h2>{recoveryMode ? "Nouveau mot de passe" : signup ? "Créer ton compte" : "Content de te revoir"}</h2><p>{recoveryMode ? "Choisis un mot de passe sûr pour retrouver ton compte." : signup ? "Inscris-toi avec ton adresse e-mail." : "Connecte-toi pour publier et aimer les moments."}</p>{!signup && !recoveryMode && <><div style={{display:"flex",gap:8,margin:"12px 0"}}><button type="button" onClick={()=>{setAuthMethod("email");setOtpSent(false);setOtpCode("");setMessage("");}} style={{flex:1,padding:10,borderRadius:9,border:"1px solid #8d6de0",background:"#302443",color:"#f7f6fb"}}>Connexion par e-mail</button></div><p style={{fontSize:12,lineHeight:1.6,color:"#aaa6b7",margin:"0 0 12px"}}>La connexion par SMS est temporairement indisponible. Utilise ton adresse e-mail et ton mot de passe.</p></>}<form onSubmit={authenticate}>{recoveryMode ? <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/> : authMethod==="phone" && !signup ? <><input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone (ex. +2376XXXXXXXX)" autoComplete="tel" disabled={otpSent} style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>{otpSent && <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="Code reçu par SMS" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}</> : <><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email" style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" autoComplete={signup?"new-password":"current-password"} style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/></>}<button className="modal-primary" disabled={busy} type="submit">{busy ? "Patiente…" : recoveryMode ? "Enregistrer le nouveau mot de passe" : authMethod==="phone" && !signup ? (otpSent ? "Vérifier le code SMS" : "Recevoir un code SMS") : signup ? "Créer mon compte" : "Se connecter"}</button></form>{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void requestPasswordReset()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Mot de passe oublié ?</button>}{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void resendConfirmationEmail()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Renvoyer le courriel de confirmation</button>}{authMethod==="email" && !recoveryMode && <button onClick={()=>setSignup(v=>!v)} style={{width:"100%",marginTop:14,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>{signup ? "J’ai déjà un compte" : "Créer un nouveau compte"}</button>}</>}</div></div>}
    </main>
  );
}
