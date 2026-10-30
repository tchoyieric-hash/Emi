"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Camera, ChevronLeft, Compass, Heart, Home, Repeat2, LogIn, LogOut, MessageCircle, Plus, Search, Send, Settings, Sparkles, UserRound, Video, X, Image as ImageIcon, Clapperboard, ShieldCheck, BadgeCheck, LockKeyhole, Bookmark, Archive, Languages, Palette, CircleHelp, Ban, Eye, SlidersHorizontal, Smartphone, ChevronRight, Clock3, Share2, UserRoundCog, Music2, Play, Headphones, TrendingUp, Mic2, Disc3, ShoppingBag, Users, Volume2, VolumeX } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type WhatsAppEmiPublication = { id: string; texte: string | null; media_url: string | null; media_type: "image" | "video" | "text"; source_type?: "whatsapp_message" | "whatsapp_status"; created_at: string };

type Post = {
  id: string; user_id: string; content: string; created_at: string;
  media_type: string; media_urls: string[]; visibility: string;
  profiles?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};
type Profile = { id: string; email?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; bio?: string | null };
type MarketHighlight = { id:string; title:string; description:string; badge:string; image:string|null; href:string; created_at:string; price?:number|null; meta?:string; viewType: "market" | "elite" | "troc" | "flow" };
type Story = { id:string; user_id:string; media_url:string; media_type:"image"|"video"; caption:string; music_url?:string|null; music_title?:string|null; visibility:string; created_at:string; expires_at:string; profiles?:{username?:string|null;display_name?:string|null;avatar_url?:string|null}|null };
const supabase = createSupabaseBrowserClient();

type OfflinePostDraft = {
  id: string; userId: string; caption: string; destination: "post" | "reel";
  mediaFiles: File[]; musicFile: File | null; musicTitle: string;
  selectedMusic: {id:string;title:string;artist:string;audio_url:string;cover_url:string|null;duration_seconds:number|null;genre:string|null}|null;
  musicStart: number; musicEnd: number; createdAt: string;
};

const OFFLINE_DRAFT_DB = "emi-offline-drafts";
const OFFLINE_DRAFT_STORE = "pending-posts";
function openOfflineDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DRAFT_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_DRAFT_STORE)) db.createObjectStore(OFFLINE_DRAFT_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Stockage local indisponible."));
  });
}
async function saveOfflinePostDraft(draft: OfflinePostDraft): Promise<void> {
  const db = await openOfflineDraftDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_DRAFT_STORE, "readwrite");
    tx.objectStore(OFFLINE_DRAFT_STORE).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Impossible de conserver le brouillon sur le téléphone."));
  });
  db.close();
}
async function readOfflinePostDrafts(): Promise<OfflinePostDraft[]> {
  const db = await openOfflineDraftDb();
  const rows = await new Promise<OfflinePostDraft[]>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_DRAFT_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_DRAFT_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []) as OfflinePostDraft[]);
    req.onerror = () => reject(req.error || new Error("Lecture des brouillons impossible."));
  });
  db.close();
  return rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
async function deleteOfflinePostDraft(id: string): Promise<void> {
  const db = await openOfflineDraftDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(OFFLINE_DRAFT_STORE, "readwrite");
    tx.objectStore(OFFLINE_DRAFT_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Suppression du brouillon impossible."));
  });
  db.close();
}
function describeUnknownError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const item = err as {message?:unknown;details?:unknown;hint?:unknown;code?:unknown;error_description?:unknown};
    const parts = [item.message, item.code ? "Code " + String(item.code) : "", item.details, item.hint, item.error_description]
      .filter(value => typeof value === "string" && value.trim()).map(String);
    if (parts.length) return parts.join(" — ");
    try { return JSON.stringify(err); } catch { return "Erreur inconnue"; }
  }
  return typeof err === "string" ? err : "Erreur inconnue";
}

export default function HomePage() {
  const [active, setActive] = useState("Accueil");
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [reelSoundOn, setReelSoundOn] = useState(false);
  const [postSoundEnabled, setPostSoundEnabled] = useState<Record<string, boolean>>({});
  const homeScrollYRef = useRef(0);
  useEffect(() => { const saved = sessionStorage.getItem("emi-home-scroll-y"); if (saved !== null) { const y = Number(saved); requestAnimationFrame(() => window.scrollTo({ top: Number.isFinite(y) ? y : 0, behavior: "instant" })); sessionStorage.removeItem("emi-home-scroll-y"); } }, []);
  const previousActiveRef = useRef("Accueil");
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [vibesTab, setVibesTab] = useState("Pour toi");
  const [vibesSearch, setVibesSearch] = useState("");
  const [privateAccount, setPrivateAccount] = useState(false);
  const [hideLikeCounts, setHideLikeCounts] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [whatsAppEmiPublications, setWhatsAppEmiPublications] = useState<WhatsAppEmiPublication[]>([]);
  const [postViewCounts, setPostViewCounts] = useState<Record<string, number>>({});
  const [onlineNow, setOnlineNow] = useState(false);
  const [onlineProfileIds, setOnlineProfileIds] = useState<string[]>([]);
  const [marketHighlights, setMarketHighlights] = useState<MarketHighlight[]>([]);
  const [marketViewCounts, setMarketViewCounts] = useState<Record<string, number>>({});
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
  const [offlineDrafts, setOfflineDrafts] = useState<OfflinePostDraft[]>([]);
  const [offlineDraftsOpen, setOfflineDraftsOpen] = useState(false);
  const [createStudioOpen, setCreateStudioOpen] = useState(false);
  const [ecosystemOpen, setEcosystemOpen] = useState(false);
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
  useEffect(() => {
    if (!composerOpen) return;
    let cancelled = false;
    void readOfflinePostDrafts().then(rows => {
      if (!cancelled) setOfflineDrafts(rows.filter(row => !user || row.userId === user.id));
    }).catch(() => { if (!cancelled) setOfflineDrafts([]); });
    return () => { cancelled = true; };
  }, [composerOpen, user?.id]);
  useEffect(() => { if (!musicFile) { setLocalMusicPreviewUrl(""); return; } const url = URL.createObjectURL(musicFile); setLocalMusicPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [musicFile]);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storyStep, setStoryStep] = useState<"choose" | "edit">("choose");
  const [storyTextTheme, setStoryTextTheme] = useState<"emerald" | "gold" | "night">("emerald");
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyFiles, setStoryFiles] = useState<File[]>([]);
  const [storyMode, setStoryMode] = useState<"text" | "photo" | "album" | "video">("photo");
  const [storyCaption, setStoryCaption] = useState("");
  
  
  
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  
  const storyVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { setStoryReaction(null); setStoryReply(""); }, [activeStory?.id]);
  
  
  const [storyReaction, setStoryReaction] = useState<string | null>(null);
  const [storyReply, setStoryReply] = useState("");
  const [storyViewCounts, setStoryViewCounts] = useState<Record<string, number>>({});
  const [storyViewers, setStoryViewers] = useState<Record<string, Profile[]>>({});
  const [storyViewersOpen, setStoryViewersOpen] = useState(false);
  const storyFileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [publishProgress, setPublishProgress] = useState("");
  const [publishSuccess, setPublishSuccess] = useState<{id:string;destination:"post"|"reel";mediaUrl:string|null;caption:string}|null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [openComments, setOpenComments] = useState<string[]>([]);
  const [comments, setComments] = useState<Record<string, {id:string;user_id:string;content:string;created_at:string;profiles?:{username?:string|null;display_name?:string|null}|null}[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string,string>>({});
  const [selectedPostDetail, setSelectedPostDetail] = useState<Post | null>(null);
  const [postDetailView, setPostDetailView] = useState<"post" | "comments">("post");
  const [expandedCaptions, setExpandedCaptions] = useState<string[]>([]);
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
  const [chatFilter, setChatFilter] = useState<"Tout"|"Non lus"|"Groupes">("Tout");
  const [notifications, setNotifications] = useState<{id:string;actor_id:string|null;type:string;post_id:string|null;comment_id:string|null;story_id:string|null;message:string;is_read:boolean;created_at:string;actor?:Profile|null}[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [incomingMessageNotice, setIncomingMessageNotice] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  function hasBlueVerificationBadge(name: string | null | undefined): boolean {
  const normalized = (name || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").replace(/\s+/g, " ");
  return normalized === "eric tchoyi" || normalized === "saa freddy" || normalized === "freddysaa";
}

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
  const pickerDestination = useRef<"post" | "reel">("post");
  const videoFileInput = useRef<HTMLInputElement>(null);

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
    // Presence is best-effort: stories still load if the presence table is not readable.
    const { data: presenceRows } = ids.length
      ? await supabase.from("profile_presence").select("user_id,last_seen").in("user_id", ids)
      : { data: [] };
    const onlineCutoff = Date.now() - 2 * 60 * 1000;
    setOnlineProfileIds((presenceRows || [])
      .filter(row => row.last_seen && new Date(row.last_seen).getTime() > onlineCutoff)
      .map(row => row.user_id));
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
      setCameraError("● REC · Enregistrement en cours. Appuie une fois sur le bouton carré rouge pour terminer.");
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
    const selected = storyMode === "text" ? [] : (storyFiles.length ? storyFiles : (storyFile ? [storyFile] : []));
    if (storyMode === "album" && selected.some(file => !file.type.startsWith("image/"))) { setMessage("Un album de stories accepte uniquement des photos. Pour une vidéo, choisis Story vidéo."); return; }
    if (storyMode === "video" && selected.some(file => !file.type.startsWith("video/"))) { setMessage("Choisis un fichier vidéo pour ce format de story."); return; }
    if (storyMode === "photo" && selected.length > 1) { setMessage("Pour plusieurs médias, choisis Album."); return; }
    if (!selected.length && !storyCaption.trim()) { setMessage("Écris un message ou choisis un média."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
    if (selected.some(file => !allowed.includes(file.type))) { setMessage("Un format n’est pas pris en charge."); return; }
    if (selected.some(file => file.size > 50 * 1024 * 1024)) { setMessage("Chaque média doit faire moins de 50 Mo."); return; }
    setBusy(true); setMessage("");
    const uploadedPaths: string[] = [];
    try {
      let files = selected;
      if (storyMode === "text") {
        // Create a real PNG in-browser: Supabase Storage does not accept SVG in this bucket.
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Impossible de préparer l’image de ta story sur cet appareil.");
        const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
        gradient.addColorStop(0, "#064331");
        gradient.addColorStop(1, "#06100d");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const theme = "#e8cf7d";
        ctx.textAlign = "center";
        ctx.fillStyle = theme;
        ctx.font = "700 34px Arial, sans-serif";
        ctx.fillText("EMi · MOMENT", 540, 610);
        const words = storyCaption.trim().split(/\s+/);
        const lines: string[] = [];
        let line = "";
        ctx.font = "700 68px Arial, sans-serif";
        for (const word of words) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > 860 && line) { lines.push(line); line = word; }
          else line = test;
        }
        if (line) lines.push(line);
        const fontSize = lines.length > 8 ? 52 : lines.length > 5 ? 60 : 68;
        ctx.font = "700 " + fontSize + "px Arial, sans-serif";
        ctx.fillStyle = "#fff4d0";
        const lineHeight = fontSize * 1.35;
        const firstY = (1920 - (lines.length - 1) * lineHeight) / 2;
        lines.forEach((text, index) => ctx.fillText(text, 540, firstY + index * lineHeight, 900));
        const pngBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("La création de l’image de story a échoué.")), "image/png"));
        files = [new File([pngBlob], "story-texte.png", { type: "image/png" })];
      }
      const now = new Date();
      const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const rows = [];
      for (let index=0; index<files.length; index++) {
        const file = files[index];
        const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (file.type.startsWith("video/") ? "mp4" : "jpg");
        const path = user.id + "/" + crypto.randomUUID() + "." + ext;
        const { error } = await supabase.storage.from("story-media").upload(path, file, { contentType:file.type, upsert:false });
        if (error) throw error;
        uploadedPaths.push(path);
        const url = supabase.storage.from("story-media").getPublicUrl(path).data.publicUrl;
        rows.push({user_id:user.id,media_url:url,media_type:file.type.startsWith("video/")?"video":"image",caption:storyCaption.trim(),music_url:null,music_title:null,visibility:"public",created_at:new Date(now.getTime()+index).toISOString(),expires_at:expires.toISOString()});
      }
      const {error: insertError}=await supabase.from("stories").insert(rows);
      if(insertError) throw insertError;
      setStoryComposerOpen(false); setStoryStep("choose"); setStoryFile(null); setStoryFiles([]); setStoryCaption("");  setStoryMode("photo");
      setMessage(rows.length>1?rows.length+" stories publiées ! Elles resteront visibles 24 heures.":"Story publiée ! Elle restera visible 24 heures.");
      await loadStories();
    } catch(err) {
      if(uploadedPaths.length) await supabase.storage.from("story-media").remove(uploadedPaths).catch(()=>undefined);
      setMessage("La story n’a pas pu être publiée : "+(err instanceof Error?err.message:"erreur inconnue"));
    } finally { setBusy(false); }
  }

  const loadFeed = useCallback(async () => {
    if (!supabase) { setMessage("Connexion Supabase non configurée. Vérifie les variables d’environnement Vercel."); return; }
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: whatsAppRows, error: whatsAppError } = await supabase.from("publications_emi").select("id,texte,media_url,media_type,source_type,created_at").gte("created_at", cutoff24h).order("created_at", { ascending: false }).limit(50);
    if (!whatsAppError) setWhatsAppEmiPublications((whatsAppRows || []) as WhatsAppEmiPublication[]);
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
    const { data: viewRows } = await supabase.from("post_views").select("post_id").in("post_id", realPosts.map(post => post.id));
    const viewCounts: Record<string, number> = {}; (viewRows || []).forEach((row: {post_id:string}) => { viewCounts[row.post_id] = (viewCounts[row.post_id] || 0) + 1; }); setPostViewCounts(old => ({...old, ...viewCounts}));
    // Synchroniser les offres du Marché avec l'accueil, avec leur badge d'origine.
    const [{data:marketRows},{data:eliteRows},{data:trocRows},{data:flowRows}] = await Promise.all([
      supabase.from("annonces").select("id,titre,description,prix,image_urls,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(8),
      supabase.from("elite_directory_profiles").select("id,nom,specialite,ville,bio,image_url,created_at").eq("published",true).order("created_at",{ascending:false}).limit(5),
      supabase.from("troc_offres").select("id,bien_offert,bien_recherche,description,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(4),
      supabase.from("tontine_cercles").select("id,nom_article,prix_cible,membres_max,created_at").order("created_at",{ascending:false}).limit(4)
    ]);
    const marketCards: MarketHighlight[] = [
      ...((marketRows || []) as any[]).map((a): MarketHighlight => ({ id: a.id, title: a.titre, description: a.description || "Découvre cette offre de la communauté.", badge: "🛍️ EMi MARKET", viewType: "market", image: Array.isArray(a.image_urls) ? a.image_urls[0] || null : null, href: "/annonce/" + a.id, created_at: a.created_at, price: Number(a.prix) || 0 })),
      ...((eliteRows || []) as any[]).map((a): MarketHighlight => ({ id: a.id, title: a.nom, description: a.bio || a.specialite || "Professionnel de la communauté EMi.", badge: "ELITE HOSPITALITY", viewType: "elite", image: a.image_url || null, href: "/annonces/elite-directory", created_at: a.created_at, meta: [a.specialite, a.ville].filter(Boolean).join(" · ") })),
      ...((trocRows || []) as any[]).map((a): MarketHighlight => ({ id: a.id, title: a.bien_offert, description: "Recherche en échange : " + a.bien_recherche + (a.description ? " — " + a.description : ""), badge: "EMi TROC", viewType: "troc", image: null, href: "/annonces/troc", created_at: a.created_at })),
      ...((flowRows || []) as any[]).map((a): MarketHighlight => ({ id: a.id, title: a.nom_article, description: "Rejoins ce cercle d’achat groupé de la communauté.", badge: "DJANGUI FLOW", viewType: "flow", image: null, href: "/annonces/tontine", created_at: a.created_at, meta: a.prix_cible ? new Intl.NumberFormat("fr-FR").format(Number(a.prix_cible)) + " FCFA" : "" }))
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 8);
    setMarketHighlights(marketCards);
    const marketKeys = marketCards.map(item=>({item_type:item.viewType,item_id:String(item.id)}));
    if (marketKeys.length) {
      const {data:mv}=await supabase.from("market_highlight_views").select("item_type,item_id").in("item_type",["market","elite","troc","flow"]).in("item_id",marketKeys.map(item=>item.item_id));
      const counts:Record<string,number>={}; (mv||[]).forEach((row:{item_type:string;item_id:string})=>{const k=row.item_type+":"+row.item_id;counts[k]=(counts[k]||0)+1;});
      setMarketViewCounts(old=>({...old,...counts}));
    }

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
    if (!supabase || !marketHighlights.length) return;
    const sessionKey = user?.id || (() => { let key=localStorage.getItem("emi_viewer_id"); if(!key){key=crypto.randomUUID();localStorage.setItem("emi_viewer_id",key);} return key; })();
    const nodes=Array.from(document.querySelectorAll<HTMLElement>(".emi-home-market-card[data-view-key]"));
    const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{
      if(!entry.isIntersecting||entry.intersectionRatio<0.6)return;
      const node=entry.target as HTMLElement; const type=node.dataset.viewType; const id=node.dataset.viewId; const key=node.dataset.viewKey;
      if(!type||!id||!key)return;
      observer.unobserve(node);
      void supabase.from("market_highlight_views").upsert({item_type:type,item_id:id,session_key:sessionKey},{onConflict:"item_type,item_id,session_key",ignoreDuplicates:true}).then(async({error})=> {
        if(error) { console.error("Impossible d’enregistrer la vue de l’annonce", error.message); return; }
        const {count,error:countError}=await supabase.from("market_highlight_views").select("id",{count:"exact",head:true}).eq("item_type",type).eq("item_id",id);
        if(countError) { console.error("Impossible de lire le compteur du marché", countError.message); return; }
        if(typeof count==="number")setMarketViewCounts(old=>({...old,[key]:count}));
      });
    });},{threshold:[0.6]});
    nodes.forEach(node=>observer.observe(node));
    return()=>observer.disconnect();
  },[marketHighlights, user?.id]);
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
    if (active !== "Reels" || !selectedReelId) return;
    let attempts = 0;
    let timer = 0;
    const revealSelected = () => {
      const target = document.getElementById("emi-post-" + selectedReelId);
      if (target) {
        target.scrollIntoView({ behavior: "instant", block: "start" });
        const video = target.querySelector("video") as HTMLVideoElement | null;
        if (video) void video.play().catch(() => undefined);
        return;
      }
      if (attempts++ < 12) timer = window.setTimeout(revealSelected, 150);
    };
    timer = window.setTimeout(revealSelected, 80);
    return () => window.clearTimeout(timer);
  }, [active, selectedReelId, posts.length]);

  useEffect(() => {
    // Musique des publications photo : lecture lorsque la publication est au centre du fil.
    const audioRows = Array.from(document.querySelectorAll<HTMLElement>(".emi-post-music[data-emi-music-row='true']"))
      .filter(row => row.closest("article")?.querySelector("img") && !row.closest("article")?.querySelector("video"));
    const isEnabled = (row: HTMLElement) => postSoundEnabled[row.dataset.postId || ""] === true;
    const audios = audioRows.map(row => row.querySelector<HTMLAudioElement>("audio")).filter((audio): audio is HTMLAudioElement => Boolean(audio));
    if (active !== "Accueil" || viewingProfile || audios.length === 0) {
      audios.forEach(audio => audio.pause());
      return;
    }
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
      const best = audioRows
        .map(row => ({ row, ratio: ratios.get(row) || 0, audio: row.querySelector<HTMLAudioElement>("audio") }))
        .filter(item => item.audio && item.ratio >= 0.6 && isEnabled(item.row))
        .sort((a, b) => b.ratio - a.ratio)[0];
      const currentAudio = best?.audio || null;
      audios.forEach(audio => {
        if (audio !== currentAudio && !audio.paused) audio.pause();
      });
      if (currentAudio && currentAudio.paused && !currentAudio.muted) {
        // Une photo musicale ne démarre que si la personne a explicitement activé son son.
        void currentAudio.play().catch(() => undefined);
      }
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    audioRows.forEach(row => observer.observe(row));
    return () => {
      observer.disconnect();
      audios.forEach(audio => audio.pause());
    };
  }, [active, viewingProfile?.id, posts.length, postSoundEnabled]);

  useEffect(() => {
    const previews = Array.from(document.querySelectorAll<HTMLVideoElement>(".emi-home-reel-card video"));
    if (!previews.length || active !== "Accueil") {
      previews.forEach(video => video.pause());
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
          video.muted = !reelSoundOn;
          const linkedAudio = document.getElementById("emi-track-"+(video.closest(".reel-post")?.getAttribute("data-post-id") || "")) as HTMLAudioElement | null;
          if (linkedAudio) linkedAudio.muted = !reelSoundOn;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
          const linkedAudio = document.getElementById("emi-track-" + (video.closest(".reel-post")?.getAttribute("data-post-id") || "")) as HTMLAudioElement | null;
          if (linkedAudio) linkedAudio.pause();
        }
      });
    }, { threshold: [0, 0.4, 0.7, 1] });
    previews.forEach(video => observer.observe(video));
    return () => { observer.disconnect(); previews.forEach(video => video.pause()); };
  }, [active, posts.length]);

  useEffect(() => {
    const selector = active === "Reels" ? ".reel-video" : active === "Accueil" && !viewingProfile ? ".emi-feed-video" : null;
    const allFeedVideos = Array.from(document.querySelectorAll<HTMLVideoElement>(".emi-feed-video, .reel-video"));
    if (!selector) {
      allFeedVideos.forEach(video => video.pause());
      return;
    }
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(selector));
    if (!videos.length) return;
    // Lecture automatique pilotée par la visibilité : le lecteur le plus visible gagne.
    // Cette règle évite que plusieurs vidéos se relancent simultanément pendant un swipe.
    let activeVideo: HTMLVideoElement | null = null;
    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
      const best = videos
        .map(video => ({ video, ratio: ratios.get(video) || 0 }))
        .filter(item => item.ratio >= 0.6)
        .sort((a, b) => b.ratio - a.ratio)[0];
      const nextVideo = best?.video || null;
      allFeedVideos.forEach(video => {
        if (video !== nextVideo && !video.paused) video.pause();
      });
      if (!nextVideo) {
        activeVideo = null;
        return;
      }
      activeVideo = nextVideo;
      nextVideo.playsInline = true;
      nextVideo.loop = true;
      // Les navigateurs mobiles autorisent plus facilement l’autoplay muet.
      const postId = nextVideo.closest("article")?.id.replace("emi-post-", "") || "";
      // L'état sonore suit le média réellement visible : le scroll ne réactive pas le muet par-dessus le choix utilisateur.
      nextVideo.muted = selector === ".reel-video" ? !reelSoundOn : !postSoundEnabled[postId];
      const linkedAudio = document.getElementById("emi-track-" + postId) as HTMLAudioElement | null;
      // Un seul média sonore à la fois : les autres pistes sont arrêtées quand une vidéo prend le focus.
      document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(audio => {
        if (audio !== linkedAudio) audio.pause();
      });
      if (linkedAudio) {
        linkedAudio.muted = nextVideo.muted;
        if (nextVideo.muted) linkedAudio.pause();
        else {
          try { linkedAudio.currentTime = Math.max(Number(linkedAudio.dataset.trackStart || 0), nextVideo.currentTime); } catch {}
          void linkedAudio.play().catch(() => undefined);
        }
      }
      if (nextVideo.paused) void nextVideo.play().catch(() => undefined);
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    videos.forEach(video => {
      video.preload = "metadata";
      observer.observe(video);
    });
    return () => {
      observer.disconnect();
      videos.forEach(video => video.pause());
    };
  }, [active, viewingProfile?.id, posts.length, reelSoundOn, postSoundEnabled]);

  useEffect(() => {
    if (!supabase || !activeStory) return;
    const viewerKey = user?.id || (() => {
      let key = localStorage.getItem("emi_viewer_id");
      if (!key) { key = crypto.randomUUID(); localStorage.setItem("emi_viewer_id", key); }
      return key;
    })();
    let cancelled = false;
    void supabase.from("story_views")
      .upsert({ story_id: activeStory.id, viewer_key: viewerKey }, { onConflict: "story_id,viewer_key", ignoreDuplicates: true })
      .then(async ({ error }) => {
        if (error) { console.error("Impossible d’enregistrer la vue de story", error.message); return; }
        const { data: viewRows, count } = await supabase.from("story_views").select("viewer_key", { count: "exact" }).eq("story_id", activeStory.id);
        if (cancelled) return;
        if (typeof count === "number") setStoryViewCounts(old => ({ ...old, [activeStory.id]: count }));
        const viewerIds = [...new Set((viewRows || []).map(row => row.viewer_key).filter((key): key is string => !!key && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)))];
        if (viewerIds.length) {
          const { data: profiles } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", viewerIds);
          if (!cancelled) setStoryViewers(old => ({ ...old, [activeStory.id]: (profiles || []) as Profile[] }));
        } else if (!cancelled) setStoryViewers(old => ({ ...old, [activeStory.id]: [] }));
      });
    return () => { cancelled = true; };
  }, [activeStory?.id, user?.id]);

  useEffect(() => {
    if (!activeStory || activeStory.media_type === "video" || storyViewersOpen) return;
    const timer = window.setTimeout(() => {
      const index = stories.findIndex(story => story.id === activeStory.id);
      if (index < 0) { setActiveStory(null); return; }
      const authorKey = (item: Story) => (item.profiles?.display_name || item.profiles?.username || "Membre EMi").trim().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase();
      const currentAuthorKey = authorKey(activeStory);
      const nextSameAuthor = stories.slice(index + 1).find(story => authorKey(story) === currentAuthorKey);
      if (nextSameAuthor) { setActiveStory(nextSameAuthor); return; }
      const seenAuthorKeys = new Set(stories.slice(0, index + 1).map(authorKey));
      const nextAuthorStory = stories.slice(index + 1).find(story => !seenAuthorKeys.has(authorKey(story)));
      setActiveStory(nextAuthorStory || null);
    }, 6000);
    return () => window.clearTimeout(timer);
  }, [activeStory, stories, storyViewersOpen]);

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
    if (!supabase) { setMessage("Connexion Supabase non configurée. Réessaie plus tard."); return; }
    if (!user) { setComposerOpen(false); setAuthOpen(true); setMessage("Connecte-toi pour publier."); return; }
    const filesToUpload = selectedFiles.length ? selectedFiles : file ? [file] : [];
    if (!caption.trim() && filesToUpload.length===0) { setMessage("Ajoute un texte ou une photo/vidéo."); return; }
    if (musicFile && filesToUpload.length===0) { setMessage("Ajoute une photo ou une vidéo pour accompagner ta musique."); return; }
    if (musicFile && !musicFile.type.startsWith("audio/")) { setMessage("Choisis un fichier audio valide."); return; }
    if (musicFile && musicFile.size > 15 * 1024 * 1024) { setMessage("Le fichier audio doit faire moins de 15 Mo."); return; }
    if (publishDestination === "reel" && (filesToUpload.length !== 1 || !(filesToUpload[0].type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(filesToUpload[0].name)))) {
      setMessage("Pour publier un Reel, sélectionne une seule vidéo.");
      return;
    }
    if (filesToUpload.length > 10) { setMessage("Tu peux sélectionner jusqu’à 10 photos par publication."); return; }
    if (filesToUpload.some(f=>f.type.startsWith("video/")) && filesToUpload.length > 1) { setMessage("Pour une publication multiple, sélectionne des photos uniquement. Une vidéo peut être publiée seule."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime","video/x-m4v","video/3gpp","video/x-matroska"];
    if (filesToUpload.some(f=>!allowed.includes(f.type) && !((f.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(f.name)) && publishDestination==="reel"))) {
      setMessage("Format non pris en charge. Choisis une photo ou une vidéo courante.");
      return;
    }
    if (filesToUpload.some(f=>f.size > 50 * 1024 * 1024)) { setMessage("Chaque fichier doit faire moins de 50 Mo."); return; }

    setBusy(true); setMessage(""); setPublishProgress("Préparation de ta publication…");
    const uploadedPaths: string[] = [];
    try {
      const uploadOne = async (sourceFile: File, index: number): Promise<string> => {
        let uploadFile = sourceFile;
        if (sourceFile.type.startsWith("image/") && (creatorFilter !== "original" || creatorBrightness !== 100 || creatorContrast !== 100 || (creatorTextOnPhoto && creatorOverlayText.trim()))) {
          setPublishProgress("Optimisation de la photo " + (index + 1) + "…");
          const bitmap = await createImageBitmap(sourceFile);
          const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d"); if (!ctx) { bitmap.close(); throw new Error("Impossible d’appliquer le filtre à cette image."); }
          ctx.filter = `${creatorFilter === "warm" ? "sepia(.22) saturate(1.25)" : creatorFilter === "mono" ? "grayscale(1)" : creatorFilter === "vivid" ? "saturate(1.45)" : creatorFilter === "fade" ? "saturate(.75)" : "none"} brightness(${creatorBrightness}%) contrast(${creatorContrast}%)`;
          ctx.drawImage(bitmap, 0, 0);
          if (creatorTextOnPhoto && creatorOverlayText.trim()) {
            const fontSize=Math.max(22,Math.round(canvas.width*0.055)); ctx.filter="none"; ctx.font=`800 ${fontSize}px system-ui, sans-serif`; ctx.textAlign="center"; ctx.textBaseline="bottom"; ctx.lineWidth=Math.max(3,fontSize*0.12); ctx.strokeStyle="rgba(0,0,0,.8)"; ctx.fillStyle="#fff";
            const words=creatorOverlayText.trim().split(/\s+/); const lines:string[]=[]; let line="";
            for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>canvas.width*.88&&line){lines.push(line);line=word;}else line=test;}
            if(line)lines.push(line); let y=canvas.height-Math.max(24,canvas.height*.06);
            for(let i=lines.length-1;i>=0;i--){ctx.strokeText(lines[i],canvas.width/2,y);ctx.fillText(lines[i],canvas.width/2,y);y-=fontSize*1.18;}
          }
          bitmap.close();
          const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Échec du traitement de l’image.")), "image/jpeg", .94));
          uploadFile = new File([blob], sourceFile.name.replace(/\.[^.]+$/, "") + "-emi.jpg", {type:"image/jpeg"});
        }
        const path = user.id + "/" + crypto.randomUUID() + "-" + uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: uploadError } = await supabase!.storage.from("post-media").upload(path, uploadFile, { contentType: uploadFile.type || "video/mp4", upsert: false, cacheControl: "31536000" });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        return supabase!.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      };

      let urls: string[] = [];
      if (filesToUpload.length) {
        setPublishProgress(filesToUpload.length > 1 ? "Envoi optimisé de " + filesToUpload.length + " photos…" : "Envoi de ton média vers EMi…");
        // Les photos d’un album partent en parallèle au lieu d’attendre chaque transfert l’un après l’autre.
        urls = await Promise.all(filesToUpload.map((sourceFile,index)=>uploadOne(sourceFile,index)));
      }
      const firstFile = filesToUpload[0];
      const isVideo = !!firstFile && (firstFile.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(firstFile.name));
      const mediaType = filesToUpload.length ? (isVideo ? "video" : filesToUpload.length > 1 ? "carousel" : "image") : "text";
      if (publishDestination === "reel" && mediaType !== "video") throw new Error("Pour publier un Reel, sélectionne une vidéo.");

      let musicUrl = selectedMusic?.audio_url ?? "";
      let musicMeta: {title:string;artist:string;start:number;end:number;trackId?:string} | null = selectedMusic ? {title:selectedMusic.title,artist:selectedMusic.artist,start:musicStart,end:musicEnd || selectedMusic.duration_seconds || 30,trackId:selectedMusic.id} : null;
      if (musicFile) {
        setPublishProgress("Envoi de la musique…");
        const audioPath = user.id + "/" + crypto.randomUUID() + "-" + musicFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: audioUploadError } = await supabase.storage.from("post-media").upload(audioPath, musicFile, { contentType: musicFile.type, upsert: false, cacheControl: "31536000" });
        if (audioUploadError) throw new Error("Impossible d’envoyer la musique. Vérifie les autorisations du stockage : " + audioUploadError.message);
        uploadedPaths.push(audioPath);
        musicUrl = supabase.storage.from("post-media").getPublicUrl(audioPath).data.publicUrl;
        musicMeta = {title: musicTitle.trim() || musicFile.name.replace(/\.[^.]+$/, ""),artist:"Audio de ton téléphone",start:0,end:30};
      }

      setPublishProgress("Finalisation de la publication…");
      const postContent = (publishDestination === "reel" ? "[EMI_REEL] " : "") + caption.trim() + (musicMeta ? "\n\n[EMI_MUSIC]" + JSON.stringify({...musicMeta,url:musicUrl}) + "[/EMI_MUSIC]" : "");
      const catalogTrackId = musicFile ? null : (selectedMusic?.id ?? null);
      const catalogClipStart = catalogTrackId && musicMeta ? Math.max(0, Math.floor(musicMeta.start)) : null;
      const catalogClipEnd = catalogTrackId && musicMeta ? catalogClipStart! + Math.min(60, Math.max(1, Math.floor(musicMeta.end) - Math.floor(musicMeta.start))) : null;
      const { data: insertedPost, error } = await supabase.from("posts").insert({
        user_id: user.id, content: postContent, media_type: mediaType, media_urls: urls, visibility: "public",
        music_track_id: catalogTrackId, music_start_seconds: catalogTrackId ? catalogClipStart : null, music_end_seconds: catalogTrackId ? catalogClipEnd : null
      }).select("id").single();
      if (error) throw error;
      if (!insertedPost?.id) throw new Error("Supabase n’a pas confirmé l’enregistrement de la publication.");

      const successPayload = {id: insertedPost.id as string, destination: publishDestination, mediaUrl: urls[0] || null, caption: caption.trim()};
      setCaption(""); setPublishDestination("post"); setFile(null); setSelectedFiles([]); setMusicFile(null); setSelectedMusic(null); setMusicTitle(""); setCatalogOpen(false); setCreatorFilter("original"); setCreatorRatio("4:5"); setCreatorBrightness(100); setCreatorContrast(100); setCreatorTextOnPhoto(false); setCreatorOverlayText(""); setCreatorEditOpen(false); setMusicStart(0); setMusicEnd(30); setMusicDuration(0); setComposerOpen(false);
      setPublishProgress(""); setPublishSuccess(successPayload);
      // Ne bloque pas l’écran de confirmation sur le rechargement complet du fil.
      void loadFeed();
    } catch (err) {
      const detail = describeUnknownError(err);
      const networkFailure = !navigator.onLine || /failed to fetch|networkerror|load failed|fetch failed|network request failed|timeout/i.test(detail);
      if (networkFailure && user) {
        try {
          const draftFiles = selectedFiles.length ? selectedFiles : file ? [file] : [];
          await saveOfflinePostDraft({
            id: crypto.randomUUID(), userId: user.id, caption: caption.trim(), destination: publishDestination,
            mediaFiles: draftFiles, musicFile, musicTitle: musicTitle.trim(),
            selectedMusic, musicStart, musicEnd, createdAt: new Date().toISOString()
          });
          const savedDrafts = await readOfflinePostDrafts(); setOfflineDrafts(savedDrafts.filter(row => row.userId === user.id)); setMessage("Connexion interrompue pendant la publication. Brouillon conservé sur ce téléphone. Ouvre « Brouillons hors connexion » pour le reprendre au retour du réseau.");
        } catch (storageError) {
          setMessage("Connexion interrompue pendant la publication : " + detail + ". Le brouillon n’a pas pu être sauvegardé : " + describeUnknownError(storageError) + ". Ne ferme pas cet écran et réessaie.");
        }
      } else {
        setMessage("Publication non terminée : " + detail);
      }
      // Nettoie les médias transférés si l’enregistrement final a échoué, afin d’éviter les fichiers orphelins.
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage.from("post-media").remove(uploadedPaths);
        if (cleanupError) console.warn("Nettoyage des médias incomplet :", cleanupError.message);
      }
    } finally {
      setBusy(false);
      setPublishProgress("");
    }
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

  useEffect(() => {
    if (!supabase || !user?.id) { setUnreadNotifications(0); return; }
    let active = true;
    const refreshUnreadNotifications = async () => {
      const { count, error } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      if (active && !error) setUnreadNotifications(count || 0);
    };
    void refreshUnreadNotifications();
    const timer = window.setInterval(() => void refreshUnreadNotifications(), 20000);
    const channel = supabase.channel("emi-notification-badge-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "recipient_id=eq." + user.id }, () => {
        void refreshUnreadNotifications();
      }).subscribe();
    return () => { active = false; window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [user?.id]);

  async function loadNotifications() {
    if (!supabase || !user) { setAuthOpen(true); setMessage("Connecte-toi pour consulter tes notifications."); return; }
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase.from("notifications").select("id,actor_id,type,post_id,comment_id,story_id,message,is_read,created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []) as {id:string;actor_id:string|null;type:string;post_id:string|null;comment_id:string|null;story_id:string|null;message:string;is_read:boolean;created_at:string}[];
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
  useEffect(() => {
    if (!supabase || !user?.id) { setOnlineNow(false); return; }
    let active = true;
    const heartbeat = async () => {
      const online = document.visibilityState === "visible" && navigator.onLine;
      if (!active) return;
      setOnlineNow(online);
      if (online) await supabase.from("profile_presence").upsert({user_id:user.id,last_seen:new Date().toISOString()},{onConflict:"user_id"});
    };
    void heartbeat();
    const timer = window.setInterval(()=>void heartbeat(), 60000);
    const onVisibility = () => void heartbeat();
    window.addEventListener("online",onVisibility); window.addEventListener("offline",onVisibility); document.addEventListener("visibilitychange",onVisibility);
    return () => { active=false; window.clearInterval(timer); window.removeEventListener("online",onVisibility); window.removeEventListener("offline",onVisibility); document.removeEventListener("visibilitychange",onVisibility); };
  }, [user?.id]);
  useEffect(() => {
    if (!supabase || !posts.length) return;
    const sessionKey = user?.id || (() => { let key=localStorage.getItem("emi_viewer_id"); if(!key){key=crypto.randomUUID();localStorage.setItem("emi_viewer_id",key);} return key; })();
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(".emi-feed-post[data-post-id]"));
    if (!nodes.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
        const id=(entry.target as HTMLElement).dataset.postId; if(!id) return;
        observer.unobserve(entry.target);
        void supabase.from("post_views").upsert({post_id:id,session_key:sessionKey},{onConflict:"post_id,session_key",ignoreDuplicates:true}).then(async ({error}) => {
          if (error) { console.error("Impossible d’enregistrer la vue de publication", error.message); return; }
          const {count,error:countError}=await supabase.from("post_views").select("id",{count:"exact",head:true}).eq("post_id",id);
          if(countError) { console.error("Impossible de lire le compteur de vues", countError.message); return; }
          if(typeof count==="number") setPostViewCounts(old=>({...old,[id]:count}));
        });
      });
    },{threshold:[0.55]});
    nodes.forEach(node=>observer.observe(node));
    return ()=>observer.disconnect();
  }, [posts, active, viewingProfile?.id, user?.id]);

  // Vidéos classiques du fil : lecture automatique à l’écran, pause hors écran.
  // Les Reels gardent leur comportement et leur espace dédiés.
  useEffect(() => {
    if (active === "Reels" || (viewingProfile && profileTab === "reels")) return;
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(".emi-feed-video"));
    if (!videos.length) return;
    const pauseAllExcept = (current: HTMLVideoElement) => {
      videos.forEach(video => {
        if (video !== current && !video.paused) video.pause();
      });
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7 && document.visibilityState === "visible") {
          pauseAllExcept(video);
          video.muted = true;
          void video.play().catch(() => {
            // Si l’autoplay est bloqué, les commandes natives restent disponibles.
          });
        } else if (!video.paused) {
          video.pause();
        }
      });
    }, { threshold: [0, 0.35, 0.7, 0.9] });
    videos.forEach(video => {
      video.setAttribute("playsinline", "");
      observer.observe(video);
    });
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") videos.forEach(video => video.pause());
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      videos.forEach(video => video.pause());
    };
  }, [posts, active, viewingProfile?.id, profileTab]);

  useEffect(() => {
    const wasReels = previousActiveRef.current === "Reels";
    if (wasReels && active === "Accueil") {
      requestAnimationFrame(() => window.scrollTo({top: homeScrollYRef.current, behavior: "instant"}));
    }
    previousActiveRef.current = active;
  }, [active]);

  useEffect(() => {
    if (active !== "Reels" || !selectedReelId) return;
    const timer = window.setTimeout(() => {
      const card = document.getElementById("emi-post-" + selectedReelId);
      const video = card?.querySelector<HTMLVideoElement>("video.reel-video");
      if (!card || !video) return;
      card.scrollIntoView({behavior:"smooth", block:"start"});
      video.setAttribute("playsinline", "");
      video.volume = 1;
      video.muted = !reelSoundOn;
      void video.play().catch(() => {
        // Les règles du navigateur peuvent exiger un toucher sur la commande sonore.
      });
      const audio = document.getElementById("emi-track-" + selectedReelId) as HTMLAudioElement | null;
      if (audio && reelSoundOn) {
        audio.volume = 1;
        audio.muted = false;
        try { audio.currentTime = Math.max(Number(audio.dataset.trackStart || 0), video.currentTime); } catch {}
        void audio.play().catch(() => undefined);
      }
    }, 160);
    return () => window.clearTimeout(timer);
  }, [active, selectedReelId, reelSoundOn]);

  // Reels : une seule vidéo visible à la fois, lecture au défilement.
  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(".reel-post .reel-video"));
    if (active !== "Reels" || viewingProfile) {
      videos.forEach(video => video.pause());
      return;
    }
    if (!videos.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65 && document.visibilityState === "visible") {
          videos.forEach(other => { if (other !== video) other.pause(); });
          // Autoplay mobile doit démarrer muet; l’utilisateur peut activer le son avec les commandes vidéo.
          if (!reelSoundOn) video.muted = true;
          else { video.muted = false; video.volume = 1; }
          const linkedAudio = document.getElementById("emi-track-" + (video.closest(".reel-post")?.getAttribute("data-post-id") || "")) as HTMLAudioElement | null;
          if (linkedAudio) { linkedAudio.volume = 1; linkedAudio.muted = !reelSoundOn; if (!reelSoundOn) linkedAudio.pause(); else { try { linkedAudio.currentTime = Math.max(Number(linkedAudio.dataset.trackStart || 0), video.currentTime); } catch {} void linkedAudio.play().catch(() => undefined); } }
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      });
    }, { threshold: [0, 0.35, 0.65, 0.85] });
    videos.forEach(video => {
      video.setAttribute("playsinline", "");
      observer.observe(video);
    });
    const onVisibility = () => { if (document.visibilityState !== "visible") videos.forEach(video => video.pause()); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      videos.forEach(video => video.pause());
    };
  }, [active, viewingProfile?.id, posts, reelSoundOn]);

  const isReelPost = (post: Post) => post.media_type === "video" && (post.media_urls || []).length > 0 && /^\s*\[EMI_REEL\]/.test(post.content || "");
  const cleanPostContent = (content: string) => content.replace(/^\s*\[EMI_REEL\]\s*/i, "").replace(/\[EMI_MUSIC\][\s\S]*?(?:\[\/EMI_MUSIC\]|$)/gi, "").trim();
  const filteredPosts = viewingProfile ? (profileTab === "shared" ? sharedPosts.filter(p => !query || cleanPostContent(p.content).toLowerCase().includes(query.toLowerCase())) : profileTab === "reels" ? visiblePosts.filter(p => p.media_type === "video" && (p.media_urls || []).length > 0) : visiblePosts.filter(p => p.media_type !== "video" || !(p.media_urls || []).length)) : active === "Reels" ? visiblePosts.filter(post => post.media_type === "video" && (post.media_urls || []).length > 0).sort((a,b)=>a.id===selectedReelId?-1:b.id===selectedReelId?1:0) : active === "Vidéos" ? visiblePosts.filter(post => post.media_type === "video" && (post.media_urls || []).length > 0) : active === "Accueil" ? visiblePosts : visiblePosts.filter(post => post.media_type !== "video" || !(post.media_urls || []).length);

  return (
    <main className="app-shell"><style>{`@keyframes emiPublishSpin{to{transform:rotate(360deg)}}`}</style>
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
        {(viewingProfile || active !== "Accueil") && <header className="mobile-header emi-mobile-royal-header">{(viewingProfile || active !== "Accueil") && <button className="icon-button back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={23}/></button>}<a className="emi-mobile-royal-brand" href="#" onClick={e => { e.preventDefault(); goBack(); }} aria-label="EMi accueil"><span className="emi-mobile-royal-emblem">e</span><span className="emi-mobile-royal-wordmark"><strong>EMi<span>.</span></strong><small>L’UNIVERS SOCIAL ROYAL</small></span></a><button className="icon-button emi-mobile-royal-account" aria-label="Compte" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? <LogOut size={21}/> : <UserRound size={21}/>}</button></header>}
        {!viewingProfile && active === "Accueil" && <section className="emi-royal-masthead" aria-label="En-tête EMi nouvelle génération">
          <div className="emi-royal-backdrop" />
          <div className="emi-royal-topline">
            <a className="emi-royal-logo" href="#" onClick={e => { e.preventDefault(); setActive("Accueil"); }} aria-label="EMi accueil">
              <span className="emi-royal-emblem"><span>e</span><i>♛</i></span>
              <span className="emi-royal-wordmark"><strong>EMi<span>.</span></strong><small>L’UNIVERS SOCIAL ROYAL</small></span>
            </a>
            <div className="emi-royal-tools">
              <button aria-label="Rechercher sur EMi" onClick={() => setActive("Découvrir")}><Search size={19}/><span>Rechercher sur EMi…</span></button>
              <button className="emi-notification-bell" aria-label={unreadNotifications + unreadMessages > 0 ? "Notifications, " + (unreadNotifications + unreadMessages) + " éléments non lus" : "Notifications"} onClick={() => { setActive("Notifications"); if (!user) setAuthOpen(true); else void loadNotifications(); }}><Bell size={19}/>{(unreadNotifications + unreadMessages) > 0 && <span className="emi-notification-badge">{(unreadNotifications + unreadMessages) > 99 ? "99+" : unreadNotifications + unreadMessages}</span>}</button>
              <button className="emi-royal-account" aria-label="Mon compte" onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}>{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : <UserRound size={20}/>}<ChevronRight size={14}/></button>
            </div>
          </div>
          <div className="emi-royal-message"><span>CONNECTER · PARTAGER · CONSTRUIRE ENSEMBLE</span><strong>Le Cameroun dans une seule communauté.</strong><i>🇨🇲</i></div>
        </section>}
        <div className={"feed-header" + (active === "Reels" && !viewingProfile ? " reels-mode-header" : "")}>{(viewingProfile || active !== "Accueil") && <button className="icon-button desktop-back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={22}/></button>}<div><span className="eyebrow">{viewingProfile ? "EMi · PROFIL PERSONNEL" : "TON UNIVERS, TES LIENS"}</span><h1>{viewingProfile ? currentProfileName : active === "Accueil" ? "Le fil des moments" : active === "EMi Pulse" ? "EMi Pulse" : active === "Découvrir" ? "Découvrir la communauté" : active === "Reels" || active === "Vidéos" ? "Reels EMi" : active === "Messages" ? "Ta messagerie" : active === "Paramètres" ? "Paramètres et activité" : active}</h1><p>{viewingProfile ? "@" + (viewingProfile.username || "membre") : active === "Découvrir" ? "Trouve des membres et découvre leurs publications." : active === "Messages" ? "Retrouve tes conversations au même endroit." : active === "Reels" || active === "Vidéos" ? "Les vidéos de la communauté, dans un fil dédié." : user ? "Connecté en tant que " + displayName : "Découvre les publications publiques."}</p></div><button className="round-action" onClick={() => viewingProfile && user?.id === viewingProfile.id ? (setActive("Paramètres"),setSettingsSection(null),window.scrollTo({top:0,behavior:"smooth"})) : setCreateStudioOpen(true)} aria-label={viewingProfile && user?.id === viewingProfile.id ? "Ouvrir les réglages du profil" : "Créer une publication"}>{viewingProfile && user?.id === viewingProfile.id ? <Settings size={22}/> : <Plus size={22}/>}</button></div>
        {viewingProfile && <section className="profile-page"><div className="profile-page-top"><div className="profile-page-avatar-wrap"><div className="profile-page-avatar">{viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt={"Photo de " + currentProfileName}/> : <span>{currentProfileName.slice(0,2).toUpperCase()}</span>}{user?.id===viewingProfile.id && onlineNow && <span className="emi-online-dot" title="En ligne" aria-label="En ligne"/>}</div></div><div className="profile-page-identity"><h2>{currentProfileName}</h2><span className="profile-username">@{viewingProfile.username || "membre"}</span><div className="profile-stats"><div><strong>{profilePostCount}</strong><span>publications</span></div><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "followers")}><strong>{profileFollowerCount}</strong><span>abonnés</span></button><button type="button" onClick={() => void loadProfileConnections(viewingProfile.id, "following")}><strong>{profileFollowingCount}</strong><span>abonnements</span></button></div></div></div><p className="profile-bio">{viewingProfile.bio?.trim() || "Bienvenue sur mon profil EMi ✨"}</p><div className="profile-page-actions">{user?.id === viewingProfile.id ? <><button className="modal-primary" onClick={startProfileEdit}><Settings size={16}/> Modifier le profil</button><button className="profile-back-button" aria-label="Ouvrir tous les réglages" onClick={() => {setActive("Paramètres");setSettingsSection(null);window.scrollTo({top:0,behavior:"smooth"});}}><Settings size={17}/> Réglages et confidentialité</button></> : user ? <button className="modal-primary" onClick={() => void toggleFollow(viewingProfile.id)}>{followPendingIds.includes(viewingProfile.id) ? "En cours…" : followedIds.includes(viewingProfile.id) ? "Abonné(e)" : "Suivre"}</button> : <button className="modal-primary" onClick={() => setAuthOpen(true)}>Se connecter</button>}{user?.id === viewingProfile.id && <button className="profile-back-button" onClick={() => {setViewingProfile(null);setActive("Accueil");void loadFeed();}}>Partager le profil</button>}<button className="profile-back-button profile-more-action" onClick={() => setMessage("Les options supplémentaires du profil seront disponibles ici.")} aria-label="Plus d’actions">•••</button></div><div className="profile-tabs" role="tablist" aria-label="Contenus du profil"><button role="tab" aria-selected={profileTab==="posts"} className={profileTab==="posts"?"selected":""} onClick={()=>setProfileTab("posts")} aria-label="Publications"><span>▦</span></button><button role="tab" aria-selected={profileTab==="reels"} className={profileTab==="reels"?"selected":""} onClick={()=>setProfileTab("reels")} aria-label="Reels"><Clapperboard size={19}/></button><button role="tab" aria-selected={profileTab==="shared"} className={profileTab==="shared"?"selected":""} onClick={()=>setProfileTab("shared")} aria-label="Repartages"><span>↻</span></button><button role="tab" aria-selected={profileTab==="tagged"} className={profileTab==="tagged"?"selected":""} onClick={()=>setProfileTab("tagged")} aria-label="Identifications"><UserRound size={19}/></button></div></section>}
        {!viewingProfile && <>
        <div className="stories-card" style={{display:["Reels","Vidéos","Découvrir","Messages"].includes(active) ? "none" : undefined}}><div className="section-label"><strong>Stories EMi</strong><button onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else { setStoryStep("choose"); setStoryComposerOpen(true); } }}>Créer une story <span>→</span></button></div><div className="stories-row"><button className="story" onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else setStoryComposerOpen(true); }}><span className="story-ring story-add"><span className="story-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : <Plus size={18}/>}</span><span className="story-plus"><Plus size={13}/></span>{user && onlineNow && <span className="story-online-dot" title="Tu es en ligne" aria-label="Tu es en ligne"/>}</span><span className="story-name">{user ? displayName : "Ta story"}</span></button>{Array.from(stories.reduce((groups, story) => { const displayName = (story.profiles?.display_name || story.profiles?.username || "Membre EMi").trim().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase(); const group = groups.get(displayName) || []; group.push(story); groups.set(displayName, group); return groups; }, new Map<string, Story[]>()).entries()).map(([authorKey, authorStories]) => { const story = authorStories[0]; const author = story.profiles?.display_name || story.profiles?.username || "Membre EMi"; const authorIds = new Set(authorStories.map(item => item.user_id)); const isOnline = authorStories.some(item => onlineProfileIds.includes(item.user_id) || (item.user_id === user?.id && onlineNow)); return <button className="story" key={authorKey} onClick={() => setActiveStory(story)} aria-label={"Voir les " + authorStories.length + " statut(s) de " + author + (isOnline ? ", en ligne" : "")}><span className="story-ring story-media-ring"><span className="story-avatar story-media-thumb">{story.media_type === "image" ? <img src={story.media_url} alt={"Statut de " + author}/> : <span className="story-video-thumb"><img src="/emi-story-video.svg" alt="Vidéo"/><Video size={16}/></span>}</span>{isOnline && <span className="story-online-dot" title={author + " est en ligne"} aria-label={author + " est en ligne"}/>}<span aria-label={authorStories.length + " statuts"} style={{position:"absolute",right:-3,top:-3,minWidth:19,height:19,padding:"0 4px",borderRadius:99,display:"grid",placeItems:"center",background:"#e8cf7d",color:"#09251b",fontSize:10,fontWeight:900,border:"2px solid #09251b",boxSizing:"border-box"}}>{authorStories.length}</span></span><span className="story-name">{author}</span></button>; })}{stories.length === 0 && <span className="stories-empty">Les stories de la communauté apparaîtront ici.</span>}</div></div>
        {active === "Accueil" && !viewingProfile && whatsAppEmiPublications.length > 0 && <section aria-label="Stories WhatsApp relayées vers EMi" style={{margin:"12px 0 18px",padding:"14px",borderRadius:20,border:"1px solid rgba(232,207,125,.3)",background:"linear-gradient(135deg,rgba(5,38,29,.98),rgba(10,20,19,.98))"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12}}><strong style={{fontSize:15,color:"#f1d98a"}}>WhatsApp · #EMI</strong><span style={{fontSize:11,opacity:.75}}>Expire après 24 h</span></div>
          <div style={{display:"grid",gap:14}}>{whatsAppEmiPublications.map(item => <article key={item.id} style={{overflow:"hidden",borderRadius:14,background:"rgba(255,255,255,.045)"}}>
            {item.media_url && item.media_type === "image" && <img src={item.media_url} alt={item.texte || "Publication relayée depuis WhatsApp"} loading="lazy" style={{display:"block",width:"100%",maxHeight:520,objectFit:"cover"}}/>}
            {item.media_url && item.media_type === "video" && <video src={item.media_url} controls playsInline preload="metadata" style={{display:"block",width:"100%",maxHeight:520,background:"#000"}}/>}
            {item.texte && <p style={{padding:"12px 13px",margin:0,whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:14,lineHeight:1.5}}>{item.texte.replace(/#emi/ig,"").trim()}</p>}
            <div style={{padding:"0 13px 11px",fontSize:10,opacity:.65}}>{new Date(item.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})} · {item.source_type === "whatsapp_status" ? "Statut WhatsApp" : "Message WhatsApp"}</div>
          </article>)}</div>
        </section>}
        {active === "Accueil" && !viewingProfile && <section className="emi-ecosystem-home" aria-label="Découvrir les services EMi">
           <div className="emi-ecosystem-entry-wrap">
             <button type="button" className="emi-ecosystem-entry" aria-expanded={ecosystemOpen} onClick={() => setEcosystemOpen(open => !open)}>
               <span className="emi-ecosystem-entry-icon"><Sparkles size={19}/></span>
               <span className="emi-ecosystem-entry-copy"><strong>Écosystème EMi</strong><small>Marché · Fondation · Flow Djangui · Help</small></span>
               <span className="emi-ecosystem-entry-action">{ecosystemOpen ? "Fermer" : "Explorer"} <ChevronRight size={17} className={ecosystemOpen ? "is-open" : ""}/></span>
             </button>
             {ecosystemOpen && <div className="emi-ecosystem-panel" aria-label="Menu Écosystème EMi">
               <div className="emi-ecosystem-panel-head"><div><span className="eyebrow">UN SEUL UNIVERS</span><h2>Tout EMi, au même endroit</h2><p>Choisis l’espace que tu veux explorer.</p></div><button type="button" aria-label="Fermer le menu Écosystème" onClick={() => setEcosystemOpen(false)}><X size={19}/></button></div>
               <div className="emi-ecosystem-panel-grid">
                 <a href="/annonces" className="emi-ecosystem-tile ecosystem-market"><span><ShoppingBag size={23}/></span><strong>Marché</strong><small>Acheter · Vendre · Échanger</small><ChevronRight size={16}/></a>
                 <a href="/annonces/philanthropy" className="emi-ecosystem-tile ecosystem-foundation"><span><Heart size={23}/></span><strong>Fondation</strong><small>Solidarité · Projets sociaux</small><ChevronRight size={16}/></a>
                 <a href="/annonces/tontine" className="emi-ecosystem-tile ecosystem-flow"><span><Users size={23}/></span><strong>Flow Djangui</strong><small>Groupes · Cotisations</small><ChevronRight size={16}/></a>
                 <a href="/annonces/master-health-check" className="emi-ecosystem-tile ecosystem-help"><span><CircleHelp size={23}/></span><strong>Help</strong><small>Assistance · Accompagnement</small><ChevronRight size={16}/></a>
               </div>
               <div className="emi-ecosystem-panel-foot"><Sparkles size={15}/> Plus qu’une application, une communauté.</div>
             </div>}
           </div>
           <section className="emi-home-market" aria-label="Publications de tous les espaces EMi">
              <div className="emi-home-market-heading"><div><span className="eyebrow">UN SEUL FIL · TOUTE LA COMMUNAUTÉ</span><h2>À la une sur EMi</h2><p>Les offres et profils publiés dans les différents espaces, avec leur badge d’origine.</p></div><a href="/annonces">Voir tout <ChevronRight size={15}/></a></div>
              <div className="emi-home-market-row">
                {marketHighlights.map(item=><a href={item.href} className="emi-home-market-card" key={item.badge+item.id} data-view-type={item.viewType} data-view-id={item.id} data-view-key={item.viewType+":"+item.id}>
                  <div className="emi-home-market-image">{item.image?<img src={item.image} alt={item.title} loading="lazy"/>:<span><ShoppingBag size={28}/></span>}<span className={"emi-home-market-badge "+(item.badge.includes("ELITE")?"is-hospitality":item.badge.includes("TROC")?"is-troc":item.badge.includes("DJANGUI")?"is-flow":"is-market")}>{item.badge}</span><span className="emi-market-view-count"><Eye size={14}/><strong>{marketViewCounts[item.viewType+":"+item.id]||0}</strong><span>vues</span></span></div>
                  <div className="emi-home-market-copy"><strong>{item.title}</strong>{item.price!==undefined&&<b>{new Intl.NumberFormat("fr-FR").format(Number(item.price))} FCFA</b>}<p>{item.description}</p>{item.meta&&<small>{item.meta}</small>}</div>
                </a>)}
                {marketHighlights.length===0&&<a href="/annonces" className="emi-home-market-empty"><ShoppingBag size={22}/><strong>Découvrir le Marché EMi</strong><span>Les annonces publiées apparaîtront ici automatiquement.</span></a>}
              </div>
            </section>
            <section className="emi-home-reels" aria-label="Reels de la communauté">
             <div className="emi-home-reels-heading"><div><span className="eyebrow">À REGARDER</span><h2>Reels</h2><p>Les vidéos récentes de la communauté.</p></div><button type="button" onClick={() => {const firstReel=posts.find(post=>post.media_type==="video"&&(post.media_urls||[]).length>0);if(firstReel){sessionStorage.setItem("emi-home-scroll-y",String(window.scrollY));window.location.href="/reels/"+firstReel.id;}else setMessage("Aucun Reel disponible pour le moment.");}}>Voir tout <ChevronRight size={15}/></button></div>
             <div className="emi-home-reels-row">
                {posts.filter(post=>post.media_type==="video"&&(post.media_urls||[]).length>0).slice(0,10).map(post=>{const author=post.profiles?.display_name||post.profiles?.username||"Membre EMi";return <button type="button" className="emi-home-reel-card" key={post.id} onClick={()=>{setSelectedReelId(post.id);setViewingProfile(null);setActive("Reels");window.scrollTo({top:0,behavior:"instant"});}} aria-label={"Ouvrir le Reel de "+author}><video src={post.media_urls[0]} muted playsInline preload="metadata"/><span className="emi-home-reel-play"><Play size={19} fill="currentColor"/></span><span className="emi-home-reel-author">{post.profiles?.avatar_url?<img src={post.profiles.avatar_url} alt=""/>:<span className="emi-home-reel-author-fallback">{author.slice(0,1).toUpperCase()}</span>}<strong>{author}</strong>{user?.id===post.user_id&&onlineNow&&<i className="emi-online-dot" aria-label="En ligne"/>}</span><span className="emi-home-reel-caption">{cleanPostContent(post.content||"Découvre cette vidéo")||"Vidéo"}</span><span className="emi-reel-view-count"><Eye size={15}/><strong>{postViewCounts[post.id]||0}</strong><span>vues</span></span></button>;})}
               {posts.filter(post=>post.media_type==="video"&&(post.media_urls||[]).length>0).length===0&&<div className="emi-home-reels-empty"><Clapperboard size={22}/><strong>Les Reels apparaîtront ici</strong><span>Publie une vidéo pour commencer.</span></div>}
             </div>
           </section>
         </section>}
         <div className="feed-tabs" style={{display:["Reels","Découvrir","Messages"].includes(active) ? "none" : undefined}}><button className={active === "Accueil" ? "tab-active" : ""} onClick={() => {setActive("Accueil"); void loadFeed();}}>Publications</button><button className={active === "Abonnements" ? "tab-active" : ""} onClick={() => void loadFollowingFeed()}>Abonnements</button></div>
        </>}

        {active === "Paramètres" && <section className="emi-settings-page">
          {!settingsSection ? <><div className="emi-settings-hero"><span className="emi-settings-crest"><Settings size={24}/></span><div><span className="eyebrow">EMi · ESPACE PERSONNEL</span><h2>Réglages</h2><p>Ton univers, ton identité, tes choix.</p></div></div>
          {user && <section className="emi-settings-profile-card" aria-label="Profil et publications personnelles">
            <div className="emi-settings-profile-main">
              <div className="emi-settings-profile-avatar">{user.avatar_url ? <img src={user.avatar_url} alt={"Photo de "+(user.display_name||user.username||"profil")}/> : <span>{(user.display_name||user.username||"EM").slice(0,2).toUpperCase()}</span>}</div>
              <div className="emi-settings-profile-identity"><h3>{user.display_name||user.username||"Membre EMi"}</h3><span>@{user.username||"membre"}</span><p>{user.bio?.trim()||"Rêve · Crée · Partage · Inspire"}</p></div>
              <button type="button" className="emi-settings-edit-profile" onClick={startProfileEdit}><Settings size={15}/> Modifier</button>
            </div>
            <div className="emi-settings-profile-stats"><div><strong>{posts.filter(p=>p.user_id===user.id&&!isReelPost(p)).length}</strong><span>Publications</span></div><div><strong>{profileFollowerCount}</strong><span>Abonnés</span></div><div><strong>{profileFollowingCount}</strong><span>Abonnements</span></div></div>
            <div className="emi-settings-own-posts-heading"><strong>Mes publications</strong><button type="button" onClick={()=>{setViewingProfile(user);setProfileTab("posts");setActive("Mon profil");window.scrollTo({top:0,behavior:"smooth"});}}>Voir tout <ChevronRight size={15}/></button></div>
            <div className="emi-settings-own-posts">{posts.filter(p=>p.user_id===user.id).slice(0,4).map(post=><button type="button" key={post.id} className="emi-settings-own-post" aria-label="Ouvrir ma publication" onClick={()=>{setViewingProfile(user);setProfileTab(post.media_type==="video"?"reels":"posts");setActive("Mon profil");window.scrollTo({top:0,behavior:"smooth"});}}>{post.media_urls?.[0] ? (post.media_type==="video" ? <video src={post.media_urls[0]} muted playsInline preload="metadata"/> : <img src={post.media_urls[0]} alt="Ma publication" loading="lazy"/>) : <span><ImageIcon size={22}/></span>}</button>)}{posts.filter(p=>p.user_id===user.id).length===0&&<p className="emi-settings-posts-empty">Tes photos et vidéos publiées apparaîtront ici.</p>}</div>
          </section>}
          <div className="emi-settings-groups">
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
            <button className="discovery-person-main" onClick={() => { if(note.type==="story_reaction"&&note.story_id){const target=stories.find(item=>item.id===note.story_id);if(target){setActiveStory(target);return;}void loadStories().then(()=>{setActive("Accueil");setMessage("Story recherchée. Ouvre-la depuis les Stories EMi si elle est encore active.");});return;}if(note.actor_id)void openProfile(note.actor_id); }}><span><strong>{note.actor?.display_name||note.actor?.username||"EMi"}</strong><small>{note.message}</small><small>{new Date(note.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></span></button>
            {!note.is_read && <span className="notification-unread-dot" aria-label="Non lue"/>}
          </article>)}
          {!notificationsLoading && notifications.length===0 && <div className="empty-feature"><Bell size={28}/><h2>Tu es à jour</h2><p>Les nouveaux abonnements, likes et commentaires apparaîtront ici.</p></div>}</div>
        </section>}
        {active === "Messages" && !viewingProfile && <section className="chat-shell">
          <header className="emi-messages-heading"><div><span className="emi-messages-kicker">EMi · RESTONS CONNECTÉS</span><h2>Messages <span>✦</span></h2><p>Reste proche de ceux qui comptent.</p></div><div className="emi-messages-head-actions"><button type="button" aria-label="Trouver des membres" onClick={()=>{setActive("Découvrir");void loadExploreProfiles();}}><Search size={19}/></button><button type="button" aria-label="Créer un groupe" onClick={()=>void createGroupConversation()}><Plus size={21}/></button></div></header>
          <aside className="chat-sidebar">
            <label className="discovery-search emi-chat-search"><Search size={17}/><input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Rechercher une conversation…" aria-label="Rechercher une conversation"/></label>
            <div className="emi-chat-filters" role="group" aria-label="Filtrer les conversations">{(["Tout","Non lus","Groupes"] as const).map(filter=><button key={filter} type="button" className={chatFilter===filter?"is-active":""} onClick={()=>setChatFilter(filter)}>{filter}</button>)}</div>
            <div className="chat-list">
              {conversations.filter(conv => (chatFilter!=="Groupes" || conv.is_group) && (chatFilter!=="Non lus") && ((conv.is_group ? conv.title || "Groupe EMi" : conv.other?.display_name || conv.other?.username || conv.title || "Conversation").toLowerCase().includes(chatSearch.toLowerCase()))).map(conv => <button key={conv.id} className={"chat-list-item "+(activeConversation===conv.id?"chat-selected":"")} onClick={()=>void openConversation(conv.id)}><span className="chat-avatar">{conv.other?.avatar_url?<img src={conv.other.avatar_url} alt=""/>:(conv.other?.display_name||conv.other?.username||conv.title||"EM").slice(0,2).toUpperCase()}</span><span className="chat-list-copy"><strong>{conv.is_group ? conv.title || "Groupe EMi" : conv.other?.display_name||conv.other?.username||conv.title||"Conversation"}</strong><small>{conv.lastMessage}</small></span></button>)}
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
        {publishSuccess && <div role="dialog" aria-modal="true" aria-labelledby="emi-publish-success-title" style={{position:"fixed",inset:0,zIndex:10000,display:"grid",placeItems:"center",padding:20,background:"rgba(5,7,12,.82)",backdropFilter:"blur(14px)"}}><section style={{width:"min(100%,420px)",borderRadius:28,padding:24,background:"linear-gradient(155deg,#171522,#0b1118 72%)",border:"1px solid rgba(177,143,255,.45)",boxShadow:"0 24px 100px #0009",color:"#fff",textAlign:"center"}}><div style={{width:76,height:76,margin:"4px auto 18px",display:"grid",placeItems:"center",borderRadius:"50%",background:"rgba(42,210,137,.13)",border:"2px solid #35d99a",color:"#35d99a"}}><ShieldCheck size={40}/></div><span style={{fontSize:11,letterSpacing:2,color:"#c9adff",fontWeight:800}}>EMi · PUBLICATION</span><h2 id="emi-publish-success-title" style={{fontSize:25,lineHeight:1.2,margin:"10px 0"}}>Publication envoyée avec succès !</h2><p style={{color:"#c6c2d3",fontSize:14,lineHeight:1.6,margin:"0 0 18px"}}>Ton {publishSuccess.destination==="reel"?"Reel":"contenu"} a bien été enregistré sur EMi. Il est prêt à être découvert par la communauté.</p>{publishSuccess.mediaUrl && <div style={{height:140,overflow:"hidden",borderRadius:16,marginBottom:18,background:"#080a10"}}>{publishSuccess.destination==="reel"?<video src={publishSuccess.mediaUrl} muted playsInline controls preload="metadata" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<img src={publishSuccess.mediaUrl} alt="Aperçu de la publication envoyée" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</div>}{publishSuccess.caption&&<p style={{fontSize:13,color:"#f0edf7",margin:"0 0 18px",overflowWrap:"anywhere"}}>{publishSuccess.caption}</p>}<button type="button" onClick={()=>{const dest=publishSuccess.destination;setPublishSuccess(null);setActive(dest==="reel"?"Reels":"Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}} style={{width:"100%",padding:"14px 18px",border:0,borderRadius:15,background:"linear-gradient(100deg,#7545ff,#9a55f5)",color:"#fff",fontWeight:800,fontSize:15,boxShadow:"0 8px 26px #7545ff55"}}>Voir ma publication</button><button type="button" onClick={()=>setPublishSuccess(null)} style={{width:"100%",padding:13,marginTop:9,borderRadius:15,border:"1px solid #51485f",background:"transparent",color:"#f3efff",fontWeight:700}}>Retour à EMi</button></section></div>}{incomingMessageNotice && <button className="emi-incoming-toast" role="status" onClick={() => { setIncomingMessageNotice(""); setActive("Messages"); }}><MessageCircle size={18}/><span><strong>EMi · Nouveau message</strong><small>{incomingMessageNotice}</small></span></button>}
        {message && <div className="demo-note" role="status"><Sparkles size={16}/><span>{message}</span><button style={{marginLeft:"auto",background:"none",border:0,color:"inherit"}} onClick={() => setMessage("")} aria-label="Fermer"><X size={15}/></button></div>}
        {active === "EMi Pulse" && !viewingProfile && <section className="emi-vibes-page">
          <header className="emi-vibes-hero"><div className="emi-vibes-orb"><Sparkles size={30}/></div><span className="eyebrow">EMi PULSE · LE RADAR DE L’ÉCOSYSTÈME</span><h2>Le radar vivant de la communauté.</h2><p>Un seul espace pour repérer les publications qui émergent, découvrir des talents, explorer les profils locaux et retrouver les opportunités et initiatives de la communauté EMi.</p><div className="emi-vibes-badges"><span><TrendingUp size={13}/> Signaux & tendances</span><span><Users size={13}/> Talents à découvrir</span><span><ShieldCheck size={13}/> Découvertes responsables</span></div></header>
          <div className="emi-vibes-search"><Search size={18}/><input value={vibesSearch} onChange={e=>setVibesSearch(e.target.value)} placeholder="Rechercher une personne ou une publication…" aria-label="Rechercher dans EMi Pulse"/></div>
          <div className="emi-vibes-tabs">{["Pour toi","Tendances","Talents","Près de moi","Opportunités","Initiatives"].map(tab=><button key={tab} className={vibesTab===tab?"selected":""} onClick={()=>{setVibesTab(tab);if(tab==="Talents"||tab==="Près de moi")void loadExploreProfiles();}}>{tab}</button>)}</div>
          <div className="emi-vibes-section-head"><div><span className="eyebrow">RADAR EMi · CONTENUS & OPPORTUNITÉS</span><h3>{vibesTab==="Tendances"?"À la une":vibesTab==="Talents"?"Talents & créateurs":vibesTab==="Près de moi"?"Découvertes locales":vibesTab==="Opportunités"?"Projets & opportunités":vibesTab==="Initiatives"?"Initiatives solidaires":"À découvrir"}</h3></div><span className="emi-vibes-live"><span/> Communauté EMi</span></div>
          {(vibesTab==="Talents"||vibesTab==="Près de moi") ? <div className="discovery-list">{exploreProfiles.filter(p=>!vibesSearch||(p.display_name||p.username||"").toLowerCase().includes(vibesSearch.toLowerCase())).map(profile=><article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={()=>void openProfile(profile.id)}><span className="avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:(profile.display_name||profile.username||"EM").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name||profile.username||"Membre EMi"}</strong><small>@{profile.username||"membre"}</small></span></button><button className="profile-back-button" onClick={()=>void openProfile(profile.id)}>Voir le profil <ChevronRight size={15}/></button></article>)}{exploreProfiles.length===0&&<div className="emi-vibes-empty"><div className="emi-vibes-empty-icon"><Users size={26}/></div><h3>Découvre la communauté</h3><p>Explore les profils disponibles sur EMi.</p><button onClick={()=>void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading?"Chargement…":"Charger les profils"} <ChevronRight size={16}/></button></div>}</div> : <div className="emi-pulse-grid">{[{title:"Tendances",desc:"Publications à découvrir dans la communauté.",icon:TrendingUp,tab:"Tendances"},{title:"Talents & créateurs",desc:"Artistes, créateurs et profils inspirants.",icon:Mic2,tab:"Talents"},{title:"Près de chez toi",desc:"Membres et découvertes locales.",icon:Compass,tab:"Près de moi"},{title:"Opportunités",desc:"Emploi, formations et collaborations.",icon:Sparkles,tab:"Opportunités"},{title:"Initiatives solidaires",desc:"Projets et actions communautaires.",icon:Heart,tab:"Initiatives"}].map(item=><button type="button" key={item.title} className="emi-pulse-card" onClick={()=>{setVibesTab(item.tab);if(item.tab==="Talents"||item.tab==="Près de moi")void loadExploreProfiles();}}><span className="emi-pulse-card-icon"><item.icon size={22}/></span><strong>{item.title}</strong><p>{item.desc}</p><span className="emi-pulse-card-link">Explorer <ChevronRight size={15}/></span></button>)}</div>}
          {(vibesTab==="Pour toi"||vibesTab==="Tendances")&&<div className="emi-pulse-posts"><div className="emi-vibes-section-head"><div><span className="eyebrow">SIGNAUX DE LA COMMUNAUTÉ</span><h3>Publications à explorer</h3></div><button onClick={()=>{setActive("Accueil");void loadFeed();}}>Tout voir <ChevronRight size={15}/></button></div>{posts.filter(p=>!p.content.includes("[EMI_REEL]")&&(!vibesSearch||(p.content||"").replace(/^\\s*\\[EMI_REEL\\]\\s*/,"").toLowerCase().includes(vibesSearch.toLowerCase())||(p.profiles?.display_name||p.profiles?.username||"").toLowerCase().includes(vibesSearch.toLowerCase()))).slice(0,6).map(post=><article className="emi-pulse-post" key={post.id}><div className="emi-pulse-post-author"><span className="emi-pulse-avatar">{post.profiles?.avatar_url?<img src={post.profiles.avatar_url} alt=""/>:(post.profiles?.display_name||post.profiles?.username||"EM").slice(0,2).toUpperCase()}</span><div><strong>{post.profiles?.display_name||post.profiles?.username||"Membre EMi"}</strong><small>@{post.profiles?.username||"membre"} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</small></div></div>{post.content&&<p>{post.content.split("[EMI_MUSIC]")[0].trim()||"Un moment partagé avec la communauté EMi."}</p>}{(post.media_urls||[]).length>0&&(post.media_type==="video"?<video className="emi-pulse-media" src={post.media_urls[0]} controls playsInline preload="metadata"/>:<img className="emi-pulse-media" src={post.media_urls[0]} alt="Publication de la communauté EMi" loading="lazy" decoding="async"/>)}<div className="emi-pulse-post-footer"><span><Heart size={15}/> Publication EMi</span><button onClick={()=>{setActive(post.media_type==="video"?"Reels":"Accueil");void loadFeed();}}>Voir la publication <ChevronRight size={15}/></button></div></article>)}{posts.length===0&&<p className="emi-vibes-empty">Aucune publication à mettre en avant pour le moment. Les nouveautés de la communauté apparaîtront ici.</p>}</div>}
          {(vibesTab==="Opportunités"||vibesTab==="Initiatives")&&<div className="emi-vibes-empty"><div className="emi-vibes-empty-icon">{vibesTab==="Opportunités"?<Sparkles size={26}/>:<Heart size={26}/>}</div><h3>{vibesTab==="Opportunités"?"Les opportunités ont leur place ici.":"Les initiatives qui comptent."}</h3><p>Cette rubrique sert à repérer les offres, projets, formations et initiatives partagés sur EMi. Elle se remplira à mesure que ces contenus seront publiés et vérifiables.</p><button onClick={()=>setActive("Découvrir")}>Explorer la communauté <ChevronRight size={16}/></button></div>}
          <div className="emi-vibes-note"><ShieldCheck size={16}/><span>Les contenus et profils proviennent d’EMi. Les offres et événements ne sont pas présentés comme vérifiés sans confirmation de leur source.</span></div>
        </section>}
        {active === "EMi Pulse" ? null : active === "Paramètres" ? null : active === "Découvrir" && !viewingProfile ? <section className="discovery-panel"><label className="discovery-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void loadExploreProfiles(); }} placeholder="Rechercher un nom ou @pseudo…" aria-label="Rechercher des membres"/></label><button className="modal-primary" onClick={() => void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading ? "Recherche…" : "Rechercher"}</button><div className="discovery-list">{exploreProfiles.map(profile => <article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={() => void openProfile(profile.id)}><span className="discovery-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : (profile.display_name || profile.username || "M").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name || profile.username || "Membre EMi"}</strong><small>@{profile.username || "membre"}</small>{profile.bio && <small className="discovery-bio">{profile.bio}</small>}</span></button><div className="discovery-person-actions"><button className="profile-back-button" onClick={() => void openProfile(profile.id)}>Voir le profil</button>{user && <button className="modal-primary" onClick={() => void startConversation(profile)}>Message</button>}</div></article>)}{!exploreLoading && exploreProfiles.length === 0 && <div className="empty-feature"><Compass size={30}/><h2>Découvre ta communauté</h2><p>Recherche un nom ou un nom d’utilisateur pour trouver des membres EMi.</p></div>}</div></section> : active === "Messages" && !viewingProfile ? null: !supabase ? <div className="post-card"><h2>Connexion à configurer</h2><p>Les variables d’environnement Supabase sont absentes. Vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel.</p></div> : (filteredPosts.length === 0 || (viewingProfile && (profileTab === "tagged" || (profileTab === "reels" && !filteredPosts.some(post => post.media_type === "video"))))) ? <div className="post-card profile-tab-empty" style={{padding:28,textAlign:"center"}}><div className="modal-icon" style={{margin:"0 auto 16px"}}><Sparkles size={23}/></div><h2 style={{fontSize:20}}>{viewingProfile && profileTab === "shared" ? "Aucun repartage pour le moment" : viewingProfile && profileTab === "tagged" ? "Aucune identification pour le moment" : query ? "Aucun résultat" : viewingProfile && profileTab === "reels" ? "Aucun Reel sur ce profil" : active === "Reels" || active === "Vidéos" ? "Aucun Reel pour le moment" : viewingProfile ? "Aucune publication pour le moment" : "Le fil commence ici"}</h2><p style={{color:"#aaa6b7",fontSize:13,lineHeight:1.7}}>{viewingProfile && profileTab === "shared" ? "Les publications que ce membre a repartagées apparaîtront ici." : viewingProfile && profileTab === "tagged" ? "Les publications qui identifient ce membre apparaîtront ici lorsque cette fonction sera disponible." : query ? "Essaie un autre mot." : viewingProfile && profileTab === "reels" ? "Les vidéos publiées par ce membre apparaîtront ici." : viewingProfile ? "Les moments partagés par ce membre apparaîtront ici." : "Aucune publication réelle n’est encore disponible. Sois le premier à partager un moment."}</p>{(!viewingProfile || (user?.id === viewingProfile.id && profileTab === "posts")) && <button className="modal-primary" style={{maxWidth:260}} onClick={() => setComposerOpen(true)}>Créer une publication</button>}</div> :
        <div className={"feed-list" + (viewingProfile ? " profile-media-grid" : "")}>{(viewingProfile && profileTab === "reels" ? filteredPosts.filter(post => post.media_type === "video" && (post.media_urls || []).length > 0) : viewingProfile && profileTab === "tagged" ? [] : filteredPosts).map(post => { const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi"; return <article id={"emi-post-" + post.id} data-post-id={post.id} className={"emi-feed-post " + (active === "Reels" && post.media_type === "video" ? "post-card reel-post" : "post-card") + (viewingProfile ? " profile-grid-post" : "")} key={post.id}><div className="post-top"><button className="post-avatar-button" onClick={() => void openProfile(post.user_id)} aria-label={"Voir le profil de " + author}><div className="avatar avatar-sunset">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt=""/> : author.slice(0,2).toUpperCase()}</div></button><button className="post-author post-author-button" onClick={() => void openProfile(post.user_id)}><strong className="emi-author-name">{author}{hasBlueVerificationBadge(author) && <span className="emi-verified-badge" role="img" aria-label="Profil vérifié par EMi" title="Profil vérifié par EMi"><BadgeCheck size={19} fill="#1877F2" stroke="#FFFFFF" strokeWidth={2.2}/></span>}</strong><span>@{post.profiles?.username || "membre"} · {new Date(post.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</span></button><button type="button" className="profile-more-action" aria-label="Options de la publication" aria-haspopup="dialog" onClick={()=>setOpenPostMenu(post)} style={{marginLeft:"auto",border:0,background:"transparent",color:"inherit",padding:8,fontSize:22,lineHeight:1}}>•••</button>{user && user.id !== post.user_id && <button onClick={() => void toggleFollow(post.user_id)} style={{marginLeft:"8px",border:"1px solid #393643",borderRadius:9,padding:"7px 10px",background:followedIds.includes(post.user_id)?"#282235":"#a78bfa17",color:"#d8c9ff",fontSize:11}}>{followPendingIds.includes(post.user_id) ? "…" : followedIds.includes(post.user_id) ? "Suivi" : "Suivre"}</button>}</div>{post.content && <><div className="post-caption-wrap"><p className="post-caption" style={expandedCaptions.includes(post.id)?undefined:{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{cleanPostContent(post.content).split("[EMI_MUSIC]")[0].trim()}</p>{cleanPostContent(post.content).split("[EMI_MUSIC]")[0].trim().length>180&&<button type="button" onClick={()=>setExpandedCaptions(old=>old.includes(post.id)?old.filter(id=>id!==post.id):[...old,post.id])} style={{border:0,background:"transparent",color:"#c5b7f6",fontWeight:700,padding:"2px 0 8px"}}>{expandedCaptions.includes(post.id)?"Voir moins":"Voir plus"}</button>}</div>{post.content.includes("[EMI_MUSIC]") && (()=>{try{const track=JSON.parse(post.content.split("[EMI_MUSIC]")[1].split("[/EMI_MUSIC]")[0]) as {url:string;title:string;start?:number;end?:number};const audioId="emi-track-"+post.id;const hasVideo=post.media_type==="video";return <div className="emi-post-music" data-emi-music-row="true" data-post-id={post.id}><span className="emi-post-music-icon"><Music2 size={17}/></span><span className="emi-post-music-title"><strong>{track.title}</strong><small>{hasVideo ? "Musique synchronisée avec la vidéo" : "Musique du moment · EMi Music"}</small></span><audio id={audioId} className="emi-post-audio" preload="none" src={track.url} data-track-start={track.start||0} aria-label={"Musique "+track.title} onPlay={e=>{if((track.start||0)>0 && e.currentTarget.currentTime<(track.start||0))e.currentTarget.currentTime=track.start||0;document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other=>{if(other!==e.currentTarget)other.pause();});}} onTimeUpdate={e=>{if((track.end||0)>0 && e.currentTarget.currentTime>= (track.end||0)){e.currentTarget.pause();e.currentTarget.currentTime=track.start||0;}}}/></div>}catch{return null}})()}</>}{(post.media_urls || []).length > 1 ? <div style={{position:"relative",width:"100%"}}><div className="emi-post-gallery" id={"emi-gallery-"+post.id} aria-label={"Carrousel de "+post.media_urls.length+" photos"} style={{width:"100%",height:"min(100vw,650px)",minHeight:320,maxHeight:650,display:"flex",flexDirection:"row",flexWrap:"nowrap",overflowX:"auto",overflowY:"hidden",scrollSnapType:"x mandatory",scrollBehavior:"smooth",overscrollBehaviorX:"contain",WebkitOverflowScrolling:"touch",touchAction:"pan-x",background:"#09090d",scrollbarWidth:"none"}}>{(post.media_urls || []).map((url,i) => <div key={url+i} style={{flex:"0 0 100%",flexShrink:0,minWidth:"100%",width:"100%",height:"100%",scrollSnapAlign:"start",scrollSnapStop:"always",position:"relative",display:"grid",placeItems:"center",background:"#09090d"}}>{post.media_type === "video" ? <video src={url} controls={active === "Reels"} muted={!postSoundEnabled[post.id]} playsInline preload="metadata" className={active === "Reels" ? "reel-video" : "emi-feed-video"} onClick={()=>{if(post.media_type==="video"&&active!=="Reels"){setSelectedReelId(post.id);setViewingProfile(null);setActive("Reels");window.scrollTo({top:0,behavior:"instant"});}}} style={{width:"100%",height:"100%",objectFit:"contain",cursor:post.media_type==="video"&&active!=="Reels"?"pointer":"auto"}} onPlay={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.currentTime=e.currentTarget.currentTime;audio.muted=!postSoundEnabled[post.id];if(!audio.muted)void audio.play().catch(()=>undefined);}}}/> : <img src={url} alt={"Photo "+(i+1)+" de la publication"} loading="lazy" decoding="async" onClick={()=>{setSelectedPostDetail(post);setPostDetailView("post");}} style={{width:"100%",height:"100%",objectFit:"contain",cursor:"zoom-in"}}/>}<span style={{position:"absolute",top:12,right:12,padding:"6px 10px",borderRadius:99,background:"#092b20dd",color:"#f6d85f",fontSize:12,fontWeight:700}}>{i+1}/{post.media_urls.length}</span></div>)}</div>{active!=="Reels"&&!viewingProfile&&(post.media_type==="video"||post.content.includes("[EMI_MUSIC]"))&&<button type="button" className="emi-feed-sound-toggle emi-gallery-sound-toggle emi-photo-music-toggle" style={{position:"absolute",right:12,bottom:12,zIndex:100,display:"flex",visibility:"visible",opacity:1,pointerEvents:"auto"}} aria-label={postSoundEnabled[post.id]?"Couper le son":"Activer le son"} aria-pressed={!!postSoundEnabled[post.id]} onClick={()=>{const next=!(postSoundEnabled[post.id]??false);setPostSoundEnabled(old=>({...old,[post.id]:next}));const card=document.getElementById("emi-post-"+post.id);const video=card?.querySelector<HTMLVideoElement>("video.emi-feed-video");const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(video)video.muted=!next;if(audio){audio.muted=!next;if(next){if(video)audio.currentTime=video.currentTime;audio.volume=1;void audio.play().catch(()=>undefined);}else audio.pause();}}}>{postSoundEnabled[post.id]?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{postSoundEnabled[post.id]?"Son activé":"Son coupé"}</span></button>}<button type="button" aria-label="Photo précédente" onClick={()=>{const el=document.getElementById("emi-gallery-"+post.id);el?.scrollBy({left:-(el.clientWidth||300),behavior:"smooth"});}} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",border:"1px solid #ffffff66",background:"#10101099",color:"#fff",fontSize:25,zIndex:2,display:"grid",placeItems:"center"}}>‹</button><button type="button" aria-label="Photo suivante" onClick={()=>{const el=document.getElementById("emi-gallery-"+post.id);el?.scrollBy({left:el.clientWidth||300,behavior:"smooth"});}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",border:"1px solid #ffffff66",background:"#10101099",color:"#fff",fontSize:25,zIndex:2,display:"grid",placeItems:"center"}}>›</button></div> : (post.media_urls || []).map((url,i) => post.media_type === "video" ? <div key={url+i} className="emi-feed-media-wrap"><video src={url} controls={active === "Reels"} autoPlay={false} muted={active === "Reels" ? !reelSoundOn : !postSoundEnabled[post.id]} loop={active === "Reels"} playsInline preload="metadata" className={active === "Reels" ? "reel-video" : "emi-feed-video"} onClick={()=>{if(post.media_type==="video"&&active!=="Reels"){setSelectedReelId(post.id);setViewingProfile(null);setActive("Reels");window.scrollTo({top:0,behavior:"instant"});}}} onPlay={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.currentTime=video.currentTime;audio.muted=active === "Reels" ? !reelSoundOn : !postSoundEnabled[post.id];if(!audio.muted)void audio.play().catch(()=>undefined);}}} onPause={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.pause();}} onSeeking={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.currentTime=e.currentTarget.currentTime;}} onTimeUpdate={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio&&Math.abs(audio.currentTime-video.currentTime)>0.35)audio.currentTime=video.currentTime;}} onEnded={()=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.pause();audio.currentTime=0;}}} style={active === "Reels" ? undefined : {width:"100%",maxHeight:560,borderRadius:0,background:"#09090d",objectFit:"contain",cursor:post.media_type==="video"&&active!=="Reels"?"pointer":"auto"}}/>{active!=="Reels"&&!viewingProfile&&<button type="button" className="emi-feed-sound-toggle" aria-label={postSoundEnabled[post.id]?"Couper le son":"Activer le son"} aria-pressed={!!postSoundEnabled[post.id]} onClick={()=>{const next=!(postSoundEnabled[post.id]??false);setPostSoundEnabled(old=>({...old,[post.id]:next}));const card=document.getElementById("emi-post-"+post.id);const video=card?.querySelector<HTMLVideoElement>("video.emi-feed-video");const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(video){video.muted=!next;if(next)void video.play().catch(()=>undefined);}if(audio){audio.muted=!next;if(next){if(video){try{audio.currentTime=video.currentTime;}catch{}}audio.volume=1;void audio.play().catch(()=>undefined);}else audio.pause();}}}>{postSoundEnabled[post.id]?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>}</div> : <div key={url+i} className="emi-feed-media-wrap"><img src={url} alt="Publication partagée sur EMi" loading="lazy" decoding="async" onClick={()=>{setSelectedPostDetail(post);setPostDetailView("post");}} style={{width:"100%",maxHeight:650,objectFit:"contain",borderRadius:0,background:"#09090d",cursor:"zoom-in"}}/>{active!=="Reels"&&!viewingProfile&&post.content.includes("EMI_MUSIC")&&<button type="button" className="emi-feed-sound-toggle emi-photo-music-toggle" style={{position:"absolute",right:12,bottom:12,zIndex:100,display:"flex",visibility:"visible",opacity:1,pointerEvents:"auto"}} aria-label={postSoundEnabled[post.id]?"Couper la musique":"Écouter la musique"} aria-pressed={!!postSoundEnabled[post.id]} onClick={e=>{e.preventDefault();e.stopPropagation();const next=!(postSoundEnabled[post.id]??false);setPostSoundEnabled(old=>({...old,[post.id]:next}));const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other=>{if(other!==audio)other.pause();});audio.muted=!next;if(next){audio.volume=1;void audio.play().catch(()=>undefined);}else audio.pause();}}}>{postSoundEnabled[post.id]?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{postSoundEnabled[post.id]?"Son activé":"Son coupé"}</span></button>}</div>)}{active === "Reels" && !viewingProfile && <button type="button" className="emi-reel-sound-toggle" aria-label={reelSoundOn ? "Désactiver le son" : "Activer le son"} aria-pressed={reelSoundOn} onClick={e=>{e.preventDefault();e.stopPropagation();const card=document.getElementById("emi-post-"+post.id);const video=card?.querySelector<HTMLVideoElement>("video.reel-video");const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;const nextMuted=video?!video.muted:reelSoundOn;if(video){video.volume=1;video.muted=nextMuted;if(!nextMuted)void video.play().catch(()=>undefined);}if(audio){audio.volume=1;audio.muted=nextMuted;if(nextMuted)audio.pause();else{if(video){try{audio.currentTime=Math.max(Number(audio.dataset.trackStart||0),video.currentTime);}catch{}}void audio.play().catch(()=>undefined);}}setReelSoundOn(!nextMuted);}}>{reelSoundOn?<Volume2 size={25}/>:<VolumeX size={25}/>}<span>{reelSoundOn?"Son activé":"Activer le son"}</span></button>}<div className="post-actions"><button className={liked.includes(post.id) ? "liked" : ""} onClick={() => void toggleLike(post.id)}><Heart size={20} fill={liked.includes(post.id) ? "currentColor" : "none"}/><span>{likes[post.id] || 0}</span></button><button onClick={() => { setSelectedPostDetail(post); setPostDetailView("comments"); void loadComments(post.id); }}><MessageCircle size={20}/><span>Commentaires{comments[post.id]?.length ? ` (${comments[post.id].length})` : ""}</span></button><button className={reposted.includes(post.id) ? "liked" : ""} onClick={() => void toggleRepost(post.id)} aria-label={reposted.includes(post.id) ? "Annuler le repartage" : "Repartager"}><Repeat2 size={19}/><span>{reposted.includes(post.id) ? "Repartagé" : "Repartager"}</span></button><button onClick={() => { if (navigator.share) void navigator.share({title:"EMi",text:post.content,url:location.href}).catch(()=>{}); else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi."); }}><Send size={19}/><span>Partager</span></button><span className="emi-post-views" title="Vues de cette publication"><Eye size={16}/><strong>{postViewCounts[post.id] || 0}</strong><span>vues</span></span></div>{active === "Reels" && !viewingProfile && <form className="emi-reel-comment-bar" onSubmit={e=>void addComment(post.id,e)}><input aria-label="Ajouter un commentaire au Reel" value={commentDrafts[post.id] || ""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} maxLength={2000} placeholder="Ajouter un commentaire…"/><button type="submit" disabled={busy || !(commentDrafts[post.id]||"").trim()} aria-label="Envoyer le commentaire"><Send size={18}/></button></form>}{openComments.includes(post.id) && <div className="comments-panel" style={{borderTop:"1px solid #2b2b35",marginTop:14,paddingTop:12}}><div style={{display:"grid",gap:10,marginBottom:12}}>{(comments[post.id] || []).map(comment => <div key={comment.id} style={{fontSize:12,lineHeight:1.6}}><strong>{comment.profiles?.display_name || comment.profiles?.username || "Membre"} </strong><span style={{color:"#d0ced9",overflowWrap:"anywhere"}}>{comment.content}</span></div>)}{comments[post.id]?.length === 0 && <p style={{fontSize:12,color:"#92919f"}}>Aucun commentaire. Lance la conversation !</p>}</div><form onSubmit={e => void addComment(post.id,e)} style={{display:"flex",gap:8}}><input aria-label="Écrire un commentaire" value={commentDrafts[post.id] || ""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:10,borderRadius:9,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 14px"}}>Envoyer</button></form></div>}</article>; })}</div>
      }
      </section>

      <aside className="right-column"><div className="right-search"><Search size={18}/><input aria-label="Rechercher" placeholder="Rechercher sur EMi..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires et garde le lien avec ta communauté.</p><button onClick={() => setComposerOpen(true)}>Partager un moment <Plus size={16}/></button></div><div className="emi-values-card"><div className="emi-values-icon"><Heart size={18} fill="currentColor"/></div><span className="eyebrow">L’ESPRIT EMi</span><h3>La bonté laisse une trace.</h3><p>Un geste, une écoute, un peu d’aide : ce que nous partageons peut éclairer la journée de quelqu’un.</p><div className="emi-values-tags"><span>Bienveillance</span><span>Partage</span><span>Lien</span></div></div><div className="suggest-card"><div className="section-label"><strong>Ton compte</strong></div><p style={{fontSize:12,lineHeight:1.7,color:"#aaa6b7"}}>{user ? "Tu es connecté. Tes publications sont enregistrées dans Supabase." : "Connecte-toi pour publier et aimer les moments."}</p><button className="modal-primary" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? "Se déconnecter" : "Connexion / Inscription"}</button></div><div className="right-footer">À propos · Confidentialité · Aide<br/>© 2026 EMi</div></aside>

<style jsx>{`
.emi-home-reels{margin:26px 0 24px;min-width:0}.emi-home-reels-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px}.emi-home-reels-heading h2{margin:3px 0;font-size:clamp(21px,3vw,28px);font-weight:800}.emi-home-reels-heading p{margin:4px 0 0;color:#a8b9b1;font-size:13px}.emi-home-reels-heading button{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:#e7cc68;font-weight:700;white-space:nowrap}.emi-home-reels-row{display:flex;gap:12px;overflow-x:auto;overflow-y:hidden;padding:2px 2px 12px;scroll-snap-type:x mandatory;scrollbar-width:thin;-webkit-overflow-scrolling:touch}.emi-home-reel-card{position:relative;flex:0 0 clamp(128px,34vw,190px);height:245px;overflow:hidden;border:1px solid #b9a75b;border-radius:17px;background:#071b15;padding:0;scroll-snap-align:start;text-align:left;color:#fff}.emi-home-reel-card video{width:100%;height:100%;object-fit:cover;display:block}.emi-home-reel-play{position:absolute;top:12px;left:12px;display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:#071b15b8;color:#f5d96c}.emi-home-reel-caption{position:absolute;left:0;right:0;bottom:0;padding:30px 10px 11px;background:linear-gradient(transparent,#03120df0);font-size:12px;font-weight:700;line-height:1.35;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.emi-home-reels-empty{min-width:100%;display:flex;align-items:center;gap:9px;padding:18px;border:1px dashed #6d795c;border-radius:14px;color:#d7c66e}.emi-home-reels-empty span{color:#a8b9b1;font-size:12px}@media(min-width:900px){.emi-home-reel-card{flex-basis:180px;height:270px}}
`}</style>
      {selectedPostDetail && <div className="modal-backdrop" onClick={()=>{setSelectedPostDetail(null);setPostDetailView("post");}} style={{position:"fixed",inset:0,zIndex:250,background:"#050807f5",display:"flex",alignItems:"stretch",justifyContent:"center",padding:0,overflowY:"auto"}}><section role="dialog" aria-modal="true" aria-label={postDetailView==="comments"?"Commentaires de la publication":"Détail de la publication"} onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:760,minHeight:"100dvh",background:"#08130f",color:"#f7f4e8",display:"flex",flexDirection:"column",paddingBottom:"max(18px,env(safe-area-inset-bottom))"}}><header style={{position:"sticky",top:0,zIndex:2,display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#08130ff2",borderBottom:"1px solid #ffffff18"}}><button type="button" onClick={()=>postDetailView==="comments"?setPostDetailView("post"):(setSelectedPostDetail(null),setPostDetailView("post"))} aria-label="Retour" style={{border:0,background:"transparent",color:"#f7f4e8",padding:4}}><ChevronLeft size={25}/></button><div><strong>{postDetailView==="comments"?"Commentaires":"Publication"}</strong><small style={{display:"block",color:"#a8b9b1",fontSize:11}}>{selectedPostDetail.profiles?.display_name||selectedPostDetail.profiles?.username||"Membre EMi"}</small></div><button type="button" onClick={()=>{setSelectedPostDetail(null);setPostDetailView("post");}} aria-label="Fermer" style={{marginLeft:"auto",border:0,background:"transparent",color:"#f7f4e8",padding:4}}><X size={22}/></button></header>{postDetailView==="post"?<><div style={{display:"flex",alignItems:"center",gap:11,padding:"14px 16px"}}><div className="avatar avatar-sunset">{selectedPostDetail.profiles?.avatar_url?<img src={selectedPostDetail.profiles.avatar_url} alt=""/>:(selectedPostDetail.profiles?.display_name||selectedPostDetail.profiles?.username||"M").slice(0,2).toUpperCase()}</div><div><strong>{selectedPostDetail.profiles?.display_name||selectedPostDetail.profiles?.username||"Membre EMi"}</strong><small style={{display:"block",color:"#a8b9b1"}}>@{selectedPostDetail.profiles?.username||"membre"} · {new Date(selectedPostDetail.created_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</small></div></div>{(selectedPostDetail.media_urls||[]).map((url,i)=>selectedPostDetail.media_type==="video"?<video key={url+i} src={url} controls playsInline style={{width:"100%",maxHeight:"65dvh",objectFit:"contain",background:"#020403"}}/>:<img key={url+i} src={url} alt={"Photo de la publication "+(i+1)} style={{display:"block",width:"100%",maxHeight:"72dvh",objectFit:"contain",background:"#020403"}}/>)}<div style={{padding:"16px"}}>{selectedPostDetail.content&&<p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",lineHeight:1.65,margin:"0 0 16px"}}>{cleanPostContent(selectedPostDetail.content).split("[EMI_MUSIC]")[0].trim()}</p>}<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",borderTop:"1px solid #ffffff18",borderBottom:"1px solid #ffffff18",padding:"12px 0"}}><button type="button" className={liked.includes(selectedPostDetail.id)?"liked":""} onClick={()=>void toggleLike(selectedPostDetail.id)} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:liked.includes(selectedPostDetail.id)?"#ff8b9a":"#f7f4e8",padding:6}}><Heart size={20} fill={liked.includes(selectedPostDetail.id)?"currentColor":"none"}/>{likes[selectedPostDetail.id]||0} J’aime</button><button type="button" onClick={()=>{setPostDetailView("comments");void loadComments(selectedPostDetail.id);}} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:"#f7f4e8",padding:6}}><MessageCircle size={20}/>{comments[selectedPostDetail.id]?.length||0} Commentaires</button><button type="button" onClick={()=>void toggleRepost(selectedPostDetail.id)} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:"#f7f4e8",padding:6}}><Repeat2 size={19}/>Repartager</button><button type="button" onClick={()=>{if(navigator.share)void navigator.share({title:"EMi",text:selectedPostDetail.content,url:location.href}).catch(()=>{});else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi.");}} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:"#f7f4e8",padding:6}}><Share2 size={19}/>Partager</button></div><button type="button" onClick={()=>{setPostDetailView("comments");void loadComments(selectedPostDetail.id);}} style={{width:"100%",marginTop:14,padding:13,borderRadius:12,border:"1px solid #ffffff22",background:"#ffffff08",color:"#c8d8ce",textAlign:"left"}}>Voir les commentaires et participer… <ChevronRight size={16} style={{float:"right"}}/></button></div></>:<div style={{display:"flex",flex:1,flexDirection:"column",padding:16}}><div style={{display:"grid",gap:14,alignContent:"start",flex:1}}>{(comments[selectedPostDetail.id]||[]).map(comment=><article key={comment.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}><div className="avatar avatar-sunset" style={{width:36,height:36,flexShrink:0}}>{(comment.profiles?.display_name||comment.profiles?.username||"M").slice(0,2).toUpperCase()}</div><div style={{minWidth:0,flex:1,borderRadius:14,padding:"10px 12px",background:"#ffffff0a"}}><strong style={{fontSize:13}}>{comment.profiles?.display_name||comment.profiles?.username||"Membre EMi"}</strong><p style={{margin:"5px 0 0",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{comment.content}</p><small style={{color:"#8da59a"}}>{new Date(comment.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></div></article>)}{(comments[selectedPostDetail.id]||[]).length===0&&<div style={{textAlign:"center",padding:"40px 10px",color:"#a8b9b1"}}><MessageCircle size={30}/><h3 style={{color:"#f7f4e8"}}>La conversation commence ici</h3><p>Sois le premier à laisser un commentaire.</p></div>}</div><form onSubmit={e=>void addComment(selectedPostDetail.id,e)} style={{display:"flex",gap:9,position:"sticky",bottom:0,paddingTop:14,background:"#08130f"}}><input aria-label="Écrire un commentaire" value={commentDrafts[selectedPostDetail.id]||""} onChange={e=>setCommentDrafts(old=>({...old,[selectedPostDetail.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:13,borderRadius:24,border:"1px solid #49665a",background:"#101e18",color:"#f7f4e8"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 18px",borderRadius:24}}><Send size={17}/></button></form></div>}</section></div>}
      <nav className="mobile-nav" aria-label="Navigation mobile"><button className={active === "Accueil" && !viewingProfile ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Home size={20}/><span>Accueil</span></button><button className={active === "Découvrir" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Découvrir");void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}}><Compass size={20}/><span>Explorer</span></button><button className="mobile-create" aria-label="Ouvrir le studio de création" onClick={() => setCreateStudioOpen(true)}><Plus size={22}/></button><button className="" onClick={() => {window.location.href="/annonces";}}><ShoppingBag size={20}/><span>Marché</span></button><button className={active === "Reels" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Reels");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Clapperboard size={20}/><span>Reels</span></button><button className={active === "Messages" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Messages");window.scrollTo({top:0,behavior:"smooth"});if(!user)setAuthOpen(true);}}><span className="emi-mobile-message-icon"><MessageCircle size={20}/>{unreadMessages > 0 && <span className="emi-mobile-nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</span><span>Messages</span></button><button className={viewingProfile || active === "Paramètres" ? "mobile-active" : ""} onClick={() => {if(!user){setAuthOpen(true);return;} if(active === "Paramètres"){setActive("Mon profil");setSettingsSection(null);void openProfile(user.id);window.scrollTo({top:0,behavior:"smooth"});}else{void openProfile(user.id);setSettingsSection(null);} }}><UserRound size={20}/><span>Profil</span></button></nav>

      {createStudioOpen && <div className="modal-backdrop create-studio-backdrop" onClick={() => setCreateStudioOpen(false)}><section className="create-studio" role="dialog" aria-modal="true" aria-label="Studio de création EMi" onClick={e => e.stopPropagation()}><header className="create-studio-header"><div><span className="eyebrow">EMi · CRÉATION</span><h2>Que veux-tu partager ?</h2><p>Un instant, une histoire, une vidéo : à toi de jouer.</p></div><button className="modal-close" onClick={() => setCreateStudioOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="create-studio-preview"><div className="studio-glow studio-glow-one"/><div className="studio-glow studio-glow-two"/><div className="studio-preview-icon"><Sparkles size={30}/></div><strong>Ton prochain moment commence ici.</strong><span>Crée, partage, rassemble.</span></div><div className="create-studio-options"><button type="button" className="studio-option studio-option-post" onClick={() => {setCreateStudioOpen(false);setPublishDestination("post");setFile(null);setSelectedFiles([]);setCaption("");setMessage("");setComposerOpen(true);}}><span className="studio-option-icon"><ImageIcon size={25}/></span><span><strong>Publication</strong><small>Photo, vidéo ou plusieurs photos avec une légende</small></span><span className="studio-option-arrow">›</span></button><button type="button" className="studio-option studio-option-story" onClick={() => {if(!user){setCreateStudioOpen(false);setAuthOpen(true);setMessage("Connecte-toi pour partager une story.");return;}setCreateStudioOpen(false);setStoryStep("choose");setStoryMode("photo");setStoryFiles([]);setStoryFile(null);setStoryCaption("");setMessage("");setStoryComposerOpen(true);}}><span className="studio-option-icon"><Camera size={25}/></span><span><strong>Story</strong><small>Photo + description ou vidéo, visible pendant 24 h</small></span><span className="studio-option-arrow">›</span></button><button type="button" className="studio-option studio-option-reel" onClick={() => {setCreateStudioOpen(false);pickerDestination.current="post";setPublishDestination("post");setFile(null);setSelectedFiles([]);setCaption("");setMessage("");setComposerOpen(true);window.setTimeout(()=>{if(videoFileInput.current){videoFileInput.current.value="";videoFileInput.current.click();}},250);}}><span className="studio-option-icon"><Clapperboard size={25}/></span><span><strong>Vidéo · Accueil + Reels</strong><small>Une seule publication, visible dans les deux espaces</small></span><span className="studio-option-arrow">›</span></button><button type="button" className="studio-option studio-option-text" onClick={() => {setCreateStudioOpen(false);setPublishDestination("post");setFile(null);setSelectedFiles([]);setCaption("");setMessage("");setComposerOpen(true);window.setTimeout(()=>document.getElementById("emi-post-caption")?.focus(),180);}}><span className="studio-option-icon"><span className="studio-text-icon">T</span></span><span><strong>Texte</strong><small>Une pensée, une annonce, une idée</small></span><span className="studio-option-arrow">›</span></button>{user && <button type="button" className="studio-option studio-option-content" onClick={() => {setCreateStudioOpen(false);void openMyContentManager();}}><span className="studio-option-icon"><Archive size={25}/></span><span><strong>Mes contenus</strong><small>Gère tes publications, stories, reels et messages</small></span><span className="studio-option-arrow">›</span></button>}</div><footer className="create-studio-footer"><span><Sparkles size={14}/> Créé avec EMi</span><span>Partage à ta façon</span></footer></section></div>}
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
      {cameraOpen && <div className="camera-studio-backdrop" role="dialog" aria-modal="true" aria-label="Caméra EMi"><section className="camera-studio"><video ref={cameraVideoRef} className={"camera-live-preview" + (cameraFacing === "user" ? " camera-selfie" : "")} autoPlay muted playsInline/><div className="camera-preview-shade"/><header className="camera-studio-top"><button onClick={() => { stopCamera(); setCameraOpen(false); }} aria-label="Fermer la caméra"><X size={25}/></button><span>EMi <small>STUDIO</small></span><button onClick={() => void startCamera(cameraFacing === "user" ? "environment" : "user")} aria-label="Changer de caméra"><span className="camera-flip-symbol">↻</span></button></header>{cameraError && <div className={"camera-status" + (cameraRecording ? " recording" : "")} role="status">{cameraError}</div>}{!cameraError && <div className="camera-tip">{cameraMode==="video" ? "Appuie une fois pour commencer · appuie encore pour terminer" : "Place-toi dans le cadre et crée ton moment ✨"}</div>}<div className="camera-tools"><button onClick={() => { const input=document.getElementById("emi-camera-gallery") as HTMLInputElement|null; if(input){stopCamera();input.removeAttribute("capture");input.accept=cameraMode==="video"?"video/mp4,.mp4,.mov,.3gp,.mkv,.webm,application/octet-stream":"image/*,video/*";input.multiple=cameraMode!=="video";input.click();} }}><ImageIcon size={22}/><small>{cameraMode==="video"?"Choisir une vidéo":"Galerie · photos"}</small></button><button className={"camera-shutter" + (cameraRecording ? " is-recording" : "")} onClick={() => cameraMode === "photo" ? captureCameraPhoto() : toggleVideoRecording()} aria-label={cameraMode === "photo" ? "Prendre une photo" : cameraRecording ? "Arrêter la vidéo" : "Démarrer la vidéo"}><span/></button><button onClick={() => { stopCamera(); setCameraOpen(false); setCreateStudioOpen(true); }}><Sparkles size={22}/><small>Modes</small></button></div><div className="camera-mode-switch"><button className={cameraMode === "photo" ? "selected" : ""} onClick={() => setCameraMode("photo")}>PHOTO</button><button className={cameraMode === "video" ? "selected" : ""} onClick={() => setCameraMode("video")}>VIDÉO</button><button onClick={() => { stopCamera(); setCameraOpen(false); openCamera("text"); }}>TEXTE</button></div><input id="emi-camera-gallery" type="file" multiple accept="image/*,video/*" onChange={e => { const picked=Array.from(e.currentTarget.files||[]); const videos=picked.filter(f=>f.type.startsWith("video/")); const images=picked.filter(f=>f.type.startsWith("image/")); if(videos.length){const video=videos[0];if(video.size>50*1024*1024){setMessage("La vidéo doit faire moins de 50 Mo.");}else{setFile(video);setSelectedFiles([video]);setCaption("");setPublishDestination("reel");setMessage("Vidéo sélectionnée. Choisis « Reel vidéo » pour l’espace Reels ou « Publication » pour l’accueil, puis publie.");stopCamera();setCameraOpen(false);setComposerOpen(true);}}else if(images.length>10){setSelectedFiles(images.slice(0,10));setFile(images[0]||null);setPublishDestination("post");setMessage("Tu peux choisir jusqu’à 10 photos. Les 10 premières ont été retenues.");}else if(images.length){setSelectedFiles(images);setFile(images[0]);setPublishDestination("post");setMessage(images.length>1?images.length+" photos sélectionnées. Appuie sur Continuer pour préparer une publication unique.":"Photo sélectionnée. Tu peux ajouter d’autres photos.");stopCamera();setCameraOpen(false);setComposerOpen(true);} e.currentTarget.value=""; }} hidden/></section></div>}
      {connectionsOpen && <div className="modal-backdrop" onClick={() => setConnectionsOpen(false)}><section className="connections-modal" role="dialog" aria-modal="true" aria-label={connectionTitle} onClick={e => e.stopPropagation()}><header><h2>{connectionTitle}</h2><button className="modal-close" onClick={() => setConnectionsOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="connections-list">{connectionProfiles.map(person => <button className="connections-person" key={person.id} onClick={() => { setConnectionsOpen(false); void openProfile(person.id); }}><span className="connections-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : (person.display_name || person.username || "EM").slice(0,2).toUpperCase()}</span><span><strong>{person.display_name || person.username || "Membre EMi"}</strong><small>@{person.username || "membre"}</small></span><span className="connections-chevron">›</span></button>)}</div>{connectionProfiles.length===0 && <p className="connections-empty">Aucun membre à afficher.</p>}</section></div>}
      {storyComposerOpen && <div className="modal-backdrop emi-story-backdrop" onClick={() => {setStoryComposerOpen(false);setStoryStep("choose");setStoryFile(null);setStoryFiles([]);}}><section className="modal-card story-composer-card emi-story-studio" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Studio de création de story"><button className="modal-close" onClick={() => {setStoryComposerOpen(false);setStoryStep("choose");}} aria-label="Fermer"><X size={21}/></button><div className="emi-story-brand"><span className="emi-story-brand-icon"><Camera size={24}/></span><div><span className="eyebrow">EMi · STUDIO STORIES</span><h2>{storyStep==="choose"?"Nouvelle story":"Crée ton moment"}</h2><p>{storyStep==="choose"?"Choisis le format qui te ressemble.":"Personnalise ton contenu avant de le partager."}</p></div></div>{storyStep==="choose"?<><div className="emi-story-format-list"><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("text");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon">Aa</span><span><strong>Story texte</strong><small>Exprime une pensée avec un fond élégant</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("photo");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><ImageIcon size={22}/></span><span><strong>Photo</strong><small>Ajoute une photo et une légende</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("album");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><Clapperboard size={22}/></span><span><strong>Story album</strong><small>Publie plusieurs photos dans l’ordre</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("video");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><Video size={22}/></span><span><strong>Story vidéo</strong><small>Une vidéo immersive comme un Reel</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("text");setStoryTextTheme("gold");setStoryCaption("✨ ");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><Sparkles size={22}/></span><span><strong>Texte & effets</strong><small>Créer un message sur fond or royal</small></span><ChevronRight size={20}/></button></div><div className="emi-story-footer-note"><ShieldCheck size={17}/> Tes stories disparaissent après 24 heures.</div></>:<><button type="button" className="emi-story-back" onClick={()=>setStoryStep("choose")}>‹&nbsp; Tous les formats</button><form className="story-studio-form emi-story-editor" onSubmit={publishStory}><input ref={storyFileInput} type="file" multiple={storyMode==="album"} accept={storyMode==="video"?"video/mp4,video/webm,video/quicktime":storyMode==="album"?"image/jpeg,image/png,image/webp,image/gif":"image/jpeg,image/png,image/webp,image/gif"} onChange={e=>{const fs=Array.from(e.target.files||[]);setStoryFiles(fs);setStoryFile(fs[0]||null);}} style={{display:"none"}}/>{storyMode==="text"?<div className={"emi-story-text-preview theme-"+storyTextTheme}><span>EMi · MOMENT</span><textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} placeholder="Écris ton message ici…" aria-label="Texte de la story"/><div className="emi-story-theme-picker"><button type="button" className={storyTextTheme==="emerald"?"selected":""} onClick={()=>setStoryTextTheme("emerald")}>Émeraude</button><button type="button" className={storyTextTheme==="gold"?"selected":""} onClick={()=>setStoryTextTheme("gold")}>Or</button><button type="button" className={storyTextTheme==="night"?"selected":""} onClick={()=>setStoryTextTheme("night")}>Nuit</button></div></div>:<><button type="button" className="story-studio-picker" onClick={()=>storyFileInput.current?.click()}><span className="emi-story-picker-icon">{storyMode==="video"?<Video size={23}/>:storyMode==="album"?<Clapperboard size={23}/>:<ImageIcon size={23}/>}</span><span><strong>{storyFiles.length>1?storyFiles.length+" photos sélectionnées":storyFile?storyFile.name:storyMode==="video"?"Choisir une vidéo":storyMode==="album"?"Choisir plusieurs photos":"Choisir une photo"}</strong><small>{storyMode==="album"?"Tu peux sélectionner plusieurs photos":storyMode==="video"?"La vidéo sera affichée en plein écran":"Depuis la galerie de ton téléphone"}</small></span><ChevronRight size={20}/></button>{storyFiles.length>0&&<div className="emi-story-selected-list">{storyFiles.map((f,index)=><div key={f.name+index}><span>{f.type.startsWith("video/")?"▶":"▧"} {f.name}</span><button type="button" aria-label={"Retirer "+f.name} onClick={()=>{const next=storyFiles.filter((_,n)=>n!==index);setStoryFiles(next);setStoryFile(next[0]||null);}}>×</button></div>)}</div>}{storyFile&&<div className="emi-story-preview"><span className="emi-story-preview-label">APERÇU</span>{storyFile.type.startsWith("video/")?<video src={URL.createObjectURL(storyFile)} controls playsInline/>:<img src={URL.createObjectURL(storyFile)} alt="Aperçu de la story"/>}</div>}<textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} rows={2} placeholder="Ajouter un texte (facultatif)…" className="story-studio-caption"/></>}<div className="emi-story-footer-note"><Music2 size={16}/> Les photos sont publiées seules, avec leur description. Aucun morceau n’est ajouté.</div><div className="emi-story-footer-note"><ShieldCheck size={17}/> Aperçu avant publication · visible pendant 24 heures.</div>{message&&<p className="emi-story-inline-message" role="status">{message}</p>}<button className="modal-primary story-studio-publish" disabled={busy||(!storyCaption.trim()&&!storyFile)} type="submit">{busy?"Publication en cours…":"Publier ma story"} <ChevronRight size={19}/></button></form></>}</section></div>}
      {activeStory && <div className="story-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Visionneuse de story" onClick={() => {setActiveStory(null);setStoryViewersOpen(false);}}><div className={"story-viewer" + (activeStory.media_type === "video" ? " story-viewer-video" : "")} onClick={e=>e.stopPropagation()} onTouchStart={e=>{if(e.touches.length){(e.currentTarget as HTMLDivElement).dataset.touchStartX=String(e.touches[0].clientX);(e.currentTarget as HTMLDivElement).dataset.touchStartY=String(e.touches[0].clientY);}}} onTouchEnd={e=>{const el=e.currentTarget as HTMLDivElement;const x=Number(el.dataset.touchStartX||0),y=Number(el.dataset.touchStartY||0);const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)){const i=stories.findIndex(st=>st.id===activeStory.id);if(dx<0)setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);else if(i>0)setActiveStory(stories[i-1]);}}}><div className="story-progress"><span key={activeStory.id} style={{animationDuration:activeStory.media_type==="video"?"15s":"6s"}}/></div><header><div className="story-viewer-author">{activeStory.profiles?.avatar_url?<img src={activeStory.profiles.avatar_url} alt=""/>:<span>{(activeStory.profiles?.display_name||activeStory.profiles?.username||"M").slice(0,1).toUpperCase()}</span>}<strong>{activeStory.profiles?.display_name||activeStory.profiles?.username||"Membre EMi"}{hasBlueVerificationBadge(activeStory.profiles?.display_name||activeStory.profiles?.username)&&<span className="emi-verified-badge" role="img" aria-label="Profil vérifié par EMi" title="Profil vérifié par EMi"><BadgeCheck size={15} fill="#1877F2" stroke="#FFFFFF" strokeWidth={2.2}/></span>}</strong><small>{new Date(activeStory.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</small></div>{user?.id===activeStory.user_id&&<button type="button" className="story-viewer-views" title="Voir les personnes qui ont regardé" onClick={()=>setStoryViewersOpen(v=>!v)}><Eye size={14}/>{storyViewCounts[activeStory.id]||0} vues</button>}<button type="button" onClick={()=>{setActiveStory(null);setStoryViewersOpen(false);}} aria-label="Fermer la story"><X size={22}/></button></header>{storyViewersOpen&&<section role="dialog" aria-label="Personnes ayant vu le statut" className="story-viewers-panel"><div className="story-viewers-title"><strong>Vues du statut · {storyViewCounts[activeStory.id]||0}</strong><button type="button" aria-label="Fermer la liste des vues" onClick={()=>setStoryViewersOpen(false)}><X size={18}/></button></div>{(storyViewers[activeStory.id]||[]).length?(storyViewers[activeStory.id]||[]).map(viewer=><div className="story-viewer-person" key={viewer.id}>{viewer.avatar_url?<img src={viewer.avatar_url} alt=""/>:<span>{(viewer.display_name||viewer.username||"?").slice(0,1).toUpperCase()}</span>}<span>{viewer.display_name||viewer.username||"Membre EMi"}</span></div>):<p>Les vues identifiées s’afficheront ici.</p>}</section>}{activeStory.media_type==="video"?<video ref={storyVideoRef} className="story-viewer-media" src={activeStory.media_url} autoPlay playsInline preload="auto" onEnded={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);}}/>:<img className="story-viewer-media" src={activeStory.media_url} alt="Story"/>}<div className="story-touch-zones" aria-label="Toucher à gauche ou à droite pour naviguer"><button type="button" aria-label="Story précédente" onClick={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);if(i>0)setActiveStory(stories[i-1]);}}/><button type="button" aria-label="Story suivante" onClick={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);}}/></div>{activeStory.caption&&<p className="story-viewer-caption">{activeStory.caption}</p>}<section className="story-interactions" aria-label="Réagir à la story"><div className="story-reaction-row">{["❤️","👍","😂","😮","🔥"].map(reaction=><button type="button" key={reaction} aria-label={"Réagir "+reaction} className={storyReaction===reaction?"selected":""} onClick={async()=>{if(!user||!supabase){setAuthOpen(true);setMessage("Connecte-toi pour réagir à une story.");return;}if(storyReaction===reaction)return;const previousReaction=storyReaction;setStoryReaction(reaction);const {data:existing,error:existingError}=await supabase.from("story_reactions").select("reaction").eq("story_id",activeStory.id).eq("user_id",user.id).maybeSingle();if(existingError){setStoryReaction(previousReaction);setMessage("Impossible de vérifier ta réaction. Réessaie.");return;}const {error}=await supabase.from("story_reactions").upsert({story_id:activeStory.id,user_id:user.id,reaction},{onConflict:"story_id,user_id"});if(error){setStoryReaction(previousReaction);setMessage("Réaction non enregistrée : "+error.message);return;}if(activeStory.user_id!==user.id&&existing?.reaction!==reaction){const {error:notificationError}=await supabase.from("notifications").insert({recipient_id:activeStory.user_id,actor_id:user.id,type:"story_reaction",story_id:activeStory.id,message:"a réagi "+reaction+" à ta story."});if(notificationError){console.error("Notification de réaction story non envoyée",notificationError.message);setMessage("Réaction enregistrée, mais notification non envoyée. Réessaie plus tard.");return;}}setMessage("Réaction "+reaction+" envoyée !");}}>{reaction}</button>)}</div><form className="story-reply-form" onSubmit={async e=>{e.preventDefault();if(!user||!supabase){setAuthOpen(true);setMessage("Connecte-toi pour répondre à une story.");return;}const content=storyReply.trim();if(!content)return;const {error}=await supabase.from("story_replies").insert({story_id:activeStory.id,sender_id:user.id,content});if(error){setMessage("Réponse non envoyée. Réessaie.");return;}setStoryReply("");setMessage("Réponse envoyée.");}}><input value={storyReply} onChange={e=>setStoryReply(e.target.value)} maxLength={1000} placeholder="Envoyer un message…" aria-label="Répondre à la story"/><button type="submit" aria-label="Envoyer la réponse">➤</button></form></section><footer className="story-viewer-footer"><button type="button" onClick={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);if(i>0)setActiveStory(stories[i-1]);else setActiveStory(null);}}>‹ Précédente</button><span>Stories EMi · 24 h</span><button type="button" onClick={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);}}>Suivante ›</button></footer></div></div>}
      {!user && !authOpen && !welcomeDismissed && <section className="emi-welcome-screen" aria-label="Bienvenue sur EMi">
        <img className="emi-welcome-cover" src="https://raw.githubusercontent.com/tchoyieric-hash/Emi/main/emi-cover-3.jpg" alt="Photo de couverture EMi" fetchPriority="high" />
        <div className="emi-welcome-photo-shade" aria-hidden="true"/>
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
      {(composerOpen || authOpen || profileEditorOpen) && <div className="modal-backdrop" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}} aria-label="Fermer"><X size={20}/></button>{message && <div role="alert" style={{margin:"12px 0",padding:12,borderRadius:10,border:"1px solid #8d6de0",background:"#282235",color:"#f7f3ff",fontSize:13,lineHeight:1.6,overflowWrap:"anywhere"}}>{message}</div>}{composerOpen ? <div className="emi-creator"><header className="emi-creator-header"><button type="button" aria-label="Retour" onClick={()=>{setComposerOpen(false);setCreateStudioOpen(true);}}><ChevronLeft size={25}/></button><strong>Nouvelle publication</strong><button type="button" aria-label="Fermer" onClick={()=>setComposerOpen(false)}><X size={22}/></button></header><form onSubmit={publish} className="emi-creator-form"><section className="emi-simple-publish-intro" aria-label="Guide de publication"><span className="emi-simple-step">ÉTAPE 1 SUR 3</span><h2>Que veux-tu partager ?</h2><p>Choisis une option ci-dessous. C’est tout simple.</p><div className="emi-simple-publish-choices"><button type="button" onClick={()=>{pickerDestination.current="post";setPublishDestination("post");if(fileInput.current){fileInput.current.value="";fileInput.current.accept="image/*";fileInput.current.multiple=true;fileInput.current.click();}}}><span className="emi-simple-choice-icon"><ImageIcon size={25}/></span><strong>Une photo</strong><small>Choisir dans mon téléphone</small></button><button type="button" onClick={()=>{pickerDestination.current="post";setPublishDestination("post");if(videoFileInput.current){videoFileInput.current.value="";videoFileInput.current.click();}}}><span className="emi-simple-choice-icon"><Video size={25}/></span><strong>Une vidéo</strong><small>Accueil + Reels automatiquement</small></button><button type="button" onClick={()=>{setPublishDestination("post");setTimeout(()=>document.getElementById("emi-post-caption")?.focus(),80);}}><span className="emi-simple-choice-icon"><MessageCircle size={25}/></span><strong>Un texte</strong><small>Écrire un message</small></button></div><div className="emi-simple-tip"><span>💡</span><span>Tu peux aussi ajouter une description ou une musique. Ce n’est pas obligatoire.</span></div></section>{offlineDrafts.length>0&&<section style={{marginBottom:14,padding:12,borderRadius:12,border:"1px solid #65528d",background:"#17131f"}}><button type="button" onClick={()=>setOfflineDraftsOpen(v=>!v)} style={{width:"100%",background:"transparent",border:0,color:"#e8d8ff",fontWeight:700,textAlign:"left",padding:4}}>📥 Brouillons hors connexion ({offlineDrafts.length}) {offlineDraftsOpen?"−":"+"}</button>{offlineDraftsOpen&&offlineDrafts.map(draft=><div key={draft.id} style={{padding:"10px 0",borderTop:"1px solid #393643"}}><button type="button" style={{display:"block",width:"100%",background:"transparent",border:0,color:"#f7f4ff",textAlign:"left"}} onClick={()=>{setCaption(draft.caption);setPublishDestination(draft.destination);setSelectedFiles(draft.mediaFiles.filter(f=>f.type.startsWith("image/")));setFile(draft.mediaFiles.find(f=>f.type.startsWith("video/"))||draft.mediaFiles[0]||null);setMusicFile(draft.musicFile);setMusicTitle(draft.musicTitle);setSelectedMusic(draft.selectedMusic);setMusicStart(draft.musicStart);setMusicEnd(draft.musicEnd);setMessage("Brouillon restauré. Vérifie les médias puis partage lorsque tu es connecté.");setOfflineDraftsOpen(false);}}><strong>{draft.caption||draft.mediaFiles.map(f=>f.name).join(", ")||"Publication sans texte"}</strong><small style={{display:"block",color:"#aaa6b7"}}>{new Date(draft.createdAt).toLocaleString("fr-FR")} · {draft.mediaFiles.length} média(s){draft.musicFile?" · musique":""}</small></button><button type="button" onClick={()=>void deleteOfflinePostDraft(draft.id).then(()=>setOfflineDrafts(rows=>rows.filter(row=>row.id!==draft.id)))} style={{marginTop:6,background:"transparent",border:0,color:"#f0b4bf"}}>Supprimer le brouillon</button></div>)}</section>}<div role="status" style={{margin:"0 0 14px",padding:"12px 14px",borderRadius:14,border:"1px solid #b99a43",background:"#0c241a",color:"#dce8df",fontSize:13,lineHeight:1.5}}><strong style={{display:"block",color:"#f0d88c",marginBottom:3}}>Une vidéo, deux espaces</strong>Chaque vidéo publiée apparaît dans le fil Accueil et dans Reels. Depuis l’Accueil, touche la vidéo pour l’ouvrir en plein écran.</div><input ref={videoFileInput} type="file" accept="video/*" multiple={false} onChange={e=>{const input=e.currentTarget;const picked=input.files?.[0]||null;const destination=pickerDestination.current;input.value="";if(!picked){setMessage("Aucune vidéo sélectionnée. Réessaie en choisissant une vidéo enregistrée sur ton téléphone.");return;}const videoType=picked.type.startsWith("video/")||/\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(picked.name);if(!videoType){setMessage("Ce fichier n’est pas reconnu comme une vidéo. Choisis un MP4 ou une vidéo de ta galerie.");return;}setSelectedFiles([]);setFile(picked);setPublishDestination(destination);setMessage("Vidéo sélectionnée : "+picked.name+". Ajoute une description puis appuie sur Publier.");}} style={{display:"none"}}/><input ref={fileInput} type="file" multiple={publishDestination!=="reel"} accept="image/*,video/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v,.3gp,.mkv" onChange={e=>{const input=e.currentTarget;const files=Array.from(input.files||[]);const destination=pickerDestination.current;const isVideo=(f:File)=>f.type.startsWith("video/")||/\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(f.name);setPublishDestination(destination);if(destination==="reel"&&!files.some(isVideo)){setMessage("Aucune vidéo détectée. Choisis un fichier MP4, MOV ou WebM dans la galerie du téléphone.");setSelectedFiles([]);setFile(null);}else if(files.length>10){setMessage("Tu peux sélectionner jusqu’à 10 photos à la fois.");setSelectedFiles(files.filter(f=>f.type.startsWith("image/")).slice(0,10));setFile(files.find(f=>f.type.startsWith("image/"))||null);}else if(files.some(isVideo)&&files.length>1){setMessage("Pour une publication multiple, sélectionne uniquement des photos. Une vidéo peut être publiée seule.");setSelectedFiles([]);setFile(files.find(isVideo)||null);}else{const photos=files.filter(f=>f.type.startsWith("image/"));const video=files.find(isVideo);setSelectedFiles(photos);setFile(video||photos[0]||null);setMessage(video?"Vidéo sélectionnée. Tu peux ajouter une légende puis publier ton "+(destination==="reel"?"Reel":"publication")+".":photos.length>1?photos.length+" photos sélectionnées. Elles seront publiées ensemble.":"");}input.value="";}} style={{display:"none"}}/><div className={"emi-creator-preview filter-"+creatorFilter} style={{aspectRatio:creatorRatio==="1:1"?"1 / 1":creatorRatio==="16:9"?"16 / 9":"4 / 5",height:"auto",minHeight:creatorRatio==="16:9"?220:320,maxHeight:520,filter:`brightness(${creatorBrightness}%) contrast(${creatorContrast}%)`}}>{(selectedFiles.length?selectedFiles:file?[file]:[]).length ? <div style={{width:"100%",height:"100%",overflowY:"auto",scrollSnapType:"y mandatory"}}>{(selectedFiles.length?selectedFiles:file?[file]:[]).map((media,index)=><div key={media.name+index} style={{height:"100%",minHeight:260,scrollSnapAlign:"start",position:"relative",display:"grid",placeItems:"center"}}>{media.type.startsWith("video/")?<video src={URL.createObjectURL(media)} controls playsInline style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>:<img src={URL.createObjectURL(media)} alt={"Aperçu "+(index+1)} style={{width:"100%",height:"100%",objectFit:"contain"}}/>}<span style={{position:"absolute",right:10,top:10,background:"#092b20dd",color:"#fff",padding:"5px 9px",borderRadius:99,fontSize:11}}>{index+1}/{(selectedFiles.length?selectedFiles:file?[file]:[]).length}</span>{creatorTextOnPhoto&&creatorOverlayText.trim()&&<span style={{position:"absolute",left:14,right:14,bottom:24,textAlign:"center",fontWeight:800,fontSize:26,color:"#fff",textShadow:"0 2px 8px #000",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{creatorOverlayText}</span>}{(selectedFiles.length?selectedFiles:[]).length>1&&<div style={{position:"absolute",left:8,top:8,display:"flex",gap:5}}><button type="button" disabled={index===0} onClick={()=>setSelectedFiles(old=>{const next=[...old];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})} style={{padding:6,borderRadius:8}}>←</button><button type="button" disabled={index===(selectedFiles.length-1)} onClick={()=>setSelectedFiles(old=>{const next=[...old];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})} style={{padding:6,borderRadius:8}}>→</button><button type="button" onClick={()=>setSelectedFiles(old=>old.filter((_,i)=>i!==index))} style={{padding:6,borderRadius:8}}>Retirer</button></div>}</div>)}</div> : <button type="button" onClick={()=>{if(fileInput.current){pickerDestination.current="post";fileInput.current.accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.mkv";fileInput.current.multiple=true;fileInput.current.click();}}}><ImageIcon size={34}/><span>Choisir plusieurs photos ou une vidéo</span></button>}{(selectedFiles.length>0||file) && <button className="emi-creator-change" type="button" onClick={()=>fileInput.current?.click()}>Ajouter / remplacer des photos</button>}</div><section className="emi-caption-editor" aria-label="Description de la publication"><label htmlFor="emi-post-caption">Description</label><textarea id="emi-post-caption" value={caption} onChange={e=>setCaption(e.target.value)} maxLength={5000} rows={3} placeholder="Écris une légende… Ajoute des hashtags si tu veux." style={{width:"100%",minHeight:92,maxHeight:180,resize:"vertical",boxSizing:"border-box",padding:"14px 15px",borderRadius:14,border:"1px solid #49665a",background:"#0b1713",color:"#f7f4e8",fontSize:16,lineHeight:1.5,outline:"none"}}/><div style={{display:"flex",justifyContent:"space-between",gap:8,color:"#a8b9b1",fontSize:12,marginTop:5}}><span>Raconte ce moment à ta communauté.</span><span>{caption.length}/5000</span></div></section><div className="emi-creator-tools"><button type="button" onClick={()=>{if(!((selectedFiles[0]||file)?.type.startsWith("image/"))){setMessage("Sélectionne d’abord une photo pour lui ajouter une musique.");fileInput.current?.click();return;}musicInput.current?.click();}}><Music2 size={22}/><span>Audio du téléphone</span></button><button type="button" onClick={()=>{setCreatorTextOnPhoto(v=>!v);setTimeout(()=>document.getElementById("emi-creator-overlay-text")?.focus(),0);}}><span className="emi-tool-aa">Aa</span><span>Texte</span></button><button type="button" onClick={()=>{if(fileInput.current){fileInput.current.accept=publishDestination==="reel"?"video/*":"image/*,video/*";fileInput.current.multiple=publishDestination!=="reel";fileInput.current.click();}}}><ImageIcon size={22}/><span>{publishDestination==="reel"?"Choisir une vidéo":"Photos multiples"}</span></button><button type="button" onClick={()=>setCreatorFilter(old=>old==="original"?"vivid":old==="vivid"?"warm":old==="warm"?"mono":old==="mono"?"fade":"original")}><Disc3 size={22}/><span>Filtre · {creatorFilter==="original"?"Original":creatorFilter==="vivid"?"Éclatant":creatorFilter==="warm"?"Chaud":creatorFilter==="mono"?"N&B":"Doux"}</span></button><button type="button" onClick={()=>setCreatorEditOpen(v=>!v)}><SlidersHorizontal size={22}/><span>Modifier</span></button><button type="button" onClick={()=>setCreatorRatio(v=>v==="4:5"?"1:1":v==="1:1"?"16:9":"4:5")}><Smartphone size={22}/><span>Ratio · {creatorRatio}</span></button></div>{creatorEditOpen && <div className="emi-audio-trim"><strong>Retouche photo</strong><label>Luminosité · {creatorBrightness}%<input type="range" min="60" max="150" value={creatorBrightness} onChange={e=>setCreatorBrightness(Number(e.target.value))}/></label><label>Contraste · {creatorContrast}%<input type="range" min="60" max="150" value={creatorContrast} onChange={e=>setCreatorContrast(Number(e.target.value))}/></label></div>}<div className="emi-creator-caption">{creatorTextOnPhoto&&<label style={{display:"block",marginBottom:10}}>Texte sur la photo<input id="emi-creator-overlay-text" value={creatorOverlayText} onChange={e=>setCreatorOverlayText(e.target.value)} maxLength={180} placeholder="Écris le texte à afficher sur la photo…" style={{display:"block",width:"100%",marginTop:6,padding:12,borderRadius:10,background:"#15141c",color:"white",border:"1px solid #65528d"}}/></label>}<textarea id="emi-creator-caption" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Écris une légende…" maxLength={5000} rows={2}/><div className="emi-creator-file">{(selectedFiles.length>0||file) ? <><ImageIcon size={18}/><span>{selectedFiles.length>1?selectedFiles.length+" photos sélectionnées":(selectedFiles[0]||file)?.name}</span><button type="button" onClick={()=>{setFile(null);setSelectedFiles([]);}}>Retirer</button></> : <button type="button" onClick={()=>fileInput.current?.click()}><Plus size={18}/> Sélectionner plusieurs photos</button>}</div>{((selectedFiles[0]||file)?.type.startsWith("image/")) && <div className="emi-compose-music"><div className="emi-compose-music-head"><span className="emi-compose-music-icon"><Music2 size={18}/></span><span><strong>Musique de la publication</strong><small>Ajoute un son que tu as le droit d’utiliser.</small></span></div><p style={{fontSize:12,color:"#aaa6b7",margin:"0 0 10px"}}>Le catalogue EMi Music est désactivé. Tu peux ajouter un fichier audio de ton téléphone.</p><input ref={musicInput} type="file" accept="audio/*" onChange={e=>{const picked=e.currentTarget.files?.[0]||null;if(picked&&!picked.type.startsWith("audio/")){setMessage("Choisis un fichier audio valide.");setMusicFile(null);}else if(picked&&picked.size>15*1024*1024){setMessage("Le fichier audio doit faire moins de 15 Mo.");setMusicFile(null);}else{setMusicFile(picked);if(picked)setMusicTitle(picked.name.replace(/\.[^.]+$/,""));setSelectedMusic(null);setMessage(picked?"Musique sélectionnée. Elle sera jointe à la publication.":"");}e.currentTarget.value="";}} style={{display:"none"}}/><button type="button" className="emi-compose-music-pick" onClick={()=>musicInput.current?.click()}><Music2 size={16}/><span>{musicFile ? "Musique choisie : "+musicFile.name : "Choisir une musique depuis mon téléphone"}</span><ChevronRight size={16}/></button>{musicFile&&<div className="emi-catalog-selected"><div><Music2 size={20}/></div><section><strong>{musicTitle||musicFile.name}</strong><small>Audio personnel · sera envoyé avec la publication</small></section><button type="button" onClick={()=>{setMusicFile(null);setMusicTitle("");setMusicStart(0);setMusicEnd(30);setMusicDuration(0);}}>Retirer</button><audio controls preload="metadata" src={localMusicPreviewUrl} style={{width:"100%",gridColumn:"1 / -1"}} onLoadedMetadata={e=>{const d=Math.floor(e.currentTarget.duration);if(Number.isFinite(d)&&d>0){setMusicDuration(d);setMusicEnd(Math.min(30,d));}}} onPlay={()=>setPreviewMusic(true)} onPause={()=>setPreviewMusic(false)}/><label style={{gridColumn:"1 / -1",display:"block"}}>Début de l’extrait : {Math.floor(musicStart/60)}:{String(musicStart%60).padStart(2,"0")}<input type="range" min="0" max={Math.max(0,musicDuration-1)} value={Math.min(musicStart,Math.max(0,musicDuration-1))} onChange={e=>{const v=Number(e.target.value);setMusicStart(v);if(musicEnd<=v)setMusicEnd(Math.min(musicDuration||30,v+10));}} style={{width:"100%"}}/></label><label style={{gridColumn:"1 / -1",display:"block"}}>Fin de l’extrait : {Math.floor(musicEnd/60)}:{String(musicEnd%60).padStart(2,"0")}<input type="range" min={Math.min(musicDuration||30,musicStart+1)} max={Math.max(1,musicDuration||30)} value={Math.max(musicStart+1,Math.min(musicEnd,musicDuration||30))} onChange={e=>setMusicEnd(Number(e.target.value))} style={{width:"100%"}}/></label><small style={{gridColumn:"1 / -1"}}>Choisis le passage à associer à ta photo (maximum conseillé : 30 secondes).</small></div>}{selectedMusic && <div className="emi-catalog-selected"><div>{selectedMusic.cover_url ? <img src={selectedMusic.cover_url} alt="" /> : <span><Music2 size={20}/></span>}</div><section><strong>{selectedMusic.title}</strong><small>{selectedMusic.artist}{selectedMusic.genre ? " · " + selectedMusic.genre : ""}</small></section><button type="button" onClick={()=>setSelectedMusic(null)}>Retirer</button></div>}{false && <div className="emi-catalog-panel"></div>}{selectedMusic && <div className="emi-audio-trim"><audio controls preload="none" src={selectedMusic.audio_url} style={{width:"100%"}} onPlay={()=>setPreviewMusic(true)} onPause={()=>setPreviewMusic(false)} /><div><strong>Extrait musical</strong><small>{Math.floor(musicStart/60)}:{String(musicStart%60).padStart(2,"0")} – {Math.floor(musicEnd/60)}:{String(musicEnd%60).padStart(2,"0")}</small></div><label>Début<input type="range" min="0" max={Math.max(1,(selectedMusic.duration_seconds||musicDuration||30)-1)} value={Math.min(musicStart,Math.max(0,(selectedMusic.duration_seconds||musicDuration||30)-1))} onChange={e=>{const v=Number(e.target.value);setMusicStart(v);if(musicEnd<=v)setMusicEnd(Math.min(selectedMusic.duration_seconds||musicDuration||30,v+10));}}/></label><label>Fin<input type="range" min={Math.min(selectedMusic.duration_seconds||musicDuration||30,musicStart+1)} max={Math.max(1,selectedMusic.duration_seconds||musicDuration||30)} value={Math.max(musicStart+1,Math.min(musicEnd,selectedMusic.duration_seconds||musicDuration||30))} onChange={e=>setMusicEnd(Number(e.target.value))}/></label><small>Le morceau sera lié à la publication, sans lecteur posé sur la photo.</small></div>}</div>}<p className="emi-creator-note">Ta publication sera publique. Publier nécessite un compte connecté.</p><div className="emi-publish-status" aria-live="polite" style={{display:busy?"flex":"none",alignItems:"center",gap:12,padding:"13px 15px",margin:"10px 0",borderRadius:14,border:"1px solid #6c4be8",background:"linear-gradient(135deg,#171321,#10151d)",color:"#f7f4ff"}}><span className="emi-publish-spinner" style={{width:20,height:20,border:"2px solid #51456e",borderTopColor:"#9b7cff",borderRadius:"50%",display:"inline-block",animation:"emiPublishSpin .8s linear infinite",flexShrink:0}}/><span><strong style={{display:"block",fontSize:13}}>Publication en cours</strong><small style={{display:"block",color:"#c5bdd8",marginTop:3}}>{publishProgress||"Préparation de ta publication…"}</small></span></div><button type="submit" className="emi-creator-next" disabled={busy}>{busy ? "Publication…" : "Publier"}</button></div></form></div> : profileEditorOpen ? <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · PROFIL</span><h2>Personnalise ton profil</h2><form onSubmit={saveProfile}><div className="profile-editor-avatar">{avatarFile ? avatarFile.name : user?.avatar_url ? <img src={user.avatar_url} alt="Photo actuelle"/> : <UserRound size={28}/>}</div><input ref={profileAvatarInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="profile-back-button" onClick={()=>profileAvatarInput.current?.click()}>Choisir une photo de profil</button><label className="profile-field-label">Nom affiché<input value={profileNameDraft} onChange={e=>setProfileNameDraft(e.target.value)} maxLength={80} placeholder="Ton nom"/></label><label className="profile-field-label">Nom d’utilisateur<input value={profileUsernameDraft} onChange={e=>setProfileUsernameDraft(e.target.value)} maxLength={30} placeholder="ex. emi_membre"/></label><label className="profile-field-label">Biographie<textarea value={profileBioDraft} onChange={e=>setProfileBioDraft(e.target.value)} maxLength={300} rows={4} placeholder="Présente-toi en quelques mots…"/></label><button className="modal-primary" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le profil"}</button></form></> : <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · TON COMPTE</span><h2>{recoveryMode ? "Nouveau mot de passe" : signup ? "Créer ton compte" : "Content de te revoir"}</h2><p>{recoveryMode ? "Choisis un mot de passe sûr pour retrouver ton compte." : signup ? "Inscris-toi avec ton adresse e-mail." : "Connecte-toi pour publier et aimer les moments."}</p>{!signup && !recoveryMode && <><div style={{display:"flex",gap:8,margin:"12px 0"}}><button type="button" onClick={()=>{setAuthMethod("email");setOtpSent(false);setOtpCode("");setMessage("");}} style={{flex:1,padding:10,borderRadius:9,border:"1px solid #8d6de0",background:"#302443",color:"#f7f6fb"}}>Connexion par e-mail</button></div><p style={{fontSize:12,lineHeight:1.6,color:"#aaa6b7",margin:"0 0 12px"}}>La connexion par SMS est temporairement indisponible. Utilise ton adresse e-mail et ton mot de passe.</p></>}<form onSubmit={authenticate}>{recoveryMode ? <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/> : authMethod==="phone" && !signup ? <><input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone (ex. +2376XXXXXXXX)" autoComplete="tel" disabled={otpSent} style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>{otpSent && <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="Code reçu par SMS" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}</> : <><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email" style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" autoComplete={signup?"new-password":"current-password"} style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/></>}<button className="modal-primary" disabled={busy} type="submit">{busy ? "Patiente…" : recoveryMode ? "Enregistrer le nouveau mot de passe" : authMethod==="phone" && !signup ? (otpSent ? "Vérifier le code SMS" : "Recevoir un code SMS") : signup ? "Créer mon compte" : "Se connecter"}</button></form>{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void requestPasswordReset()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Mot de passe oublié ?</button>}{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void resendConfirmationEmail()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Renvoyer le courriel de confirmation</button>}{authMethod==="email" && !recoveryMode && <button onClick={()=>setSignup(v=>!v)} style={{width:"100%",marginTop:14,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>{signup ? "J’ai déjà un compte" : "Créer un nouveau compte"}</button>}</>}</div></div>}
    <style jsx global>{`
      .emi-royal-tools .emi-notification-bell{position:relative!important;display:grid!important;place-items:center!important}
      .emi-royal-tools .emi-notification-badge{position:absolute!important;top:-7px!important;right:-6px!important;min-width:19px!important;height:19px!important;padding:0 5px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;border:2px solid #06130d!important;border-radius:999px!important;background:#e8c96c!important;color:#06130d!important;font-size:10px!important;font-weight:900!important;line-height:1!important;box-shadow:0 2px 8px #0008!important}
      .emi-nav-badge{min-width:17px!important;height:17px!important}
    `}</style>
    {active === "Reels" && !viewingProfile && <style jsx global>{`
      @media(max-width:700px){
        body:has(.reels-mode-header){background:#03100c!important}
        .reels-mode-header{display:none!important}
        body:has(.reels-mode-header) main>header,body:has(.reels-mode-header) .site-header,body:has(.reels-mode-header) .app-header{display:none!important}
        body:has(.reels-mode-header) .feed-list{display:flex!important;flex-direction:column;gap:0!important;padding:0!important;margin:0!important}
        body:has(.reels-mode-header) .reel-post{position:relative!important;display:flex!important;flex-direction:column!important;gap:0!important;margin:0!important;padding:0 0 12px!important;border:0!important;border-radius:0!important;background:#03100c!important;box-shadow:none!important;min-height:calc(100dvh - 72px)!important;overflow:hidden!important}
        body:has(.reels-mode-header) .reel-post>.post-top{order:0!important;min-height:76px!important;padding:10px 18px!important;background:#03100c!important;align-items:center!important}
        body:has(.reels-mode-header) .reel-post>.post-caption-wrap{order:2!important;padding:12px 20px 4px!important;margin:0!important;background:#03100c!important}
        body:has(.reels-mode-header) .reel-post>.post-caption-wrap .post-caption{display:block!important;-webkit-line-clamp:unset!important;overflow:visible!important;font-size:18px!important;line-height:1.4!important;color:#f7f4e8!important;margin:0!important}
        body:has(.reels-mode-header) .reel-post>.emi-feed-media-wrap{order:1!important;position:relative!important;width:100%!important;height:min(66dvh,760px)!important;min-height:360px!important;background:#000!important;overflow:hidden!important}
        body:has(.reels-mode-header) .reel-post>.emi-feed-media-wrap>video.reel-video{width:100%!important;height:100%!important;max-height:none!important;object-fit:contain!important;background:#000!important;border-radius:0!important}
        body:has(.reels-mode-header) .reel-post>.post-actions{order:3!important;display:flex!important;position:absolute!important;right:12px!important;top:125px!important;bottom:auto!important;width:68px!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:18px!important;padding:16px 4px!important;border:1px solid #e7d17a22!important;border-radius:36px!important;background:#06140fe8!important;z-index:5!important}
        body:has(.reels-mode-header) .reel-post>.post-actions button{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-width:0!important;padding:0!important;border:0!important;background:transparent!important;color:#fff!important;font-size:11px!important;white-space:normal!important;text-align:center!important}
        body:has(.reels-mode-header) .reel-post>.post-actions button svg{width:27px!important;height:27px!important}
        body:has(.reels-mode-header) .reel-post>.post-actions button span{font-size:10px!important;line-height:1.2!important}
        body:has(.reels-mode-header) .reel-post>.post-actions .emi-post-views{display:flex!important;flex-direction:column!important;align-items:center!important;gap:3px!important;font-size:10px!important}
        body:has(.reels-mode-header) .reel-post>.emi-reel-comment-bar{order:4!important;display:flex!important;position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;margin:8px 20px 0!important;padding:7px 8px 7px 18px!important;min-height:54px!important;border:1px solid #a9924c!important;border-radius:30px!important;background:#101d16!important;gap:10px!important}
        body:has(.reels-mode-header) .reel-post>.emi-reel-comment-bar input{flex:1!important;min-width:0!important;border:0!important;background:transparent!important;color:#fff!important;font-size:14px!important;outline:none!important}
        body:has(.reels-mode-header) .reel-post>.emi-reel-comment-bar button{width:40px!important;height:40px!important;flex:0 0 40px!important;border:0!important;border-radius:50%!important;background:#e8c96c!important;color:#06120c!important;display:grid!important;place-items:center!important}
        body:has(.reels-mode-header) .reel-post>.emi-reel-comment-bar button svg{width:20px!important;height:20px!important}
        body:has(.reels-mode-header) .mobile-nav{position:fixed!important;bottom:0!important;left:0!important;right:0!important;z-index:80!important;background:#03100cf7!important;border-top:1px solid #b99b4e55!important}
        body:has(.reels-mode-header) main{padding-top:0!important}
      }
    `}</style>}
    </main>
  );
}
