"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Camera, ChevronLeft, Compass, Heart, Home, Repeat2, LogIn, LogOut, MessageCircle, Plus, Search, Send, Settings, Sparkles, UserRound, Video, X, Image as ImageIcon, Clapperboard, ShieldCheck, LockKeyhole, Bookmark, Archive, Languages, Palette, CircleHelp, Ban, Eye, SlidersHorizontal, Smartphone, ChevronRight, Clock3, Share2, UserRoundCog, Music2, Play, Headphones, TrendingUp, Mic2, Disc3, ShoppingBag, Users } from "lucide-react";
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
  const [openPostMenu, setOpenPostMenu] = useState<Post | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [archivedPostIds, setArchivedPostIds] = useState<string[]>([]);
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>([]);
  const [commentsDisabledIds, setCommentsDisabledIds] = useState<string[]>([]);
  const [hiddenLikeIds, setHiddenLikeIds] = useState<string[]>([]);
  const [hiddenShareIds, setHiddenShareIds] = useState<string[]>([]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [createStudioOpen, setCreateStudioOpen] = useState(false);
  const [manageContentOpen, setManageContentOpen] = useState(false);
  const [managedPosts, setManagedPosts] = useState<Post[]>([]);
  const [managedStories, setManagedStories] = useState<Story[]>([]);
  const [managedMessages, setManagedMessages] = useState<{id:string;conversation_id:string;sender_id:string;content:string;media_url?:string|null;media_type?:string|null;created_at:string}[]>([]);
  const [manageContentLoading, setManageContentLoading] = useState(false);
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
  const [publishDestination, setPublishDestination] = useState<"post" | "reel">("post");
  const [file, setFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicCatalog, setMusicCatalog] = useState<{id:string;title:string;artist:string;audio_url:string;cover_url:string|null;duration_seconds:number|null;genre:string|null}[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<{id:string;title:string;artist:string;audio_url:string;cover_url:string|null;duration_seconds:number|null;genre:string|null}|null>(null);
  const [musicSearch, setMusicSearch] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [musicTitle, setMusicTitle] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("original");
  const [creatorRatio, setCreatorRatio] = useState<"4:5"|"1:1"|"16:9">("4:5");
  const [creatorBrightness, setCreatorBrightness] = useState(100);
  const [creatorContrast, setCreatorContrast] = useState(100);
  const [creatorTextOnPhoto, setCreatorTextOnPhoto] = useState(false);
  const [creatorOverlayText, setCreatorOverlayText] = useState("");
  const [creatorEditOpen, setCreatorEditOpen] = useState(false);
  const [previewMusic, setPreviewMusic] = useState(false);
  const [musicStart, setMusicStart] = useState(0);
  const [musicEnd, setMusicEnd] = useState(30);
  const [musicDuration, setMusicDuration] = useState(0);
  const musicInput = useRef<HTMLInputElement>(null);
  const [localMusicPreviewUrl, setLocalMusicPreviewUrl] = useState("");
  useEffect(() => { if (!musicFile) { setLocalMusicPreviewUrl(""); return; } const url = URL.createObjectURL(musicFile); setLocalMusicPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [musicFile]);
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
  const [followPendingIds, setFollowPendingIds] = useState<string[]>([]);
  // Empêche une lecture initiale lente de remplacer l'état plus récent après un clic Suivre.
  const followMutationVersion = useRef(0);
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
  const [notifications, setNotifications] = useState<{id:string;actor_id:string|null;type:string;post_id:string|null;comment_id:string|null;message:string;is_read:boolean;created_at:string;actor?:Profile|null}[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [incomingMessageNotice, setIncomingMessageNotice] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  function decodeVapidKey(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
  }

  async function enablePushNotifications() {
    if (!supabase || !user) {
      setSettingsNotice("Connecte-toi à ton compte EMi avant d’activer les notifications.");
      setAuthOpen(true);
      return;
    }
    if (!( "Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSettingsNotice("Ce navigateur ne prend pas en charge les notifications push. Mets à jour Chrome et ouvre EMi depuis son icône installée.");
      return;
    }
    setPushBusy(true);
    setSettingsNotice("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Autorisation refusée. Autorise les notifications EMi dans les paramètres Android.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const keyResponse = await fetch("https://sygzppmhenpemunacpfn.supabase.co/functions/v1/emi-push", { headers: { apikey: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "") } });
      const keyPayload = await keyResponse.json();
      if (!keyResponse.ok || !keyPayload.publicKey) throw new Error(keyPayload.error || "Les clés Web Push ne sont pas encore configurées sur le serveur.");
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(keyPayload.publicKey) });
      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) throw new Error("Le navigateur n’a pas fourni un abonnement push complet.");
      const { error } = await supabase.from("push_subscriptions").upsert({ user_id: user.id, endpoint, p256dh, auth, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
      if (error) throw error;
      setPushEnabled(true);
      setSettingsNotice("Notifications activées sur cet appareil. L’envoi côté serveur doit aussi être relié aux nouveaux messages.");
    } catch (err) {
      setSettingsNotice(err instanceof Error ? err.message : "Impossible d’activer les notifications pour le moment.");
    } finally {
      setPushBusy(false);
    }
  }


  useEffect(() => {
    try {
      setSavedPostIds(JSON.parse(localStorage.getItem("emi:saved-posts") || "[]"));
      setArchivedPostIds(JSON.parse(localStorage.getItem("emi:archived-posts") || "[]"));
      setPinnedPostIds(JSON.parse(localStorage.getItem("emi:pinned-posts") || "[]"));
      setCommentsDisabledIds(JSON.parse(localStorage.getItem("emi:comments-disabled") || "[]"));
      setHiddenLikeIds(JSON.parse(localStorage.getItem("emi:hidden-likes") || "[]"));
      setHiddenShareIds(JSON.parse(localStorage.getItem("emi:hidden-shares") || "[]"));
    } catch { /* Ignore malformed local preferences. */ }
  }, []);

  function persistPostPreference(key: string, values: string[]) {
    try { localStorage.setItem("emi:" + key, JSON.stringify(values)); } catch {}
  }
  function togglePostPreference(key: "saved-posts"|"archived-posts"|"pinned-posts"|"comments-disabled"|"hidden-likes"|"hidden-shares", current: string[], setter: (value: string[]) => void, postId: string, label: string) {
    const next = current.includes(postId) ? current.filter(id => id !== postId) : [...current, postId];
    setter(next); persistPostPreference(key, next); setMessage(current.includes(postId) ? label + " désactivé." : label + " activé.");
  }
  async function sharePost(post: Post) {
    const url = window.location.origin + "/?publication=" + encodeURIComponent(post.id);
    try {
      if (navigator.share) await navigator.share({ title: "Publication EMi", text: post.content || "Découvre cette publication sur EMi", url });
      else { await navigator.clipboard.writeText(url); setMessage("Lien de la publication copié."); }
    } catch (error) { if (error instanceof Error && error.name !== "AbortError") setMessage("Partage indisponible sur cet appareil."); }
  }
  async function copyPostLink(post: Post) {
    const url = window.location.origin + "/?publication=" + encodeURIComponent(post.id);
    try { await navigator.clipboard.writeText(url); setMessage("Lien de la publication copié."); }
    catch { setMessage("Copie automatique indisponible. Lien : " + url); }
    setOpenPostMenu(null);
  }

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
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30, max: 30 }
        }
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
    // Conserve la résolution native réellement fournie par la caméra.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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
    }, "image/jpeg", 0.98);
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
    const versionAtStart = followMutationVersion.current;
    supabase.from("follows").select("following_id").eq("follower_id", user.id).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setMessage("Impossible de charger tes abonnements : " + error.message); return; }
      // Ne pas écraser une modification faite pendant que cette lecture était en cours.
      if (versionAtStart !== followMutationVersion.current) return;
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
    const musicRows = Array.from(document.querySelectorAll<HTMLElement>("[data-emi-music-row]"));
    if (!musicRows.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const row = entry.target as HTMLElement;
        const audio = row.querySelector("audio") as HTMLAudioElement | null;
        if (!audio) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6 && active !== "Reels") {
          document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other => { if (other !== audio) other.pause(); });
          audio.play().catch(() => { /* Les navigateurs mobiles peuvent exiger une première action de l’utilisateur. */ });
        } else {
          audio.pause();
        }
      });
    }, { threshold: [0, 0.3, 0.6, 1] });
    musicRows.forEach(row => observer.observe(row));
    return () => { observer.disconnect(); musicRows.forEach(row => { const audio=row.querySelector("audio"); if(audio) audio.pause(); }); };
  }, [active, posts.length]);

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


  async function loadMusicCatalog() {
    if (!supabase) return;
    setCatalogLoading(true);
    try {
      const { data, error } = await supabase.from("music_catalog").select("id,title,artist,audio_url,cover_url,duration_seconds,genre").eq("is_published", true).eq("rights_confirmed", true).order("title", { ascending: true }).limit(100);
      if (error) throw error;
      setMusicCatalog((data ?? []) as typeof musicCatalog);
      setCatalogOpen(true);
    } catch (err) {
      setMessage(err instanceof Error ? "Le catalogue musical est indisponible : " + err.message : "Le catalogue musical est indisponible.");
    } finally { setCatalogLoading(false); }
  }

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    let publishStage = "préparation de la publication"; if (!supabase) return;
    if (!user) { setComposerOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour publier."); return; }
    if (!caption.trim() && !file && selectedFiles.length===0) { setMessage("Ajoute un texte ou une photo/vidéo."); return; }
    if (musicFile && !file && selectedFiles.length===0) { setMessage("Ajoute une photo ou une vidéo pour accompagner ta musique."); return; }
    if (musicFile && !musicFile.type.startsWith("audio/")) { setMessage("Choisis un fichier audio valide."); return; }
    if (musicFile && musicFile.size > 15 * 1024 * 1024) { setMessage("Le fichier audio doit faire moins de 15 Mo."); return; }
    setBusy(true); setMessage("");
    try {
      let urls: string[] = []; let mediaType = "text";
      const filesToUpload = selectedFiles.length ? selectedFiles : file ? [file] : [];
      if (filesToUpload.length > 10) throw new Error("Tu peux sélectionner jusqu’à 10 photos par publication.");
      if (filesToUpload.some(f=>f.type.startsWith("video/")) && filesToUpload.length > 1) throw new Error("Pour une publication multiple, sélectionne des photos uniquement. Une vidéo peut être publiée seule.");
      publishStage = "envoi de la photo/vidéo";
      for (const sourceFile of filesToUpload) {
        if (!["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"].includes(sourceFile.type)) throw new Error("Format non pris en charge. Choisis des photos ou une vidéo courante.");
        if (sourceFile.size > 50 * 1024 * 1024) throw new Error("Chaque fichier doit faire moins de 50 Mo.");
        let uploadFile = sourceFile;
        if (sourceFile.type.startsWith("image/") && (creatorFilter !== "original" || creatorBrightness !== 100 || creatorContrast !== 100)) {
          const bitmap = await createImageBitmap(sourceFile);
          const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Impossible d’appliquer le filtre à cette image.");
          ctx.filter = `${creatorFilter === "warm" ? "sepia(.22) saturate(1.25)" : creatorFilter === "mono" ? "grayscale(1)" : creatorFilter === "vivid" ? "saturate(1.45)" : creatorFilter === "fade" ? "saturate(.75)" : "none"} brightness(${creatorBrightness}%) contrast(${creatorContrast}%)`;
          ctx.drawImage(bitmap, 0, 0); if (creatorTextOnPhoto && creatorOverlayText.trim()) { const fontSize=Math.max(22,Math.round(canvas.width*0.055)); ctx.filter="none"; ctx.font=`800 ${fontSize}px system-ui, sans-serif`; ctx.textAlign="center"; ctx.textBaseline="bottom"; ctx.lineWidth=Math.max(3,fontSize*0.12); ctx.strokeStyle="rgba(0,0,0,.8)"; ctx.fillStyle="#fff"; const words=creatorOverlayText.trim().split(/\s+/); const lines:string[]=[]; let line=""; for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>canvas.width*.88&&line){lines.push(line);line=word;}else line=test;} if(line)lines.push(line); let y=canvas.height-Math.max(24,canvas.height*.06); for(let i=lines.length-1;i>=0;i--){ctx.strokeText(lines[i],canvas.width/2,y);ctx.fillText(lines[i],canvas.width/2,y);y-=fontSize*1.18;} } bitmap.close();
          const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Échec du traitement de l’image.")), "image/jpeg", .94));
          uploadFile = new File([blob], sourceFile.name.replace(/\.[^.]+$/, "") + "-emi.jpg", {type:"image/jpeg"});
        }
        const path = user.id + "/" + crypto.randomUUID() + "-" + uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, uploadFile, { contentType: uploadFile.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from("post-media").getPublicUrl(path);
        urls.push(publicUrl.publicUrl);
      }
      if (filesToUpload.length) mediaType = filesToUpload[0].type.startsWith("video/") ? "video" : "image";
      if (publishDestination === "reel" && mediaType !== "video") throw new Error("Pour publier un Reel, sélectionne une vidéo.");
      let musicUrl = selectedMusic?.audio_url ?? "";
      let musicMeta: {title:string;artist:string;start:number;end:number;trackId?:string} | null = selectedMusic ? {title:selectedMusic.title,artist:selectedMusic.artist,start:musicStart,end:musicEnd || selectedMusic.duration_seconds || 30,trackId:selectedMusic.id} : null;
      if (musicFile) {
        publishStage = "envoi du fichier musical";
        const audioPath = user.id + "/" + crypto.randomUUID() + "-" + musicFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: audioUploadError } = await supabase.storage.from("post-media").upload(audioPath, musicFile, { contentType: musicFile.type, upsert: false });
        if (audioUploadError) throw new Error("Impossible d’envoyer la musique. Vérifie les autorisations du stockage : " + audioUploadError.message);
        musicUrl = supabase.storage.from("post-media").getPublicUrl(audioPath).data.publicUrl;
        musicMeta = {title: musicTitle.trim() || musicFile.name.replace(/\\.[^.]+$/, ""),artist:"Audio de ton téléphone",start:0,end:30};
      }
      publishStage = "enregistrement de la publication dans Supabase";
      const postContent = (publishDestination === "reel" ? "[EMI_REEL] " : "") + caption.trim() + (musicMeta ? "\\n\\n[EMI_MUSIC]" + JSON.stringify({...musicMeta,url:musicUrl}) + "[/EMI_MUSIC]" : "");
      const { error } = await supabase.from("posts").insert({ user_id: user.id, content: postContent, media_type: mediaType, media_urls: urls, visibility: "public" });
      if (error) throw error;
      setCaption(""); setPublishDestination("post"); setFile(null); setSelectedFiles([]); setMusicFile(null); setSelectedMusic(null); setMusicTitle(""); setCatalogOpen(false); setCreatorFilter("original"); setCreatorRatio("4:5"); setCreatorBrightness(100); setCreatorContrast(100); setCreatorTextOnPhoto(false); setCreatorOverlayText(""); setCreatorEditOpen(false); setMusicStart(0); setMusicEnd(30); setMusicDuration(0); setComposerOpen(false); setMessage("Publication envoyée."); await loadFeed();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err || "Erreur inconnue");
      const networkFailure = /failed to fetch|networkerror|load failed|fetch failed/i.test(detail);
      setMessage(networkFailure ? `Connexion interrompue pendant ${publishStage}. Vérifie Internet puis réessaie. Si cela persiste, le stockage Supabase doit être contrôlé.` : `${publishStage} : ${detail}`);
    }
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
      const { data: conversationId, error } = await supabase.rpc("start_direct_conversation", { target_user: target.id });
      if (error) throw error;
      if (!conversationId || typeof conversationId !== "string") throw new Error("Supabase n'a pas retourné l'identifiant de la conversation.");
      await loadConversations();
      setActive("Messages");
      await openConversation(conversationId);
    } catch (err) {
      const detail = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : err instanceof Error ? err.message : "Erreur inconnue";
      setMessage("Impossible de démarrer la conversation : " + detail);
    } finally { setChatLoading(false); }
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

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(error => console.error("EMi service worker:", error));
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "EMI_OPEN_MESSAGES") setActive("Messages");
    };
    navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
  }, []);

  useEffect(() => {
    if (!supabase || !user) { setUnreadMessages(0); return; }
    let alive = true;
    const refreshUnread = async () => {
      const { data: memberships, error } = await supabase.from("conversation_participants").select("conversation_id,last_read_at").eq("user_id", user.id);
      if (!alive || error) return;
      let total = 0;
      for (const membership of memberships || []) {
        if (membership.conversation_id === activeConversation) continue;
        let query = supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", membership.conversation_id).neq("sender_id", user.id);
        if (membership.last_read_at) query = query.gt("created_at", membership.last_read_at);
        const { count } = await query;
        total += count || 0;
      }
      if (alive) setUnreadMessages(total);
    };
    void refreshUnread();
    const channel = supabase.channel("emi-incoming-messages-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async payload => {
        const row = payload.new as {conversation_id:string;sender_id:string;content?:string};
        if (!alive || row.sender_id === user.id || row.conversation_id === activeConversation) return;
        const { data: membership } = await supabase.from("conversation_participants").select("conversation_id").eq("conversation_id", row.conversation_id).eq("user_id", user.id).maybeSingle();
        if (!alive || !membership) return;
        setIncomingMessageNotice("Tu as reçu un nouveau message.");
        window.setTimeout(() => { if (alive) setIncomingMessageNotice(""); }, 6000);
        setUnreadMessages(old => old + 1);
      }).subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [user?.id, activeConversation]);

  async function loadNotifications() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour consulter tes notifications."); return; }
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase.from("notifications").select("id,actor_id,type,post_id,comment_id,message,is_read,created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []) as {id:string;actor_id:string|null;type:string;post_id:string|null;comment_id:string|null;message:string;is_read:boolean;created_at:string}[];
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
    if (targetId === user.id || followPendingIds.includes(targetId)) return;

    // Invalide toute lecture d'abonnements commencée avant ce clic.
    followMutationVersion.current += 1;
    // Bloque les clics concurrents pour éviter les insertions/suppressions contradictoires.
    setFollowPendingIds(old => [...old, targetId]);
    let isFollowing = false;
    try {
      // Vérifie la session Supabase réelle avant de modifier les abonnements.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error(authError?.message || "Session expirée. Reconnecte-toi puis réessaie.");
      const followerId = authData.user.id;
      // Lit l'état réel en base avant de décider : l'état React peut être périmé.
      const { data: existingFollow, error: checkError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", followerId)
        .eq("following_id", targetId)
        .maybeSingle();
      if (checkError) throw checkError;
      isFollowing = Boolean(existingFollow);

      // INSERT/DELETE utilisent les politiques RLS explicites déjà configurées.
      // Évite l'UPSERT, qui peut exiger une politique UPDATE absente sur follows.
      const result = isFollowing
        ? await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", targetId)
        : await supabase.from("follows").insert({ follower_id: followerId, following_id: targetId });

      if (result.error) throw result.error;

      // Confirme l’état depuis la base plutôt que de se fier uniquement à l’état local.
      const { data, error: refreshError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", followerId);
      if (refreshError) throw refreshError;
      const refreshedIds = (data || []).map(row => row.following_id as string);
      const confirmed = refreshedIds.includes(targetId);
      if (confirmed === isFollowing) {
        throw new Error(isFollowing
          ? "La suppression de l’abonnement n’a pas été confirmée par la base de données."
          : "La base de données n’a pas confirmé l’abonnement. Vérifie la session et les autorisations Supabase.");
      }
      setFollowedIds(refreshedIds);

      // Actualise les compteurs du profil actuellement consulté.
      if (viewingProfile?.id === targetId) {
        const { count, error: countError } = await supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", targetId);
        if (!countError && count !== null) setProfileFollowerCount(count);
      }
      setMessage(isFollowing ? "Abonnement supprimé." : "Tu suis maintenant ce membre.");
    } catch (err) {
      // Les erreurs PostgREST sont parfois des objets simples, pas des instances d'Error.
      const failure = err as { message?: string; details?: string; hint?: string; code?: string } | null;
      const detail = failure?.message
        ? [failure.message, failure.code ? "Code " + failure.code : "", failure.details || "", failure.hint || ""].filter(Boolean).join(" — ")
        : err instanceof Error ? err.message : JSON.stringify(err) || "Erreur inconnue";
      setMessage("Impossible de modifier l’abonnement : " + detail);
    } finally {
      setFollowPendingIds(old => old.filter(id => id !== targetId));
    }
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

  async function openMyContentManager() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour gérer tes contenus."); return; }
    setCreateStudioOpen(false); setManageContentOpen(true); setManageContentLoading(true);
    const [postsResult, storiesResult, messagesResult] = await Promise.all([
      supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("stories").select("id,user_id,media_url,media_type,caption,music_url,music_title,visibility,created_at,expires_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("messages").select("id,conversation_id,sender_id,content,media_url,media_type,created_at").eq("sender_id", user.id).order("created_at", { ascending: false }).limit(100)
    ]);
    if (postsResult.error || storiesResult.error || messagesResult.error) setMessage("Certains contenus n’ont pas pu être chargés : " + [postsResult.error?.message, storiesResult.error?.message, messagesResult.error?.message].filter(Boolean).join(" · "));
    setManagedPosts((postsResult.data || []) as Post[]);
    setManagedStories((storiesResult.data || []) as Story[]);
    setManagedMessages((messagesResult.data || []) as {id:string;conversation_id:string;sender_id:string;content:string;media_url?:string|null;media_type?:string|null;created_at:string}[]);
    setManageContentLoading(false);
  }

  async function deletePost(post: Post) {
    if (!supabase || !user || post.user_id !== user.id) return;
    if (!window.confirm("Supprimer définitivement cette publication ? Cette action est irréversible.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id).eq("user_id", user.id);
    if (error) { setMessage("Suppression impossible : " + error.message); return; }
    setManagedPosts(old => old.filter(item => item.id !== post.id));
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
    setManagedMessages(old => old.filter(item => item.id !== msg.id));
    setChatMessages(old => old.filter(item => item.id !== msg.id));
    setMessage("Message supprimé.");
  }

  async function deleteStory(story: Story) {
    if (!supabase || !user || story.user_id !== user.id) return;
    if (!window.confirm("Supprimer définitivement ce statut ?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id).eq("user_id", user.id);
    if (error) { setMessage("Suppression du statut impossible : " + error.message); return; }
    setManagedStories(old => old.filter(item => item.id !== story.id));
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
  const isReelPost = (post: Post) => post.content.includes("[EMI_REEL]");
  const cleanPostContent = (content: string) => content.replace(/^\s*\[EMI_REEL\]\s*/, "");
  const filteredPosts = viewingProfile ? (profileTab === "shared" ? sharedPosts.filter(p => !query || cleanPostContent(p.content).toLowerCase().includes(query.toLowerCase())) : profileTab === "reels" ? visiblePosts.filter(isReelPost) : visiblePosts.filter(p => !isReelPost(p))) : active === "Reels" ? visiblePosts.filter(post => post.media_type === "video" && isReelPost(post)) : active === "Vidéos" ? visiblePosts.filter(post => post.media_type === "video" && !isReelPost(post)) : visiblePosts.filter(post => !isReelPost(post));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="EMi accueil"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a>
        <button className="profile-mini profile-mini-button" onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><div className="avatar avatar-me">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : user ? displayName.slice(0,2).toUpperCase() : "ME"}</div><div><strong>{user ? displayName : "Bienvenue sur EMi"}</strong><span>{user ? "Voir mon profil" : "Ton espace social"}</span></div></button>
        <nav className="nav-list" aria-label="Navigation principale">
          {[[ "Accueil", Home ], [ "EMi Pulse", Sparkles ], [ "Découvrir", Compass ], [ "Messages", MessageCircle ], [ "Notifications", Bell ], [ "Mon profil", UserRound ]].map(([label, Icon]) => { const title = label as string; const Glyph = Icon as typeof Home; return <button key={title} className={`nav-item ${active === title ? "selected" : ""}`} onClick={() => { setActive(title); if (title === "Notifications") void loadNotifications(); if (["Messages","Notifications","Mon profil"].includes(title) && !user) setAuthOpen(true); }}><span className="nav-icon-wrap"><Glyph size={20}/>{title === "Messages" && unreadMessages > 0 && <span className="emi-nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</span><span>{title}</span></button>; })}
        </nav>
        <button className="create-button" onClick={() => setCreateStudioOpen(true)}><Plus size={20}/> Créer</button>
        <div className="sidebar-bottom">{user ? <button className="nav-item" onClick={logout}><LogOut size={20}/><span>Se déconnecter</span></button> : <button className="nav-item" onClick={() => setAuthOpen(true)}><LogIn size={20}/><span>Connexion / Inscription</span></button>}<div className="sidebar-note"><Sparkles size={16}/><p>Des moments vrais.<br/><strong>Des liens qui comptent.</strong></p></div><span className="version">EMi · Communauté</span></div>
      </aside>

      <section className="main-column">
        <header className="mobile-header">{(viewingProfile || active !== "Accueil") && <button className="icon-button back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={23}/></button>}<a className="brand" href="#" onClick={e => { e.preventDefault(); goBack(); }}><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a><button className="icon-button" aria-label="Compte" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? <LogOut size={21}/> : <UserRound size={21}/>}</button></header>
        {!viewingProfile && !["Découvrir","EMi Pulse","Messages","Reels","Vidéos"].includes(active) && <section className="welcome-hero" aria-label="Bienvenue sur EMi">
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
        <div className="feed-header">{(viewingProfile || active !== "Accueil") && <button className="icon-button desktop-back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={22}/></button>}<div><span className="eyebrow">{viewingProfile ? "EMi · PROFIL PERSONNEL" : "TON UNIVERS, TES LIENS"}</span><h1>{viewingProfile ? currentProfileName : active === "Accueil" ? "Le fil des moments" : active === "EMi Pulse" ? "EMi Pulse" : active === "Découvrir" ? "Découvrir la communauté" : active === "Reels" || active === "Vidéos" ? "Reels EMi" : active === "Messages" ? "Ta messagerie" : active === "Paramètres" ? "Paramètres et activité" : active}</h1><p>{viewingProfile ? "@" + (viewingProfile.username || "membre") : active === "Découvrir" ? "Trouve des membres et découvre leurs publications." : active === "Messages" ? "Retrouve tes conversations au même endroit." : active === "Reels" || active === "Vidéos" ? "Les vidéos de la communauté, dans un fil dédié." : user ? "Connecté en tant que " + displayName : "Découvre les publications publiques."}</p></div><button className="round-action" onClick={() => viewingProfile && user?.id === viewingProfile.id ? startProfileEdit() : setCreateStudioOpen(true)} aria-label="Action profil ou publication">{viewingProfile && user?.id === viewingProfile.id ? <Settings size={22}/> : <Plus size={22}/>}</button></div>
        {viewingProfile && <section className="profile-page"><div className="profile-page-top"><div className="profile-page-avatar-wrap"><div className="profile-page-avatar">{viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt={"Photo de " + currentProfileName}/> : <span>{currentProfileName.slice(0,2).toUpperCase()}</span>}</div></div><div className="profile-page-identity"><h2>{currentProfileName}</h2><span className="profile-username">@{viewingProfile.username || "membre"}</span><div className="profile-stats"><div><strong>{profilePostCount}</strong><span>publications</span></div><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "followers")}><strong>{profileFollowerCount}</strong><span>abonnés</span></button><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "following")}><strong>{profileFollowingCount}</strong><span>abonnements</span></button></div></div></div><p className="profile-bio">{viewingProfile.bio?.trim() || "Bienvenue sur mon profil EMi ✨"}</p><div className="profile-page-actions">{user?.id === viewingProfile.id ? <><button className="modal-primary" onClick={startProfileEdit}><Settings size={16}/> Modifier le profil</button><button className="profile-back-button" aria-label="Paramètres et activité" onClick={() => {setViewingProfile(null);setActive("Paramètres");setSettingsSection(null);window.scrollTo({top:0,behavior:"smooth"});}}><Settings size={17}/> Paramètres</button></> : user ? <button className="modal-primary" onClick={() => void toggleFollow(viewingProfile.id)}>{followPendingIds.includes(viewingProfile.id) ? "En cours…" : followedIds.includes(viewingProfile.id) ? "Abonné(e)" : "Suivre"}</button> : <button className="modal-primary" onClick={() => setAuthOpen(true)}>Se connecter</button>}<button className="profile-back-button" onClick={() => { setViewingProfile(null); setActive("Accueil"); void loadFeed(); }}>Partager le profil</button><button className="profile-back-button profile-more-action" onClick={() => setMessage("Les options de suppression ne sont pas disponibles dans ce menu pour le moment.")} aria-label="Plus d’actions">•••</button></div><div className="profile-tabs" role="tablist" aria-label="Contenus du profil"><button role="tab" aria-selected={profileTab==="posts"} className={profileTab==="posts"?"selected":""} onClick={()=>setProfileTab("posts")} aria-label="Publications"><span>▦</span></button><button role="tab" aria-selected={profileTab==="reels"} className={profileTab==="reels"?"selected":""} onClick={()=>setProfileTab("reels")} aria-label="Reels"><Clapperboard size={19}/></button><button role="tab" aria-selected={profileTab==="shared"} className={profileTab==="shared"?"selected":""} onClick={()=>setProfileTab("shared")} aria-label="Repartages"><span>↻</span></button><button role="tab" aria-selected={profileTab==="tagged"} className={profileTab==="tagged"?"selected":""} onClick={()=>setProfileTab("tagged")} aria-label="Identifications"><UserRound size={19}/></button></div></section>}
        {!viewingProfile && <>
        <div className="stories-card" style={{display:["Reels","Vidéos","Découvrir","Messages"].includes(active) ? "none" : undefined}}><div className="section-label"><strong>Les stories</strong><button onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}>Partager <span>→</span></button></div><div className="stories-row"><button className="story" onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}><span className="story-ring story-add"><span className="story-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : <Plus size={18}/>}</span><span className="story-plus"><Plus size={13}/></span></span><span className="story-name">Ta story</span></button>{stories.map((story, index) => { const author = story.profiles?.display_name || story.profiles?.username || "Membre EMi"; return <button className="story" key={story.id} onClick={() => setActiveStory(story)} aria-label={"Voir la story de " + author}><span className="story-ring story-media-ring"><span className="story-avatar story-media-thumb">{story.media_type === "image" ? <img src={story.media_url} alt="Aperçu du statut"/> : <span className="story-video-thumb"><img src="/emi-story-video.svg" alt="Vidéo"/><Video size={16}/></span>}</span></span><span className="story-name">{story.user_id === user?.id ? "Votre story" : author}</span></button>; })}{stories.length === 0 && <span className="stories-empty">Les stories de la communauté apparaîtront ici.</span>}</div></div>
        {active === "Accueil" && !viewingProfile && <section className="emi-ecosystem-home" aria-label="Découvrir les services EMi">
           <div className="emi-services-heading"><div><span className="eyebrow">UN SEUL ÉCOSYSTÈME</span><h2>Tout EMi</h2><p>Tous tes espaces, à portée de main.</p></div><a href="/annonces" className="emi-services-all">Voir tout <ChevronRight size={15}/></a></div>
           <div className="emi-services-grid">
             <a href="/annonces" className="emi-service-card emi-service-market"><span className="emi-service-icon"><ShoppingBag size={21}/></span><strong>Marché</strong><small>Offres & vendeurs</small><ChevronRight size={15}/></a>
             <a href="/annonces/tontine" className="emi-service-card emi-service-flow"><span className="emi-service-icon"><Users size={21}/></span><strong>Flow · Djangui</strong><small>Groupes & cotisations</small><ChevronRight size={15}/></a>
             <a href="/annonces/philanthropy" className="emi-service-card emi-service-foundation"><span className="emi-service-icon"><Heart size={21}/></span><strong>Fondation</strong><small>Solidarité & initiatives</small><ChevronRight size={15}/></a>
             <a href="/annonces/master-health-check" className="emi-service-card emi-service-help"><span className="emi-service-icon"><CircleHelp size={21}/></span><strong>Help EMi</strong><small>Aide & assistance</small><ChevronRight size={15}/></a>
           </div>
           <section className="emi-home-reels" aria-label="Reels de la communauté">
             <div className="emi-home-reels-heading"><div><span className="eyebrow">À REGARDER</span><h2>Reels</h2><p>Les vidéos récentes de la communauté.</p></div><button type="button" onClick={() => {setActive("Reels");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}>Voir tout <ChevronRight size={15}/></button></div>
             <div className="emi-home-reels-row">
               {posts.filter(post=>post.media_type==="video"&&(post.media_urls||[]).length>0).slice(0,10).map(post=><button type="button" className="emi-home-reel-card" key={post.id} onClick={()=>{setActive("Reels");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}} aria-label="Ouvrir les Reels"><video src={post.media_urls[0]} muted playsInline preload="metadata"/><span className="emi-home-reel-play"><Play size={19} fill="currentColor"/></span><span className="emi-home-reel-caption">{(post.content||"Reel EMi").replace(/^\\s*\\[EMI_REEL\\]\\s*/,"").split("[EMI_MUSIC]")[0].trim()||"Reel EMi"}</span></button>)}
               {posts.filter(post=>post.media_type==="video"&&(post.media_urls||[]).length>0).length===0&&<div className="emi-home-reels-empty"><Clapperboard size={22}/><strong>Les Reels apparaîtront ici</strong><span>Publie une vidéo pour commencer.</span></div>}
             </div>
           </section>
         </section>}
         <div className="feed-tabs" style={{display:["Reels","Découvrir","Messages"].includes(active) ? "none" : undefined}}><button className={active === "Accueil" ? "tab-active" : ""} onClick={() => {setActive("Accueil"); void loadFeed();}}>Publications</button><button className={active === "Abonnements" ? "tab-active" : ""} onClick={() => void loadFollowingFeed()}>Abonnements</button></div>
        </>}

        {active === "Paramètres" && !viewingProfile && <section className="emi-settings-page">
          {!settingsSection ? <><div className="emi-settings-hero"><span className="emi-settings-crest"><Settings size={24}/></span><div><span className="eyebrow">EMi · ESPACE PERSONNEL</span><h2>Paramètres et activité</h2><p>Ton compte, tes choix, tes règles.</p></div></div><div className="emi-settings-groups">
            {([{title:"MON COMPTE",items:[["Informations personnelles","Gère les informations de ton profil","user"],["Modifier mon profil","Photo, nom, pseudo et biographie","edit"],["Sécurité et mot de passe","Protège l’accès à ton compte","security"],["Désactivation et suppression","Gérer ton compte EMi","account"]]}, {title:"CONFIDENTIALITÉ",items:[["Confidentialité du compte","Choisis qui peut voir ton contenu","privacy"],["Comptes bloqués","Gère les membres bloqués","blocked"],["Messages et commentaires","Contrôle les interactions","interactions"],["Stories, mentions et partages","Choisis comment ton contenu circule","sharing"]]}, {title:"NOTIFICATIONS",items:[["Préférences de notifications","Choisis les alertes que tu reçois","notifications"],["Ne pas déranger","Gère tes moments de tranquillité","quiet"]]}, {title:"MON UNIVERS",items:[["Contenus enregistrés","Retrouve tes publications sauvegardées","saved"],["Archives et souvenirs","Retrouve tes stories archivées","archive"],["Préférences de contenu","Personnalise ce que tu découvres","content"]]}, {title:"APPLICATION",items:[["Apparence et thème","Personnalise l’expérience EMi","appearance"],["Langue et accessibilité","Rends EMi plus confortable","language"],["Données et stockage","Gère la qualité et les données","data"]]}, {title:"AIDE ET INFORMATIONS",items:[["Centre d’aide","Obtiens de l’assistance","help"],["Confidentialité et conditions","Découvre les règles d’EMi","legal"],["À propos d’EMi","Version et informations","about"]]}] as {title:string;items:string[][]}[]).map(group=><div className="emi-settings-group" key={group.title}><h3>{group.title}</h3>{group.items.map(([label,desc,key])=><button className="emi-settings-row" key={key} onClick={()=>{setSettingsSection(key);setSettingsNotice("");}}><span className="emi-settings-row-icon">{key==="security"?<ShieldCheck/>:key==="privacy"?<LockKeyhole/>:key==="saved"?<Bookmark/>:key==="archive"?<Archive/>:key==="notifications"?<Bell/>:key==="appearance"?<Palette/>:key==="language"?<Languages/>:key==="blocked"?<Ban/>:key==="sharing"?<Share2/>:key==="data"?<Smartphone/>:key==="help"||key==="legal"?<CircleHelp/>:key==="interactions"?<Eye/>:key==="quiet"?<Clock3/>:key==="content"?<SlidersHorizontal/>:<UserRoundCog/>}</span><span className="emi-settings-row-copy"><strong>{label}</strong><small>{desc}</small></span><ChevronRight size={19}/></button>)}</div>)}
          </div>{user && <div className="emi-settings-logout-wrap"><div className="emi-settings-logout-label">SESSION</div><button className="emi-settings-logout" onClick={() => {setSettingsSection(null);void logout();}}><LogOut size={18}/><span><strong>Se déconnecter</strong><small>Fermer ta session EMi sur cet appareil</small></span><ChevronRight size={18}/></button></div>}
          </> : <><header className="emi-settings-subhead"><button className="profile-back-button" onClick={()=>setSettingsSection(null)}><ChevronLeft size={19}/> Retour</button><span className="eyebrow">PARAMÈTRES EMi</span></header><h2 className="emi-settings-subtitle">({({user:"Informations personnelles",edit:"Modifier mon profil",security:"Sécurité et mot de passe",account:"Désactivation et suppression",privacy:"Confidentialité du compte",blocked:"Comptes bloqués",interactions:"Messages et commentaires",sharing:"Stories, mentions et partages",notifications:"Préférences de notifications",quiet:"Ne pas déranger",saved:"Contenus enregistrés",archive:"Archives et souvenirs",content:"Préférences de contenu",appearance:"Apparence et thème",language:"Langue et accessibilité",data:"Données et stockage",help:"Centre d’aide",legal:"Confidentialité et conditions",about:"À propos d’EMi"} as Record<string,string>)[settingsSection] || "Paramètres"}</h2><div className="emi-settings-detail">
            {settingsSection==="privacy" ? <><p>Choisis la visibilité de ton compte. Les changements ne s’appliqueront pleinement que lorsque la confidentialité sera reliée aux règles serveur.</p><label className="emi-setting-toggle"><span><strong>Compte privé</strong><small>Autoriser uniquement les abonnés approuvés à voir tes contenus.</small></span><input type="checkbox" checked={privateAccount} onChange={e=>{setPrivateAccount(e.target.checked);setSettingsNotice("Préférence modifiée sur cet écran. La protection serveur doit encore être connectée.");}}/></label><label className="emi-setting-toggle"><span><strong>Masquer les compteurs de J’aime</strong><small>Masquer les nombres de J’aime et de partages lorsque cette option sera prise en charge.</small></span><input type="checkbox" checked={hideLikeCounts} onChange={e=>{setHideLikeCounts(e.target.checked);setSettingsNotice("Préférence modifiée sur cet écran.");}}/></label></> : settingsSection==="edit" ? <><p>Modifie les informations visibles sur ton profil.</p><button className="modal-primary emi-settings-action" onClick={()=>{setSettingsSection(null);startProfileEdit();}}>Ouvrir la modification du profil</button></> : settingsSection==="security" ? <><p>Protège ton compte EMi.</p><button className="emi-settings-action" onClick={()=>{setAuthOpen(true);setRecoveryMode(true);setSettingsNotice("Suis les étapes de récupération pour définir un nouveau mot de passe.");}}>Récupérer ou modifier mon mot de passe</button><p className="emi-settings-note">La gestion des appareils connectés et la vérification renforcée seront ajoutées dans une prochaine étape.</p></> : settingsSection==="blocked" ? <p>La gestion complète des comptes bloqués sera ajoutée avec les règles de confidentialité et de modération.</p> : settingsSection==="notifications" ? <><p>Active les alertes sur cet appareil pour recevoir les nouveaux messages même quand EMi est en arrière-plan. Le navigateur doit autoriser les notifications.</p><button className="modal-primary emi-settings-action" disabled={pushBusy} onClick={() => void enablePushNotifications()}><Bell size={17}/>{pushBusy ? "Activation en cours…" : pushEnabled ? "Notifications activées" : "Activer les notifications sur cet appareil"}</button><p className="emi-settings-note">Cette étape enregistre l’appareil. L’envoi automatique nécessite encore les clés Web Push et le déclencheur serveur.</p></> : settingsSection==="quiet" ? <p>Les horaires « Ne pas déranger » seront connectés aux préférences de notifications EMi.</p> : settingsSection==="saved" ? <p>Les publications enregistrées seront accessibles ici lorsque la liste des favoris sera reliée à ton profil.</p> : settingsSection==="appearance" ? <><p>Choisis l’apparence de ton univers EMi.</p><div className="emi-theme-preview"><span/> <div><strong>Royal futuriste</strong><small>Violet profond · Or champagne</small></div><span className="emi-theme-current">Actuel</span></div></> : settingsSection==="language" ? <p>Langue actuelle : Français. D’autres langues et options d’accessibilité seront ajoutées progressivement.</p> : settingsSection==="about" ? <><p>EMi — des moments vrais, des liens qui rapprochent.</p><p className="emi-settings-note">Application en évolution · Version publique</p></> : <p>Cette rubrique est prévue dans la feuille de route EMi. Nous la connecterons à des fonctionnalités réelles avant d’activer ses commandes.</p>}
            {settingsNotice && <p className="emi-settings-note" role="status">{settingsNotice}</p>}
          </div></>}
        </section>}
        {active === "Notifications" && !viewingProfile && <section className="discovery-panel">
          <div className="section-label"><strong>Notifications</strong><button onClick={() => void loadNotifications()}>Actualiser ↻</button></div>
          {notificationsLoading && <p className="chat-empty">Chargement des notifications…</p>}
          <div className="discovery-list">{notifications.map(note => <article key={note.id} className="discovery-person" style={{opacity:note.is_read?0.72:1,borderColor:note.is_read?"var(--line)":"#8d6de0"}}>
            <span className="discovery-avatar">{note.actor?.avatar_url?<img src={note.actor.avatar_url} alt=""/>:(note.actor?.display_name||note.actor?.username||"EM").slice(0,2).toUpperCase()}</span>
            <button className="discovery-person-main" onClick={() => note.actor_id ? void openProfile(note.actor_id) : undefined}><span><strong>{note.actor?.display_name||note.actor?.username||"EMi"}</strong><small>{note.message}</small><small>{new Date(note.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></span></button>
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
              <div className="chat-messages" aria-live="polite">{chatMessages.map(msg=><div key={msg.id} className={"chat-bubble "+(msg.sender_id===user?.id?"chat-mine":"chat-theirs")}><p>{msg.content}</p>{msg.media_url && (msg.media_type === "video" ? <video src={msg.media_url} controls playsInline className="chat-media"/> : <img src={msg.media_url} alt="Média partagé" className="chat-media"/>)}<time>{new Date(msg.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</time></div>)}</div>
              <form className="chat-compose" onSubmit={sendChatMessage}><input ref={chatMediaInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setChatMediaFile(e.target.files?.[0]||null)} hidden/><button type="button" className="profile-back-button" aria-label="Joindre une image ou vidéo" onClick={()=>chatMediaInput.current?.click()}><ImageIcon size={17}/></button><input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={5000} placeholder={chatMediaFile ? chatMediaFile.name : "Écris un message…"} aria-label="Écris un message" disabled={!user}/><button className="modal-primary" type="submit" disabled={!chatDraft.trim()&&!chatMediaFile||chatLoading}><Send size={17}/> Envoyer</button></form>
            </>}
          </section>
        </section>}
        {incomingMessageNotice && <button className="emi-incoming-toast" role="status" onClick={() => { setIncomingMessageNotice(""); setActive("Messages"); }}><MessageCircle size={18}/><span><strong>EMi · Nouveau message</strong><small>{incomingMessageNotice}</small></span></button>}
        {message && <div className="demo-note" role="status"><Sparkles size={16}/><span>{message}</span><button style={{marginLeft:"auto",background:"none",border:0,color:"inherit"}} onClick={() => setMessage("")} aria-label="Fermer"><X size={15}/></button></div>}
        {active === "EMi Pulse" && !viewingProfile && <section className="emi-vibes-page">
          <header className="emi-vibes-hero"><div className="emi-vibes-orb"><Sparkles size={30}/></div><span className="eyebrow">EMi · LE POULS DE LA COMMUNAUTÉ</span><h2>Tout ce qui fait vibrer EMi.</h2><p>Découvre les tendances, les talents, les commerces, les opportunités et les initiatives de la communauté.</p><div className="emi-vibes-badges"><span><TrendingUp size={13}/> Tendances</span><span><Users size={13}/> Talents</span><span><ShieldCheck size={13}/> Communauté</span></div></header>
          <div className="emi-vibes-search"><Search size={18}/><input value={vibesSearch} onChange={e=>setVibesSearch(e.target.value)} placeholder="Rechercher une personne ou une publication…" aria-label="Rechercher dans EMi Pulse"/></div>
          <div className="emi-vibes-tabs">{["Pour toi","Tendances","Talents","Près de moi","Opportunités","Initiatives"].map(tab=><button key={tab} className={vibesTab===tab?"selected":""} onClick={()=>{setVibesTab(tab);if(tab==="Talents"||tab==="Près de moi")void loadExploreProfiles();}}>{tab}</button>)}</div>
          <div className="emi-vibes-section-head"><div><span className="eyebrow">EMi PULSE</span><h3>{vibesTab==="Tendances"?"À la une":vibesTab==="Talents"?"Talents & créateurs":vibesTab==="Près de moi"?"Découvertes locales":vibesTab==="Opportunités"?"Projets & opportunités":vibesTab==="Initiatives"?"Initiatives solidaires":"À découvrir"}</h3></div><span className="emi-vibes-live"><span/> Communauté EMi</span></div>
          {(vibesTab==="Talents"||vibesTab==="Près de moi") ? <div className="discovery-list">{exploreProfiles.filter(p=>!vibesSearch||(p.display_name||p.username||"").toLowerCase().includes(vibesSearch.toLowerCase())).map(profile=><article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={()=>void openProfile(profile.id)}><span className="avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:(profile.display_name||profile.username||"EM").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name||profile.username||"Membre EMi"}</strong><small>@{profile.username||"membre"}</small></span></button><button className="profile-back-button" onClick={()=>void openProfile(profile.id)}>Voir le profil <ChevronRight size={15}/></button></article>)}{exploreProfiles.length===0&&<div className="emi-vibes-empty"><div className="emi-vibes-empty-icon"><Users size={26}/></div><h3>Découvre la communauté</h3><p>Explore les profils disponibles sur EMi.</p><button onClick={()=>void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading?"Chargement…":"Charger les profils"} <ChevronRight size={16}/></button></div>}</div> : <div className="emi-pulse-grid">{[{title:"Tendances",desc:"Publications à découvrir dans la communauté.",icon:TrendingUp,tab:"Tendances"},{title:"Talents & créateurs",desc:"Artistes, créateurs et profils inspirants.",icon:Mic2,tab:"Talents"},{title:"Près de chez toi",desc:"Membres et découvertes locales.",icon:Compass,tab:"Près de moi"},{title:"Opportunités",desc:"Emploi, formations et collaborations.",icon:Sparkles,tab:"Opportunités"},{title:"Initiatives solidaires",desc:"Projets et actions communautaires.",icon:Heart,tab:"Initiatives"}].map(item=><button type="button" key={item.title} className="emi-pulse-card" onClick={()=>{setVibesTab(item.tab);if(item.tab==="Talents"||item.tab==="Près de moi")void loadExploreProfiles();}}><span className="emi-pulse-card-icon"><item.icon size={22}/></span><strong>{item.title}</strong><p>{item.desc}</p><span className="emi-pulse-card-link">Explorer <ChevronRight size={15}/></span></button>)}</div>}
          {(vibesTab==="Pour toi"||vibesTab==="Tendances")&&<div className="emi-pulse-posts"><div className="emi-vibes-section-head"><div><span className="eyebrow">CONTENUS DE LA COMMUNAUTÉ</span><h3>Dans la communauté</h3></div><button onClick={()=>{setActive("Accueil");void loadFeed();}}>Tout voir <ChevronRight size={15}/></button></div>{posts.filter(p=>!p.content.includes("[EMI_REEL]")&&(!vibesSearch||(p.content||"").replace(/^\\s*\\[EMI_REEL\\]\\s*/,"").toLowerCase().includes(vibesSearch.toLowerCase())||(p.profiles?.display_name||p.profiles?.username||"").toLowerCase().includes(vibesSearch.toLowerCase()))).slice(0,6).map(post=><article className="emi-pulse-post" key={post.id}><div className="emi-pulse-post-author"><span className="emi-pulse-avatar">{post.profiles?.avatar_url?<img src={post.profiles.avatar_url} alt=""/>:(post.profiles?.display_name||post.profiles?.username||"EM").slice(0,2).toUpperCase()}</span><div><strong>{post.profiles?.display_name||post.profiles?.username||"Membre EMi"}</strong><small>@{post.profiles?.username||"membre"} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</small></div></div>{post.content&&<p>{post.content.split("[EMI_MUSIC]")[0].trim()||"Un moment partagé avec la communauté EMi."}</p>}{(post.media_urls||[]).length>0&&(post.media_type==="video"?<video className="emi-pulse-media" src={post.media_urls[0]} controls playsInline preload="metadata"/>:<img className="emi-pulse-media" src={post.media_urls[0]} alt="Publication de la communauté EMi" loading="lazy" decoding="async"/>)}<div className="emi-pulse-post-footer"><span><Heart size={15}/> Publication EMi</span><button onClick={()=>{setActive(post.media_type==="video"?"Reels":"Accueil");void loadFeed();}}>Voir la publication <ChevronRight size={15}/></button></div></article>)}{posts.length===0&&<p className="emi-vibes-empty">Les publications apparaîtront ici lorsque le fil contiendra des contenus.</p>}</div>}
          {(vibesTab==="Opportunités"||vibesTab==="Initiatives")&&<div className="emi-vibes-empty"><div className="emi-vibes-empty-icon">{vibesTab==="Opportunités"?<Sparkles size={26}/>:<Heart size={26}/>}</div><h3>{vibesTab==="Opportunités"?"Les opportunités ont leur place ici.":"Les initiatives qui comptent."}</h3><p>Cette section est prête à accueillir les contenus publiés sur EMi. Les offres et événements réels nécessitent des données vérifiées ; aucun faux contenu n’est affiché.</p><button onClick={()=>setActive("Découvrir")}>Explorer la communauté <ChevronRight size={16}/></button></div>}
          <div className="emi-vibes-note"><ShieldCheck size={16}/><span>Les contenus et profils proviennent d’EMi. Les offres et événements ne sont pas présentés comme vérifiés sans confirmation de leur source.</span></div>
        </section>}
        {active === "EMi Pulse" ? null : active === "Paramètres" ? null : active === "Découvrir" && !viewingProfile ? <section className="discovery-panel"><label className="discovery-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void loadExploreProfiles(); }} placeholder="Rechercher un nom ou @pseudo…" aria-label="Rechercher des membres"/></label><button className="modal-primary" onClick={() => void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading ? "Recherche…" : "Rechercher"}</button><div className="discovery-list">{exploreProfiles.map(profile => <article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={() => void openProfile(profile.id)}><span className="discovery-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : (profile.display_name || profile.username || "M").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name || profile.username || "Membre EMi"}</strong><small>@{profile.username || "membre"}</small>{profile.bio && <small className="discovery-bio">{profile.bio}</small>}</span></button><div className="discovery-person-actions"><button className="profile-back-button" onClick={() => void openProfile(profile.id)}>Voir le profil</button>{user && <button className="modal-primary" onClick={() => void startConversation(profile)}>Message</button>}</div></article>)}{!exploreLoading && exploreProfiles.length === 0 && <div className="empty-feature"><Compass size={30}/><h2>Découvre ta communauté</h2><p>Recherche un nom ou un nom d’utilisateur pour trouver des membres EMi.</p></div>}</div></section> : active === "Messages" && !viewingProfile ? null: !supabase ? <div className="post-card"><h2>Connexion à configurer</h2><p>Les variables d’environnement Supabase sont absentes. Vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel.</p></div> : (filteredPosts.length === 0 || (viewingProfile && (profileTab === "tagged" || (profileTab === "reels" && !filteredPosts.some(post => post.media_type === "video"))))) ? <div className="post-card profile-tab-empty" style={{padding:28,textAlign:"center"}}><div className="modal-icon" style={{margin:"0 auto 16px"}}><Sparkles size={23}/></div><h2 style={{fontSize:20}}>{viewingProfile && profileTab === "shared" ? "Aucun repartage pour le moment" : viewingProfile && profileTab === "tagged" ? "Aucune identification pour le moment" : query ? "Aucun résultat" : viewingProfile && profileTab === "reels" ? "Aucun Reel sur ce profil" : active === "Reels" || active === "Vidéos" ? "Aucun Reel pour le moment" : viewingProfile ? "Aucune publication pour le moment" : "Le fil commence ici"}</h2><p style={{color:"#aaa6b7",fontSize:13,lineHeight:1.7}}>{viewingProfile && profileTab === "shared" ? "Les publications que ce membre a repartagées apparaîtront ici." : viewingProfile && profileTab === "tagged" ? "Les publications qui identifient ce membre apparaîtront ici lorsque cette fonction sera disponible." : query ? "Essaie un autre mot." : viewingProfile && profileTab === "reels" ? "Les vidéos publiées par ce membre apparaîtront ici." : viewingProfile ? "Les moments partagés par ce membre apparaîtront ici." : "Aucune publication réelle n’est encore disponible. Sois le premier à partager un moment."}</p>{(!viewingProfile || (user?.id === viewingProfile.id && profileTab === "posts")) && <button className="modal-primary" style={{maxWidth:260}} onClick={() => setComposerOpen(true)}>Créer une publication</button>}</div> :
        <div className={"feed-list" + (viewingProfile ? " profile-media-grid" : "")}>{(viewingProfile && profileTab === "reels" ? filteredPosts.filter(post => post.media_type === "video") : viewingProfile && profileTab === "tagged" ? [] : filteredPosts).map(post => { const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi"; return <article className={(active === "Reels" && post.media_type === "video" ? "post-card reel-post" : "post-card") + (viewingProfile ? " profile-grid-post" : "")} key={post.id}><div className="post-top"><button className="post-avatar-button" onClick={() => void openProfile(post.user_id)} aria-label={"Voir le profil de " + author}><div className="avatar avatar-sunset">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt=""/> : author.slice(0,2).toUpperCase()}</div></button><button className="post-author post-author-button" onClick={() => void openProfile(post.user_id)}><strong>{author}</strong><span>@{post.profiles?.username || "membre"} · {new Date(post.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</span></button><button type="button" className="profile-more-action" aria-label="Options de la publication" aria-haspopup="dialog" onClick={()=>setOpenPostMenu(post)} style={{marginLeft:"auto",border:0,background:"transparent",color:"inherit",padding:8,fontSize:22,lineHeight:1}}>•••</button>{user && user.id !== post.user_id && <button onClick={() => void toggleFollow(post.user_id)} style={{marginLeft:"8px",border:"1px solid #393643",borderRadius:9,padding:"7px 10px",background:followedIds.includes(post.user_id)?"#282235":"#a78bfa17",color:"#d8c9ff",fontSize:11}}>{followPendingIds.includes(post.user_id) ? "…" : followedIds.includes(post.user_id) ? "Suivi" : "Suivre"}</button>}</div>{post.content && <><p className="post-caption">{post.content.replace(/^\\s*\\[EMI_REEL\\]\\s*/,"").split("[EMI_MUSIC]")[0].trim()}</p>{post.content.includes("[EMI_MUSIC]") && (()=>{try{const track=JSON.parse(post.content.split("[EMI_MUSIC]")[1].split("[/EMI_MUSIC]")[0]) as {url:string;title:string;start?:number;end?:number};const audioId="emi-track-"+post.id;const hasVideo=post.media_type==="video";return <div className="emi-post-music" data-emi-music-row="true"><span className="emi-post-music-icon"><Music2 size={17}/></span><span className="emi-post-music-title"><strong>{track.title}</strong><small>{hasVideo ? "Musique synchronisée avec la vidéo" : "Musique du moment · EMi Music"}</small></span><button type="button" className="emi-music-play-button" aria-label={"Écouter "+track.title} onClick={()=>{const audio=document.getElementById(audioId) as HTMLAudioElement|null;if(audio){if(audio.paused){document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other=>{if(other!==audio)other.pause();});audio.play().catch(()=>setMessage("Appuie à nouveau sur Écouter pour autoriser la lecture musicale."));}else audio.pause();}}}><Play size={15}/></button><audio id={audioId} className="emi-post-audio" preload="none" src={track.url} aria-label={"Musique "+track.title} onPlay={e=>{if((track.start||0)>0 && e.currentTarget.currentTime<(track.start||0))e.currentTarget.currentTime=track.start||0;document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other=>{if(other!==e.currentTarget)other.pause();});}} onTimeUpdate={e=>{if((track.end||0)>0 && e.currentTarget.currentTime>= (track.end||0)){e.currentTarget.pause();e.currentTarget.currentTime=track.start||0;}}}/></div>}catch{return null}})()}</>}{(post.media_urls || []).length > 1 ? <div style={{position:"relative",width:"100%"}}><div className="emi-post-gallery" id={"emi-gallery-"+post.id} aria-label={"Carrousel de "+post.media_urls.length+" photos"} style={{width:"100%",height:"min(100vw,650px)",minHeight:320,maxHeight:650,display:"flex",flexDirection:"row",flexWrap:"nowrap",overflowX:"auto",overflowY:"hidden",scrollSnapType:"x mandatory",scrollBehavior:"smooth",overscrollBehaviorX:"contain",WebkitOverflowScrolling:"touch",touchAction:"pan-x",background:"#09090d",scrollbarWidth:"none"}}>{(post.media_urls || []).map((url,i) => <div key={url+i} style={{flex:"0 0 100%",flexShrink:0,minWidth:"100%",width:"100%",height:"100%",scrollSnapAlign:"start",scrollSnapStop:"always",position:"relative",display:"grid",placeItems:"center",background:"#09090d"}}>{post.media_type === "video" ? <video src={url} controls autoPlay={active !== "Reels"} muted={active !== "Reels"} loop={active !== "Reels"} playsInline style={{width:"100%",height:"100%",objectFit:"contain"}}/> : <img src={url} alt={"Photo "+(i+1)+" de la publication"} loading="lazy" decoding="async" style={{width:"100%",height:"100%",objectFit:"contain"}}/>}<span style={{position:"absolute",top:12,right:12,padding:"6px 10px",borderRadius:99,background:"#092b20dd",color:"#f6d85f",fontSize:12,fontWeight:700}}>{i+1}/{post.media_urls.length}</span></div>)}</div><button type="button" aria-label="Photo précédente" onClick={()=>{const el=document.getElementById("emi-gallery-"+post.id);el?.scrollBy({left:-(el.clientWidth||300),behavior:"smooth"});}} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",border:"1px solid #ffffff66",background:"#10101099",color:"#fff",fontSize:25,zIndex:2,display:"grid",placeItems:"center"}}>‹</button><button type="button" aria-label="Photo suivante" onClick={()=>{const el=document.getElementById("emi-gallery-"+post.id);el?.scrollBy({left:el.clientWidth||300,behavior:"smooth"});}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",border:"1px solid #ffffff66",background:"#10101099",color:"#fff",fontSize:25,zIndex:2,display:"grid",placeItems:"center"}}>›</button></div> : (post.media_urls || []).map((url,i) => post.media_type === "video" ? <video key={url+i} src={url} controls autoPlay muted={active !== "Reels"} loop={active === "Reels"} playsInline preload="metadata" className={active === "Reels" ? "reel-video" : undefined} onPlay={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.currentTime=video.currentTime;void audio.play().catch(()=>undefined);}}} onPause={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.pause();}} onSeeking={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.currentTime=e.currentTarget.currentTime;}} onTimeUpdate={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio&&Math.abs(audio.currentTime-video.currentTime)>0.35)audio.currentTime=video.currentTime;}} onEnded={()=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.pause();audio.currentTime=0;}}} style={active === "Reels" ? undefined : {width:"100%",maxHeight:560,borderRadius:0,background:"#09090d",objectFit:"contain"}}/> : <img key={url+i} src={url} alt="Publication partagée sur EMi" loading="lazy" decoding="async" style={{width:"100%",maxHeight:650,objectFit:"contain",borderRadius:0,background:"#09090d"}}/>)}<div className="post-actions"><button className={liked.includes(post.id) ? "liked" : ""} onClick={() => void toggleLike(post.id)}><Heart size={20} fill={liked.includes(post.id) ? "currentColor" : "none"}/><span>{likes[post.id] || 0}</span></button><button onClick={() => { const isOpen = openComments.includes(post.id); setOpenComments(old => isOpen ? old.filter(id => id !== post.id) : [...old, post.id]); if (!isOpen) void loadComments(post.id); }}><MessageCircle size={20}/><span>Commentaires{comments[post.id]?.length ? ` (${comments[post.id].length})` : ""}</span></button><button className={reposted.includes(post.id) ? "liked" : ""} onClick={() => void toggleRepost(post.id)} aria-label={reposted.includes(post.id) ? "Annuler le repartage" : "Repartager"}><Repeat2 size={19}/><span>{reposted.includes(post.id) ? "Repartagé" : "Repartager"}</span></button><button onClick={() => { if (navigator.share) void navigator.share({title:"EMi",text:post.content,url:location.href}).catch(()=>{}); else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi."); }}><Send size={19}/><span>Partager</span></button></div>{openComments.includes(post.id) && <div className="comments-panel" style={{borderTop:"1px solid #2b2b35",marginTop:14,paddingTop:12}}><div style={{display:"grid",gap:10,marginBottom:12}}>{(comments[post.id] || []).map(comment => <div key={comment.id} style={{fontSize:12,lineHeight:1.6}}><strong>{comment.profiles?.display_name || comment.profiles?.username || "Membre"} </strong><span style={{color:"#d0ced9",overflowWrap:"anywhere"}}>{comment.content}</span></div>)}{comments[post.id]?.length === 0 && <p style={{fontSize:12,color:"#92919f"}}>Aucun commentaire. Lance la conversation !</p>}</div><form onSubmit={e => void addComment(post.id,e)} style={{display:"flex",gap:8}}><input aria-label="Écrire un commentaire" value={commentDrafts[post.id] || ""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:10,borderRadius:9,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 14px"}}>Envoyer</button></form></div>}</article>; })}</div>
      }
      </section>

      <aside className="right-column"><div className="right-search"><Search size={18}/><input aria-label="Rechercher" placeholder="Rechercher sur EMi..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires et garde le lien avec ta communauté.</p><button onClick={() => setComposerOpen(true)}>Partager un moment <Plus size={16}/></button></div><div className="emi-values-card"><div className="emi-values-icon"><Heart size={18} fill="currentColor"/></div><span className="eyebrow">L’ESPRIT EMi</span><h3>La bonté laisse une trace.</h3><p>Un geste, une écoute, un peu d’aide : ce que nous partageons peut éclairer la journée de quelqu’un.</p><div className="emi-values-tags"><span>Bienveillance</span><span>Partage</span><span>Lien</span></div></div><div className="suggest-card"><div className="section-label"><strong>Ton compte</strong></div><p style={{fontSize:12,lineHeight:1.7,color:"#aaa6b7"}}>{user ? "Tu es connecté. Tes publications sont enregistrées dans Supabase." : "Connecte-toi pour publier et aimer les moments."}</p><button className="modal-primary" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? "Se déconnecter" : "Connexion / Inscription"}</button></div><div className="right-footer">À propos · Confidentialité · Aide<br/>© 2026 EMi</div></aside>

<style jsx>{`
.emi-home-reels{margin:26px 0 24px;min-width:0}.emi-home-reels-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px}.emi-home-reels-heading h2{margin:3px 0;font-size:clamp(21px,3vw,28px);font-weight:800}.emi-home-reels-heading p{margin:4px 0 0;color:#a8b9b1;font-size:13px}.emi-home-reels-heading button{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:#e7cc68;font-weight:700;white-space:nowrap}.emi-home-reels-row{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 12px;scroll-snap-type:x mandatory;scrollbar-width:thin;-webkit-overflow-scrolling:touch}.emi-home-reel-card{position:relative;flex:0 0 clamp(128px,34vw,190px);height:245px;overflow:hidden;border:1px solid #b9a75b;border-radius:17px;background:#071b15;padding:0;scroll-snap-align:start;text-align:left;color:#fff}.emi-home-reel-card video{width:100%;height:100%;object-fit:cover;display:block}.emi-home-reel-play{position:absolute;top:12px;left:12px;display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:#071b15b8;color:#f5d96c}.emi-home-reel-caption{position:absolute;left:0;right:0;bottom:0;padding:30px 10px 11px;background:linear-gradient(transparent,#03120df0);font-size:12px;font-weight:700;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.emi-home-reels-empty{min-width:100%;display:flex;align-items:center;gap:9px;padding:18px;border:1px dashed #6d795c;border-radius:14px;color:#d7c66e}.emi-home-reels-empty span{color:#a8b9b1;font-size:12px}@media(min-width:900px){.emi-home-reel-card{flex-basis:180px;height:270px}}
`}</style>
      <nav className="mobile-nav" aria-label="Navigation mobile"><button className={active === "Accueil" && !viewingProfile ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Home size={20}/><span>Accueil</span></button><button className={active === "Découvrir" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Découvrir");void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}}><Compass size={20}/><span>Explorer</span></button><button className="mobile-create" aria-label="Ouvrir le studio de création" onClick={() => setCreateStudioOpen(true)}><Plus size={22}/></button><button className={active === "EMi Pulse" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("EMi Pulse");setVibesTab("Pour toi");window.scrollTo({top:0,behavior:"smooth"});}}><Sparkles size={20}/><span>EMi Pulse</span></button><button className={active === "Reels" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Reels");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Clapperboard size={20}/><span>Reels</span></button><button className={active === "Messages" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Messages");window.scrollTo({top:0,behavior:"smooth"});if(!user)setAuthOpen(true);}}><span className="emi-mobile-message-icon"><MessageCircle size={20}/>{unreadMessages > 0 && <span className="emi-mobile-nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</span><span>Messages</span></button><button className={viewingProfile ? "mobile-active" : ""} onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><UserRound size={20}/><span>Profil</span></button><button className={active === "Paramètres" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Paramètres");setSettingsSection(null);window.scrollTo({top:0,behavior:"smooth"});}}><Settings size={20}/><span>Réglages</span></button></nav>

      {createStudioOpen && <div className="modal-backdrop create-studio-backdrop" onClick={() => setCreateStudioOpen(false)}><section className="create-studio" role="dialog" aria-modal="true" aria-label="Studio de création EMi" onClick={e => e.stopPropagation()}><header className="create-studio-header"><div><span className="eyebrow">EMi · CRÉATION</span><h2>Que veux-tu partager ?</h2><p>Un instant, une histoire, une vidéo : à toi de jouer.</p></div><button className="modal-close" onClick={() => setCreateStudioOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="create-studio-preview"><div className="studio-glow studio-glow-one"/><div className="studio-glow studio-glow-two"/><div className="studio-preview-icon"><Sparkles size={30}/></div><strong>Chaque moment mérite d’exister.</strong><span>Ton espace créatif, signé EMi</span></div><div className="create-studio-options">{user && <button className="studio-option" onClick={() => void openMyContentManager()}><span className="studio-option-icon"><Archive size={23}/></span><span><strong>Mes contenus</strong><small>Gérer et supprimer tes publications, Reels, stories et messages</small></span><span className="studio-option-arrow">›</span></button>}<button className="studio-option studio-option-story" onClick={() => { if (!user) { setCreateStudioOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else openCamera("photo"); }}><span className="studio-option-icon"><Camera size={23}/></span><span><strong>Story</strong><small>Photo ou vidéo · 24 h</small></span><span className="studio-option-arrow">↗</span></button><button className="studio-option studio-option-post" onClick={() => openCamera("photo")}><span className="studio-option-icon"><ImageIcon size={23}/></span><span><strong>Publication</strong><small>Photo, vidéo et légende</small></span><span className="studio-option-arrow">↗</span></button><button className="studio-option studio-option-reel" onClick={() => openCamera("video")}><span className="studio-option-icon"><Clapperboard size={23}/></span><span><strong>Reel / vidéo</strong><small>Partage un moment en mouvement</small></span><span className="studio-option-arrow">↗</span></button><button className="studio-option studio-option-text" onClick={() => openCamera("text")}><span className="studio-option-icon"><span className="studio-text-icon">T</span></span><span><strong>Texte</strong><small>Une pensée, une annonce, une idée</small></span><span className="studio-option-arrow">↗</span></button></div><footer className="create-studio-footer"><span><Sparkles size={14}/> Créé avec EMi</span><span>Partage à ta façon</span></footer></section></div>}
      {openPostMenu && <div className="modal-backdrop emi-post-menu-backdrop" onClick={()=>setOpenPostMenu(null)} style={{alignItems:"flex-end",padding:0,zIndex:120}}><section role="dialog" aria-modal="true" aria-label="Actions de la publication" onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:620,maxHeight:"88dvh",overflowY:"auto",borderRadius:"28px 28px 0 0",background:"#fff",color:"#092b20",padding:"12px 18px max(24px,env(safe-area-inset-bottom))",boxShadow:"0 -12px 40px #0003"}}><div style={{width:48,height:4,borderRadius:9,background:"#c8cecb",margin:"0 auto 18px"}}/><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:12}}><div><strong style={{fontSize:18}}>Actions de la publication</strong><p style={{fontSize:12,color:"#66776f",marginTop:3}}>{openPostMenu.profiles?.display_name||openPostMenu.profiles?.username||"Membre EMi"} · {new Date(openPostMenu.created_at).toLocaleDateString("fr-FR")}</p></div><button type="button" onClick={()=>setOpenPostMenu(null)} aria-label="Fermer" style={{border:0,background:"#f0f3f1",borderRadius:99,padding:10}}><X size={18}/></button></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,margin:"12px 0 16px"}}>
          <button type="button" onClick={()=>togglePostPreference("saved-posts",savedPostIds,setSavedPostIds,openPostMenu.id,"Enregistrement")} style={{border:0,borderRadius:18,padding:15,background:"#f0f4f1",color:"#083d2b",display:"grid",justifyItems:"center",gap:7}}><Bookmark size={25}/><strong>{savedPostIds.includes(openPostMenu.id)?"Enregistré":"Enregistrer"}</strong></button>
          <button type="button" onClick={()=>{void sharePost(openPostMenu);setOpenPostMenu(null)}} style={{border:0,borderRadius:18,padding:15,background:"#f0f4f1",color:"#083d2b",display:"grid",justifyItems:"center",gap:7}}><Share2 size={25}/><strong>Partager</strong></button>
        </div>
        {[
          {icon:<Share2 size={21}/>,label:"Copier le lien",run:()=>void copyPostLink(openPostMenu)},
          {icon:<Send size={21}/>,label:"Envoyer par message",run:()=>{setMessage("Le partage par message direct sera disponible dès que le destinataire sera choisi.");setOpenPostMenu(null);setActive("Messages");}},
          ...(user?.id===openPostMenu.user_id?[{icon:<Archive size={21}/>,label:archivedPostIds.includes(openPostMenu.id)?"Restaurer la publication":"Archiver la publication",run:()=>{togglePostPreference("archived-posts",archivedPostIds,setArchivedPostIds,openPostMenu.id,"Archivage");setOpenPostMenu(null);}}, {icon:<Bookmark size={21}/>,label:pinnedPostIds.includes(openPostMenu.id)?"Désépingler du profil":"Épingler sur mon profil",run:()=>{togglePostPreference("pinned-posts",pinnedPostIds,setPinnedPostIds,openPostMenu.id,"Épinglage");setOpenPostMenu(null);}}, {icon:<MessageCircle size={21}/>,label:commentsDisabledIds.includes(openPostMenu.id)?"Réactiver les commentaires":"Désactiver les commentaires",run:()=>{togglePostPreference("comments-disabled",commentsDisabledIds,setCommentsDisabledIds,openPostMenu.id,"Commentaires");setOpenPostMenu(null);}}, {icon:<Heart size={21}/>,label:hiddenLikeIds.includes(openPostMenu.id)?"Afficher le nombre de J’aime":"Masquer le nombre de J’aime",run:()=>{togglePostPreference("hidden-likes",hiddenLikeIds,setHiddenLikeIds,openPostMenu.id,"Compteur de J’aime");setOpenPostMenu(null);}}, {icon:<Repeat2 size={21}/>,label:hiddenShareIds.includes(openPostMenu.id)?"Afficher le nombre de partages":"Masquer le nombre de partages",run:()=>{togglePostPreference("hidden-shares",hiddenShareIds,setHiddenShareIds,openPostMenu.id,"Compteur de partages");setOpenPostMenu(null);}}, {icon:<X size={21}/>,label:"Modifier la publication",run:()=>{setMessage("La modification d’une publication existante n’est pas encore reliée à ce menu.");setOpenPostMenu(null);}}]:[]),
          ...(user?.id!==openPostMenu.user_id?[{icon:<ShieldCheck size={21}/>,label:"Signaler la publication",run:()=>{setMessage("Le signalement sera ajouté avec une destination de modération.");setOpenPostMenu(null);}}]:[])
        ].map((item,index)=><button key={item.label} type="button" onClick={item.run} style={{width:"100%",display:"flex",alignItems:"center",gap:17,textAlign:"left",padding:"14px 4px",border:0,borderBottom:"1px solid #edf0ee",background:"transparent",color:"#102d23",fontSize:15}}><span style={{width:28,display:"grid",placeItems:"center"}}>{item.icon}</span><span>{item.label}</span><ChevronRight size={17} style={{marginLeft:"auto",color:"#87958e"}}/></button>)}
        {user?.id===openPostMenu.user_id&&<button type="button" onClick={()=>{const target=openPostMenu;setOpenPostMenu(null);void deletePost(target)}} style={{width:"100%",display:"flex",alignItems:"center",gap:17,textAlign:"left",padding:"16px 4px",marginTop:8,border:0,borderTop:"1px solid #e5e9e6",background:"transparent",color:"#d21f35",fontSize:15,fontWeight:700}}><Archive size={21}/>Supprimer la publication<ChevronRight size={17} style={{marginLeft:"auto"}}/></button>}
        <p style={{fontSize:10,color:"#8b9891",textAlign:"center",marginTop:12}}>Certaines préférences sont enregistrées sur cet appareil. Les fonctions nécessitant une synchronisation serveur seront finalisées séparément.</p>
      </section></div>}
      {manageContentOpen && <div className="modal-backdrop" onClick={() => setManageContentOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-label="Mes contenus" onClick={e => e.stopPropagation()} style={{width:"min(680px,94vw)",maxHeight:"85vh",overflowY:"auto"}}><button className="modal-close" onClick={() => setManageContentOpen(false)} aria-label="Fermer"><X size={20}/></button><div className="modal-icon"><Archive size={23}/></div><span className="eyebrow">EMi · TON ESPACE</span><h2>Mes contenus</h2><p>Les commandes de suppression sont regroupées ici, uniquement pour tes propres contenus. Chaque suppression demande confirmation.</p>{manageContentLoading ? <p>Chargement de tes contenus…</p> : <><h3 style={{margin:"18px 0 8px"}}>Publications et Reels ({managedPosts.length})</h3>{managedPosts.length ? managedPosts.map(post => <div key={post.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #393643"}}><div style={{minWidth:0,flex:1}}><strong>{post.media_type==="video" ? "Reel / vidéo" : "Publication"}</strong><p style={{margin:"3px 0",fontSize:12,color:"#aaa6b7",overflowWrap:"anywhere"}}>{post.content?.trim() || "Sans légende"} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</p></div><button className="profile-back-button" onClick={() => void deletePost(post)} style={{color:"#ff9eaa",flexShrink:0}}>Supprimer</button></div>) : <p style={{color:"#aaa6b7",fontSize:13}}>Aucune publication.</p>}<h3 style={{margin:"18px 0 8px"}}>Stories et statuts ({managedStories.length})</h3>{managedStories.length ? managedStories.map(story => <div key={story.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #393643"}}><div style={{minWidth:0,flex:1}}><strong>{story.media_type==="video" ? "Story vidéo" : "Story photo"}</strong><p style={{margin:"3px 0",fontSize:12,color:"#aaa6b7",overflowWrap:"anywhere"}}>{story.caption?.trim() || "Sans texte"} · {new Date(story.created_at).toLocaleDateString("fr-FR")}</p></div><button className="profile-back-button" onClick={() => void deleteStory(story)} style={{color:"#ff9eaa",flexShrink:0}}>Supprimer</button></div>) : <p style={{color:"#aaa6b7",fontSize:13}}>Aucune story.</p>}<h3 style={{margin:"18px 0 8px"}}>Messages envoyés ({managedMessages.length})</h3>{managedMessages.length ? managedMessages.map(msg => <div key={msg.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #393643"}}><div style={{minWidth:0,flex:1}}><strong>{msg.media_url ? (msg.media_type==="video" ? "Message vidéo" : "Message avec média") : "Message"}</strong><p style={{margin:"3px 0",fontSize:12,color:"#aaa6b7",overflowWrap:"anywhere"}}>{msg.content?.trim() || "Média partagé"} · {new Date(msg.created_at).toLocaleDateString("fr-FR")}</p></div><button className="profile-back-button" onClick={() => void deleteChatMessage(msg)} style={{color:"#ff9eaa",flexShrink:0}}>Supprimer</button></div>) : <p style={{color:"#aaa6b7",fontSize:13}}>Aucun message envoyé.</p>}</>}</section></div>}
      {cameraOpen && <div className="camera-studio-backdrop" role="dialog" aria-modal="true" aria-label="Caméra EMi"><section className="camera-studio"><video ref={cameraVideoRef} className={"camera-live-preview" + (cameraFacing === "user" ? " camera-selfie" : "")} autoPlay muted playsInline/><div className="camera-preview-shade"/><header className="camera-studio-top"><button onClick={() => { stopCamera(); setCameraOpen(false); }} aria-label="Fermer la caméra"><X size={25}/></button><span>EMi <small>STUDIO</small></span><button onClick={() => void startCamera(cameraFacing === "user" ? "environment" : "user")} aria-label="Changer de caméra"><span className="camera-flip-symbol">↻</span></button></header>{cameraError && <div className={"camera-status" + (cameraRecording ? " recording" : "")} role="status">{cameraError}</div>}{!cameraError && <div className="camera-tip">Place-toi dans le cadre et crée ton moment ✨</div>}<div className="camera-tools"><button onClick={() => { const input=document.getElementById("emi-camera-gallery") as HTMLInputElement|null; if(input){input.removeAttribute("capture");input.click();} }}><ImageIcon size={22}/><small>Galerie · photos</small></button><button className={"camera-shutter" + (cameraRecording ? " is-recording" : "")} onClick={() => cameraMode === "photo" ? captureCameraPhoto() : toggleVideoRecording()} aria-label={cameraMode === "photo" ? "Prendre une photo" : cameraRecording ? "Arrêter la vidéo" : "Démarrer la vidéo"}><span/></button><button onClick={() => { stopCamera(); setCameraOpen(false); setCreateStudioOpen(true); }}><Sparkles size={22}/><small>Modes</small></button></div><div className="camera-mode-switch"><button className={cameraMode === "photo" ? "selected" : ""} onClick={() => setCameraMode("photo")}>PHOTO</button><button className={cameraMode === "video" ? "selected" : ""} onClick={() => setCameraMode("video")}>VIDÉO</button><button onClick={() => { stopCamera(); setCameraOpen(false); openCamera("text"); }}>TEXTE</button></div><input id="emi-camera-gallery" type="file" multiple accept="image/*" onChange={e => { const files=Array.from(e.currentTarget.files||[]).filter(f=>f.type.startsWith("image/")); if(files.length>10){setSelectedFiles(files.slice(0,10));setFile(files[0]||null);setMessage("Tu peux choisir jusqu’à 10 photos. Les 10 premières ont été retenues.");}else if(files.length){setSelectedFiles(files);setFile(files[0]);setMessage(files.length>1?files.length+" photos sélectionnées. Appuie sur Continuer pour préparer une publication unique.":"Photo sélectionnée. Tu peux ajouter d’autres photos.");stopCamera();setCameraOpen(false);setComposerOpen(true);} e.currentTarget.value=""; }} hidden/></section></div>}
      {connectionsOpen && <div className="modal-backdrop" onClick={() => setConnectionsOpen(false)}><section className="connections-modal" role="dialog" aria-modal="true" aria-label={connectionTitle} onClick={e => e.stopPropagation()}><header><h2>{connectionTitle}</h2><button className="modal-close" onClick={() => setConnectionsOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="connections-list">{connectionProfiles.map(person => <button className="connections-person" key={person.id} onClick={() => { setConnectionsOpen(false); void openProfile(person.id); }}><span className="connections-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : (person.display_name || person.username || "EM").slice(0,2).toUpperCase()}</span><span><strong>{person.display_name || person.username || "Membre EMi"}</strong><small>@{person.username || "membre"}</small></span><span className="connections-chevron">›</span></button>)}</div>{connectionProfiles.length===0 && <p className="connections-empty">Aucun membre à afficher.</p>}</section></div>}
      {storyComposerOpen && <div className="modal-backdrop" onClick={() => {setStoryComposerOpen(false);setStoryFile(null);}}><div className="modal-card story-composer-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => setStoryComposerOpen(false)} aria-label="Fermer"><X size={20}/></button><div className="modal-icon"><Camera size={23}/></div><span className="eyebrow">EMi · STORY</span><h2>Partager une story</h2><p>Une photo ou vidéo, avec ta musique, visible pendant 24 heures.</p><form onSubmit={publishStory}><input ref={storyFileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setStoryFile(e.target.files?.[0] || null)} style={{display:"none"}}/><input ref={storyMusicInput} type="file" accept="audio/*" onChange={e=>setStoryMusicFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="nav-item" style={{border:"1px solid #393643",marginBottom:12}} onClick={()=>storyFileInput.current?.click()}><ImageIcon size={18}/><span>{storyFile ? storyFile.name : "Choisir une photo ou vidéo"}</span></button><button type="button" className="nav-item" style={{border:"1px solid #393643",marginBottom:12}} onClick={()=>storyMusicInput.current?.click()}><Music2 size={18}/><span>{storyMusicFile ? storyMusicFile.name : "Ajouter une musique (facultatif)"}</span></button>{storyMusicFile && <input value={storyMusicTitle} onChange={e=>setStoryMusicTitle(e.target.value)} maxLength={100} placeholder="Titre de la musique" style={{width:"100%",padding:12,marginBottom:12,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}{storyFile && <div className="story-preview">{storyFile.type.startsWith("video/") ? "Aperçu vidéo sélectionné" : "Photo sélectionnée"} · {(storyFile.size/1024/1024).toFixed(1)} Mo</div>}<textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} rows={3} placeholder="Ajouter un texte (facultatif)…" style={{width:"100%",resize:"vertical",padding:12,margin:"12px 0",borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><p style={{fontSize:11,lineHeight:1.6,color:"#aaa6b7"}}>Formats photo/vidéo courants, jusqu’à 50 Mo. La story expire dans 24 heures.</p><button className="modal-primary" disabled={busy || !storyFile} type="submit">{busy ? "Publication…" : "Publier la story"}</button></form></div></div>}
      {activeStory && <div className="story-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Visionneuse de story" onClick={() => setActiveStory(null)}><div className="story-viewer" onClick={e=>e.stopPropagation()}><div className="story-progress"><span style={{animationDuration:activeStory.media_type === "video" ? "15s" : "6s"}}/></div><header><div className="story-viewer-author">{activeStory.profiles?.avatar_url ? <img src={activeStory.profiles.avatar_url} alt=""/> : <span>{(activeStory.profiles?.display_name || activeStory.profiles?.username || "M").slice(0,1).toUpperCase()}</span>}<strong>{activeStory.profiles?.display_name || activeStory.profiles?.username || "Membre EMi"}</strong><small>{new Date(activeStory.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</small></div><button onClick={() => setActiveStory(null)} aria-label="Fermer la story"><X size={22}/></button></header>{activeStory.media_type === "video" ? <video className="story-viewer-media" src={activeStory.media_url} controls autoPlay playsInline onEnded={() => setActiveStory(null)}/> : <img className="story-viewer-media" src={activeStory.media_url} alt="Story"/>}{activeStory.caption && <p className="story-viewer-caption">{activeStory.caption}</p>}{activeStory.music_url && <div className="emi-story-music"><Music2 size={18}/><span>{activeStory.music_title || "Musique du moment"}</span><audio controls preload="none" src={activeStory.music_url} aria-label={"Écouter " + (activeStory.music_title || "la musique de la story")}/></div>}<div className="story-viewer-nav"><button onClick={() => { const i=stories.findIndex(st=>st.id===activeStory.id); if(i>0)setActiveStory(stories[i-1]); else setActiveStory(null); }}>Précédente</button><button onClick={() => { const i=stories.findIndex(st=>st.id===activeStory.id); if(i>=0 && i<stories.length-1)setActiveStory(stories[i+1]); else setActiveStory(null); }}>Suivante</button></div></div></div>}
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
      {(composerOpen || authOpen || profileEditorOpen) && <div className="modal-backdrop" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}} aria-label="Fermer"><X size={20}/></button>{message && <div role="alert" style={{margin:"12px 0",padding:12,borderRadius:10,border:"1px solid #8d6de0",background:"#282235",color:"#f7f3ff",fontSize:13,lineHeight:1.6,overflowWrap:"anywhere"}}>{message}</div>}{composerOpen ? <div className="emi-creator"><header className="emi-creator-header"><button type="button" aria-label="Retour" onClick={()=>{setComposerOpen(false);setCreateStudioOpen(true);}}><ChevronLeft size={25}/></button><strong>Nouvelle publication</strong><button type="button" aria-label="Fermer" onClick={()=>setComposerOpen(false)}><X size={22}/></button></header><form onSubmit={publish} className="emi-creator-form"><div role="group" aria-label="Type de publication" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}><button type="button" onClick={()=>setPublishDestination("post")} aria-pressed={publishDestination==="post"} style={{padding:12,borderRadius:12,border:publishDestination==="post"?"2px solid #e5c85c":"1px solid #49665a",background:publishDestination==="post"?"#e5c85c":"#092b20",color:publishDestination==="post"?"#092b20":"#f7f4e8",fontWeight:700}}>Publication classique</button><button type="button" onClick={()=>setPublishDestination("reel")} aria-pressed={publishDestination==="reel"} style={{padding:12,borderRadius:12,border:publishDestination==="reel"?"2px solid #e5c85c":"1px solid #49665a",background:publishDestination==="reel"?"#e5c85c":"#092b20",color:publishDestination==="reel"?"#092b20":"#f7f4e8",fontWeight:700}}>Reel vidéo</button></div>{publishDestination==="reel"&&<p style={{margin:"0 0 12px",color:"#e5c85c",fontSize:13}}>Ton Reel sera visible dans l’espace Reels. Sélectionne une vidéo pour continuer.</p>}<input ref={fileInput} type="file" multiple accept="image/*,video/mp4,video/webm,video/quicktime" onChange={e=>{const files=Array.from(e.currentTarget.files||[]);if(files.length>10){setMessage("Tu peux sélectionner jusqu’à 10 photos à la fois.");setSelectedFiles(files.filter(f=>f.type.startsWith("image/")).slice(0,10));setFile(files.find(f=>f.type.startsWith("image/"))||null);}else if(files.some(f=>f.type.startsWith("video/"))&&files.length>1){setMessage("Pour une publication multiple, sélectionne uniquement des photos. Une vidéo peut être publiée seule.");setSelectedFiles([]);setFile(files.find(f=>f.type.startsWith("video/"))||null);}else{const photos=files.filter(f=>f.type.startsWith("image/"));const video=files.find(f=>f.type.startsWith("video/"));setSelectedFiles(photos);setFile(video||photos[0]||null);setMessage(photos.length>1?photos.length+" photos sélectionnées. Elles seront publiées ensemble.":"");}e.currentTarget.value="";}} style={{display:"none"}}/><div className={"emi-creator-preview filter-"+creatorFilter} style={{aspectRatio:creatorRatio==="1:1"?"1 / 1":creatorRatio==="16:9"?"16 / 9":"4 / 5",height:"auto",minHeight:creatorRatio==="16:9"?220:320,maxHeight:520,filter:`brightness(${creatorBrightness}%) contrast(${creatorContrast}%)`}}>{(selectedFiles.length?selectedFiles:file?[file]:[]).length ? <div style={{width:"100%",height:"100%",overflowY:"auto",scrollSnapType:"y mandatory"}}>{(selectedFiles.length?selectedFiles:file?[file]:[]).map((media,index)=><div key={media.name+index} style={{height:"100%",minHeight:260,scrollSnapAlign:"start",position:"relative",display:"grid",placeItems:"center"}}>{media.type.startsWith("video/")?<video src={URL.createObjectURL(media)} controls playsInline style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>:<img src={URL.createObjectURL(media)} alt={"Aperçu "+(index+1)} style={{width:"100%",height:"100%",objectFit:"contain"}}/>}<span style={{position:"absolute",right:10,top:10,background:"#092b20dd",color:"#fff",padding:"5px 9px",borderRadius:99,fontSize:11}}>{index+1}/{(selectedFiles.length?selectedFiles:file?[file]:[]).length}</span>{creatorTextOnPhoto&&creatorOverlayText.trim()&&<span style={{position:"absolute",left:14,right:14,bottom:24,textAlign:"center",fontWeight:800,fontSize:26,color:"#fff",textShadow:"0 2px 8px #000",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{creatorOverlayText}</span>}{(selectedFiles.length?selectedFiles:[]).length>1&&<div style={{position:"absolute",left:8,top:8,display:"flex",gap:5}}><button type="button" disabled={index===0} onClick={()=>setSelectedFiles(old=>{const next=[...old];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})} style={{padding:6,borderRadius:8}}>←</button><button type="button" disabled={index===(selectedFiles.length-1)} onClick={()=>setSelectedFiles(old=>{const next=[...old];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})} style={{padding:6,borderRadius:8}}>→</button><button type="button" onClick={()=>setSelectedFiles(old=>old.filter((_,i)=>i!==index))} style={{padding:6,borderRadius:8}}>Retirer</button></div>}</div>)}</div> : <button type="button" onClick={()=>fileInput.current?.click()}><ImageIcon size={34}/><span>Choisir plusieurs photos ou une vidéo</span></button>}{(selectedFiles.length>0||file) && <button className="emi-creator-change" type="button" onClick={()=>fileInput.current?.click()}>Ajouter / remplacer des photos</button>}</div><div className="emi-creator-tools"><button type="button" onClick={()=>void loadMusicCatalog()} disabled={catalogLoading}><Music2 size={22}/><span>Audio</span></button><button type="button" onClick={()=>{setCreatorTextOnPhoto(v=>!v);setTimeout(()=>document.getElementById("emi-creator-overlay-text")?.focus(),0);}}><span className="emi-tool-aa">Aa</span><span>Texte</span></button><button type="button" onClick={()=>fileInput.current?.click()}><ImageIcon size={22}/><span>Photos multiples</span></button><button type="button" onClick={()=>setCreatorFilter(old=>old==="original"?"vivid":old==="vivid"?"warm":old==="warm"?"mono":old==="mono"?"fade":"original")}><Disc3 size={22}/><span>Filtre · {creatorFilter==="original"?"Original":creatorFilter==="vivid"?"Éclatant":creatorFilter==="warm"?"Chaud":creatorFilter==="mono"?"N&B":"Doux"}</span></button><button type="button" onClick={()=>setCreatorEditOpen(v=>!v)}><SlidersHorizontal size={22}/><span>Modifier</span></button><button type="button" onClick={()=>setCreatorRatio(v=>v==="4:5"?"1:1":v==="1:1"?"16:9":"4:5")}><Smartphone size={22}/><span>Ratio · {creatorRatio}</span></button></div>{creatorEditOpen && <div className="emi-audio-trim"><strong>Retouche photo</strong><label>Luminosité · {creatorBrightness}%<input type="range" min="60" max="150" value={creatorBrightness} onChange={e=>setCreatorBrightness(Number(e.target.value))}/></label><label>Contraste · {creatorContrast}%<input type="range" min="60" max="150" value={creatorContrast} onChange={e=>setCreatorContrast(Number(e.target.value))}/></label></div>}<div className="emi-creator-caption">{creatorTextOnPhoto&&<label style={{display:"block",marginBottom:10}}>Texte sur la photo<input id="emi-creator-overlay-text" value={creatorOverlayText} onChange={e=>setCreatorOverlayText(e.target.value)} maxLength={180} placeholder="Écris le texte à afficher sur la photo…" style={{display:"block",width:"100%",marginTop:6,padding:12,borderRadius:10,background:"#15141c",color:"white",border:"1px solid #65528d"}}/></label>}<textarea id="emi-creator-caption" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Écris une légende…" maxLength={5000} rows={2}/><div className="emi-creator-file">{(selectedFiles.length>0||file) ? <><ImageIcon size={18}/><span>{selectedFiles.length>1?selectedFiles.length+" photos sélectionnées":(selectedFiles[0]||file)?.name}</span><button type="button" onClick={()=>{setFile(null);setSelectedFiles([]);}}>Retirer</button></> : <button type="button" onClick={()=>fileInput.current?.click()}><Plus size={18}/> Sélectionner plusieurs photos</button>}</div>{((selectedFiles[0]||file)?.type.startsWith("image/")) && <div className="emi-compose-music"><div className="emi-compose-music-head"><span className="emi-compose-music-icon"><Music2 size={18}/></span><span><strong>Musique de la publication</strong><small>Ajoute un son que tu as le droit d’utiliser.</small></span></div><button type="button" className="emi-compose-music-pick" onClick={()=>void loadMusicCatalog()} disabled={catalogLoading}><Music2 size={16}/><span>{catalogLoading ? "Chargement du catalogue…" : selectedMusic ? selectedMusic.title + " · " + selectedMusic.artist : "Explorer le catalogue EMi Music"}</span><ChevronRight size={16}/></button><input ref={musicInput} type="file" accept="audio/*" onChange={e=>{const picked=e.currentTarget.files?.[0]||null;if(picked&&!picked.type.startsWith("audio/")){setMessage("Choisis un fichier audio valide.");setMusicFile(null);}else if(picked&&picked.size>15*1024*1024){setMessage("Le fichier audio doit faire moins de 15 Mo.");setMusicFile(null);}else{setMusicFile(picked);if(picked)setMusicTitle(picked.name.replace(/\\.[^.]+$/,""));setSelectedMusic(null);setMessage(picked?"Musique sélectionnée. Elle sera jointe à la publication.":"");}e.currentTarget.value="";}} style={{display:"none"}}/><button type="button" className="emi-compose-music-pick" onClick={()=>musicInput.current?.click()}><Music2 size={16}/><span>{musicFile ? "Musique choisie : "+musicFile.name : "Choisir une musique depuis mon téléphone"}</span><ChevronRight size={16}/></button>{musicFile&&<div className="emi-catalog-selected"><div><Music2 size={20}/></div><section><strong>{musicTitle||musicFile.name}</strong><small>Audio personnel · sera envoyé avec la publication</small></section><button type="button" onClick={()=>{setMusicFile(null);setMusicTitle("");setMusicStart(0);setMusicEnd(30);setMusicDuration(0);}}>Retirer</button><audio controls preload="metadata" src={localMusicPreviewUrl} style={{width:"100%",gridColumn:"1 / -1"}} onLoadedMetadata={e=>{const d=Math.floor(e.currentTarget.duration);if(Number.isFinite(d)&&d>0){setMusicDuration(d);setMusicEnd(Math.min(30,d));}}} onPlay={()=>setPreviewMusic(true)} onPause={()=>setPreviewMusic(false)}/><label style={{gridColumn:"1 / -1",display:"block"}}>Début de l’extrait : {Math.floor(musicStart/60)}:{String(musicStart%60).padStart(2,"0")}<input type="range" min="0" max={Math.max(0,musicDuration-1)} value={Math.min(musicStart,Math.max(0,musicDuration-1))} onChange={e=>{const v=Number(e.target.value);setMusicStart(v);if(musicEnd<=v)setMusicEnd(Math.min(musicDuration||30,v+10));}} style={{width:"100%"}}/></label><label style={{gridColumn:"1 / -1",display:"block"}}>Fin de l’extrait : {Math.floor(musicEnd/60)}:{String(musicEnd%60).padStart(2,"0")}<input type="range" min={Math.min(musicDuration||30,musicStart+1)} max={Math.max(1,musicDuration||30)} value={Math.max(musicStart+1,Math.min(musicEnd,musicDuration||30))} onChange={e=>setMusicEnd(Number(e.target.value))} style={{width:"100%"}}/></label><small style={{gridColumn:"1 / -1"}}>Choisis le passage à associer à ta photo (maximum conseillé : 30 secondes).</small></div>}{selectedMusic && <div className="emi-catalog-selected"><div>{selectedMusic.cover_url ? <img src={selectedMusic.cover_url} alt="" /> : <span><Music2 size={20}/></span>}</div><section><strong>{selectedMusic.title}</strong><small>{selectedMusic.artist}{selectedMusic.genre ? " · " + selectedMusic.genre : ""}</small></section><button type="button" onClick={()=>setSelectedMusic(null)}>Retirer</button></div>}{catalogOpen && <div className="emi-catalog-panel"><div className="emi-catalog-top"><strong>EMi Music</strong><button type="button" onClick={()=>setCatalogOpen(false)} aria-label="Fermer le catalogue"><X size={18}/></button></div><input value={musicSearch} onChange={e=>setMusicSearch(e.target.value)} placeholder="Rechercher un titre ou un artiste…" aria-label="Rechercher dans le catalogue musical"/><div className="emi-catalog-list">{musicCatalog.filter(t=>(t.title+" "+t.artist+" "+(t.genre||"")).toLowerCase().includes(musicSearch.toLowerCase())).map(t=><button type="button" className={"emi-catalog-track"+(selectedMusic?.id===t.id?" selected":"")} key={t.id} onClick={()=>{setSelectedMusic(t);setMusicTitle(t.title);setMusicStart(0);setMusicEnd(Math.min(30,t.duration_seconds||30));setMusicDuration(t.duration_seconds||30);setCatalogOpen(false);}}>{t.cover_url ? <img src={t.cover_url} alt="" /> : <span className="emi-catalog-cover"><Music2 size={18}/></span>}<span><strong>{t.title}</strong><small>{t.artist}{t.genre ? " · "+t.genre : ""}</small></span><Play size={16}/></button>)}{musicCatalog.length===0 && <p className="emi-catalog-empty">Le catalogue est prêt, mais aucun morceau autorisé n’est encore publié. Ajoute des titres avec leurs droits confirmés pour les rendre disponibles ici.</p>}</div></div>}{selectedMusic && <div className="emi-audio-trim"><audio controls preload="none" src={selectedMusic.audio_url} style={{width:"100%"}} onPlay={()=>setPreviewMusic(true)} onPause={()=>setPreviewMusic(false)} /><div><strong>Extrait musical</strong><small>{Math.floor(musicStart/60)}:{String(musicStart%60).padStart(2,"0")} – {Math.floor(musicEnd/60)}:{String(musicEnd%60).padStart(2,"0")}</small></div><label>Début<input type="range" min="0" max={Math.max(1,(selectedMusic.duration_seconds||musicDuration||30)-1)} value={Math.min(musicStart,Math.max(0,(selectedMusic.duration_seconds||musicDuration||30)-1))} onChange={e=>{const v=Number(e.target.value);setMusicStart(v);if(musicEnd<=v)setMusicEnd(Math.min(selectedMusic.duration_seconds||musicDuration||30,v+10));}}/></label><label>Fin<input type="range" min={Math.min(selectedMusic.duration_seconds||musicDuration||30,musicStart+1)} max={Math.max(1,selectedMusic.duration_seconds||musicDuration||30)} value={Math.max(musicStart+1,Math.min(musicEnd,selectedMusic.duration_seconds||musicDuration||30))} onChange={e=>setMusicEnd(Number(e.target.value))}/></label><small>Le morceau sera lié à la publication, sans lecteur posé sur la photo.</small></div>}</div>}<p className="emi-creator-note">Ta publication sera publique. Publier nécessite un compte connecté.</p><button className="emi-creator-next" disabled={busy}>{busy ? "Publication…" : "Partager"}</button></div></form></div> : profileEditorOpen ? <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · PROFIL</span><h2>Personnalise ton profil</h2><form onSubmit={saveProfile}><div className="profile-editor-avatar">{avatarFile ? avatarFile.name : user?.avatar_url ? <img src={user.avatar_url} alt="Photo actuelle"/> : <UserRound size={28}/>}</div><input ref={profileAvatarInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="profile-back-button" onClick={()=>profileAvatarInput.current?.click()}>Choisir une photo de profil</button><label className="profile-field-label">Nom affiché<input value={profileNameDraft} onChange={e=>setProfileNameDraft(e.target.value)} maxLength={80} placeholder="Ton nom"/></label><label className="profile-field-label">Nom d’utilisateur<input value={profileUsernameDraft} onChange={e=>setProfileUsernameDraft(e.target.value)} maxLength={30} placeholder="ex. emi_membre"/></label><label className="profile-field-label">Biographie<textarea value={profileBioDraft} onChange={e=>setProfileBioDraft(e.target.value)} maxLength={300} rows={4} placeholder="Présente-toi en quelques mots…"/></label><button className="modal-primary" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le profil"}</button></form></> : <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · TON COMPTE</span><h2>{recoveryMode ? "Nouveau mot de passe" : signup ? "Créer ton compte" : "Content de te revoir"}</h2><p>{recoveryMode ? "Choisis un mot de passe sûr pour retrouver ton compte." : signup ? "Inscris-toi avec ton adresse e-mail." : "Connecte-toi pour publier et aimer les moments."}</p>{!signup && !recoveryMode && <><div style={{display:"flex",gap:8,margin:"12px 0"}}><button type="button" onClick={()=>{setAuthMethod("email");setOtpSent(false);setOtpCode("");setMessage("");}} style={{flex:1,padding:10,borderRadius:9,border:"1px solid #8d6de0",background:"#302443",color:"#f7f6fb"}}>Connexion par e-mail</button></div><p style={{fontSize:12,lineHeight:1.6,color:"#aaa6b7",margin:"0 0 12px"}}>La connexion par SMS est temporairement indisponible. Utilise ton adresse e-mail et ton mot de passe.</p></>}<form onSubmit={authenticate}>{recoveryMode ? <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/> : authMethod==="phone" && !signup ? <><input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone (ex. +2376XXXXXXXX)" autoComplete="tel" disabled={otpSent} style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>{otpSent && <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="Code reçu par SMS" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}</> : <><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email" style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" autoComplete={signup?"new-password":"current-password"} style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/></>}<button className="modal-primary" disabled={busy} type="submit">{busy ? "Patiente…" : recoveryMode ? "Enregistrer le nouveau mot de passe" : authMethod==="phone" && !signup ? (otpSent ? "Vérifier le code SMS" : "Recevoir un code SMS") : signup ? "Créer mon compte" : "Se connecter"}</button></form>{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void requestPasswordReset()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Mot de passe oublié ?</button>}{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void resendConfirmationEmail()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Renvoyer le courriel de confirmation</button>}{authMethod==="email" && !recoveryMode && <button onClick={()=>setSignup(v=>!v)} style={{width:"100%",marginTop:14,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>{signup ? "J’ai déjà un compte" : "Créer un nouveau compte"}</button>}</>}</div></div>}
    </main>
  );
}
