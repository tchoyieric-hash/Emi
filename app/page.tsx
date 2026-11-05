"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Camera, Copy, ChevronLeft, Compass, Heart, Home, Repeat2, LogIn, LogOut, MessageCircle, Plus, Search, Send, Settings, Sparkles, UserRound, Video, Phone, Mic, Square, X, Image as ImageIcon, Clapperboard, ShieldCheck, BadgeCheck, LockKeyhole, Bookmark, Archive, Languages, Palette, CircleHelp, Ban, Eye, SlidersHorizontal, Smartphone, ChevronRight, Clock3, Share2, UserRoundCog, Music2, Headphones, TrendingUp, Mic2, Disc3, ShoppingBag, BriefcaseBusiness, Users, Volume2, VolumeX, Smile } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import ReelsRoyalScreen from "@/components/ReelsRoyalScreen";

type WhatsAppEmiPublication = { id: string; texte: string | null; media_url: string | null; media_type: "image" | "video" | "text"; source_type?: "whatsapp_message" | "whatsapp_status"; created_at: string };

type Post = {
  id: string; user_id: string; content: string; created_at: string;
  media_type: string; media_urls: string[]; visibility: string;
  profiles?: { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
};
type Profile = { id: string; email?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; cover_url?: string | null; bio?: string | null };
type MarketHighlight = { id:string; title:string; description:string; badge:string; image:string|null; href:string; created_at:string; price?:number|null; meta?:string; viewType: "market" | "elite" | "troc" | "flow" };
type Story = { id:string; user_id:string; media_url:string; media_type:"image"|"video"; caption:string; music_url?:string|null; music_title?:string|null; visibility:string; created_at:string; expires_at:string; profiles?:{username?:string|null;display_name?:string|null;avatar_url?:string|null}|null };
const supabase = createSupabaseBrowserClient();
const formatSocialCount = (value: number) => value >= 1_000_000 ? (value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(".", ",") + "M" : value >= 1_000 ? (value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(".", ",") + "K" : String(value);

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
  const [homeFeedSort, setHomeFeedSort] = useState<"for-you" | "recent" | "popular">("for-you");
  const [postSoundEnabled, setPostSoundEnabled] = useState<Record<string, boolean>>({});
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [profileMoreOpen, setProfileMoreOpen] = useState(false);
  const [vibesTab, setVibesTab] = useState("Pour toi");
  const [vibesSearch, setVibesSearch] = useState("");
  const [privateAccount, setPrivateAccount] = useState(false);
  const [hideLikeCounts, setHideLikeCounts] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [blockedProfiles, setBlockedProfiles] = useState<Profile[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [pendingReelPostId, setPendingReelPostId] = useState<string | null>(null);
  const [whatsAppEmiPublications, setWhatsAppEmiPublications] = useState<WhatsAppEmiPublication[]>([]);
  const [postViewCounts, setPostViewCounts] = useState<Record<string, number>>({});
  const [onlineNow, setOnlineNow] = useState(false);
  const [onlineProfileIds, setOnlineProfileIds] = useState<string[]>([]);
  const [marketHighlights, setMarketHighlights] = useState<MarketHighlight[]>([]);
  const [marketViewCounts, setMarketViewCounts] = useState<Record<string, number>>({});
  const [sharedPosts, setSharedPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [taggedLoading, setTaggedLoading] = useState(false);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [repostCounts, setRepostCounts] = useState<Record<string, number>>({});
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
  const [peopleDiscoveryOpen, setPeopleDiscoveryOpen] = useState(true);
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
  const [profileTab, setProfileTab] = useState<"posts" | "shared" | "tagged">("posts");
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionTitle, setConnectionTitle] = useState("Abonnés");
  const [connectionProfiles, setConnectionProfiles] = useState<Profile[]>([]);
  const [exploreProfiles, setExploreProfiles] = useState<Profile[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [homeSuggestedProfiles, setHomeSuggestedProfiles] = useState<Profile[]>([]);
  const [homeSuggestionsLoading, setHomeSuggestionsLoading] = useState(false);
  const [profilePostCount, setProfilePostCount] = useState(0);
  const [profileFollowerCount, setProfileFollowerCount] = useState(0);
  const [profileFollowingCount, setProfileFollowingCount] = useState(0);
  const [profileBusiness, setProfileBusiness] = useState<{name:string;category:string;description:string;phone:string|null;whatsapp:string|null;email:string|null;city:string;address:string}|null>(null);
  const [conversations, setConversations] = useState<{id:string; title:string; is_group:boolean; other?:Profile; lastMessage?:string; unreadCount?:number; lastSenderId?:string|null; created_at:string}[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{id:string;conversation_id:string;sender_id:string;content:string;media_url?:string|null;media_type?:string|null;created_at:string}[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatMediaFile, setChatMediaFile] = useState<File | null>(null);
  const chatMediaInput = useRef<HTMLInputElement>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"Tout"|"Non lus"|"Groupes">("Tout");
  const [notifications, setNotifications] = useState<{id:string;actor_id:string|null;type:string;post_id:string|null;comment_id:string|null;story_id:string|null;order_id:string|null;message:string;is_read:boolean;created_at:string;actor?:Profile|null}[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [messagesInboxTab, setMessagesInboxTab] = useState<"chats"|"activity">("chats");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [incomingMessageNotice, setIncomingMessageNotice] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  function hasBlueVerificationBadge(...names: Array<string | null | undefined>): boolean {
  return names.some(name => {
    const normalized = (name || "").trim().replace(/^@/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR").replace(/\s+/g, " ");
    return normalized === "eric tchoyi" || normalized === "saa freddy" || normalized === "freddysaa";
  });
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
      setSettingsNotice("Notifications EMi activées sur cet appareil : messages, abonnements, J’aime, commentaires, réactions aux stories et commandes de tes boutiques.");
    } catch (err) {
      setSettingsNotice(err instanceof Error ? err.message : "Impossible d’activer les notifications pour le moment.");
    } finally {
      setPushBusy(false);
    }
  }


  useEffect(() => {
    try {
      setPinnedPostIds(JSON.parse(localStorage.getItem("emi:pinned-posts") || "[]"));
      setCommentsDisabledIds(JSON.parse(localStorage.getItem("emi:comments-disabled") || "[]"));
      setHiddenLikeIds(JSON.parse(localStorage.getItem("emi:hidden-likes") || "[]"));
      setHiddenShareIds(JSON.parse(localStorage.getItem("emi:hidden-shares") || "[]"));
    } catch { /* Ignore malformed local preferences. */ }
  }, []);

  useEffect(() => {
    let alive = true;
    if (!supabase || !user?.id) {
      setSavedPostIds([]);
      setArchivedPostIds([]);
      return;
    }
    void Promise.all([
      supabase.from("post_bookmarks").select("post_id").eq("user_id", user.id),
      supabase.from("post_archives").select("post_id").eq("user_id", user.id)
    ]).then(([savedResult, archiveResult]) => {
      if (!alive) return;
      if (savedResult.error) setSettingsNotice("Impossible de charger les favoris : " + savedResult.error.message);
      else setSavedPostIds((savedResult.data || []).map(row => row.post_id as string));
      if (archiveResult.error) setSettingsNotice("Impossible de charger les archives : " + archiveResult.error.message);
      else setArchivedPostIds((archiveResult.data || []).map(row => row.post_id as string));
    });
    return () => { alive = false; };
  }, [user?.id]);

  function persistPostPreference(key: string, values: string[]) {
    try { localStorage.setItem("emi:" + key, JSON.stringify(values)); } catch {}
  }
  async function togglePostPreference(key: "saved-posts"|"archived-posts"|"pinned-posts"|"comments-disabled"|"hidden-likes"|"hidden-shares", current: string[], setter: (value: string[]) => void, postId: string, label: string) {
    const removing = current.includes(postId);
    const next = removing ? current.filter(id => id !== postId) : [...current, postId];
    if ((key === "saved-posts" || key === "archived-posts") && (!supabase || !user?.id)) {
      setAuthOpen(true);
      setMessage("Connecte-toi pour synchroniser tes favoris et tes archives.");
      return;
    }
    setter(next);
    if (key === "saved-posts" || key === "archived-posts") {
      const table = key === "saved-posts" ? "post_bookmarks" : "post_archives";
      const result = removing
        ? await supabase!.from(table).delete().eq("user_id", user!.id).eq("post_id", postId)
        : await supabase!.from(table).insert({ user_id: user!.id, post_id: postId });
      if (result.error) {
        setter(current);
        setMessage("Impossible d’enregistrer cette action : " + result.error.message);
        return;
      }
    } else {
      persistPostPreference(key, next);
    }
    setMessage(removing ? label + " désactivé." : label + " activé.");
  }
  async function copyProfileLink(profile: Profile) {
    const url = window.location.origin + "/?profile=" + encodeURIComponent(profile.id);
    try { await navigator.clipboard.writeText(url); setMessage("Lien du profil copié."); }
    catch { setMessage("Copie indisponible sur cet appareil. Utilise le bouton Partager le profil."); }
  }
  async function shareProfile(profile: Profile) {
    const url = window.location.origin + "/?profile=" + encodeURIComponent(profile.id);
    const label = profile.display_name || profile.username || "un membre";
    try {
      if (navigator.share) await navigator.share({title:"Profil EMi · "+label,text:"Découvre le profil de "+label+" sur EMi.",url});
      else { await navigator.clipboard.writeText(url); setMessage("Lien du profil copié."); }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setMessage("Partage indisponible sur cet appareil.");
    }
  }
  async function sharePost(post: Post) {
    const url = window.location.origin + "/?publication=" + encodeURIComponent(post.id);
    const isAlbum = post.media_type === "carousel" && (post.media_urls || []).length > 1;
    const mediaCount = (post.media_urls || []).length;
    const shareText = isAlbum
      ? `Découvre cet album de ${mediaCount} photos sur EMi. ${post.content || ""}`.trim()
      : post.content || "Découvre cette publication sur EMi";
    try {
      if (navigator.share) {
        await navigator.share({ title: isAlbum ? "Album photo · EMi" : "Publication EMi", text: shareText, url });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage(isAlbum ? "Lien de l’album photo copié. Toutes les photos sont accessibles depuis ce lien." : "Lien de la publication copié.");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setMessage("Partage indisponible sur cet appareil. Tu peux copier le lien depuis les options de la publication.");
    }
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
  const [businessDraft, setBusinessDraft] = useState({ id: "", name: "", category: "Commerce", description: "", phone: "", whatsapp: "", email: "", city: "", address: "", is_published: false });
  const [businessLoading, setBusinessLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [profileCoverFile, setProfileCoverFile] = useState<File | null>(null);
  const profileCoverInput = useRef<HTMLInputElement>(null);
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
    const ownStoryIds = rows.filter(row => row.user_id === user?.id).map(row => row.id);
    if (ownStoryIds.length) {
      const { data: ownViews, error: ownViewsError } = await supabase.from("story_views").select("story_id,viewer_key").in("story_id", ownStoryIds);
      if (!ownViewsError) {
        const counts: Record<string, number> = {};
        const viewerKeysByStory: Record<string, string[]> = {};
        (ownViews || []).forEach((view: {story_id:string;viewer_key:string}) => {
          counts[view.story_id] = (counts[view.story_id] || 0) + 1;
          if (view.viewer_key && view.viewer_key !== user?.id) (viewerKeysByStory[view.story_id] ||= []).push(view.viewer_key);
        });
        setStoryViewCounts(old => ({ ...old, ...counts }));
        const viewerIds = [...new Set(Object.values(viewerKeysByStory).flat().filter(key => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)))];
        if (viewerIds.length) {
          const { data: viewerProfiles } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", viewerIds);
          const profileById = new Map((viewerProfiles || []).map(profile => [profile.id, profile as Profile]));
          const viewersByStory: Record<string, Profile[]> = {};
          Object.entries(viewerKeysByStory).forEach(([storyId, keys]) => {
            viewersByStory[storyId] = [...new Set(keys)].map(key => profileById.get(key)).filter((profile): profile is Profile => !!profile);
          });
          setStoryViewers(old => ({ ...old, ...viewersByStory }));
        }
      }
    }
  }, [user?.id]);


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
    setFeedHasMore(rawPosts.length === 40);
    const authorIds = [...new Set(rawPosts.map(post => post.user_id))];
    const { data: authorProfiles, error: profilesError } = authorIds.length
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").in("id", authorIds)
      : { data: [], error: null };
    if (profilesError) { setMessage("Impossible de charger les profils des auteurs : " + profilesError.message); return; }
    const profilesById = new Map((authorProfiles || []).map(profile => [profile.id, profile]));
    const realPosts = rawPosts.map(post => ({ ...post, profiles: profilesById.get(post.user_id) || null }));
    setPosts(realPosts);
    const { data: viewRows } = await supabase.from("post_views").select("post_id").in("post_id", realPosts.map(post => post.id));
    const viewCounts: Record<string, number> = {}; (viewRows || []).forEach((row: {post_id:string}) => { viewCounts[row.post_id] = (viewCounts[row.post_id] || 0) + 1; }); setPostViewCounts(old => ({...old, ...viewCounts}));
    // Synchroniser les offres du Marché avec l'accueil, avec leur badge d'origine.
    const [{data:marketRows},{data:productRows},{data:eliteRows},{data:trocRows},{data:flowRows}] = await Promise.all([
      supabase.from("annonces").select("id,titre,description,prix,image_urls,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(8),
      supabase.from("products").select("id,name,description,price,image_urls,created_at,businesses(name,city)").eq("status","active").gt("stock",0).order("created_at",{ascending:false}).limit(8),
      supabase.from("elite_directory_profiles").select("id,nom,specialite,ville,bio,image_url,created_at").eq("published",true).order("created_at",{ascending:false}).limit(5),
      supabase.from("troc_offres").select("id,bien_offert,bien_recherche,description,created_at").eq("statut","active").order("created_at",{ascending:false}).limit(4),
      supabase.from("tontine_cercles").select("id,nom_article,prix_cible,membres_max,created_at").order("created_at",{ascending:false}).limit(4)
    ]);
    const marketCards: MarketHighlight[] = [
      ...((marketRows || []) as any[]).map((a): MarketHighlight => ({ id: a.id, title: a.titre, description: a.description || "Découvre cette offre de la communauté.", badge: "🛍️ EMi MARKET", viewType: "market", image: Array.isArray(a.image_urls) ? a.image_urls[0] || null : null, href: "/annonce/" + a.id, created_at: a.created_at, price: Number(a.prix) || 0 })),
      ...((productRows || []) as any[]).map((p): MarketHighlight => ({ id: p.id, title: p.name, description: p.description || p.businesses?.name || "Produit disponible dans une boutique EMi.", badge: "🛒 EMi BOUTIQUE", viewType: "market", image: Array.isArray(p.image_urls) ? p.image_urls[0] || null : null, href: "/boutiques?product=" + encodeURIComponent(p.id), created_at: p.created_at, price: Number(p.price) || 0, meta: [p.businesses?.name, p.businesses?.city].filter(Boolean).join(" · ") })),
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
      const [likeResult, commentResult, repostResult] = await Promise.all([
        supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
        supabase.from("post_reposts").select("post_id").in("post_id", ids)
      ]);
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      (likeResult.data || []).forEach((l: {post_id:string;user_id:string}) => { counts[l.post_id] = (counts[l.post_id] || 0) + 1; if (user?.id === l.user_id) mine.push(l.post_id); });
      const commentTotals: Record<string, number> = {};
      (commentResult.data || []).forEach((row: {post_id:string}) => { commentTotals[row.post_id] = (commentTotals[row.post_id] || 0) + 1; });
      const repostTotals: Record<string, number> = {};
      (repostResult.data || []).forEach((row: {post_id:string}) => { repostTotals[row.post_id] = (repostTotals[row.post_id] || 0) + 1; });
      setLikes(counts); setLiked(mine); setCommentCounts(commentTotals); setRepostCounts(repostTotals);
    } else { setLikes({}); setLiked([]); setCommentCounts({}); setRepostCounts({}); }
  }, [user?.id]);

  const loadMoreFeed = useCallback(async () => {
    if (!supabase || feedLoadingMore || !feedHasMore || posts.length === 0) return;
    setFeedLoadingMore(true);
    try {
      const from = posts.length;
      const { data, error } = await supabase.from("posts")
        .select("id,user_id,content,created_at,media_type,media_urls,visibility")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(from, from + 39);
      if (error) throw error;
      const raw = (data || []) as unknown as Post[];
      setFeedHasMore(raw.length === 40);
      if (!raw.length) return;
      const ids = raw.map(post => post.id);
      const authorIds = [...new Set(raw.map(post => post.user_id))];
      const [profileResult, likeResult, commentResult, repostResult] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").in("id", authorIds),
        supabase.from("post_likes").select("post_id,user_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
        supabase.from("post_reposts").select("post_id").in("post_id", ids)
      ]);
      if (profileResult.error) throw profileResult.error;
      const profileMap = new Map((profileResult.data || []).map(profile => [profile.id, profile]));
      const hydrated = raw.map(post => ({ ...post, profiles: profileMap.get(post.user_id) || null }));
      setPosts(old => {
        const known = new Set(old.map(post => post.id));
        return [...old, ...hydrated.filter(post => !known.has(post.id))];
      });
      const likeTotals: Record<string, number> = {};
      const myLikes: string[] = [];
      (likeResult.data || []).forEach((row: {post_id:string;user_id:string}) => {
        likeTotals[row.post_id] = (likeTotals[row.post_id] || 0) + 1;
        if (user?.id === row.user_id) myLikes.push(row.post_id);
      });
      const commentTotals: Record<string, number> = {};
      (commentResult.data || []).forEach((row: {post_id:string}) => { commentTotals[row.post_id] = (commentTotals[row.post_id] || 0) + 1; });
      const repostTotals: Record<string, number> = {};
      (repostResult.data || []).forEach((row: {post_id:string}) => { repostTotals[row.post_id] = (repostTotals[row.post_id] || 0) + 1; });
      setLikes(old => ({...old, ...likeTotals}));
      setLiked(old => [...new Set([...old, ...myLikes])]);
      setCommentCounts(old => ({...old, ...commentTotals}));
      setRepostCounts(old => ({...old, ...repostTotals}));
    } catch (err) {
      setMessage("Impossible de charger les publications suivantes : " + describeUnknownError(err));
    } finally {
      setFeedLoadingMore(false);
    }
  }, [feedLoadingMore, feedHasMore, posts.length, user?.id]);

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
        const { data: profile } = await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").eq("id", data.user.id).maybeSingle();
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
      if (alive) setUser(current => session?.user ? ({ ...(current?.id === session.user.id ? current : {}), id: session.user.id, email: session.user.email }) : null);
    });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!supabase || !user?.id) { setHideLikeCounts(false); return; }
    void supabase.from("profile_preferences").select("hide_like_counts").eq("user_id", user.id).maybeSingle().then(({data,error}) => {
      if (!alive) return;
      if (error) { setSettingsNotice("Impossible de charger tes préférences : " + error.message); return; }
      setHideLikeCounts(Boolean(data?.hide_like_counts));
    });
    return () => { alive = false; };
  }, [user?.id]);

  async function saveHideLikeCounts(nextValue: boolean) {
    if (!supabase || !user?.id || preferencesLoading) return;
    const previous = hideLikeCounts;
    setHideLikeCounts(nextValue);
    setPreferencesLoading(true);
    setSettingsNotice("");
    const { error } = await supabase.from("profile_preferences").upsert({user_id:user.id,hide_like_counts:nextValue,updated_at:new Date().toISOString()},{onConflict:"user_id"});
    setPreferencesLoading(false);
    if (error) { setHideLikeCounts(previous); setSettingsNotice("Enregistrement impossible : " + error.message); return; }
    setSettingsNotice(nextValue ? "Préférence enregistrée : les compteurs de J’aime sont masqués sur ton écran." : "Préférence enregistrée : les compteurs de J’aime sont visibles.");
  }

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
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
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
    const selector = active === "Accueil" && !viewingProfile ? ".emi-feed-video" : null;
    const allFeedVideos = Array.from(document.querySelectorAll<HTMLVideoElement>(".emi-feed-video"));
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
      nextVideo.muted = !postSoundEnabled[postId];
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
  }, [active, viewingProfile?.id, posts.length, postSoundEnabled]);

  // Keep the selected reaction scoped to the currently displayed story.
  // Without this read, the previous story's emoji remains selected and can block a new reaction.
  useEffect(() => {
    let cancelled = false;
    setStoryReaction(null);
    setStoryViewersOpen(false);
    if (!supabase || !activeStory || !user?.id) return () => { cancelled = true; };
    void supabase.from("story_reactions").select("reaction")
      .eq("story_id", activeStory.id).eq("user_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled && !error) setStoryReaction(data?.reaction || null);
      });
    return () => { cancelled = true; };
  }, [activeStory?.id, user?.id]);

  useEffect(() => {
    if (!supabase || !activeStory) return;
    let cancelled = false;
    const refreshOwnStoryInsights = async () => {
      if (user?.id !== activeStory.user_id) {
        if (!user?.id) return;
        // Une insertion simple évite les permissions SELECT/UPDATE exigées par upsert.
        // L'index unique (story_id, viewer_key) garantit une seule vue par membre.
        const { error } = await supabase.from("story_views")
          .insert({ story_id: activeStory.id, viewer_key: user.id });
        if (error && error.code !== "23505") {
          console.error("Impossible d’enregistrer la vue de story", error.code, error.message);
        }
        return;
      }
      const { data: viewRows, count, error } = await supabase
        .from("story_views").select("viewer_key", { count: "exact" }).eq("story_id", activeStory.id);
      if (cancelled || error) { if (error) console.error("Impossible de charger les vues", error.message); return; }
      if (typeof count === "number") setStoryViewCounts(old => ({ ...old, [activeStory.id]: count }));
      const viewerIds = [...new Set((viewRows || []).map(row => row.viewer_key).filter((key): key is string => !!key && key !== activeStory.user_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)))];
      if (!viewerIds.length) { setStoryViewers(old => ({ ...old, [activeStory.id]: [] })); return; }
      const { data: profiles, error: profileError } = await supabase.from("profiles")
        .select("id,username,display_name,avatar_url").in("id", viewerIds);
      if (!cancelled && !profileError) setStoryViewers(old => ({ ...old, [activeStory.id]: (profiles || []) as Profile[] }));
    };
    void refreshOwnStoryInsights();
    const channel = user?.id === activeStory.user_id
      ? supabase.channel("emi-story-views-" + activeStory.id)
          .on("postgres_changes", { event: "*", schema: "public", table: "story_views", filter: "story_id=eq." + activeStory.id }, () => { void refreshOwnStoryInsights(); })
          .subscribe()
      : null;
    return () => { cancelled = true; if (channel) void supabase.removeChannel(channel); };
  }, [activeStory?.id, user?.id]);

  useEffect(() => {
    if (!activeStory || activeStory.media_type === "video" || storyViewersOpen) return;
    const timer = window.setTimeout(() => {
      const index = stories.findIndex(story => story.id === activeStory.id);
      if (index < 0) { setActiveStory(null); return; }
      const authorKey = (item: Story) => item.user_id;
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
        const { data: p, error: profileReadError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").eq("id", data.user.id).maybeSingle();
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
        const { data: p, error: profileReadError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").eq("id", data.user.id).maybeSingle();
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
    if (publishDestination === "reel" && (!filesToUpload.length || !filesToUpload[0].type.startsWith("video/"))) { setMessage("Un Reel doit contenir une vidéo. Sélectionne une vidéo depuis ton téléphone."); return; }
    if (musicFile && filesToUpload.length===0) { setMessage("Ajoute une photo ou une vidéo pour accompagner ta musique."); return; }
    if (musicFile && !musicFile.type.startsWith("audio/")) { setMessage("Choisis un fichier audio valide."); return; }
    if (musicFile && musicFile.size > 15 * 1024 * 1024) { setMessage("Le fichier audio doit faire moins de 15 Mo."); return; }
    if (filesToUpload.length > 10) { setMessage("Tu peux sélectionner jusqu’à 10 photos par publication."); return; }
    if (filesToUpload.some(f=>f.type.startsWith("video/")) && filesToUpload.length > 1) { setMessage("Pour une publication multiple, sélectionne des photos uniquement. Une vidéo peut être publiée seule."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime","video/x-m4v","video/3gpp","video/x-matroska"];
    if (filesToUpload.some(f=>!allowed.includes(f.type) && !(f.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(f.name)))) {
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
      const isVideoUpload = !!filesToUpload[0] && (filesToUpload[0].type.startsWith("video/") || /\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(filesToUpload[0].name));
      const postContent = (publishDestination === "reel" ? "[EMI_REEL] " : isVideoUpload ? "[EMI_VIDEO_POST] " : "") + caption.trim() + (musicMeta ? "\n\n[EMI_MUSIC]" + JSON.stringify({...musicMeta,url:musicUrl}) + "[/EMI_MUSIC]" : "");
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
      const { data: participants, error: partError } = await supabase.from("conversation_participants").select("conversation_id,user_id,last_read_at").in("conversation_id", ids);
      if (partError) throw partError;
      const otherIds = [...new Set((participants || []).filter(p => p.user_id !== user.id).map(p => p.user_id as string))];
      const { data: profiles, error: profileError } = otherIds.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", otherIds) : {data:[],error:null};
      if (profileError) throw profileError;
      const { data: recent, error: msgError } = await supabase.from("messages").select("id,conversation_id,sender_id,content,created_at").in("conversation_id", ids).order("created_at", {ascending:false}).limit(100);
      if (msgError) throw msgError;
      const pMap = new Map((profiles || []).map(p => [p.id,p as Profile]));
      const result = await Promise.all((convs || []).map(async conv => {
        const member = (participants || []).find(p => p.conversation_id === conv.id && p.user_id !== user.id);
        const ownMembership = (participants || []).find(p => p.conversation_id === conv.id && p.user_id === user.id);
        const last = (recent || []).find(m => m.conversation_id === conv.id);
        const unreadQuery = supabase.from("messages").select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id).neq("sender_id", user.id);
        if (ownMembership?.last_read_at) unreadQuery.gt("created_at", ownMembership.last_read_at);
        const { count, error: unreadError } = await unreadQuery;
        if (unreadError) throw unreadError;
        return {...conv, other: member ? pMap.get(member.user_id) : undefined,
          lastMessage: last?.content || (last ? "Média partagé" : "Commence la conversation"),
          lastSenderId: last?.sender_id || null, unreadCount: count || 0};
      }));
      setConversations(result);
      if (activeConversation && !ids.includes(activeConversation)) setActiveConversation(null);
    } catch (err) { setMessage(err instanceof Error ? "Messagerie : " + err.message : "Impossible de charger les conversations."); }
    finally { setChatLoading(false); }
  }

  async function resolveChatMediaUrl(value: string | null | undefined) {
    if (!value || !supabase || value.startsWith("http://") || value.startsWith("https://")) return value || null;
    const { data, error } = await supabase.storage.from("message-media").createSignedUrl(value, 15 * 60);
    if (error) throw error;
    return data.signedUrl;
  }

  async function openConversation(conversationId: string) {
    if (!supabase || !user) { setAuthOpen(true); return; }
    setActiveConversation(conversationId);
    const { data, error } = await supabase.from("messages").select("id,conversation_id,sender_id,content,media_url,media_type,created_at").eq("conversation_id", conversationId).order("created_at", {ascending:false}).limit(200);
    if (error) { setMessage("Impossible d’ouvrir cette conversation : " + error.message); return; }
    try {
      const rows = await Promise.all(((data || []).reverse()).map(async row => ({...row, media_url: await resolveChatMediaUrl(row.media_url)})));
      setChatMessages(rows as typeof chatMessages);
    } catch (mediaError) {
      setMessage("Impossible de charger un média privé : " + describeUnknownError(mediaError));
      setChatMessages(((data || []).reverse()).map(row => ({...row,media_url:null})) as typeof chatMessages);
    }
    await supabase.from("conversation_participants").update({last_read_at:new Date().toISOString()}).eq("conversation_id",conversationId).eq("user_id",user.id);
    setConversations(current => current.map(conv => conv.id === conversationId ? {...conv, unreadCount:0} : conv));
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
      // Quitte le contexte du profil : l'écran Messages est masqué tant que viewingProfile reste défini.
      setViewingProfile(null);
      setProfileTab("posts");
      setActive("Messages");
      await openConversation(conversationId);
    } catch (err) {
      const detail = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : err instanceof Error ? err.message : "Erreur inconnue";
      setMessage("Impossible de démarrer la conversation : " + detail);
    } finally { setChatLoading(false); }
  }

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get("messageTo");
    if (!targetId) return;
    params.delete("messageTo");
    const nextUrl = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
    window.history.replaceState({}, "", nextUrl);
    void (async () => {
      const { data, error } = await supabase!.from("profiles").select("id,username,display_name,avatar_url").eq("id", targetId).maybeSingle();
      if (error || !data) { setMessage("Ce professionnel n’est pas disponible pour la messagerie."); return; }
      await startConversation(data as Profile);
    })();
  }, [user?.id]);

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("L’enregistrement vocal n’est pas disponible sur cet appareil ou ce navigateur."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
      voiceChunksRef.current = [];
      recorder.ondataavailable = event => { if (event.data.size) voiceChunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(voiceChunksRef.current, {type:recorder.mimeType || "audio/webm"});
        if (!blob.size || !supabase || !user || !activeConversation) return;
        setChatLoading(true);
        try {
          const ext = blob.type.includes("mp4") ? "m4a" : "webm";
          const path = activeConversation + "/" + user.id + "/" + crypto.randomUUID() + "." + ext;
          const {error: uploadError} = await supabase.storage.from("message-media").upload(path,blob,{contentType:blob.type,upsert:false});
          if (uploadError) throw uploadError;
          const {data,error} = await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:user.id,content:"Message vocal",media_url:path,media_type:"audio"}).select("id,conversation_id,sender_id,content,media_url,media_type,created_at").single();
          if (error) throw error;
          const signedUrl = await resolveChatMediaUrl(data.media_url);
          setChatMessages(old => old.some(item=>item.id===data.id)?old:[...old,{...data,media_url:signedUrl} as typeof chatMessages[number]]);
          await supabase.from("conversations").update({updated_at:new Date().toISOString()}).eq("id",activeConversation);
          void loadConversations();
        } catch(err) { setMessage("Envoi du vocal impossible : " + describeUnknownError(err)); }
        finally { setChatLoading(false); }
      };
      voiceRecorderRef.current = recorder;
      recorder.start();
      setVoiceSeconds(0);
      setVoiceRecording(true);
      const started = Date.now();
      const tick = () => { if (voiceRecorderRef.current?.state==="recording") { setVoiceSeconds(Math.floor((Date.now()-started)/1000)); window.setTimeout(tick,500); } };
      tick();
    } catch(err) { setMessage("Microphone inaccessible : " + describeUnknownError(err)); }
  }
  function stopVoiceRecording() {
    if (voiceRecorderRef.current?.state==="recording") voiceRecorderRef.current.stop();
    voiceRecorderRef.current = null;
    setVoiceRecording(false);
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
        if (!["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime","audio/webm","audio/mp4","audio/mpeg","audio/ogg"].includes(file.type)) throw new Error("Format non pris en charge. Choisis une image, une vidéo ou un audio.");
        if (file.size > 25 * 1024 * 1024) throw new Error("Un média de messagerie doit faire moins de 25 Mo.");
        const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g,"") || "bin";
        const path = activeConversation + "/" + user.id + "/" + crypto.randomUUID() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("message-media").upload(path,file,{contentType:file.type,upsert:false});
        if (uploadError) throw uploadError;
        mediaUrl = path;
        mediaType = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
      }
      const { data, error } = await supabase.from("messages").insert({conversation_id:activeConversation,sender_id:user.id,content,media_url:mediaUrl,media_type:mediaType}).select("id,conversation_id,sender_id,content,media_url,media_type,created_at").single();
      if (error) throw error;
      setChatDraft(""); setChatMediaFile(null);
      const signedUrl = await resolveChatMediaUrl(data.media_url);
      setChatMessages(old => old.some(m => m.id === data.id) ? old : [...old, {...data,media_url:signedUrl} as typeof chatMessages[number]]);
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
        void (async () => {
          try {
            const signedUrl = await resolveChatMediaUrl(row.media_url);
            setChatMessages(old => old.some(message => message.id === row.id) ? old : [...old,{...row,media_url:signedUrl}]);
          } catch (mediaError) {
            console.warn("EMi private chat media:", describeUnknownError(mediaError));
            setChatMessages(old => old.some(message => message.id === row.id) ? old : [...old,{...row,media_url:null}]);
          }
        })();
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
      const { data, error } = await supabase.rpc("get_unread_message_count", {
        p_active_conversation: activeConversation
      });
      if (!alive || error) return;
      setUnreadMessages(Number(data || 0));
    };
    void refreshUnread();
    const channel = supabase.channel("emi-incoming-messages-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async payload => {
        const row = payload.new as {sender_id:string};
        if (!alive || row.sender_id === user.id) return;
        await refreshUnread();
        if (!alive) return;
        setIncomingMessageNotice("Tu as reçu un nouveau message.");
        window.setTimeout(() => { if (alive) setIncomingMessageNotice(""); }, 6000);
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
        .neq("type", "order_received")
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
      const { data, error } = await supabase.from("notifications").select("id,actor_id,type,post_id,comment_id,story_id,order_id,message,is_read,created_at").eq("recipient_id", user.id).neq("type", "order_received").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []) as {id:string;actor_id:string|null;type:string;post_id:string|null;comment_id:string|null;story_id:string|null;order_id:string|null;message:string;is_read:boolean;created_at:string}[];
      const actorIds = [...new Set(rows.map(row => row.actor_id).filter((id): id is string => !!id))];
      const { data: people, error: peopleError } = actorIds.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", actorIds) : { data: [], error: null };
      if (peopleError) throw peopleError;
      const peopleById = new Map((people || []).map(person => [person.id, person as Profile]));
      setNotifications(rows.map(row => ({ ...row, actor: row.actor_id ? peopleById.get(row.actor_id) || null : null })));
    } catch (err) { setMessage(err instanceof Error ? "Notifications : " + err.message : "Impossible de charger les notifications."); }
    finally { setNotificationsLoading(false); }
  }

  async function loadMessageActivity() {
    if (!supabase || !user) { setAuthOpen(true); return; }
    setNotificationsLoading(true);
    try {
      const { data, error } = await supabase.from("notifications")
        .select("id,actor_id,type,post_id,comment_id,story_id,order_id,message,is_read,created_at")
        .eq("recipient_id", user.id).neq("type", "order_received").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data || []) as typeof notifications;
      const actorIds = [...new Set(rows.map(row => row.actor_id).filter((id): id is string => !!id))];
      const { data: people, error: peopleError } = actorIds.length
        ? await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", actorIds)
        : { data: [], error: null };
      if (peopleError) throw peopleError;
      const byId = new Map((people || []).map(person => [person.id, person as Profile]));
      setNotifications(rows.map(row => ({ ...row, actor: row.actor_id ? byId.get(row.actor_id) || null : null })));
    } catch (err) {
      setMessage(err instanceof Error ? "Activité Messages : " + err.message : "Impossible de charger l’activité.");
    } finally { setNotificationsLoading(false); }
  }

  async function openMessageActivity(note: typeof notifications[number]) {
    if (!supabase || !user) return;
    if (!note.is_read) {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", note.id).eq("recipient_id", user.id);
      if (!error) {
        setNotifications(old => old.map(item => item.id === note.id ? { ...item, is_read: true } : item));
        setUnreadNotifications(value => Math.max(0, value - 1));
      }
    }
    if (note.type === "order_received" && note.order_id) { window.location.href = "/annonces/commandes?mode=seller&order=" + encodeURIComponent(note.order_id); return; }
    if ((note.type === "story_reaction" || note.type === "story_reply") && note.story_id) {
      const story = stories.find(item => item.id === note.story_id);
      if (story) { setActiveStory(story); return; }
      setActive("Accueil");
      await loadStories();
      setMessage("Cette story a peut-être expiré. Consulte les stories encore disponibles.");
      return;
    }
    if (note.post_id) {
      setActive("Accueil");
      setViewingProfile(null);
      await loadFeed();
      setMessage("Ouvre la publication concernée dans le fil EMi.");
      return;
    }
    if (note.actor_id) {
      setViewingProfile(null);
      await openProfile(note.actor_id);
    }
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
      ? await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").in("id", authorIds)
      : { data: [], error: null };
    if (profilesError) { setMessage("Impossible de charger les profils des auteurs : " + profilesError.message); return; }
    const profilesById = new Map((authorProfiles || []).map(profile => [profile.id, profile]));
    setPosts(rawPosts.map(post => ({ ...post, profiles: profilesById.get(post.user_id) || null }))); setActive("Abonnements");
  }

  async function loadExploreProfiles() {
    if (!supabase) return;
    setExploreLoading(true);
    try {
      const term = query.trim().replace(/[%,()]/g, "");
      const [{ data, error }, { data: follows, error: followsError }] = await Promise.all([
        (() => {
          let request = supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").limit(100);
          if (term) request = request.or(`display_name.ilike.%${term}%,username.ilike.%${term}%,bio.ilike.%${term}%`);
          return request;
        })(),
        user ? supabase.from("follows").select("following_id").eq("follower_id", user.id) : Promise.resolve({ data: [], error: null } as any)
      ]);
      if (error) throw error;
      if (followsError) throw followsError;
      const excluded = new Set([...(user ? [user.id] : []), ...(follows || []).map((row: {following_id:string}) => row.following_id)]);
      const isRealIdentity = (value?: string | null) => {
        const normalized = (value || "").trim().toLocaleLowerCase("fr-FR").replace(/^@/, "");
        return normalized.length >= 2 && !["membre", "membre emi", "utilisateur", "user", "unknown", "inconnu", "sans nom"].includes(normalized);
      };
      const cleanProfiles = ((data || []) as Profile[]).filter(profile =>
        !excluded.has(profile.id) && (isRealIdentity(profile.display_name) || isRealIdentity(profile.username))
      );
      setExploreProfiles(cleanProfiles);
    } catch (err) { setMessage(err instanceof Error ? "Impossible de charger Explorer : " + err.message : "Impossible de charger Explorer."); }
    finally { setExploreLoading(false); }
  }

  async function loadHomeSuggestedProfiles() {
    if (!supabase || !user) { setHomeSuggestedProfiles([]); return; }
    setHomeSuggestionsLoading(true);
    try {
      const [{ data: profiles, error: profilesError }, { data: follows, error: followsError }, { data: recentPosts, error: postsError }] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").limit(100),
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("posts").select("user_id,created_at").order("created_at", { ascending: false }).limit(300)
      ]);
      if (profilesError) throw profilesError;
      if (followsError) throw followsError;
      if (postsError) throw postsError;
      const excluded = new Set([user.id, ...(follows || []).map(row => row.following_id as string)]);
      const activity = new Map<string, { count: number; latest: number }>();
      for (const post of recentPosts || []) {
        const previous = activity.get(post.user_id) || { count: 0, latest: 0 };
        const timestamp = new Date(post.created_at).getTime();
        activity.set(post.user_id, { count: previous.count + 1, latest: Math.max(previous.latest, Number.isFinite(timestamp) ? timestamp : 0) });
      }
      const isRealIdentity = (value?: string | null) => {
        const normalized = (value || "").trim().toLocaleLowerCase("fr-FR").replace(/^@/, "");
        return normalized.length >= 2 && !["membre", "membre emi", "utilisateur", "user", "unknown", "inconnu", "sans nom"].includes(normalized);
      };
      const eligibleProfiles = ((profiles || []) as Profile[]).filter(profile => {
        if (excluded.has(profile.id)) return false;
        return isRealIdentity(profile.display_name) || isRealIdentity(profile.username);
      });
      const now = Date.now();
      const rankedProfiles = eligibleProfiles.map(profile => {
        const stats = activity.get(profile.id) || { count: 0, latest: 0 };
        const daysSincePost = stats.latest ? Math.max(0, (now - stats.latest) / 86_400_000) : Infinity;
        const activityScore = stats.count * 3 + (daysSincePost <= 7 ? 12 : daysSincePost <= 30 ? 6 : 0);
        const profileScore = (profile.avatar_url ? 5 : 0) + (profile.bio?.trim() ? 3 : 0) + (isRealIdentity(profile.display_name) ? 2 : 0);
        return { profile, score: activityScore + profileScore, latest: stats.latest };
      }).sort((a, b) => b.score - a.score || b.latest - a.latest);
      setHomeSuggestedProfiles(rankedProfiles.slice(0, 8).map(item => item.profile));
    } catch (err) {
      console.error("Suggestions EMi indisponibles", err);
      setHomeSuggestedProfiles([]);
    } finally { setHomeSuggestionsLoading(false); }
  }

  function goBack() {
    // Dans une conversation, le retour prioritaire mène à la boîte de réception,
    // sans quitter l'espace Messages ni perdre l'historique.
    if (active === "Messages" && activeConversation) {
      setActiveConversation(null);
      setChatMessages([]);
      setMessagesInboxTab("chats");
      setChatFilter("Tout");
      return;
    }
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

  async function loadBlockedProfiles() {
    if (!supabase || !user?.id) return;
    setBlockedLoading(true);
    const { data, error } = await supabase.from("blocked_users").select("blocked_user_id").eq("blocker_id", user.id).order("created_at", { ascending: false });
    if (error) {
      setSettingsNotice("Impossible de charger les comptes bloqués : " + error.message);
      setBlockedLoading(false);
      return;
    }
    const ids = (data || []).map(row => row.blocked_user_id as string);
    if (!ids.length) {
      setBlockedProfiles([]);
      setBlockedLoading(false);
      return;
    }
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
    if (profilesError) setSettingsNotice("Liste chargée, mais profils indisponibles : " + profilesError.message);
    else {
      const byId = new Map((profiles || []).map(profile => [profile.id, profile]));
      setBlockedProfiles(ids.map(id => byId.get(id)).filter(Boolean) as Profile[]);
    }
    setBlockedLoading(false);
  }

  async function blockProfile(profile: Profile) {
    if (!supabase || !user?.id) {
      setAuthOpen(true);
      return;
    }
    if (profile.id === user.id) return;
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: user.id, blocked_user_id: profile.id });
    if (error && error.code !== "23505") {
      setMessage("Impossible de bloquer ce compte : " + error.message);
      return;
    }
    setProfileMoreOpen(false);
    setPosts(current => current.filter(post => post.user_id !== profile.id));
    if (viewingProfile?.id === profile.id) {
      setViewingProfile(null);
      setProfileTab("posts");
      setActive("Accueil");
    }
    setMessage("Compte bloqué. Ses publications sont masquées et les messages/abonnements entre vos deux comptes sont empêchés.");
    if (settingsSection === "blocked") void loadBlockedProfiles();
  }

  async function unblockProfile(profileId: string) {
    if (!supabase || !user?.id) return;
    const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", user.id).eq("blocked_user_id", profileId);
    if (error) {
      setSettingsNotice("Impossible de débloquer ce compte : " + error.message);
      return;
    }
    setBlockedProfiles(current => current.filter(profile => profile.id !== profileId));
    setSettingsNotice("Compte débloqué.");
  }

  async function openProfile(targetId: string) {
    if (!supabase) return;
    setMessage("");
    if (user?.id && targetId !== user.id) {
      const [{ data: iBlocked }, { data: blockedMe }] = await Promise.all([
        supabase.from("blocked_users").select("blocker_id").eq("blocker_id", user.id).eq("blocked_user_id", targetId).maybeSingle(),
        supabase.from("blocked_users").select("blocker_id").eq("blocker_id", targetId).eq("blocked_user_id", user.id).maybeSingle()
      ]);
      if (iBlocked || blockedMe) {
        setViewingProfile(null);
        setMessage("Ce profil n’est pas disponible entre vos deux comptes.");
        return;
      }
    }
    // Charger immédiatement les données indépendantes en parallèle pour réduire l'attente.
    const [{ data: profile, error: profileError }, postsResult, postsCountResult, followersResult, followingResult] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").eq("id", targetId).maybeSingle(),
      supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").eq("user_id", targetId).order("created_at", { ascending: false }).limit(60),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", targetId),
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
    const { data: publicBusiness, error: businessError } = await supabase.from("businesses").select("name,category,description,phone,whatsapp,email,city,address").eq("owner_id", targetId).eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (businessError) console.warn("Fiche professionnelle indisponible :", businessError.message);
    setProfileBusiness(publicBusiness || null);
    setProfileTab("posts");
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
    const { data: people, error: peopleError } = await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").in("id", ids);
    if (peopleError) { setMessage("Impossible de charger les profils : " + peopleError.message); return; }
    setConnectionProfiles((people || []) as Profile[]);
    setConnectionTitle(mode === "followers" ? "Abonnés" : "Abonnements");
    setConnectionsOpen(true);
  }

  async function startProfileEdit() {
    if (!user) { setAuthOpen(true); return; }
    setProfileNameDraft(user.display_name || ""); setProfileUsernameDraft(user.username || ""); setProfileBioDraft(user.bio || ""); setAvatarFile(null); setProfileCoverFile(null);
    setBusinessDraft({ id: "", name: "", category: "Commerce", description: "", phone: "", whatsapp: "", email: "", city: "", address: "", is_published: false });
    setProfileEditorOpen(true); setBusinessLoading(true);
    try {
      const { data, error } = await supabase!.from("businesses").select("id,name,category,description,phone,whatsapp,email,city,address,is_published").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (data) setBusinessDraft({ id: data.id, name: data.name || "", category: data.category || "Commerce", description: data.description || "", phone: data.phone || "", whatsapp: data.whatsapp || "", email: data.email || "", city: data.city || "", address: data.address || "", is_published: Boolean(data.is_published) });
    } catch (err) { setMessage(err instanceof Error ? "Fiche professionnelle : " + err.message : "Impossible de charger la fiche professionnelle."); }
    finally { setBusinessLoading(false); }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault(); if (!supabase || !user) return;
    const username = profileUsernameDraft.trim().toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (username.length < 3) { setMessage("Le nom d’utilisateur doit contenir au moins 3 caractères."); return; }
    setBusy(true); setMessage("");
    try {
      let avatar_url = user.avatar_url || null;
      let cover_url = user.cover_url || null;
      if (profileCoverFile) {
        if (!["image/jpeg","image/png","image/webp"].includes(profileCoverFile.type)) throw new Error("Choisis une couverture JPG, PNG ou WebP.");
        if (profileCoverFile.size > 8 * 1024 * 1024) throw new Error("La couverture doit faire moins de 8 Mo.");
        const coverExt = profileCoverFile.type === "image/png" ? "png" : profileCoverFile.type === "image/webp" ? "webp" : "jpg";
        const coverPath = user.id + "/profile-cover-" + Date.now() + "." + coverExt;
        const { error: coverUploadError } = await supabase.storage.from("post-media").upload(coverPath, profileCoverFile, { contentType: profileCoverFile.type, upsert: true });
        if (coverUploadError) throw coverUploadError;
        cover_url = supabase.storage.from("post-media").getPublicUrl(coverPath).data.publicUrl;
      }
      if (avatarFile) {
        if (!["image/jpeg","image/png","image/webp"].includes(avatarFile.type)) throw new Error("Choisis une photo JPG, PNG ou WebP.");
        if (avatarFile.size > 5 * 1024 * 1024) throw new Error("La photo de profil doit faire moins de 5 Mo.");
        const ext = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const path = user.id + "/avatar-" + Date.now() + "." + ext;
        const { error: uploadError } = await supabase.storage.from("post-media").upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (uploadError) throw uploadError;
        avatar_url = supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl;
      }
      const updated = { id: user.id, display_name: profileNameDraft.trim().slice(0,80) || username, username, bio: profileBioDraft.trim().slice(0,300), avatar_url, cover_url };
      const { error } = await supabase.from("profiles").upsert(updated);
      if (error) throw error;
      const nextUser = { ...user, ...updated }; setUser(nextUser);
      if (viewingProfile?.id === user.id) setViewingProfile(nextUser);
      const businessName = businessDraft.name.trim();
      if (businessName) {
        const businessPayload = { owner_id: user.id, name: businessName.slice(0,120), category: businessDraft.category.trim().slice(0,60) || "Commerce", description: businessDraft.description.trim().slice(0,1000), phone: businessDraft.phone.trim().slice(0,40) || null, whatsapp: businessDraft.whatsapp.trim().slice(0,40) || null, email: businessDraft.email.trim().slice(0,120) || null, city: businessDraft.city.trim().slice(0,100), address: businessDraft.address.trim().slice(0,200), is_published: businessDraft.is_published, updated_at: new Date().toISOString() };
        const businessResult = businessDraft.id
          ? await supabase.from("businesses").update(businessPayload).eq("id", businessDraft.id).eq("owner_id", user.id)
          : await supabase.from("businesses").insert(businessPayload);
        if (businessResult.error) throw businessResult.error;
      }
      setProfileEditorOpen(false); setAvatarFile(null); setProfileCoverFile(null); setMessage(businessName ? "Profil, couverture et fiche professionnelle enregistrés." : "Ton profil et sa couverture ont été mis à jour.");
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
      const { data: originalPosts, error: postsError } = await supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").in("id", ids);
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
  useEffect(() => {
    if (active === "Accueil" && user?.id && homeSuggestedProfiles.length === 0 && !homeSuggestionsLoading) void loadHomeSuggestedProfiles();
  }, [active, user?.id]);
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

  useEffect(() => {
    let alive = true;
    async function loadTaggedPosts() {
      if (!supabase || !viewingProfile || profileTab !== "tagged") return;
      setTaggedLoading(true);
      const { data: mentions, error: mentionError } = await supabase.from("post_mentions").select("post_id").eq("mentioned_user_id", viewingProfile.id).order("created_at", {ascending:false}).limit(60);
      if (mentionError) { if (alive) { setTaggedPosts([]); setMessage("Impossible de charger les identifications : " + mentionError.message); setTaggedLoading(false); } return; }
      const ids = [...new Set((mentions || []).map((row:{post_id:string})=>row.post_id))];
      if (!ids.length) { if (alive) { setTaggedPosts([]); setTaggedLoading(false); } return; }
      const { data: rows, error: postsError } = await supabase.from("posts").select("id,user_id,content,created_at,media_type,media_urls,visibility").in("id",ids).order("created_at",{ascending:false});
      if (postsError) { if (alive) { setMessage("Impossible de charger les publications identifiées : "+postsError.message); setTaggedLoading(false); } return; }
      const authorIds = [...new Set((rows || []).map((p:{user_id:string})=>p.user_id))];
      const { data: authors } = authorIds.length ? await supabase.from("profiles").select("id,username,display_name,avatar_url,cover_url,bio").in("id",authorIds) : {data:[]};
      const authorMap = new Map((authors || []).map((p:Profile)=>[p.id,p]));
      if (alive) { setTaggedPosts((rows || []).map((p:Record<string,unknown>)=>({...p,profiles:authorMap.get(p.user_id as string) || null} as Post))); setTaggedLoading(false); }
    }
    void loadTaggedPosts();
    return () => { alive = false; };
  }, [viewingProfile?.id, profileTab, user?.id]);

  const cleanPostContent = (content: string) => content.replace(/^\s*\[(?:EMI_REEL|EMI_VIDEO_POST)\]\s*/i, "").replace(/\[EMI_MUSIC\][\s\S]*?(?:\[\/EMI_MUSIC\]|$)/gi, "").trim();
  const filteredPosts = viewingProfile ? (profileTab === "tagged" ? taggedPosts.filter(p => !query || cleanPostContent(p.content).toLowerCase().includes(query.toLowerCase())) : profileTab === "shared" ? sharedPosts.filter(p => !query || cleanPostContent(p.content).toLowerCase().includes(query.toLowerCase())) : visiblePosts) : active === "Vidéos" ? visiblePosts.filter(post => post.media_type === "video" && (post.media_urls || []).length > 0) : active === "Accueil" ? visiblePosts : visiblePosts.filter(post => post.media_type !== "video" || !(post.media_urls || []).length);
  const displayedPosts = active !== "Accueil" || viewingProfile
    ? filteredPosts
    : [...filteredPosts].sort((a, b) => {
        const engagement = (post: Post) => (likes[post.id] || 0) + (commentCounts[post.id] || 0) * 2 + (repostCounts[post.id] || 0) * 2;
        const freshness = (post: Post) => {
          const ageHours = Math.max(0, (Date.now() - new Date(post.created_at).getTime()) / 3_600_000);
          return 24 / (24 + ageHours);
        };
        const score = (post: Post) => {
          // Un fil personnalisé doit valoriser les abonnements sans masquer
          // les découvertes récentes et les contenus pertinents de la communauté.
          const followedBoost = user && followedIds.includes(post.user_id) ? 10 : 0;
          const creatorBoost = user?.id === post.user_id ? 3 : 0;
          const engagementScore = Math.log1p(engagement(post)) * 3.5;
          return followedBoost + creatorBoost + engagementScore + freshness(post) * 18;
        };
        if (homeFeedSort === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (homeFeedSort === "popular") return engagement(b) - engagement(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return score(b) - score(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

  return (
    <main className={"app-shell" + (active === "Reels" ? " emi-reels-shell" : "") + (active === "Paramètres" ? " emi-settings-fullscreen" : "")}>
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="EMi accueil"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a>
        <button className="profile-mini profile-mini-button" onClick={() => user ? void openProfile(user.id) : setAuthOpen(true)}><div className="avatar avatar-me">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : user ? displayName.slice(0,2).toUpperCase() : "ME"}</div><div><strong>{user ? displayName : "Bienvenue sur EMi"}</strong><span>{user ? "Voir mon profil" : "Ton espace social"}</span></div></button>
        <nav className="nav-list" aria-label="Navigation principale">
          {[[ "Accueil", Home ], [ "EMi Pulse", Sparkles ], [ "Découvrir", Compass ], [ "Reels", Clapperboard ], [ "Messages", MessageCircle ], [ "Notifications", Bell ], [ "Mon profil", UserRound ]].map(([label, Icon]) => { const title = label as string; const Glyph = Icon as typeof Home; return <button key={title} className={`nav-item ${active === title ? "selected" : ""}`} onClick={() => { setActive(title); if (title === "Notifications") void loadNotifications(); if (["Messages","Notifications","Mon profil"].includes(title) && !user) setAuthOpen(true); }}><span className="nav-icon-wrap"><Glyph size={20}/>{title === "Messages" && unreadMessages > 0 && <span className="emi-nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</span><span>{title}</span></button>; })}
        </nav>
        <button className="create-button" onClick={() => setCreateStudioOpen(true)}><Plus size={20}/> Créer</button>
        <div className="sidebar-bottom">{user ? <button className="nav-item" onClick={logout}><LogOut size={20}/><span>Se déconnecter</span></button> : <button className="nav-item" onClick={() => setAuthOpen(true)}><LogIn size={20}/><span>Connexion / Inscription</span></button>}<div className="sidebar-note"><Sparkles size={16}/><p>Des moments vrais.<br/><strong>Des liens qui comptent.</strong></p></div><span className="version">EMi · Communauté</span></div>
      </aside>

      <section className="main-column">
        {active === "Reels" && <ReelsRoyalScreen posts={posts} initialPostId={pendingReelPostId} userId={user?.id} liked={liked} likes={likes} commentCounts={commentCounts} viewCounts={postViewCounts} repostCounts={repostCounts} reposted={reposted} savedPostIds={savedPostIds} followedIds={followedIds} followPendingIds={followPendingIds} onLike={id => void toggleLike(id)} onComments={post => {setSelectedPostDetail(post);setPostDetailView("comments");void loadComments(post.id);}} onRepost={id => void toggleRepost(id)} onShare={post => void sharePost(post)} onSave={id => togglePostPreference("saved-posts",savedPostIds,setSavedPostIds,id,"Enregistrement")} onFollow={id => void toggleFollow(id)} onProfile={id => void openProfile(id)} onDiscover={() => {setViewingProfile(null);setActive("Découvrir");void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}} onClose={() => {setPendingReelPostId(null);setViewingProfile(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}} formatCount={formatSocialCount}/>}
        {active === "Paramètres" ? <header className="emi-settings-mobile-topbar"><button type="button" className="emi-settings-back" aria-label={settingsSection ? "Retour aux réglages" : "Retour au profil"} onClick={() => { if (settingsSection) { setSettingsSection(null); setSettingsNotice(""); } else { setSettingsSection(null); setActive("Mon profil"); if (user) void openProfile(user.id); window.scrollTo({top:0,behavior:"instant"}); } }}><ChevronLeft size={23}/></button><div className="emi-settings-topbar-title"><span>EMi · ESPACE PERSONNEL</span><strong>{settingsSection ? (({user:"Informations personnelles",edit:"Modifier mon profil",security:"Sécurité et mot de passe",account:"Désactivation et suppression",privacy:"Confidentialité du compte",blocked:"Comptes bloqués",interactions:"Messages et commentaires",sharing:"Stories, mentions et partages",notifications:"Préférences de notifications",quiet:"Ne pas déranger",saved:"Contenus enregistrés",archive:"Archives et souvenirs",content:"Préférences de contenu",appearance:"Apparence et thème",language:"Langue et accessibilité",data:"Données et stockage",help:"Centre d’aide",legal:"Confidentialité et conditions",about:"À propos d’EMi"} as Record<string,string>)[settingsSection] || "Réglages") : "Réglages et confidentialité"}</strong></div><span className="emi-settings-topbar-mark">e<span>.</span></span></header> : (viewingProfile || active !== "Accueil") && <header className="mobile-header emi-mobile-royal-header">{(viewingProfile || active !== "Accueil") && <button className="icon-button back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={23}/></button>}<a className="emi-mobile-royal-brand" href="#" onClick={e => { e.preventDefault(); goBack(); }} aria-label="EMi accueil"><span className="emi-mobile-royal-emblem">e</span><span className="emi-mobile-royal-wordmark"><strong>EMi<span>.</span></strong><small>L’UNIVERS SOCIAL ROYAL</small></span></a><button className="icon-button emi-mobile-royal-account" aria-label="Compte" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? <LogOut size={21}/> : <UserRound size={21}/>}</button></header>}
        {!viewingProfile && active === "Accueil" && <><section className="emi-royal-masthead" aria-label="En-tête EMi nouvelle génération">
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
        </section>
        </>}
        <div className={"feed-header" + (active === "Accueil" && !viewingProfile ? " home-feed-header" : "")}>{(viewingProfile || active !== "Accueil") && <button className="icon-button desktop-back-navigation" aria-label="Retour à l’accueil" onClick={goBack}><ChevronLeft size={22}/></button>}<div><span className="eyebrow">{viewingProfile ? "EMi · PROFIL PERSONNEL" : "TON UNIVERS, TES LIENS"}</span><h1>{viewingProfile ? currentProfileName : active === "Accueil" ? "Le fil des moments" : active === "EMi Pulse" ? "EMi Pulse" : active === "Découvrir" ? "Découvrir EMi" : active === "Vidéos" ? "Vidéos" : active === "Messages" ? "Ta messagerie" : active === "Paramètres" ? "Paramètres et activité" : active}</h1><p>{viewingProfile ? "@" + (viewingProfile.username || "membre") : active === "Découvrir" ? "Explore les univers, rencontre des personnes et découvre les nouveautés de la communauté." : active === "Messages" ? "Retrouve tes conversations au même endroit." : active === "Vidéos" ? "Les vidéos de la communauté." : user ? "Connecté en tant que " + displayName : "Découvre les publications publiques."}</p></div>{active !== "Découvrir" && <button className="round-action" onClick={() => setCreateStudioOpen(true)} aria-label="Créer une publication"><Plus size={22}/></button>}</div>
        {viewingProfile && <section className="profile-page emi-profile-pro">
          <div className="emi-profile-cover" style={viewingProfile.cover_url ? {backgroundImage:"linear-gradient(180deg,rgba(4,20,14,.08),rgba(4,20,14,.55)),url("+JSON.stringify(viewingProfile.cover_url)+")",backgroundSize:"cover",backgroundPosition:"center"} : undefined}>
            <div className="emi-profile-cover-glow"/>
            {user?.id===viewingProfile.id && <button type="button" className="emi-profile-cover-edit" onClick={()=>{startProfileEdit();}}> <ImageIcon size={15}/> Modifier la couverture</button>}
            
            <button type="button" className="emi-profile-more-trigger" aria-label="Plus d’actions du profil" aria-expanded={profileMoreOpen} onClick={()=>setProfileMoreOpen(value=>!value)}>•••</button>
          </div>
          <div className="emi-profile-identity-card">
            <div className="emi-profile-avatar-frame">
              <div className="profile-page-avatar">{viewingProfile.avatar_url ? <img src={viewingProfile.avatar_url} alt={"Photo de " + currentProfileName}/> : <span>{currentProfileName.slice(0,2).toUpperCase()}</span>}{user?.id===viewingProfile.id && onlineNow && <span className="emi-online-dot" title="En ligne" aria-label="En ligne"/>}</div>
            </div>
            <div className="emi-profile-name-block">
              <div className="emi-profile-name-line"><h2>{currentProfileName}</h2>{user?.id===viewingProfile.id && <ShieldCheck size={19} className="emi-profile-verified" aria-label="Compte propriétaire"/>}</div>
              <span className="profile-username">@{viewingProfile.username || "membre"}</span>
              <p className="emi-profile-bio">{viewingProfile.bio?.trim() || "Bienvenue dans mon univers EMi ✨"}</p>
            </div>
          </div>
          <div className="emi-profile-stats">
            <div><strong>{profilePostCount}</strong><span>Publications</span></div>
            <button type="button" onClick={() => void loadProfileConnections(viewingProfile.id,"followers")}><strong>{profileFollowerCount}</strong><span>Abonnés</span></button>
            <button type="button" onClick={() => void loadProfileConnections(viewingProfile.id,"following")}><strong>{profileFollowingCount}</strong><span>Abonnements</span></button>
          </div>
          <div className="emi-profile-actions">
            {user?.id===viewingProfile.id ? <>
              <button className="emi-profile-primary-action" onClick={startProfileEdit}><Settings size={17}/> Modifier mon profil</button>
              <button className="emi-profile-secondary-action" onClick={()=>void shareProfile(viewingProfile)}><Share2 size={17}/> Partager</button>
              <button className="emi-profile-secondary-action emi-profile-settings-entry" onClick={()=>{setActive("Paramètres");setSettingsSection(null);setSettingsNotice("");window.scrollTo({top:0,behavior:"smooth"});}}><Settings size={17}/> Réglages et confidentialité</button>
            </> : user ? <>
              <button className="emi-profile-primary-action" onClick={()=>void toggleFollow(viewingProfile.id)}>{followPendingIds.includes(viewingProfile.id) ? "En cours…" : followedIds.includes(viewingProfile.id) ? "Abonné(e)" : "Suivre"}</button>
              <button className="emi-profile-secondary-action" onClick={()=>void startConversation(viewingProfile)} disabled={chatLoading}><MessageCircle size={17}/> Message</button>
            </> : <button className="emi-profile-primary-action" onClick={()=>setAuthOpen(true)}>Se connecter</button>}
            {profileMoreOpen && <div className="emi-profile-menu-backdrop" onClick={()=>setProfileMoreOpen(false)} aria-hidden="true"/>}
            {profileMoreOpen && <div className="emi-profile-action-menu" role="menu">
              <button role="menuitem" onClick={()=>{setProfileMoreOpen(false);void shareProfile(viewingProfile);}}><Share2 size={17}/> Partager le profil</button>
              <button role="menuitem" onClick={()=>{setProfileMoreOpen(false);void copyProfileLink(viewingProfile);}}><Copy size={17}/> Copier le lien du profil</button>
              {user?.id!==viewingProfile.id && <><button role="menuitem" onClick={()=>void blockProfile(viewingProfile)}><Ban size={17}/> Bloquer ce compte</button><button role="menuitem" onClick={()=>{setProfileMoreOpen(false);setMessage("Le signalement sera transmis au centre d’assistance EMi dans une prochaine phase.");}}><Sparkles size={17}/> Signaler ce compte</button></>}
            </div>}
          </div>
          {profileBusiness && <section className="emi-profile-business">
            <div className="emi-profile-section-heading"><span>VITRINE PROFESSIONNELLE</span><strong>{profileBusiness.name}</strong></div>
            <p className="emi-profile-business-category">{profileBusiness.category}</p>
            {profileBusiness.description && <p className="emi-profile-business-description">{profileBusiness.description}</p>}
            <p className="emi-profile-business-location">{[profileBusiness.city,profileBusiness.address].filter(Boolean).join(" · ")}</p>
            <div className="emi-profile-business-links">
              {profileBusiness.whatsapp && <a href={"https://wa.me/"+profileBusiness.whatsapp.replace(/[^0-9]/g,"")} target="_blank" rel="noreferrer">WhatsApp</a>}
              {profileBusiness.phone && <a href={"tel:"+profileBusiness.phone}>Appeler</a>}
              {profileBusiness.email && <a href={"mailto:"+profileBusiness.email}>E-mail</a>}
            </div>
          </section>}
          <div className="emi-profile-content-tabs" role="tablist" aria-label="Contenus du profil">
            <button role="tab" aria-selected={profileTab==="posts"} className={profileTab==="posts"?"selected":""} onClick={()=>setProfileTab("posts")}><ImageIcon size={17}/> Publications</button>
            <button role="tab" aria-selected={profileTab==="shared"} className={profileTab==="shared"?"selected":""} onClick={()=>setProfileTab("shared")}><Repeat2 size={17}/> Reposts</button>
            <button role="tab" aria-selected={profileTab==="tagged"} className={profileTab==="tagged"?"selected":""} onClick={()=>setProfileTab("tagged")}><UserRound size={17}/> Identifications</button>
          </div>

        </section>}
        {!viewingProfile && <>
        <section className="stories-card" aria-label="Stories EMi" style={{display:["Vidéos","Découvrir","Messages"].includes(active) ? "none" : undefined}}>
          <div className="stories-heading"><div><span className="stories-eyebrow">À partager maintenant</span><strong>Stories</strong></div><button className="stories-create" onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else { setStoryStep("choose"); setStoryComposerOpen(true); } }}><Camera size={16}/> Créer une story</button></div>
          <div className="stories-row">
            {(!user||!stories.some(item=>item.user_id===user.id))&&<button className="story story-create-tile" onClick={() => { if (!user) { setAuthOpen(true); setMessage("Connecte-toi pour partager une story."); } else { setStoryStep("choose"); setStoryComposerOpen(true); } }} aria-label="Ajouter ma story">
              <span className="story-ring story-add"><span className="story-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt=""/> : <UserRound size={25}/>}</span><span className="story-plus"><Plus size={15}/></span>{user && onlineNow && <span className="story-online-dot" title="Tu es en ligne" aria-label="Tu es en ligne"/>}</span><span className="story-name">{user ? "Ma story" : "Ajouter"}</span>
            </button>}
            {Array.from(stories.reduce((groups, item) => { const group = groups.get(item.user_id) || []; group.push(item); groups.set(item.user_id, group); return groups; }, new Map<string, Story[]>()).entries()).map(([authorKey, authorStories]) => { const story = authorStories[0]; const author = story.profiles?.display_name || story.profiles?.username || "Membre EMi"; const isOnline = authorStories.some(item => onlineProfileIds.includes(item.user_id) || (item.user_id === user?.id && onlineNow)); return <button className="story" key={authorKey} onClick={() => setActiveStory(story)} aria-label={"Voir les " + authorStories.length + " statut(s) de " + author + (isOnline ? ", en ligne" : "")}>
              <span className="story-ring story-media-ring"><span className="story-avatar story-media-thumb">{story.profiles?.avatar_url ? <img className="story-author-avatar" src={story.profiles.avatar_url} alt=""/> : story.media_type === "image" ? <img src={story.media_url} alt={"Statut de " + author}/> : <span className="story-video-thumb"><img src="/emi-story-video.svg" alt="Vidéo"/><Video size={16}/></span>}</span>{isOnline && <span className="story-online-dot" title={author + " est en ligne"} aria-label={author + " est en ligne"}/>}<span className="story-stack-count" aria-label={authorStories.length + " statuts"}>{authorStories.length}</span></span>
              <span className="story-name">{author}</span><span className="story-time">{new Date(story.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}</span>
            </button>; })}
            {stories.length === 0 && <span className="stories-empty">Les stories de la communauté apparaîtront ici.</span>}
          </div>
        </section>
        {active === "Accueil" && !viewingProfile && whatsAppEmiPublications.length > 0 && <section aria-label="Stories WhatsApp relayées vers EMi" style={{margin:"12px 0 18px",padding:"14px",borderRadius:20,border:"1px solid rgba(232,207,125,.3)",background:"linear-gradient(135deg,rgba(5,38,29,.98),rgba(10,20,19,.98))"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:12}}><strong style={{fontSize:15,color:"#f1d98a"}}>WhatsApp · #EMI</strong><span style={{fontSize:11,opacity:.75}}>Expire après 24 h</span></div>
          <div style={{display:"grid",gap:14}}>{whatsAppEmiPublications.map(item => <article key={item.id} style={{overflow:"hidden",borderRadius:14,background:"rgba(255,255,255,.045)"}}>
            {item.media_url && item.media_type === "image" && <img src={item.media_url} alt={item.texte || "Publication relayée depuis WhatsApp"} loading="lazy" style={{display:"block",width:"100%",maxHeight:520,objectFit:"cover"}}/>}
            {item.media_url && item.media_type === "video" && <video src={item.media_url} controls playsInline preload="metadata" style={{display:"block",width:"100%",maxHeight:520,background:"#000"}}/>}
            {item.texte && <p style={{padding:"12px 13px",margin:0,whiteSpace:"pre-wrap",overflowWrap:"anywhere",fontSize:14,lineHeight:1.5}}>{item.texte.replace(/#emi/ig,"").trim()}</p>}
            <div style={{padding:"0 13px 11px",fontSize:10,opacity:.65}}>{new Date(item.created_at).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})} · {item.source_type === "whatsapp_status" ? "Statut WhatsApp" : "Message WhatsApp"}</div>
          </article>)}</div>
        </section>}
        
        {active === "Découvrir" && !viewingProfile && <section className="emi-explorer-page" aria-label="Explorer EMi">
          <header className="emi-explorer-heading">
            <div className="emi-explorer-heading-mark"><Compass size={23}/></div>
            <div><span className="emi-explorer-kicker">EMi · ROYAL DISCOVERY</span><h1>Explorer <em>EMi.</em></h1><p>Découvre les personnes, les talents et les univers de ta communauté.</p></div>
          </header>
          <section className="emi-explorer-search-panel" aria-label="Recherche de membres">
            <div className="emi-explorer-section-title"><div><span className="emi-explorer-eyebrow">COMMUNAUTÉ EMi</span><h2>Trouver des personnes</h2><p>Développe ton réseau et rencontre les membres.</p></div><span className="emi-explorer-title-icon"><Users size={20}/></span></div>
            <div className="emi-explorer-search-row"><label className="discovery-search"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => {if(e.key==="Enter")void loadExploreProfiles();}} placeholder="Nom, pseudo ou biographie…" aria-label="Rechercher des membres"/></label><button className="emi-people-search-button" onClick={() => void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading ? "Recherche…" : <><Search size={17}/> Rechercher</>}</button></div>
            <div className="emi-explorer-list-heading"><div><strong>{query.trim() ? "Résultats de recherche" : "Membres à découvrir"}</strong><small>{query.trim() ? "Membres correspondant à ta recherche" : "Suggestions de la communauté"}</small></div><span>{exploreProfiles.length}</span></div>
            <div className="discovery-list">{exploreProfiles.map(profile => <article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={() => void openProfile(profile.id)}><span className="discovery-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt=""/> : (profile.display_name || profile.username || "M").slice(0,2).toUpperCase()}</span><span><strong>{(profile.display_name && !["membre","membre emi","utilisateur","user","unknown","inconnu","sans nom"].includes(profile.display_name.trim().toLocaleLowerCase("fr-FR")) ? profile.display_name.trim() : profile.username?.trim().replace(/^@/,""))}{hasBlueVerificationBadge(profile.display_name,profile.username) && <span className="emi-people-verified" aria-label="Profil vérifié">✓</span>}</strong><small>{profile.username && profile.username.replace(/^@/,"").toLocaleLowerCase("fr-FR") !== (profile.display_name || "").trim().toLocaleLowerCase("fr-FR") ? "@"+profile.username.replace(/^@/,"") : ""}</small>{profile.bio && <small className="discovery-bio">{profile.bio}</small>}</span></button><div className="discovery-person-actions"><button className="profile-back-button" onClick={() => void openProfile(profile.id)}>Profil</button>{user && <><button className="emi-people-follow-button" onClick={() => void toggleFollow(profile.id)}>{followedIds.includes(profile.id) ? "Suivi" : "Suivre"}</button><button className="emi-people-message-button" onClick={() => void startConversation(profile)}>Message</button></>}</div></article>)}{!exploreLoading && exploreProfiles.length===0 && <div className="emi-explorer-empty"><Compass size={24}/><strong>Ta communauté t’attend</strong><span>Lance une recherche pour découvrir les membres EMi.</span></div>}</div>
          </section>
          <section className="emi-explorer-univers" aria-label="Univers EMi">
            <div className="emi-explorer-section-title"><div><span className="emi-explorer-eyebrow">TOUT L’ÉCOSYSTÈME</span><h2>Les univers EMi</h2><p>Accède directement aux services de la communauté.</p></div><span className="emi-explorer-title-icon cyan"><Sparkles size={20}/></span></div>
            <div className="emi-explorer-univers-grid">
              <a href="/annonces/elite-directory" className="emi-explorer-universe-card"><span className="emi-explorer-universe-icon"><BriefcaseBusiness size={21}/></span><span className="emi-explorer-universe-copy"><strong>EMi PRO</strong><small>Annuaire professionnel et talents</small></span><ChevronRight size={18}/></a>
              <a href="/annonces/philanthropy" className="emi-explorer-universe-card"><span className="emi-explorer-universe-icon"><Heart size={21}/></span><span className="emi-explorer-universe-copy"><strong>EMi Fondation</strong><small>Initiatives solidaires et projets</small></span><ChevronRight size={18}/></a>
              <a href="/annonces/tontine" className="emi-explorer-universe-card"><span className="emi-explorer-universe-icon"><Users size={21}/></span><span className="emi-explorer-universe-copy"><strong>Djangui Flow</strong><small>Groupes et cotisations</small></span><ChevronRight size={18}/></a>
              <a href="/annonces/master-health-check" className="emi-explorer-universe-card"><span className="emi-explorer-universe-icon"><CircleHelp size={21}/></span><span className="emi-explorer-universe-copy"><strong>EMi Help</strong><small>Entraide et accompagnement</small></span><ChevronRight size={18}/></a>
              <a href="/annonces" className="emi-explorer-universe-card"><span className="emi-explorer-universe-icon"><Repeat2 size={21}/></span><span className="emi-explorer-universe-copy"><strong>EMi Troc</strong><small>Échange et économie circulaire</small></span><ChevronRight size={18}/></a>
            </div>
          </section>
        </section>}
        <div className="feed-tabs" style={{display:["Accueil","Découvrir","Messages"].includes(active) ? "none" : undefined}}><button className={active === "Accueil" ? "tab-active" : ""} onClick={() => {setActive("Accueil"); void loadFeed();}}>Publications</button><button className={active === "Abonnements" ? "tab-active" : ""} onClick={() => void loadFollowingFeed()}>Abonnements</button></div>
        </>}

        {active === "Accueil" && !viewingProfile && <div className="emi-feed-discovery-bar" role="group" aria-label="Trier le fil d’actualité"><div><span>TON FIL EMi</span><strong>À découvrir</strong></div><div className="emi-feed-sort"><button type="button" className={homeFeedSort === "for-you" ? "is-active" : ""} aria-pressed={homeFeedSort === "for-you"} onClick={() => setHomeFeedSort("for-you")}>Pour toi</button><button type="button" className={homeFeedSort === "recent" ? "is-active" : ""} aria-pressed={homeFeedSort === "recent"} onClick={() => setHomeFeedSort("recent")}>Récents</button><button type="button" className={homeFeedSort === "popular" ? "is-active" : ""} aria-pressed={homeFeedSort === "popular"} onClick={() => setHomeFeedSort("popular")}>Populaires</button></div></div>}
        {active === "Accueil" && !viewingProfile && user && <section aria-label="Personnes et créateurs à suivre" style={{margin:"0 0 22px",padding:"17px 16px 16px",border:"1px solid rgba(210,177,83,.42)",borderRadius:20,background:"linear-gradient(135deg,rgba(7,45,31,.98),rgba(5,25,20,.98) 62%,rgba(35,29,13,.92))",boxShadow:"0 12px 30px rgba(0,0,0,.18)",overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:5}}>
            <div><span style={{display:"block",fontSize:9,fontWeight:800,letterSpacing:1.8,color:"#dfc16c"}}>AGRANDIS TON CERCLE</span><h2 style={{margin:"5px 0 0",fontSize:18,fontWeight:800,color:"#fff7df",letterSpacing:"-.4px"}}>Personnes à suivre</h2></div>
            <button type="button" onClick={()=>void loadHomeSuggestedProfiles()} disabled={homeSuggestionsLoading} aria-label="Actualiser les suggestions" style={{border:"1px solid rgba(222,190,102,.5)",borderRadius:12,width:38,height:38,background:"rgba(255,255,255,.05)",color:"#efd47d",fontSize:18}}>{homeSuggestionsLoading?"…":"↻"}</button>
          </div>
          <p style={{margin:"0 0 14px",fontSize:11,color:"#b7c9bd"}}>Découvre des membres et créateurs qui font vivre la communauté EMi.</p>
          {homeSuggestedProfiles.length>0 ? <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
            {homeSuggestedProfiles.slice(0,4).map(profile=><article key={profile.id} style={{minWidth:0,padding:"13px 10px 11px",border:"1px solid rgba(224,197,119,.2)",borderRadius:16,background:"linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025))",display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center"}}>
              <button type="button" onClick={()=>void openProfile(profile.id)} aria-label={"Voir le profil de "+(profile.display_name||profile.username||"ce membre")} style={{width:58,height:58,borderRadius:"50%",padding:2,border:"1.5px solid #d8b95e",background:"linear-gradient(135deg,#0dbb78,#d8b95e)",marginBottom:9,overflow:"hidden",color:"#f9e6a8",fontWeight:800}}>
                {profile.avatar_url?<img src={profile.avatar_url} alt="" loading="lazy" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:<span style={{display:"grid",placeItems:"center",height:"100%",borderRadius:"50%",background:"#103a2b"}}>{(profile.display_name||profile.username||"M").slice(0,2).toUpperCase()}</span>}
              </button>
              <strong style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,maxWidth:"100%",fontSize:11,color:"#fff8e8",overflowWrap:"anywhere"}}>{(profile.display_name && !["membre","membre emi","utilisateur","user","unknown","inconnu","sans nom"].includes(profile.display_name.trim().toLocaleLowerCase("fr-FR")) ? profile.display_name.trim() : profile.username?.trim().replace(/^@/,""))}{hasBlueVerificationBadge(profile.display_name,profile.username)&&<BadgeCheck size={14} fill="#1877F2" color="#fff" aria-label="Profil vérifié"/>}</strong>
              {profile.display_name?.trim() && !["membre","membre emi","utilisateur","user","unknown","inconnu","sans nom"].includes(profile.display_name.trim().toLocaleLowerCase("fr-FR")) && profile.username?.trim() && !["membre","utilisateur","user","unknown","inconnu"].includes(profile.username.trim().toLocaleLowerCase("fr-FR").replace(/^@/,"")) && profile.username.trim().replace(/^@/,"").toLocaleLowerCase("fr-FR") !== profile.display_name.trim().toLocaleLowerCase("fr-FR") && <span style={{marginTop:3,fontSize:9,color:"#b6c9bd"}}>@{profile.username.trim().replace(/^@/,"")}</span>}
              {profile.bio&&<p style={{width:"100%",margin:"7px 0 10px",fontSize:9,lineHeight:1.45,color:"#c1cbbf",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{profile.bio}</p>}
              <div style={{display:"flex",gap:6,width:"100%",marginTop:"auto",paddingTop:profile.bio?0:10}}>
                <button type="button" onClick={()=>void toggleFollow(profile.id)} disabled={followPendingIds.includes(profile.id)} style={{flex:1,minWidth:0,padding:"8px 5px",border:0,borderRadius:9,background:followedIds.includes(profile.id)?"rgba(255,255,255,.1)":"linear-gradient(110deg,#e8d18a,#c5a64d)",color:followedIds.includes(profile.id)?"#f2e7c2":"#14291d",fontSize:10,fontWeight:800}}>{followPendingIds.includes(profile.id)?"…":followedIds.includes(profile.id)?"Suivi":"Suivre"}</button>
                <button type="button" onClick={()=>void openProfile(profile.id)} aria-label="Ouvrir le profil" style={{width:34,flex:"0 0 34px",border:"1px solid rgba(224,197,119,.35)",borderRadius:9,background:"rgba(255,255,255,.04)",color:"#e7d18a",fontSize:15}}>↗</button>
              </div>
            </article>)}
          </div> : <div style={{padding:"15px 10px",borderRadius:13,background:"rgba(255,255,255,.035)",textAlign:"center",color:"#c1cbbf",fontSize:11}}>{homeSuggestionsLoading?"Recherche de membres à te présenter…":"Tu suis déjà les membres proposés. Reviens bientôt découvrir de nouveaux profils."}</div>}
          <button type="button" onClick={()=>{setActive("Découvrir");setPeopleDiscoveryOpen(true);if(exploreProfiles.length===0)void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",marginTop:12,padding:"10px 12px",border:"1px solid rgba(222,190,102,.3)",borderRadius:11,background:"rgba(0,0,0,.12)",color:"#e8d18a",fontSize:10,fontWeight:700}}>Découvrir toute la communauté <ChevronRight size={14}/></button>
        </section>}

        {active === "Paramètres" && <section className="emi-settings-page">
          {!settingsSection ? <><div className="emi-settings-hero"><span className="emi-settings-crest"><Settings size={24}/></span><div><span className="eyebrow">EMi · ESPACE PERSONNEL</span><h2>Réglages</h2><p>Ton univers, ton identité, tes choix.</p></div></div>
          {user && <section className="emi-settings-profile-card" aria-label="Profil et publications personnelles">
            <div className="emi-settings-profile-main">
              <div className="emi-settings-profile-avatar">{user.avatar_url ? <img src={user.avatar_url} alt={"Photo de "+(user.display_name||user.username||"profil")}/> : <span>{(user.display_name||user.username||"EM").slice(0,2).toUpperCase()}</span>}</div>
              <div className="emi-settings-profile-identity"><h3>{user.display_name||user.username||"Membre EMi"}</h3><span>@{user.username||"membre"}</span><p>{user.bio?.trim()||"Rêve · Crée · Partage · Inspire"}</p></div>
              <button type="button" className="emi-settings-edit-profile" onClick={startProfileEdit}><Settings size={15}/> Modifier</button>
            </div>
            <div className="emi-settings-profile-stats"><div><strong>{posts.filter(p=>p.user_id===user.id).length}</strong><span>Publications</span></div><div><strong>{profileFollowerCount}</strong><span>Abonnés</span></div><div><strong>{profileFollowingCount}</strong><span>Abonnements</span></div></div>
            <div className="emi-settings-own-posts-heading"><strong>Mes publications</strong><button type="button" onClick={()=>{setViewingProfile(user);setProfileTab("posts");setActive("Mon profil");window.scrollTo({top:0,behavior:"smooth"});}}>Voir tout <ChevronRight size={15}/></button></div>
            <div className="emi-settings-own-posts">{posts.filter(p=>p.user_id===user.id).slice(0,4).map(post=><button type="button" key={post.id} className="emi-settings-own-post" aria-label="Ouvrir ma publication" onClick={()=>{setViewingProfile(user);setProfileTab("posts");setActive("Mon profil");window.scrollTo({top:0,behavior:"smooth"});}}>{post.media_urls?.[0] ? (post.media_type==="video" ? <video src={post.media_urls[0]} muted playsInline preload="metadata"/> : <img src={post.media_urls[0]} alt="Ma publication" loading="lazy"/>) : <span><ImageIcon size={22}/></span>}</button>)}{posts.filter(p=>p.user_id===user.id).length===0&&<p className="emi-settings-posts-empty">Tes photos et vidéos publiées apparaîtront ici.</p>}</div>
          </section>}
          <div className="emi-settings-groups">
            {([{title:"MON COMPTE",items:[["Informations personnelles","Gère les informations de ton profil","user"],["Modifier mon profil","Photo, nom, pseudo et biographie","edit"],["Sécurité et mot de passe","Protège l’accès à ton compte","security"],["Désactivation et suppression","Gérer ton compte EMi","account"]]}, {title:"CONFIDENTIALITÉ",items:[["Confidentialité du compte","Choisis qui peut voir ton contenu","privacy"],["Comptes bloqués","Gère les membres bloqués","blocked"],["Messages et commentaires","Contrôle les interactions","interactions"],["Stories, mentions et partages","Choisis comment ton contenu circule","sharing"]]}, {title:"NOTIFICATIONS",items:[["Préférences de notifications","Choisis les alertes que tu reçois","notifications"],["Ne pas déranger","Gère tes moments de tranquillité","quiet"]]}, {title:"MON UNIVERS",items:[["Contenus enregistrés","Retrouve tes publications sauvegardées","saved"],["Archives et souvenirs","Retrouve tes stories archivées","archive"],["Préférences de contenu","Personnalise ce que tu découvres","content"]]}, {title:"APPLICATION",items:[["Apparence et thème","Personnalise l’expérience EMi","appearance"],["Langue et accessibilité","Rends EMi plus confortable","language"],["Données et stockage","Gère la qualité et les données","data"]]}, {title:"AIDE ET INFORMATIONS",items:[["Centre d’aide","Obtiens de l’assistance","help"],["Confidentialité et conditions","Découvre les règles d’EMi","legal"],["À propos d’EMi","Version et informations","about"]]}] as {title:string;items:string[][]}[]).map(group=><div className="emi-settings-group" key={group.title}><h3>{group.title}</h3>{group.items.map(([label,desc,key])=><button className="emi-settings-row" key={key} onClick={()=>{setSettingsSection(key);setSettingsNotice("");if(key==="blocked")void loadBlockedProfiles();window.scrollTo({top:0,behavior:"instant"});}}><span className="emi-settings-row-icon">{key==="security"?<ShieldCheck/>:key==="privacy"?<LockKeyhole/>:key==="saved"?<Bookmark/>:key==="archive"?<Archive/>:key==="notifications"?<Bell/>:key==="appearance"?<Palette/>:key==="language"?<Languages/>:key==="blocked"?<Ban/>:key==="sharing"?<Share2/>:key==="data"?<Smartphone/>:key==="help"||key==="legal"?<CircleHelp/>:key==="interactions"?<Eye/>:key==="quiet"?<Clock3/>:key==="content"?<SlidersHorizontal/>:<UserRoundCog/>}</span><span className="emi-settings-row-copy"><strong>{label}</strong><small>{desc}</small></span><ChevronRight size={19}/></button>)}</div>)}
          </div>{user && <div className="emi-settings-logout-wrap"><div className="emi-settings-logout-label">SESSION</div><button className="emi-settings-logout" onClick={() => {setSettingsSection(null);void logout();}}><LogOut size={18}/><span><strong>Se déconnecter</strong><small>Fermer ta session EMi sur cet appareil</small></span><ChevronRight size={18}/></button></div>}
          </> : <><header className="emi-settings-subhead"><button className="profile-back-button" onClick={()=>setSettingsSection(null)}><ChevronLeft size={19}/> Retour</button><span className="eyebrow">PARAMÈTRES EMi</span></header><h2 className="emi-settings-subtitle">({({user:"Informations personnelles",edit:"Modifier mon profil",security:"Sécurité et mot de passe",account:"Désactivation et suppression",privacy:"Confidentialité du compte",blocked:"Comptes bloqués",interactions:"Messages et commentaires",sharing:"Stories, mentions et partages",notifications:"Préférences de notifications",quiet:"Ne pas déranger",saved:"Contenus enregistrés",archive:"Archives et souvenirs",content:"Préférences de contenu",appearance:"Apparence et thème",language:"Langue et accessibilité",data:"Données et stockage",help:"Centre d’aide",legal:"Confidentialité et conditions",about:"À propos d’EMi"} as Record<string,string>)[settingsSection] || "Paramètres"}</h2><div className="emi-settings-detail">
            {settingsSection==="privacy" ? <><p>Gère ici les préférences de visibilité de ton profil.</p><label className="emi-setting-toggle"><span><strong>Compte privé</strong><small>Cette option restera indisponible tant que les demandes d’abonnement et l’approbation des abonnés ne seront pas reliées aux règles d’accès. Nous ne voulons pas afficher un faux niveau de protection.</small></span><input type="checkbox" checked={false} disabled aria-label="Compte privé indisponible"/></label><label className="emi-setting-toggle"><span><strong>Masquer les compteurs de J’aime</strong><small>Masquer les nombres de J’aime sur ton écran. Cette préférence est enregistrée sur ton compte et te suit sur tes appareils.</small></span><input type="checkbox" checked={hideLikeCounts} disabled={preferencesLoading || !user} onChange={e=>void saveHideLikeCounts(e.target.checked)}/></label>{preferencesLoading && <p className="emi-settings-note">Enregistrement…</p>}</> : settingsSection==="edit" ? <><p>Modifie les informations visibles sur ton profil.</p><button className="modal-primary emi-settings-action" onClick={()=>{setSettingsSection(null);startProfileEdit();}}>Ouvrir la modification du profil</button></> : settingsSection==="security" ? <><p>Protège ton compte EMi.</p><button className="emi-settings-action" onClick={()=>{setAuthOpen(true);setRecoveryMode(true);setSettingsNotice("Suis les étapes de récupération pour définir un nouveau mot de passe.");}}>Récupérer ou modifier mon mot de passe</button><p className="emi-settings-note">La gestion des appareils connectés et la vérification renforcée seront ajoutées dans une prochaine étape.</p></> : settingsSection==="blocked" ? <><p>Les membres que tu bloques ne sont pas avertis. Tu peux les débloquer ici à tout moment.</p>{blockedLoading && <p className="emi-settings-note">Chargement des comptes bloqués…</p>}<div className="emi-settings-saved-list">{blockedProfiles.map(profile=><div className="emi-settings-row" key={profile.id}><span className="emi-settings-row-icon">{profile.avatar_url?<img src={profile.avatar_url} alt="" />:<Ban size={18}/>}</span><span className="emi-settings-row-copy"><strong>{profile.display_name||profile.username||"Membre EMi"}</strong><small>@{profile.username||"membre"}</small></span><button type="button" className="emi-settings-edit-profile" onClick={()=>void unblockProfile(profile.id)}>Débloquer</button></div>)}{!blockedLoading && blockedProfiles.length===0 && <p className="emi-settings-note">Aucun compte bloqué pour le moment.</p>}</div></> : settingsSection==="notifications" ? <><div className="emi-notification-settings-intro"><span className="emi-notification-settings-icon"><Bell size={22}/></span><div><strong>Notifications sur cet appareil</strong><small>Choisis d’abord si EMi peut envoyer des alertes sur ce téléphone.</small></div></div><div className="emi-notification-status"><span>Autorisation du navigateur</span><strong>{typeof window !== "undefined" && "Notification" in window ? (Notification.permission === "granted" ? "Autorisée" : Notification.permission === "denied" ? "Bloquée dans Android / Chrome" : "Pas encore demandée") : "Non prise en charge"}</strong></div><button className="modal-primary emi-settings-action" disabled={pushBusy || !user} onClick={() => void enablePushNotifications()}><Bell size={17}/>{pushBusy ? "Activation en cours…" : pushEnabled ? "Notifications activées sur cet appareil" : "Activer les notifications"}</button>{!user && <p className="emi-settings-note">Connecte-toi à ton compte pour enregistrer cet appareil.</p>}<div className="emi-notification-scope"><strong>Alertes prises en charge</strong><ul><li>Nouveaux messages</li><li>Abonnements et interactions</li><li>J’aime, commentaires et réactions aux stories</li></ul></div><p className="emi-settings-note">Les catégories individuelles et les horaires « Ne pas déranger » ne sont pas encore reliés au serveur. Ils ne seront pas affichés comme réglages actifs tant que leur sauvegarde réelle n’est pas disponible.</p></> : settingsSection==="quiet" ? <p>Les horaires « Ne pas déranger » seront connectés aux préférences de notifications EMi.</p> : settingsSection==="saved" ? <><p>Retrouve tes publications enregistrées sur ton compte, sur tous tes appareils.</p><div className="emi-settings-saved-list">{posts.filter(post=>savedPostIds.includes(post.id)).map(post=><button type="button" className="emi-settings-row" key={post.id} onClick={()=>{setSelectedPostDetail(post);setPostDetailView("post");}}><span className="emi-settings-row-icon"><Bookmark size={18}/></span><span className="emi-settings-row-copy"><strong>{post.profiles?.display_name||post.profiles?.username||"Publication EMi"}</strong><small>{(post.content||"Photo ou vidéo enregistrée").slice(0,90)}</small></span><ChevronRight size={18}/></button>)}{!savedPostIds.length&&<p className="emi-settings-note">Aucune publication enregistrée. Utilise le menu ⋯ d’une publication puis « Enregistrer ».</p>}</div></> : settingsSection==="archive" ? <><p>Retrouve et restaure les publications archivées sur ton compte, sur tous tes appareils.</p><div className="emi-settings-saved-list">{posts.filter(post=>archivedPostIds.includes(post.id)).map(post=><div className="emi-settings-row" key={post.id}><span className="emi-settings-row-icon"><Archive size={18}/></span><span className="emi-settings-row-copy"><strong>{post.profiles?.display_name||post.profiles?.username||"Publication EMi"}</strong><small>{(post.content||"Photo ou vidéo archivée").slice(0,90)}</small></span><button type="button" className="emi-settings-edit-profile" onClick={()=>togglePostPreference("archived-posts",archivedPostIds,setArchivedPostIds,post.id,"Restauration")}>Restaurer</button></div>)}{!archivedPostIds.length&&<p className="emi-settings-note">Aucune publication archivée. Le menu ⋯ de tes publications permet de les archiver.</p>}</div></> : settingsSection==="appearance" ? <><p>Choisis l’apparence de ton univers EMi.</p><div className="emi-theme-preview"><span/> <div><strong>Royal futuriste</strong><small>Vert émeraude · Or champagne</small></div><span className="emi-theme-current">Actuel</span></div></> : settingsSection==="language" ? <p>Langue actuelle : Français. D’autres langues et options d’accessibilité seront ajoutées progressivement.</p> : settingsSection==="about" ? <><p>EMi — des moments vrais, des liens qui rapprochent.</p><p className="emi-settings-note">Application en évolution · Version publique</p></> : <p>Cette rubrique est prévue dans la feuille de route EMi. Nous la connecterons à des fonctionnalités réelles avant d’activer ses commandes.</p>}
            {settingsNotice && <p className="emi-settings-note" role="status">{settingsNotice}</p>}
          </div></>}
        </section>}
        {active === "Notifications" && !viewingProfile && <section className="discovery-panel">
          <div className="section-label"><strong>Notifications</strong><button onClick={() => void loadNotifications()}>Actualiser ↻</button></div>
          {notificationsLoading && <p className="chat-empty">Chargement des notifications…</p>}
          <div className="discovery-list">{notifications.map(note => <article key={note.id} className="discovery-person" style={{opacity:note.is_read?0.72:1,borderColor:note.is_read?"var(--line)":"#8d6de0"}}>
            <span className="discovery-avatar">{note.actor?.avatar_url?<img src={note.actor.avatar_url} alt=""/>:(note.actor?.display_name||note.actor?.username||"EM").slice(0,2).toUpperCase()}</span>
            <button className="discovery-person-main" onClick={() => void openMessageActivity(note)}><span><strong>{note.actor?.display_name||note.actor?.username||"EMi"}</strong><small>{note.message}</small><small>{new Date(note.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></span></button>
            {!note.is_read && <span className="notification-unread-dot" aria-label="Non lue"/>}
          </article>)}
          {!notificationsLoading && notifications.length===0 && <div className="empty-feature"><Bell size={28}/><h2>Tu es à jour</h2><p>Les nouveaux abonnements, interactions et messages apparaîtront ici. Les commandes sont réservées à l’espace vendeur.</p></div>}</div>
        </section>}
        {active === "Messages" && !viewingProfile && <section className="emi-messenger" aria-label="Messagerie EMi">
          <aside className={`emi-messenger-inbox ${activeConversation ? "is-conversation-open" : ""}`}>
            <header className="emi-messenger-brand">
              <div className="emi-messenger-brand-user">{user?.avatar_url?<img src={user.avatar_url} alt="Mon profil"/>:<UserRound size={25}/>}<i/></div>
              <div className="emi-messenger-brand-title"><strong>EMi<span>.</span></strong><small>L’UNIVERS SOCIAL ROYAL</small></div>
              <button type="button" aria-label="Trouver un membre" onClick={()=>{setActive("Découvrir");void loadExploreProfiles();}}><Search size={21}/></button>
              <button type="button" className="emi-messenger-bell" aria-label="Activité" onClick={()=>{setMessagesInboxTab("activity");void loadMessageActivity();}}><Bell size={20}/>{unreadNotifications>0&&<b>{unreadNotifications>9?"9+":unreadNotifications}</b>}</button>
            </header>
            <nav className="emi-messenger-tabs" aria-label="Filtres de messagerie">
              <button className={messagesInboxTab==="chats"&&chatFilter==="Tout"?"active":""} onClick={()=>{setMessagesInboxTab("chats");setChatFilter("Tout");}}><MessageCircle size={17}/> Messages</button>
              <button className={messagesInboxTab==="chats"&&chatFilter==="Groupes"?"active":""} onClick={()=>{setMessagesInboxTab("chats");setChatFilter("Groupes");}}><Users size={17}/> Groupes</button>
              <button className={messagesInboxTab==="activity"?"active":""} onClick={()=>{setMessagesInboxTab("activity");void loadMessageActivity();}}><Bell size={16}/> Activité</button>
            </nav>
            {messagesInboxTab==="chats" ? <>
              <label className="emi-messenger-search"><Search size={19}/><input value={chatSearch} onChange={e=>setChatSearch(e.target.value)} placeholder="Rechercher une conversation…"/><button type="button" aria-label="Filtrer les messages non lus" onClick={()=>setChatFilter(chatFilter==="Non lus"?"Tout":"Non lus")}><SlidersHorizontal size={19}/></button></label>
              <div className="emi-messenger-list">
                {conversations.filter((conv)=>{const title=(conv.is_group?conv.title||"Groupe EMi":conv.other?.display_name||conv.other?.username||conv.title||"Conversation").toLowerCase();return (chatFilter!=="Groupes"||conv.is_group)&&(chatFilter!=="Non lus"||(conv.unreadCount||0)>0)&&title.includes(chatSearch.toLowerCase());}).map(conv=><button key={conv.id} className={`emi-messenger-item ${activeConversation===conv.id?"selected":""}`} onClick={()=>void openConversation(conv.id)}>
                  <span className="emi-messenger-avatar">{conv.other?.avatar_url?<img src={conv.other.avatar_url} alt=""/>:(conv.other?.display_name||conv.other?.username||conv.title||"EM").slice(0,2).toUpperCase()}{!conv.is_group&&onlineProfileIds.includes(conv.other?.id||"")&&<i/>}</span>
                  <span className="emi-messenger-item-copy"><strong>{conv.is_group?conv.title||"Groupe EMi":conv.other?.display_name||conv.other?.username||conv.title||"Conversation"}{!conv.is_group&&hasBlueVerificationBadge(conv.other?.display_name,conv.other?.username)&&<BadgeCheck size={15}/>}</strong><small>{conv.lastMessage||"Commencez à discuter"}</small></span>
                  <span className="emi-messenger-item-meta"><time>{conv.created_at?new Date(conv.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):""}</time>{(conv.unreadCount||0)>0&&<b>{(conv.unreadCount||0)>99?"99+":(conv.unreadCount||0)}</b>}</span>
                </button>)}
                {conversations.length===0&&<div className="emi-messenger-empty">{chatLoading?"Chargement des conversations…":"Aucune conversation pour le moment."}</div>}
                {conversations.length>0&&conversations.filter((conv)=>{const title=(conv.is_group?conv.title||"Groupe EMi":conv.other?.display_name||conv.other?.username||conv.title||"Conversation").toLowerCase();return (chatFilter!=="Groupes"||conv.is_group)&&(chatFilter!=="Non lus"||(conv.unreadCount||0)>0)&&title.includes(chatSearch.toLowerCase());}).length===0&&<div className="emi-messenger-empty">Aucun résultat pour cette recherche.</div>}
              </div>
              <button type="button" className="emi-messenger-new" onClick={()=>{setActive("Découvrir");void loadExploreProfiles();}}><Plus size={18}/> Nouveau message</button>
              <button type="button" className="emi-messenger-create-group" onClick={()=>void createGroupConversation()} disabled={chatLoading}>+ Créer un groupe</button>
            </> : <section className="emi-messenger-activity">
              <div className="emi-messenger-activity-title"><strong>Activité reçue</strong><button type="button" onClick={()=>void loadMessageActivity()}>Actualiser ↻</button></div>
              {notificationsLoading&&<p>Chargement…</p>}
              {!notificationsLoading&&notifications.length===0&&<p>Aucune activité pour le moment.</p>}
              {notifications.map(note=><button key={note.id} type="button" className="emi-messenger-activity-item" onClick={()=>void openMessageActivity(note)}><span className="emi-messenger-avatar">{note.actor?.avatar_url?<img src={note.actor.avatar_url} alt=""/>:(note.actor?.display_name||"EM").slice(0,2).toUpperCase()}</span><span><strong>{note.actor?.display_name||note.actor?.username||"EMi"}</strong><small>{note.message}</small></span>{!note.is_read&&<i/>}</button>)}
            </section>}
          </aside>
          <section className={`emi-messenger-chat ${activeConversation?"has-active-chat":""}`}>
            {!activeConversation ? <div className="emi-messenger-welcome"><span className="emi-messenger-welcome-icon"><MessageCircle size={32}/></span><h2>Ta messagerie EMi</h2><p>Sélectionne une conversation pour reprendre le fil de tes échanges.</p><button type="button" onClick={()=>{setActive("Découvrir");void loadExploreProfiles();}}>Trouver un membre <ChevronRight size={16}/></button></div> : <>
              <header className="emi-messenger-chat-header">
                <button type="button" className="emi-messenger-back" onClick={()=>setActiveConversation(null)} aria-label="Retour aux conversations"><ChevronLeft size={22}/></button>
                <span className="emi-messenger-avatar large">{conversations.find(conv=>conv.id===activeConversation)?.other?.avatar_url?<img src={conversations.find(conv=>conv.id===activeConversation)?.other?.avatar_url||""} alt=""/>:(conversations.find(conv=>conv.id===activeConversation)?.other?.display_name||"EM").slice(0,2).toUpperCase()}<i/></span>
                <span className="emi-messenger-chat-identity"><strong>{conversations.find(conv=>conv.id===activeConversation)?.is_group?conversations.find(conv=>conv.id===activeConversation)?.title||"Groupe EMi":conversations.find(conv=>conv.id===activeConversation)?.other?.display_name||conversations.find(conv=>conv.id===activeConversation)?.other?.username||"Conversation privée"}{hasBlueVerificationBadge(conversations.find(conv=>conv.id===activeConversation)?.other?.display_name,conversations.find(conv=>conv.id===activeConversation)?.other?.username)&&<BadgeCheck size={16}/>}</strong><small>{conversations.find(conv=>conv.id===activeConversation)?.is_group?"Groupe privé":onlineProfileIds.includes(conversations.find(conv=>conv.id===activeConversation)?.other?.id||"")?"● En ligne":"Conversation privée"}</small></span>
                <div className="emi-messenger-chat-actions"><button type="button" disabled title="Appel audio bientôt disponible" aria-label="Appel audio bientôt disponible"><Phone size={19}/></button><button type="button" disabled title="Appel vidéo bientôt disponible" aria-label="Appel vidéo bientôt disponible"><Video size={19}/></button>{conversations.find(conv=>conv.id===activeConversation)?.is_group&&<button type="button" onClick={()=>void addGroupMembers()} title="Ajouter des membres"><Users size={18}/></button>}</div>
              </header>
              <div className="emi-messenger-messages" aria-live="polite">
                {chatMessages.map(msg=><div key={msg.id} className={`emi-messenger-message-row ${msg.sender_id===user?.id?"mine":"theirs"}`}><div className="emi-messenger-bubble">{msg.content&&msg.content!=="Message vocal"&&<p>{msg.content}</p>}{msg.media_url&&(msg.media_type==="video"?<video src={msg.media_url} controls playsInline className="chat-media"/>:msg.media_type==="audio"?<audio src={msg.media_url} controls preload="metadata" className="emi-chat-audio"/>:<img src={msg.media_url} alt="Média partagé" className="chat-media"/>)}<time>{new Date(msg.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}{msg.sender_id===user?.id?"  ✓✓":""}</time></div></div>)}
                {chatMessages.length===0&&<div className="emi-messenger-first-message">Cette conversation est prête. Envoie ton premier message.</div>}
              </div>
              <form className="emi-messenger-composer" onSubmit={sendChatMessage}>
                <input ref={chatMediaInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/webm,audio/mp4,audio/mpeg,audio/ogg" onChange={e=>setChatMediaFile(e.target.files?.[0]||null)} hidden/>
                <div className="emi-messenger-attachment-tools"><button type="button" onClick={()=>chatMediaInput.current?.click()} aria-label="Joindre une image ou vidéo" title="Image ou vidéo"><ImageIcon size={20}/></button><button type="button" onClick={()=>chatMediaInput.current?.click()} aria-label="Prendre une photo ou vidéo" title="Appareil photo"><Camera size={20}/></button><button type="button" onClick={()=>chatMediaInput.current?.click()} aria-label="Joindre un document ou audio" title="Document"><Copy size={19}/></button><button type="button" onClick={()=>chatMediaInput.current?.click()} aria-label="Joindre un fichier" title="Joindre un fichier"><Plus size={20}/></button></div>
                <div className="emi-messenger-input-row">{voiceRecording?<><span className="emi-recording-label">● Enregistrement · {voiceSeconds}s</span><button type="button" className="emi-messenger-send" onClick={stopVoiceRecording} aria-label="Terminer le vocal"><Send size={20}/></button></>:<><button type="button" className="emi-messenger-emoji" onClick={()=>setChatDraft(value=>value+" 😊")} aria-label="Ajouter un emoji"><Smile size={20}/></button><input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={5000} placeholder={chatMediaFile?chatMediaFile.name:"Écrire un message…"} aria-label="Écrire un message" disabled={!user}/><button type="button" className="emi-messenger-mic" onClick={()=>void startVoiceRecording()} disabled={chatLoading} aria-label="Message vocal"><Mic size={19}/></button><button type="submit" className="emi-messenger-send" disabled={!chatDraft.trim()&&!chatMediaFile||chatLoading} aria-label="Envoyer le message"><Send size={20}/></button></>}</div>
              </form>
            </>}
          </section>
        </section>}
        {publishSuccess && <div role="dialog" aria-modal="true" aria-labelledby="emi-publish-success-title" style={{position:"fixed",inset:0,zIndex:10000,display:"grid",placeItems:"center",padding:20,background:"rgba(5,7,12,.82)",backdropFilter:"blur(14px)"}}><section style={{width:"min(100%,420px)",borderRadius:28,padding:24,background:"linear-gradient(155deg,#171522,#0b1118 72%)",border:"1px solid rgba(177,143,255,.45)",boxShadow:"0 24px 100px #0009",color:"#fff",textAlign:"center"}}><div style={{width:76,height:76,margin:"4px auto 18px",display:"grid",placeItems:"center",borderRadius:"50%",background:"rgba(42,210,137,.13)",border:"2px solid #35d99a",color:"#35d99a"}}><ShieldCheck size={40}/></div><span style={{fontSize:11,letterSpacing:2,color:"#c9adff",fontWeight:800}}>EMi · PUBLICATION</span><h2 id="emi-publish-success-title" style={{fontSize:25,lineHeight:1.2,margin:"10px 0"}}>Publication envoyée avec succès !</h2><p style={{color:"#c6c2d3",fontSize:14,lineHeight:1.6,margin:"0 0 18px"}}>Ton contenu a bien été enregistré sur EMi. Il est prêt à être découvert par la communauté.</p>{publishSuccess.caption&&<p style={{fontSize:13,color:"#f0edf7",margin:"0 0 18px",overflowWrap:"anywhere"}}>{publishSuccess.caption}</p>}<button type="button" onClick={()=>{setPublishSuccess(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}} style={{width:"100%",padding:"14px 18px",border:0,borderRadius:15,background:"linear-gradient(100deg,#7545ff,#9a55f5)",color:"#fff",fontWeight:800,fontSize:15,boxShadow:"0 8px 26px #7545ff55"}}>Voir ma publication</button><button type="button" onClick={()=>setPublishSuccess(null)} style={{width:"100%",padding:13,marginTop:9,borderRadius:15,border:"1px solid #51485f",background:"transparent",color:"#f3efff",fontWeight:700}}>Retour à EMi</button></section></div>}{incomingMessageNotice && <button className="emi-incoming-toast" role="status" onClick={() => { setIncomingMessageNotice(""); setActive("Messages"); }}><MessageCircle size={18}/><span><strong>EMi · Nouveau message</strong><small>{incomingMessageNotice}</small></span></button>}
        {message && <div className="demo-note" role="status"><Sparkles size={16}/><span>{message}</span><button style={{marginLeft:"auto",background:"none",border:0,color:"inherit"}} onClick={() => setMessage("")} aria-label="Fermer"><X size={15}/></button></div>}
        {active === "EMi Pulse" && !viewingProfile && <section className="emi-vibes-page">
          <header className="emi-vibes-hero"><div className="emi-vibes-orb"><Sparkles size={30}/></div><span className="eyebrow">EMi PULSE · LE RADAR DE L’ÉCOSYSTÈME</span><h2>Le radar vivant de la communauté.</h2><p>Un seul espace pour repérer les publications qui émergent, découvrir des talents, explorer les profils locaux et retrouver les opportunités et initiatives de la communauté EMi.</p><div className="emi-vibes-badges"><span><TrendingUp size={13}/> Signaux & tendances</span><span><Users size={13}/> Talents à découvrir</span><span><ShieldCheck size={13}/> Découvertes responsables</span></div></header>
          <div className="emi-vibes-search"><Search size={18}/><input value={vibesSearch} onChange={e=>setVibesSearch(e.target.value)} placeholder="Rechercher une personne ou une publication…" aria-label="Rechercher dans EMi Pulse"/></div>
          <div className="emi-vibes-tabs">{["Pour toi","Tendances","Talents","Près de moi","Opportunités","Initiatives"].map(tab=><button key={tab} className={vibesTab===tab?"selected":""} onClick={()=>{setVibesTab(tab);if(tab==="Talents"||tab==="Près de moi")void loadExploreProfiles();}}>{tab}</button>)}</div>
          <div className="emi-vibes-section-head"><div><span className="eyebrow">RADAR EMi · CONTENUS & OPPORTUNITÉS</span><h3>{vibesTab==="Tendances"?"À la une":vibesTab==="Talents"?"Talents & créateurs":vibesTab==="Près de moi"?"Découvertes locales":vibesTab==="Opportunités"?"Projets & opportunités":vibesTab==="Initiatives"?"Initiatives solidaires":"À découvrir"}</h3></div><span className="emi-vibes-live"><span/> Communauté EMi</span></div>
          {(vibesTab==="Talents"||vibesTab==="Près de moi") ? <div className="discovery-list">{exploreProfiles.filter(p=>!vibesSearch||(p.display_name||p.username||"").toLowerCase().includes(vibesSearch.toLowerCase())).map(profile=><article className="discovery-person" key={profile.id}><button className="discovery-person-main" onClick={()=>void openProfile(profile.id)}><span className="avatar">{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:(profile.display_name||profile.username||"EM").slice(0,2).toUpperCase()}</span><span><strong>{profile.display_name||profile.username||"Membre EMi"}</strong><small>@{profile.username||"membre"}</small></span></button><button className="profile-back-button" onClick={()=>void openProfile(profile.id)}>Voir le profil <ChevronRight size={15}/></button></article>)}{exploreProfiles.length===0&&<div className="emi-vibes-empty"><div className="emi-vibes-empty-icon"><Users size={26}/></div><h3>Découvre la communauté</h3><p>Explore les profils disponibles sur EMi.</p><button onClick={()=>void loadExploreProfiles()} disabled={exploreLoading}>{exploreLoading?"Chargement…":"Charger les profils"} <ChevronRight size={16}/></button></div>}</div> : <div className="emi-pulse-grid">{[{title:"Tendances",desc:"Publications à découvrir dans la communauté.",icon:TrendingUp,tab:"Tendances"},{title:"Talents & créateurs",desc:"Artistes, créateurs et profils inspirants.",icon:Mic2,tab:"Talents"},{title:"Près de chez toi",desc:"Membres et découvertes locales.",icon:Compass,tab:"Près de moi"},{title:"Opportunités",desc:"Emploi, formations et collaborations.",icon:Sparkles,tab:"Opportunités"},{title:"Initiatives solidaires",desc:"Projets et actions communautaires.",icon:Heart,tab:"Initiatives"}].map(item=><button type="button" key={item.title} className="emi-pulse-card" onClick={()=>{setVibesTab(item.tab);if(item.tab==="Talents"||item.tab==="Près de moi")void loadExploreProfiles();}}><span className="emi-pulse-card-icon"><item.icon size={22}/></span><strong>{item.title}</strong><p>{item.desc}</p><span className="emi-pulse-card-link">Explorer <ChevronRight size={15}/></span></button>)}</div>}
          {(vibesTab==="Pour toi"||vibesTab==="Tendances")&&<div className="emi-pulse-posts"><div className="emi-vibes-section-head"><div><span className="eyebrow">SIGNAUX DE LA COMMUNAUTÉ</span><h3>Publications à explorer</h3></div><button onClick={()=>{setActive("Accueil");void loadFeed();}}>Tout voir <ChevronRight size={15}/></button></div>{posts.filter(p=>(!vibesSearch||(p.content||"").replace(/^\\s*\\[EMI_REEL\\]\\s*/,"").toLowerCase().includes(vibesSearch.toLowerCase())||(p.profiles?.display_name||p.profiles?.username||"").toLowerCase().includes(vibesSearch.toLowerCase()))).slice(0,6).map(post=><article className="emi-pulse-post" key={post.id}><div className="emi-pulse-post-author"><span className="emi-pulse-avatar">{post.profiles?.avatar_url?<img src={post.profiles.avatar_url} alt=""/>:(post.profiles?.display_name||post.profiles?.username||"EM").slice(0,2).toUpperCase()}</span><div><strong>{post.profiles?.display_name||post.profiles?.username||"Membre EMi"}</strong><small>@{post.profiles?.username||"membre"} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</small></div></div>{post.content&&<p>{post.content.split("[EMI_MUSIC]")[0].trim()||"Un moment partagé avec la communauté EMi."}</p>}{(post.media_urls||[]).length>0&&(post.media_type==="video"?<video className="emi-pulse-media" src={post.media_urls[0]} controls playsInline preload="metadata"/>:<img className="emi-pulse-media" src={post.media_urls[0]} alt="Publication de la communauté EMi" loading="lazy" decoding="async"/>)}<div className="emi-pulse-post-footer"><span><Heart size={15}/> Publication EMi</span><button onClick={()=>{setActive("Accueil");void loadFeed();}}>Voir la publication <ChevronRight size={15}/></button></div></article>)}{posts.length===0&&<p className="emi-vibes-empty">Aucune publication à mettre en avant pour le moment. Les nouveautés de la communauté apparaîtront ici.</p>}</div>}
          {(vibesTab==="Opportunités"||vibesTab==="Initiatives")&&<div className="emi-vibes-empty"><div className="emi-vibes-empty-icon">{vibesTab==="Opportunités"?<Sparkles size={26}/>:<Heart size={26}/>}</div><h3>{vibesTab==="Opportunités"?"Les opportunités ont leur place ici.":"Les initiatives qui comptent."}</h3><p>Cette rubrique sert à repérer les offres, projets, formations et initiatives partagés sur EMi. Elle se remplira à mesure que ces contenus seront publiés et vérifiables.</p><button onClick={()=>setActive("Découvrir")}>Explorer la communauté <ChevronRight size={16}/></button></div>}
          <div className="emi-vibes-note"><ShieldCheck size={16}/><span>Les contenus et profils proviennent d’EMi. Les offres et événements ne sont pas présentés comme vérifiés sans confirmation de leur source.</span></div>
        </section>}
        {active === "EMi Pulse" ? null : active === "Paramètres" ? null : active === "Découvrir" && !viewingProfile ? null : active === "Messages" && !viewingProfile ? null: !supabase ? <div className="post-card"><h2>Connexion à configurer</h2><p>Les variables d’environnement Supabase sont absentes. Vérifie NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel.</p></div> : (viewingProfile && profileTab === "tagged" && taggedLoading) ? <div className="post-card" style={{padding:24,textAlign:"center"}}>Chargement des identifications…</div> : filteredPosts.length === 0 ? <div className="post-card profile-tab-empty" style={{padding:28,textAlign:"center"}}><div className="modal-icon" style={{margin:"0 auto 16px"}}><Sparkles size={23}/></div><h2 style={{fontSize:20}}>{viewingProfile && profileTab === "shared" ? "Aucun repartage pour le moment" : viewingProfile && profileTab === "tagged" ? "Aucune identification pour le moment" : query ? "Aucun résultat" : active === "Vidéos" ? "Aucune vidéo pour le moment" : viewingProfile ? "Aucune publication pour le moment" : "Le fil commence ici"}</h2><p style={{color:"#aaa6b7",fontSize:13,lineHeight:1.7}}>{viewingProfile && profileTab === "shared" ? "Les publications que ce membre a repartagées apparaîtront ici." : viewingProfile && profileTab === "tagged" ? "Les publications dans lesquelles ce membre est identifié apparaîtront ici." : query ? "Essaie un autre mot." :  viewingProfile ? "Les moments partagés par ce membre apparaîtront ici." : "Aucune publication réelle n’est encore disponible. Sois le premier à partager un moment."}</p>{(!viewingProfile || (user?.id === viewingProfile.id && profileTab === "posts")) && <button className="modal-primary" style={{maxWidth:260}} onClick={() => setComposerOpen(true)}>Créer une publication</button>}</div> :
        <div className={"feed-list" + (viewingProfile ? " profile-media-grid" : "")}>{displayedPosts.map(post => { const author = post.profiles?.display_name || post.profiles?.username || "Membre EMi"; return <article id={"emi-post-" + post.id} data-post-id={post.id} className={"emi-feed-post " + "post-card" + (viewingProfile ? " profile-grid-post" : "")} key={post.id}><div className="post-top"><button className="post-avatar-button" onClick={() => void openProfile(post.user_id)} aria-label={"Voir le profil de " + author}><div className="avatar avatar-sunset">{post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt=""/> : author.slice(0,2).toUpperCase()}</div></button><button className="post-author post-author-button" onClick={() => void openProfile(post.user_id)}><strong className="emi-author-name">{author}{hasBlueVerificationBadge(post.profiles?.display_name, post.profiles?.username) && <span className="emi-verified-badge" role="img" aria-label="Profil vérifié par EMi" title="Profil vérifié par EMi"><BadgeCheck size={19} fill="#1877F2" stroke="#FFFFFF" strokeWidth={2.2}/></span>}</strong><span>@{post.profiles?.username || "membre"} · {new Date(post.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</span></button><button type="button" className="profile-more-action" aria-label="Options de la publication" aria-haspopup="dialog" onClick={()=>setOpenPostMenu(post)} style={{marginLeft:"auto",border:0,background:"transparent",color:"inherit",padding:8,fontSize:22,lineHeight:1}}>•••</button>{user && user.id !== post.user_id && <button className="emi-follow-button" onClick={() => void toggleFollow(post.user_id)} style={{marginLeft:"8px",border:"1px solid #393643",borderRadius:9,padding:"7px 10px",background:followedIds.includes(post.user_id)?"#282235":"#a78bfa17",color:"#d8c9ff",fontSize:11}}>{followPendingIds.includes(post.user_id) ? "…" : followedIds.includes(post.user_id) ? "Suivi" : "Suivre"}</button>}</div>{post.content && <><div className="post-caption-wrap"><p className="post-caption" style={expandedCaptions.includes(post.id)?undefined:{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{cleanPostContent(post.content).split("[EMI_MUSIC]")[0].trim()}</p>{cleanPostContent(post.content).split("[EMI_MUSIC]")[0].trim().length>180&&<button type="button" onClick={()=>setExpandedCaptions(old=>old.includes(post.id)?old.filter(id=>id!==post.id):[...old,post.id])} style={{border:0,background:"transparent",color:"#c5b7f6",fontWeight:700,padding:"2px 0 8px"}}>{expandedCaptions.includes(post.id)?"Voir moins":"Voir plus"}</button>}</div>{post.content.includes("[EMI_MUSIC]") && (()=>{try{const track=JSON.parse(post.content.split("[EMI_MUSIC]")[1].split("[/EMI_MUSIC]")[0]) as {url:string;title:string;start?:number;end?:number};const audioId="emi-track-"+post.id;const hasVideo=post.media_type==="video";return <div className="emi-post-music" data-emi-music-row="true" data-post-id={post.id}><span className="emi-post-music-icon"><Music2 size={17}/></span><span className="emi-post-music-title"><strong>{track.title}</strong><small>{hasVideo ? "Musique synchronisée avec la vidéo" : "Musique du moment · EMi Music"}</small></span><audio id={audioId} className="emi-post-audio" preload="none" src={track.url} data-track-start={track.start||0} aria-label={"Musique "+track.title} onPlay={e=>{if((track.start||0)>0 && e.currentTarget.currentTime<(track.start||0))e.currentTarget.currentTime=track.start||0;document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other=>{if(other!==e.currentTarget)other.pause();});}} onTimeUpdate={e=>{if((track.end||0)>0 && e.currentTarget.currentTime>= (track.end||0)){e.currentTarget.pause();e.currentTarget.currentTime=track.start||0;}}}/></div>}catch{return null}})()}</>}{(post.media_urls || []).length > 1 ? <div style={{position:"relative",width:"100%"}}><div className="emi-post-gallery" id={"emi-gallery-"+post.id} aria-label={"Carrousel de "+post.media_urls.length+" photos"} style={{width:"100%",height:"min(100vw,650px)",minHeight:320,maxHeight:650,display:"flex",flexDirection:"row",flexWrap:"nowrap",overflowX:"auto",overflowY:"hidden",scrollSnapType:"x mandatory",scrollBehavior:"smooth",overscrollBehaviorX:"contain",WebkitOverflowScrolling:"touch",touchAction:"pan-x",background:"#09090d",scrollbarWidth:"none"}}>{(post.media_urls || []).map((url,i) => <div key={url+i} style={{flex:"0 0 100%",flexShrink:0,minWidth:"100%",width:"100%",height:"100%",scrollSnapAlign:"start",scrollSnapStop:"always",position:"relative",display:"grid",placeItems:"center",background:"#09090d"}}>{post.media_type === "video" ? <video src={url} controls muted={!postSoundEnabled[post.id]} playsInline preload="metadata" className="emi-feed-video"  style={{width:"100%",height:"100%",objectFit:"contain"}} onPlay={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.currentTime=e.currentTarget.currentTime;audio.muted=!postSoundEnabled[post.id];if(!audio.muted)void audio.play().catch(()=>undefined);}}}/> : <img src={url} alt={"Photo "+(i+1)+" de la publication"} loading="lazy" decoding="async" onClick={()=>{setSelectedPostDetail(post);setPostDetailView("post");}} style={{width:"100%",height:"100%",objectFit:"contain",cursor:"zoom-in"}}/>}<span style={{position:"absolute",top:12,right:12,padding:"6px 10px",borderRadius:99,background:"#092b20dd",color:"#f6d85f",fontSize:12,fontWeight:700}}>{i+1}/{post.media_urls.length}</span></div>)}</div>{!viewingProfile&&(post.media_type==="video"||post.content.includes("[EMI_MUSIC]"))&&<button type="button" className="emi-feed-sound-toggle emi-gallery-sound-toggle emi-photo-music-toggle" style={{position:"absolute",right:12,bottom:12,zIndex:100,display:"flex",visibility:"visible",opacity:1,pointerEvents:"auto"}} aria-label={postSoundEnabled[post.id]?"Couper le son":"Activer le son"} aria-pressed={!!postSoundEnabled[post.id]} onClick={()=>{const next=!(postSoundEnabled[post.id]??false);setPostSoundEnabled(old=>({...old,[post.id]:next}));const card=document.getElementById("emi-post-"+post.id);const video=card?.querySelector<HTMLVideoElement>("video.emi-feed-video");const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(video)video.muted=!next;if(audio){audio.muted=!next;if(next){if(video)audio.currentTime=video.currentTime;audio.volume=1;void audio.play().catch(()=>undefined);}else audio.pause();}}}>{postSoundEnabled[post.id]?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{postSoundEnabled[post.id]?"Son activé":"Son coupé"}</span></button>}<button type="button" aria-label="Photo précédente" onClick={()=>{const el=document.getElementById("emi-gallery-"+post.id);el?.scrollBy({left:-(el.clientWidth||300),behavior:"smooth"});}} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",border:"1px solid #ffffff66",background:"#10101099",color:"#fff",fontSize:25,zIndex:2,display:"grid",placeItems:"center"}}>‹</button><button type="button" aria-label="Photo suivante" onClick={()=>{const el=document.getElementById("emi-gallery-"+post.id);el?.scrollBy({left:el.clientWidth||300,behavior:"smooth"});}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:38,height:38,borderRadius:"50%",border:"1px solid #ffffff66",background:"#10101099",color:"#fff",fontSize:25,zIndex:2,display:"grid",placeItems:"center"}}>›</button></div> : (post.media_urls || []).map((url,i) => post.media_type === "video" ? <div key={url+i} className="emi-feed-media-wrap"><video src={url} controls={false} autoPlay={false} onClick={() => { if (!viewingProfile) { setPendingReelPostId(post.id); setActive("Reels"); window.scrollTo({top:0,behavior:"instant"}); } }} aria-label="Ouvrir cette vidéo dans EMi Reels" muted={!postSoundEnabled[post.id]} loop playsInline preload="none" className="emi-feed-video"  onPlay={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.currentTime=video.currentTime;audio.muted=!postSoundEnabled[post.id];if(!audio.muted)void audio.play().catch(()=>undefined);}}} onPause={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.pause();}} onSeeking={e=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio)audio.currentTime=e.currentTarget.currentTime;}} onTimeUpdate={e=>{const video=e.currentTarget;const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio&&Math.abs(audio.currentTime-video.currentTime)>0.35)audio.currentTime=video.currentTime;}} onEnded={()=>{const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){audio.pause();audio.currentTime=0;}}} style={{width:"100%",maxHeight:560,borderRadius:0,background:"#09090d",objectFit:"contain"}}/>{!viewingProfile&&<button type="button" className="emi-feed-sound-toggle" aria-label={postSoundEnabled[post.id]?"Couper le son":"Activer le son"} aria-pressed={!!postSoundEnabled[post.id]} onClick={()=>{const next=!(postSoundEnabled[post.id]??false);setPostSoundEnabled(old=>({...old,[post.id]:next}));const card=document.getElementById("emi-post-"+post.id);const video=card?.querySelector<HTMLVideoElement>("video.emi-feed-video");const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(video){video.muted=!next;if(next)void video.play().catch(()=>undefined);}if(audio){audio.muted=!next;if(next){if(video){try{audio.currentTime=video.currentTime;}catch{}}audio.volume=1;void audio.play().catch(()=>undefined);}else audio.pause();}}}>{postSoundEnabled[post.id]?<Volume2 size={17}/>:<VolumeX size={17}/>}</button>}</div> : <div key={url+i} className="emi-feed-media-wrap"><img src={url} alt="Publication partagée sur EMi" loading="lazy" decoding="async" onClick={()=>{setSelectedPostDetail(post);setPostDetailView("post");}} style={{width:"100%",maxHeight:650,objectFit:"contain",borderRadius:0,background:"#09090d",cursor:"zoom-in"}}/>{true&&!viewingProfile&&post.content.includes("EMI_MUSIC")&&<button type="button" className="emi-feed-sound-toggle emi-photo-music-toggle" style={{position:"absolute",right:12,bottom:12,zIndex:100,display:"flex",visibility:"visible",opacity:1,pointerEvents:"auto"}} aria-label={postSoundEnabled[post.id]?"Couper la musique":"Écouter la musique"} aria-pressed={!!postSoundEnabled[post.id]} onClick={e=>{e.preventDefault();e.stopPropagation();const next=!(postSoundEnabled[post.id]??false);setPostSoundEnabled(old=>({...old,[post.id]:next}));const audio=document.getElementById("emi-track-"+post.id) as HTMLAudioElement|null;if(audio){document.querySelectorAll<HTMLAudioElement>(".emi-post-music audio").forEach(other=>{if(other!==audio)other.pause();});audio.muted=!next;if(next){audio.volume=1;void audio.play().catch(()=>undefined);}else audio.pause();}}}>{postSoundEnabled[post.id]?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{postSoundEnabled[post.id]?"Son activé":"Son coupé"}</span></button>}</div>)}<div className="post-actions"><button className={liked.includes(post.id) ? "liked" : ""} onClick={() => void toggleLike(post.id)} aria-label={liked.includes(post.id) ? "Retirer le J’aime" : "J’aime"}><Heart size={27} fill={liked.includes(post.id) ? "currentColor" : "none"}/><span>{hideLikeCounts ? "•••" : formatSocialCount(likes[post.id] || 0)}</span></button><button onClick={() => { setSelectedPostDetail(post); setPostDetailView("comments"); void loadComments(post.id); }} aria-label="Ouvrir les commentaires"><MessageCircle size={27}/><span>{formatSocialCount(commentCounts[post.id] || 0)}</span></button><button className={reposted.includes(post.id) ? "liked" : ""} onClick={() => void toggleRepost(post.id)} aria-label={reposted.includes(post.id) ? "Annuler le repartage" : "Repartager"}><Repeat2 size={27}/><span>{formatSocialCount(repostCounts[post.id] || 0)}</span></button><button onClick={() => { if (navigator.share) void navigator.share({title:"EMi",text:post.content,url:location.href}).catch(()=>{}); else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi."); }} aria-label="Partager"><Send size={27}/></button><button className={savedPostIds.includes(post.id) ? "is-saved" : ""} onClick={() => togglePostPreference("saved-posts",savedPostIds,setSavedPostIds,post.id,"Enregistrement")} aria-label={savedPostIds.includes(post.id) ? "Retirer des enregistrements" : "Enregistrer"}><Bookmark size={26} fill={savedPostIds.includes(post.id) ? "currentColor" : "none"}/></button></div>{openComments.includes(post.id) && <div className="comments-panel" style={{borderTop:"1px solid #2b2b35",marginTop:14,paddingTop:12}}><div style={{display:"grid",gap:10,marginBottom:12}}>{(comments[post.id] || []).map(comment => <div key={comment.id} style={{fontSize:12,lineHeight:1.6}}><strong>{comment.profiles?.display_name || comment.profiles?.username || "Membre"} </strong><span style={{color:"#d0ced9",overflowWrap:"anywhere"}}>{comment.content}</span></div>)}{comments[post.id]?.length === 0 && <p style={{fontSize:12,color:"#92919f"}}>Aucun commentaire. Lance la conversation !</p>}</div><form onSubmit={e => void addComment(post.id,e)} style={{display:"flex",gap:8}}><input aria-label="Écrire un commentaire" value={commentDrafts[post.id] || ""} onChange={e=>setCommentDrafts(old=>({...old,[post.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:10,borderRadius:9,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 14px"}}>Envoyer</button></form></div>}</article>; })}</div>
      }
      {!viewingProfile && (active === "Accueil" || active === "Vidéos") && feedHasMore && <div style={{display:"flex",justifyContent:"center",padding:"22px 12px"}}><button type="button" className="modal-primary" onClick={() => void loadMoreFeed()} disabled={feedLoadingMore} style={{maxWidth:260}}>{feedLoadingMore ? "Chargement…" : "Charger plus de publications"}</button></div>}
        {active === "Accueil" && !viewingProfile && <section className="emi-home-market" aria-label="Publications de tous les espaces EMi">
              <div className="emi-home-market-heading"><div><span className="eyebrow">UN SEUL FIL · TOUTE LA COMMUNAUTÉ</span><h2>À la une sur EMi</h2><p>Les offres et profils publiés dans les différents espaces, avec leur badge d’origine.</p></div><a href="/annonces">Voir tout <ChevronRight size={15}/></a></div>
              <div className="emi-home-market-row">
                {marketHighlights.filter(item=>item.viewType!=="elite").map(item=><a href={item.href} className="emi-home-market-card" key={item.badge+item.id} data-view-type={item.viewType} data-view-id={item.id} data-view-key={item.viewType+":"+item.id}>
                  <div className="emi-home-market-image">{item.image?<img src={item.image} alt={item.title} loading="lazy"/>:<span><ShoppingBag size={28}/></span>}<span className={"emi-home-market-badge "+(item.badge.includes("ELITE")?"is-hospitality":item.badge.includes("TROC")?"is-troc":item.badge.includes("DJANGUI")?"is-flow":"is-market")}>{item.badge}</span><span className="emi-market-view-count"><Eye size={14}/><strong>{marketViewCounts[item.viewType+":"+item.id]||0}</strong><span>vues</span></span></div>
                  <div className="emi-home-market-copy"><strong>{item.title}</strong>{item.price!==undefined&&<b>{new Intl.NumberFormat("fr-FR").format(Number(item.price))} FCFA</b>}<p>{item.description}</p>{item.meta&&<small>{item.meta}</small>}<span className="emi-market-card-cta">Voir l’offre <ChevronRight size={14}/></span></div>
                </a>)}
                {marketHighlights.filter(item=>item.viewType!=="elite").length===0&&<a href="/annonces" className="emi-home-market-empty"><ShoppingBag size={22}/><strong>Découvrir le Marché EMi</strong><span>Les annonces publiées apparaîtront ici automatiquement.</span></a>}
              </div>
            </section>}
        {active === "Accueil" && !viewingProfile && <section className="emi-home-nexus" aria-label="Accès rapide aux univers EMi">
          <div className="emi-home-nexus-heading"><div><span>EMi · ROYAL NEXUS</span><h2>Un seul univers. Toutes tes possibilités.</h2></div><button type="button" onClick={()=>{setActive("Découvrir");setEcosystemOpen(true);window.scrollTo({top:0,behavior:"smooth"});}}>Tout voir <ChevronRight size={15}/></button></div>
          <div className="emi-home-nexus-grid">
            <a href="/boutiques" className="emi-nexus-tile emi-nexus-pro"><span className="emi-nexus-icon"><ShoppingBag size={22}/></span><strong>EMi Boutiques</strong><small>Crée ta vitrine et commande</small><b>Découvrir <ChevronRight size={13}/></b></a>
            <a href="/annonces/elite-directory" className="emi-nexus-tile emi-nexus-pro"><span className="emi-nexus-icon"><BriefcaseBusiness size={22}/></span><strong>EMi PRO</strong><small>Annuaire professionnel</small><b>Découvrir <ChevronRight size={13}/></b></a>

            <a href="/annonces/tontine" className="emi-nexus-tile"><span className="emi-nexus-icon"><Users size={22}/></span><strong>Djangui Flow</strong><small>Solidarité collective</small><b>Accéder <ChevronRight size={13}/></b></a>
            <a href="/annonces/troc" className="emi-nexus-tile"><span className="emi-nexus-icon"><Repeat2 size={22}/></span><strong>EMi Troc</strong><small>Échange & don</small><b>Découvrir <ChevronRight size={13}/></b></a>
            <a href="/annonces/philanthropy" className="emi-nexus-tile"><span className="emi-nexus-icon"><Heart size={22}/></span><strong>EMi Fondation</strong><small>Actions sociales</small><b>Participer <ChevronRight size={13}/></b></a>
          </div>
        </section>}
      </section>

      <aside className="right-column"><div className="right-search"><Search size={18}/><input aria-label="Rechercher" placeholder="Rechercher sur EMi..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires et garde le lien avec ta communauté.</p><button onClick={() => setComposerOpen(true)}>Partager un moment <Plus size={16}/></button></div><div className="emi-values-card"><div className="emi-values-icon"><Heart size={18} fill="currentColor"/></div><span className="eyebrow">L’ESPRIT EMi</span><h3>La bonté laisse une trace.</h3><p>Un geste, une écoute, un peu d’aide : ce que nous partageons peut éclairer la journée de quelqu’un.</p><div className="emi-values-tags"><span>Bienveillance</span><span>Partage</span><span>Lien</span></div></div><div className="suggest-card"><div className="section-label"><strong>Ton compte</strong></div><p style={{fontSize:12,lineHeight:1.7,color:"#aaa6b7"}}>{user ? "Tu es connecté. Tes publications sont enregistrées dans Supabase." : "Connecte-toi pour publier et aimer les moments."}</p><button className="modal-primary" onClick={() => user ? void logout() : setAuthOpen(true)}>{user ? "Se déconnecter" : "Connexion / Inscription"}</button></div><div className="right-footer">À propos · Confidentialité · Aide<br/>© 2026 EMi</div></aside>

<style jsx>{`
/* EMi Explorer — premium discovery refresh */
.emi-explorer-hero{position:relative;isolation:isolate;overflow:hidden;margin:14px 0 16px;padding:20px 18px 17px;border:1px solid rgba(211,190,119,.28);border-radius:24px;background:radial-gradient(ellipse at 92% 0%,rgba(31,153,119,.22),transparent 48%),linear-gradient(135deg,#0c241b 0%,#07140f 62%,#0b1c20 100%);box-shadow:0 14px 36px rgba(0,0,0,.22),inset 0 1px rgba(255,255,255,.045)}
.emi-explorer-hero:after{content:"";position:absolute;z-index:-1;width:190px;height:190px;right:-86px;top:42px;border:1px solid rgba(213,192,128,.12);border-radius:50%;box-shadow:0 0 0 18px rgba(213,192,128,.025),0 0 0 38px rgba(213,192,128,.02)}
.emi-explorer-hero-top{display:flex;align-items:center;gap:9px}
.emi-explorer-orbit{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;color:#e3cf8d;background:linear-gradient(145deg,rgba(218,195,125,.2),rgba(218,195,125,.045));border:1px solid rgba(218,195,125,.3)}
.emi-explorer-kicker{font-size:10px;letter-spacing:2px;font-weight:900;color:#d9c787}
.emi-explorer-live{margin-left:auto;display:flex;align-items:center;gap:6px;padding:6px 9px;border-radius:30px;background:rgba(48,184,133,.1);border:1px solid rgba(75,206,153,.2);color:#9ce4c3;font-size:9px;font-weight:800;letter-spacing:.8px}
.emi-explorer-live i{width:6px;height:6px;border-radius:50%;background:#55d59a;box-shadow:0 0 9px #55d59a}
.emi-explorer-hero-copy{margin:19px 0 16px;max-width:520px}
.emi-explorer-hero-copy h1{margin:0 0 7px;color:#f5f0df;font-size:clamp(27px,7vw,36px);font-weight:900;letter-spacing:-1.2px;line-height:1.08}
.emi-explorer-hero-copy h1 em{font-style:normal;color:#dfc77f}
.emi-explorer-hero-copy p{max-width:440px;margin:0;color:#b4c5bb;font-size:13px;line-height:1.65}
.emi-explorer-hero-actions{display:flex;flex-wrap:wrap;gap:9px}
.emi-explorer-hero-actions button{min-height:43px;border-radius:13px;padding:0 13px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:850;cursor:pointer}
.emi-explorer-primary{border:1px solid #e2ce91;background:linear-gradient(135deg,#e5d39b,#c7ad68);color:#142016;box-shadow:0 5px 14px rgba(0,0,0,.18)}
.emi-explorer-secondary{border:1px solid rgba(107,205,177,.35);background:rgba(38,139,116,.12);color:#9de5d2}
.emi-explorer-trust{display:flex;flex-wrap:wrap;gap:12px;margin-top:15px;padding-top:12px;border-top:1px solid rgba(255,255,255,.08)}
.emi-explorer-trust span{display:flex;align-items:center;gap:5px;color:#9fb5a9;font-size:10px;font-weight:650}
.emi-people-discovery{overflow:hidden;border-radius:22px!important;border:1px solid rgba(202,188,129,.2)!important;background:linear-gradient(160deg,rgba(12,32,24,.98),rgba(6,17,14,.98))!important;box-shadow:0 12px 30px rgba(0,0,0,.18)}
.emi-people-discovery-toggle{min-height:88px!important;padding:16px!important;gap:13px!important}
.emi-people-toggle-icon{width:48px!important;height:48px!important;flex:0 0 48px!important;border-radius:15px!important;background:linear-gradient(145deg,rgba(217,194,124,.19),rgba(217,194,124,.045))!important;border:1px solid rgba(217,194,124,.27)!important;color:#e2ce91!important}
.emi-people-discovery-toggle small{color:#d8c98e!important;font-size:9px!important;letter-spacing:1.8px!important}
.emi-people-discovery-toggle strong{font-size:17px!important;letter-spacing:-.3px}
.emi-people-discovery-toggle em{font-size:12px!important;color:#a9bbb1!important;line-height:1.45}
.emi-people-discovery-content{padding:0 15px 16px!important}
.emi-people-search-row{gap:9px!important}
.emi-people-search-button{border-radius:13px!important;min-height:48px!important;font-weight:850!important}
.discovery-search{min-height:48px!important;border-radius:13px!important;background:#06110d!important;border:1px solid rgba(212,194,133,.25)!important}
.emi-people-list-heading{margin:19px 0 12px!important}
.emi-people-list-heading strong{font-size:15px!important}
.discovery-person{border-radius:17px!important;border:1px solid rgba(119,157,171,.22)!important;background:linear-gradient(130deg,#0d1e2a,#0a1720)!important;box-shadow:0 7px 18px rgba(0,0,0,.12)}
.discovery-person-actions button{min-height:39px!important;border-radius:12px!important;font-weight:800!important}
.emi-ecosystem-home{margin-top:15px!important}
.emi-ecosystem-entry{border-radius:20px!important;min-height:100px!important;background:linear-gradient(125deg,#0d202b,#091923)!important;border:1px solid rgba(103,172,194,.24)!important;box-shadow:0 10px 25px rgba(0,0,0,.16)}
.emi-ecosystem-entry-icon{border-radius:15px!important}
.emi-ecosystem-panel{border-radius:20px!important;margin-top:10px!important}
@media(max-width:420px){.emi-explorer-hero{padding:17px 15px 15px;border-radius:21px}.emi-explorer-hero-actions button{flex:1 1 145px;padding:0 9px;font-size:11px}.emi-explorer-trust{gap:8px}.emi-explorer-trust span{font-size:9px}.emi-people-discovery-content{padding-left:11px!important;padding-right:11px!important}}

/* Structural Explorer refresh: one search area and a unified universe directory */
.emi-explorer-page{display:flex;flex-direction:column;gap:15px;padding:10px 0 22px}
.emi-explorer-heading{display:flex;align-items:center;gap:14px;padding:19px 17px;border:1px solid rgba(211,190,119,.26);border-radius:22px;background:radial-gradient(ellipse at 100% 0%,rgba(31,153,119,.18),transparent 54%),linear-gradient(135deg,#0c241b,#07140f 72%,#0b1c20);box-shadow:0 12px 28px rgba(0,0,0,.18)}
.emi-explorer-heading-mark{width:54px;height:54px;flex:0 0 54px;display:grid;place-items:center;border-radius:17px;color:#e3cf8d;background:linear-gradient(145deg,rgba(218,195,125,.2),rgba(218,195,125,.045));border:1px solid rgba(218,195,125,.3)}
.emi-explorer-kicker,.emi-explorer-eyebrow{display:block;color:#d9c787;font-size:9px;letter-spacing:1.8px;font-weight:900}
.emi-explorer-heading h1{margin:5px 0;color:#f5f0df;font-size:26px;line-height:1.1;font-weight:900;letter-spacing:-.8px}
.emi-explorer-heading h1 em{font-style:normal;color:#dfc77f}
.emi-explorer-heading p,.emi-explorer-section-title p{margin:0;color:#aebfb5;font-size:12px;line-height:1.5}
.emi-explorer-search-panel,.emi-explorer-univers{padding:16px;border:1px solid rgba(202,188,129,.2);border-radius:21px;background:linear-gradient(160deg,rgba(12,32,24,.98),rgba(6,17,14,.98));box-shadow:0 10px 25px rgba(0,0,0,.16)}
.emi-explorer-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.emi-explorer-section-title h2{margin:4px 0 4px;color:#f2eee1;font-size:18px;line-height:1.2;font-weight:900}
.emi-explorer-title-icon{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;border-radius:14px;color:#e2ce91;border:1px solid rgba(217,194,124,.27);background:rgba(217,194,124,.09)}
.emi-explorer-title-icon.cyan{color:#72d7e9;border-color:rgba(103,202,222,.25);background:rgba(54,156,179,.1)}
.emi-explorer-search-row{display:flex;align-items:stretch;gap:8px}
.emi-explorer-search-row .discovery-search{flex:1;min-width:0;min-height:48px;border-radius:13px;background:#06110d;border:1px solid rgba(212,194,133,.25)}
.emi-explorer-search-row .emi-people-search-button{min-width:112px;border-radius:13px;min-height:48px}
.emi-explorer-list-heading{display:flex;align-items:center;justify-content:space-between;margin:17px 0 11px}
.emi-explorer-list-heading strong{display:block;color:#f0eee4;font-size:14px}
.emi-explorer-list-heading small{display:block;margin-top:3px;color:#a7b9ae;font-size:11px}
.emi-explorer-list-heading>span{min-width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(217,194,124,.25);border-radius:50%;color:#e2ce91;font-size:12px}
.emi-explorer-empty{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:15px;border:1px dashed rgba(217,194,124,.2);border-radius:15px;color:#b6c6bd;font-size:12px}
.emi-explorer-empty svg{color:#d8c787}.emi-explorer-empty strong{color:#f0eee4}.emi-explorer-empty span{flex-basis:100%;padding-left:33px}
.emi-explorer-univers{background:linear-gradient(145deg,#0c202b,#081721);border-color:rgba(103,172,194,.23)}
.emi-explorer-univers-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.emi-explorer-universe-card{min-width:0;display:flex;align-items:center;gap:9px;padding:12px 10px;border:1px solid rgba(120,170,181,.18);border-radius:15px;background:linear-gradient(135deg,rgba(17,43,53,.95),rgba(9,25,33,.95));color:inherit;text-decoration:none}
.emi-explorer-universe-card:last-child{grid-column:1/-1}
.emi-explorer-universe-icon{width:39px;height:39px;flex:0 0 39px;display:grid;place-items:center;border-radius:12px;color:#83d9e9;background:rgba(70,167,188,.11);border:1px solid rgba(103,202,222,.2)}
.emi-explorer-universe-copy{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.emi-explorer-universe-copy strong{color:#f1eee2;font-size:12px;font-weight:850}
.emi-explorer-universe-copy small{color:#a9bdc5;font-size:10px;line-height:1.35}
.emi-explorer-universe-card>svg{flex:0 0 auto;color:#dfc77f}
@media(max-width:390px){.emi-explorer-page{gap:11px}.emi-explorer-heading{padding:15px 13px}.emi-explorer-heading h1{font-size:23px}.emi-explorer-search-panel,.emi-explorer-univers{padding:12px}.emi-explorer-search-row{flex-direction:column}.emi-explorer-search-row .emi-people-search-button{width:100%}.emi-explorer-univers-grid{grid-template-columns:1fr}.emi-explorer-universe-card:last-child{grid-column:auto}}
`}
/* Structural Explorer refresh: one search area and a unified universe directory */
.emi-explorer-page{display:flex;flex-direction:column;gap:15px;padding:10px 0 22px}
.emi-explorer-heading{display:flex;align-items:center;gap:14px;padding:19px 17px;border:1px solid rgba(211,190,119,.26);border-radius:22px;background:radial-gradient(ellipse at 100% 0%,rgba(31,153,119,.18),transparent 54%),linear-gradient(135deg,#0c241b,#07140f 72%,#0b1c20);box-shadow:0 12px 28px rgba(0,0,0,.18)}
.emi-explorer-heading-mark{width:54px;height:54px;flex:0 0 54px;display:grid;place-items:center;border-radius:17px;color:#e3cf8d;background:linear-gradient(145deg,rgba(218,195,125,.2),rgba(218,195,125,.045));border:1px solid rgba(218,195,125,.3)}
.emi-explorer-kicker,.emi-explorer-eyebrow{display:block;color:#d9c787;font-size:9px;letter-spacing:1.8px;font-weight:900}
.emi-explorer-heading h1{margin:5px 0;color:#f5f0df;font-size:26px;line-height:1.1;font-weight:900;letter-spacing:-.8px}
.emi-explorer-heading h1 em{font-style:normal;color:#dfc77f}
.emi-explorer-heading p,.emi-explorer-section-title p{margin:0;color:#aebfb5;font-size:12px;line-height:1.5}
.emi-explorer-search-panel,.emi-explorer-univers{padding:16px;border:1px solid rgba(202,188,129,.2);border-radius:21px;background:linear-gradient(160deg,rgba(12,32,24,.98),rgba(6,17,14,.98));box-shadow:0 10px 25px rgba(0,0,0,.16)}
.emi-explorer-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.emi-explorer-section-title h2{margin:4px 0 4px;color:#f2eee1;font-size:18px;line-height:1.2;font-weight:900}
.emi-explorer-title-icon{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;border-radius:14px;color:#e2ce91;border:1px solid rgba(217,194,124,.27);background:rgba(217,194,124,.09)}
.emi-explorer-title-icon.cyan{color:#72d7e9;border-color:rgba(103,202,222,.25);background:rgba(54,156,179,.1)}
.emi-explorer-search-row{display:flex;align-items:stretch;gap:8px}
.emi-explorer-search-row .discovery-search{flex:1;min-width:0;min-height:48px;border-radius:13px;background:#06110d;border:1px solid rgba(212,194,133,.25)}
.emi-explorer-search-row .emi-people-search-button{min-width:112px;border-radius:13px;min-height:48px}
.emi-explorer-list-heading{display:flex;align-items:center;justify-content:space-between;margin:17px 0 11px}
.emi-explorer-list-heading strong{display:block;color:#f0eee4;font-size:14px}
.emi-explorer-list-heading small{display:block;margin-top:3px;color:#a7b9ae;font-size:11px}
.emi-explorer-list-heading>span{min-width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(217,194,124,.25);border-radius:50%;color:#e2ce91;font-size:12px}
.emi-explorer-empty{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:15px;border:1px dashed rgba(217,194,124,.2);border-radius:15px;color:#b6c6bd;font-size:12px}
.emi-explorer-empty svg{color:#d8c787}.emi-explorer-empty strong{color:#f0eee4}.emi-explorer-empty span{flex-basis:100%;padding-left:33px}
.emi-explorer-univers{background:linear-gradient(145deg,#0c202b,#081721);border-color:rgba(103,172,194,.23)}
.emi-explorer-univers-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.emi-explorer-universe-card{min-width:0;display:flex;align-items:center;gap:9px;padding:12px 10px;border:1px solid rgba(120,170,181,.18);border-radius:15px;background:linear-gradient(135deg,rgba(17,43,53,.95),rgba(9,25,33,.95));color:inherit;text-decoration:none}
.emi-explorer-universe-card:last-child{grid-column:1/-1}
.emi-explorer-universe-icon{width:39px;height:39px;flex:0 0 39px;display:grid;place-items:center;border-radius:12px;color:#83d9e9;background:rgba(70,167,188,.11);border:1px solid rgba(103,202,222,.2)}
.emi-explorer-universe-copy{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.emi-explorer-universe-copy strong{color:#f1eee2;font-size:12px;font-weight:850}
.emi-explorer-universe-copy small{color:#a9bdc5;font-size:10px;line-height:1.35}
.emi-explorer-universe-card>svg{flex:0 0 auto;color:#dfc77f}
@media(max-width:390px){.emi-explorer-page{gap:11px}.emi-explorer-heading{padding:15px 13px}.emi-explorer-heading h1{font-size:23px}.emi-explorer-search-panel,.emi-explorer-univers{padding:12px}.emi-explorer-search-row{flex-direction:column}.emi-explorer-search-row .emi-people-search-button{width:100%}.emi-explorer-univers-grid{grid-template-columns:1fr}.emi-explorer-universe-card:last-child{grid-column:auto}}
</style>
      {selectedPostDetail && <div className="modal-backdrop" onClick={()=>{setSelectedPostDetail(null);setPostDetailView("post");}} style={{position:"fixed",inset:0,zIndex:250,background:"#050807f5",display:"flex",alignItems:"stretch",justifyContent:"center",padding:0,overflowY:"auto"}}><section role="dialog" aria-modal="true" aria-label={postDetailView==="comments"?"Commentaires de la publication":"Détail de la publication"} onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:760,minHeight:"100dvh",background:"#08130f",color:"#f7f4e8",display:"flex",flexDirection:"column",paddingBottom:"max(18px,env(safe-area-inset-bottom))"}}><header style={{position:"sticky",top:0,zIndex:2,display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:"#08130ff2",borderBottom:"1px solid #ffffff18"}}><button type="button" onClick={()=>postDetailView==="comments"?setPostDetailView("post"):(setSelectedPostDetail(null),setPostDetailView("post"))} aria-label="Retour" style={{border:0,background:"transparent",color:"#f7f4e8",padding:4}}><ChevronLeft size={25}/></button><div><strong>{postDetailView==="comments"?"Commentaires":"Publication"}</strong><small style={{display:"block",color:"#a8b9b1",fontSize:11}}>{selectedPostDetail.profiles?.display_name||selectedPostDetail.profiles?.username||"Membre EMi"}</small></div><button type="button" onClick={()=>{setSelectedPostDetail(null);setPostDetailView("post");}} aria-label="Fermer" style={{marginLeft:"auto",border:0,background:"transparent",color:"#f7f4e8",padding:4}}><X size={22}/></button></header>{postDetailView==="post"?<><div style={{display:"flex",alignItems:"center",gap:11,padding:"14px 16px"}}><div className="avatar avatar-sunset">{selectedPostDetail.profiles?.avatar_url?<img src={selectedPostDetail.profiles.avatar_url} alt=""/>:(selectedPostDetail.profiles?.display_name||selectedPostDetail.profiles?.username||"M").slice(0,2).toUpperCase()}</div><div><strong>{selectedPostDetail.profiles?.display_name||selectedPostDetail.profiles?.username||"Membre EMi"}</strong><small style={{display:"block",color:"#a8b9b1"}}>@{selectedPostDetail.profiles?.username||"membre"} · {new Date(selectedPostDetail.created_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</small></div></div>{(selectedPostDetail.media_urls||[]).map((url,i)=>selectedPostDetail.media_type==="video"?<video key={url+i} src={url} controls playsInline style={{width:"100%",maxHeight:"65dvh",objectFit:"contain",background:"#020403"}}/>:<img key={url+i} src={url} alt={"Photo de la publication "+(i+1)} style={{display:"block",width:"100%",maxHeight:"72dvh",objectFit:"contain",background:"#020403"}}/>)}<div style={{padding:"16px"}}>{selectedPostDetail.content&&<p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",lineHeight:1.65,margin:"0 0 16px"}}>{cleanPostContent(selectedPostDetail.content).split("[EMI_MUSIC]")[0].trim()}</p>}<div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",borderTop:"1px solid #ffffff18",borderBottom:"1px solid #ffffff18",padding:"12px 0"}}><button type="button" className={liked.includes(selectedPostDetail.id)?"liked":""} onClick={()=>void toggleLike(selectedPostDetail.id)} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:liked.includes(selectedPostDetail.id)?"#ff8b9a":"#f7f4e8",padding:6}}><Heart size={20} fill={liked.includes(selectedPostDetail.id)?"currentColor":"none"}/>{likes[selectedPostDetail.id]||0} J’aime</button><button type="button" onClick={()=>{setPostDetailView("comments");void loadComments(selectedPostDetail.id);}} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:"#f7f4e8",padding:6}}><MessageCircle size={20}/>{comments[selectedPostDetail.id]?.length||0} Commentaires</button><button type="button" onClick={()=>void toggleRepost(selectedPostDetail.id)} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:"#f7f4e8",padding:6}}><Repeat2 size={19}/>Repartager</button><button type="button" onClick={()=>{if(navigator.share)void navigator.share({title:"EMi",text:selectedPostDetail.content,url:location.href}).catch(()=>{});else setMessage("Utilise le menu de partage de ton navigateur pour partager EMi.");}} style={{display:"flex",alignItems:"center",gap:7,border:0,background:"transparent",color:"#f7f4e8",padding:6}}><Share2 size={19}/>Partager</button></div><button type="button" onClick={()=>{setPostDetailView("comments");void loadComments(selectedPostDetail.id);}} style={{width:"100%",marginTop:14,padding:13,borderRadius:12,border:"1px solid #ffffff22",background:"#ffffff08",color:"#c8d8ce",textAlign:"left"}}>Voir les commentaires et participer… <ChevronRight size={16} style={{float:"right"}}/></button></div></>:<div style={{display:"flex",flex:1,flexDirection:"column",padding:16}}><div style={{display:"grid",gap:14,alignContent:"start",flex:1}}>{(comments[selectedPostDetail.id]||[]).map(comment=><article key={comment.id} style={{display:"flex",gap:10,alignItems:"flex-start"}}><div className="avatar avatar-sunset" style={{width:36,height:36,flexShrink:0}}>{(comment.profiles?.display_name||comment.profiles?.username||"M").slice(0,2).toUpperCase()}</div><div style={{minWidth:0,flex:1,borderRadius:14,padding:"10px 12px",background:"#ffffff0a"}}><strong style={{fontSize:13}}>{comment.profiles?.display_name||comment.profiles?.username||"Membre EMi"}</strong><p style={{margin:"5px 0 0",fontSize:14,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{comment.content}</p><small style={{color:"#8da59a"}}>{new Date(comment.created_at).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"})}</small></div></article>)}{(comments[selectedPostDetail.id]||[]).length===0&&<div style={{textAlign:"center",padding:"40px 10px",color:"#a8b9b1"}}><MessageCircle size={30}/><h3 style={{color:"#f7f4e8"}}>La conversation commence ici</h3><p>Sois le premier à laisser un commentaire.</p></div>}</div><form onSubmit={e=>void addComment(selectedPostDetail.id,e)} style={{display:"flex",gap:9,position:"sticky",bottom:0,paddingTop:14,background:"#08130f"}}><input aria-label="Écrire un commentaire" value={commentDrafts[selectedPostDetail.id]||""} onChange={e=>setCommentDrafts(old=>({...old,[selectedPostDetail.id]:e.target.value}))} maxLength={2000} placeholder="Écrire un commentaire…" style={{flex:1,minWidth:0,padding:13,borderRadius:24,border:"1px solid #49665a",background:"#101e18",color:"#f7f4e8"}}/><button type="submit" disabled={busy} className="modal-primary" style={{width:"auto",padding:"0 18px",borderRadius:24}}><Send size={17}/></button></form></div>}</section></div>}
      <nav className="mobile-nav" aria-label="Navigation mobile"><button className={active === "Accueil" && !viewingProfile ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Accueil");void loadFeed();window.scrollTo({top:0,behavior:"smooth"});}}><Home size={20}/><span>Accueil</span></button><button className={active === "Découvrir" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Découvrir");setEcosystemOpen(false);setPeopleDiscoveryOpen(true);if(exploreProfiles.length===0)void loadExploreProfiles();window.scrollTo({top:0,behavior:"smooth"});}}><Compass size={20}/><span>Explorer</span></button><button className="mobile-create" aria-label="Ouvrir le studio de création" onClick={() => setCreateStudioOpen(true)}><Plus size={22}/></button><button className={active === "Reels" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Reels");window.scrollTo({top:0,behavior:"instant"});}}><Clapperboard size={20}/><span>Reels</span></button><button className={active === "Messages" ? "mobile-active" : ""} onClick={() => {setViewingProfile(null);setActive("Messages");window.scrollTo({top:0,behavior:"smooth"});if(!user)setAuthOpen(true);}}><span className="emi-mobile-message-icon"><MessageCircle size={20}/>{unreadMessages > 0 && <span className="emi-mobile-nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>}</span><span>Messages</span></button><button className={viewingProfile || active === "Paramètres" ? "mobile-active" : ""} onClick={() => {if(!user){setAuthOpen(true);return;} if(active === "Paramètres"){setActive("Mon profil");setSettingsSection(null);void openProfile(user.id);window.scrollTo({top:0,behavior:"smooth"});}else{void openProfile(user.id);setSettingsSection(null);} }}><UserRound size={20}/><span>Profil</span></button></nav>

      {createStudioOpen && <div className="modal-backdrop create-studio-backdrop" onClick={() => setCreateStudioOpen(false)}><section className="create-studio" role="dialog" aria-modal="true" aria-label="Studio de création EMi" onClick={e => e.stopPropagation()}><header className="create-studio-header"><div><span className="eyebrow">EMi · CRÉATION</span><h2>Que veux-tu partager ?</h2><p>Un instant, une histoire, une vidéo : à toi de jouer.</p></div><button className="modal-close" onClick={() => setCreateStudioOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="create-studio-preview"><div className="studio-glow studio-glow-one"/><div className="studio-glow studio-glow-two"/><div className="studio-preview-icon"><Sparkles size={30}/></div><strong>Ton prochain moment commence ici.</strong><span>Crée, partage, rassemble.</span></div><div className="create-studio-options"><button type="button" className="studio-option studio-option-post" onClick={() => {setCreateStudioOpen(false);pickerDestination.current="post";setPublishDestination("post");setFile(null);setSelectedFiles([]);setCaption("");setMessage("");setComposerOpen(true);}}><span className="studio-option-icon"><ImageIcon size={25}/></span><span><strong>Publication</strong><small>Photo, vidéo ou plusieurs photos avec une légende</small></span><span className="studio-option-arrow">›</span></button><button type="button" className="studio-option studio-option-reel" onClick={() => {if(!user){setCreateStudioOpen(false);setAuthOpen(true);setMessage("Connecte-toi pour créer un Reel.");return;}setCreateStudioOpen(false);setPublishDestination("reel");pickerDestination.current="reel";setFile(null);setSelectedFiles([]);setCaption("");setMessage("");setComposerOpen(true);window.setTimeout(()=>videoFileInput.current?.click(),180);}}><span className="studio-option-icon"><Clapperboard size={25}/></span><span><strong>Créer un Reel</strong><small>Vidéo verticale immersive, visible dans Reels et sur l’accueil</small></span><span className="studio-option-arrow">›</span></button><button type="button" className="studio-option studio-option-story" onClick={() => {if(!user){setCreateStudioOpen(false);setAuthOpen(true);setMessage("Connecte-toi pour partager une story.");return;}setCreateStudioOpen(false);setStoryStep("choose");setStoryMode("photo");setStoryFiles([]);setStoryFile(null);setStoryCaption("");setMessage("");setStoryComposerOpen(true);}}><span className="studio-option-icon"><Camera size={25}/></span><span><strong>Story</strong><small>Photo + description ou vidéo, visible pendant 24 h</small></span><span className="studio-option-arrow">›</span></button><button type="button" className="studio-option studio-option-text" onClick={() => {setCreateStudioOpen(false);pickerDestination.current="post";setPublishDestination("post");setFile(null);setSelectedFiles([]);setCaption("");setMessage("");setComposerOpen(true);window.setTimeout(()=>document.getElementById("emi-post-caption")?.focus(),180);}}><span className="studio-option-icon"><span className="studio-text-icon">T</span></span><span><strong>Texte</strong><small>Une pensée, une annonce, une idée</small></span><span className="studio-option-arrow">›</span></button>{user && <button type="button" className="studio-option studio-option-content" onClick={() => {setCreateStudioOpen(false);void openMyContentManager();}}><span className="studio-option-icon"><Archive size={25}/></span><span><strong>Mes contenus</strong><small>Gère tes publications, stories et messages</small></span><span className="studio-option-arrow">›</span></button>}</div><footer className="create-studio-footer"><span><Sparkles size={14}/> Créé avec EMi</span><span>Partage à ta façon</span></footer></section></div>}
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
      {manageContentOpen && <div className="modal-backdrop" onClick={() => setManageContentOpen(false)}><section className="modal-card" role="dialog" aria-modal="true" aria-label="Mes contenus" onClick={e => e.stopPropagation()} style={{width:"min(680px,94vw)",maxHeight:"85vh",overflowY:"auto"}}><button className="modal-close" onClick={() => setManageContentOpen(false)} aria-label="Fermer"><X size={20}/></button><div className="modal-icon"><Archive size={23}/></div><span className="eyebrow">EMi · TON ESPACE</span><h2>Mes contenus</h2><p>Les commandes de suppression sont regroupées ici, uniquement pour tes propres contenus. Chaque suppression demande confirmation.</p>{manageContentLoading ? <p>Chargement de tes contenus…</p> : <><h3 style={{margin:"18px 0 8px"}}>Publications ({managedPosts.length})</h3>{managedPosts.length ? managedPosts.map(post => <div key={post.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #393643"}}><div style={{minWidth:0,flex:1}}><strong>{post.media_type==="video" ? "Vidéo" : "Publication"}</strong><p style={{margin:"3px 0",fontSize:12,color:"#aaa6b7",overflowWrap:"anywhere"}}>{post.content?.trim() || "Sans légende"} · {new Date(post.created_at).toLocaleDateString("fr-FR")}</p></div><button className="profile-back-button" onClick={() => void deletePost(post)} style={{color:"#ff9eaa",flexShrink:0}}>Supprimer</button></div>) : <p style={{color:"#aaa6b7",fontSize:13}}>Aucune publication.</p>}<h3 style={{margin:"18px 0 8px"}}>Stories et statuts ({managedStories.length})</h3>{managedStories.length ? managedStories.map(story => <div key={story.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #393643"}}><div style={{minWidth:0,flex:1}}><strong>{story.media_type==="video" ? "Story vidéo" : "Story photo"}</strong><p style={{margin:"3px 0",fontSize:12,color:"#aaa6b7",overflowWrap:"anywhere"}}>{story.caption?.trim() || "Sans texte"} · {new Date(story.created_at).toLocaleDateString("fr-FR")}</p></div><button className="profile-back-button" onClick={() => void deleteStory(story)} style={{color:"#ff9eaa",flexShrink:0}}>Supprimer</button></div>) : <p style={{color:"#aaa6b7",fontSize:13}}>Aucune story.</p>}<h3 style={{margin:"18px 0 8px"}}>Messages envoyés ({managedMessages.length})</h3>{managedMessages.length ? managedMessages.map(msg => <div key={msg.id} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #393643"}}><div style={{minWidth:0,flex:1}}><strong>{msg.media_url ? (msg.media_type==="video" ? "Message vidéo" : "Message avec média") : "Message"}</strong><p style={{margin:"3px 0",fontSize:12,color:"#aaa6b7",overflowWrap:"anywhere"}}>{msg.content?.trim() || "Média partagé"} · {new Date(msg.created_at).toLocaleDateString("fr-FR")}</p></div><button className="profile-back-button" onClick={() => void deleteChatMessage(msg)} style={{color:"#ff9eaa",flexShrink:0}}>Supprimer</button></div>) : <p style={{color:"#aaa6b7",fontSize:13}}>Aucun message envoyé.</p>}</>}</section></div>}
      {cameraOpen && <div className="camera-studio-backdrop" role="dialog" aria-modal="true" aria-label="Caméra EMi"><section className="camera-studio"><video ref={cameraVideoRef} className={"camera-live-preview" + (cameraFacing === "user" ? " camera-selfie" : "")} autoPlay muted playsInline/><div className="camera-preview-shade"/><header className="camera-studio-top"><button onClick={() => { stopCamera(); setCameraOpen(false); }} aria-label="Fermer la caméra"><X size={25}/></button><span>EMi <small>STUDIO</small></span><button onClick={() => void startCamera(cameraFacing === "user" ? "environment" : "user")} aria-label="Changer de caméra"><span className="camera-flip-symbol">↻</span></button></header>{cameraError && <div className={"camera-status" + (cameraRecording ? " recording" : "")} role="status">{cameraError}</div>}{!cameraError && <div className="camera-tip">{cameraMode==="video" ? "Appuie une fois pour commencer · appuie encore pour terminer" : "Place-toi dans le cadre et crée ton moment ✨"}</div>}<div className="camera-tools"><button onClick={() => { const input=document.getElementById("emi-camera-gallery") as HTMLInputElement|null; if(input){stopCamera();input.removeAttribute("capture");input.accept=cameraMode==="video"?"video/mp4,.mp4,.mov,.3gp,.mkv,.webm,application/octet-stream":"image/*,video/*";input.multiple=cameraMode!=="video";input.click();} }}><ImageIcon size={22}/><small>{cameraMode==="video"?"Choisir une vidéo":"Galerie · photos"}</small></button><button className={"camera-shutter" + (cameraRecording ? " is-recording" : "")} onClick={() => cameraMode === "photo" ? captureCameraPhoto() : toggleVideoRecording()} aria-label={cameraMode === "photo" ? "Prendre une photo" : cameraRecording ? "Arrêter la vidéo" : "Démarrer la vidéo"}><span/></button><button onClick={() => { stopCamera(); setCameraOpen(false); setCreateStudioOpen(true); }}><Sparkles size={22}/><small>Modes</small></button></div><div className="camera-mode-switch"><button className={cameraMode === "photo" ? "selected" : ""} onClick={() => setCameraMode("photo")}>PHOTO</button><button className={cameraMode === "video" ? "selected" : ""} onClick={() => setCameraMode("video")}>VIDÉO</button><button onClick={() => { stopCamera(); setCameraOpen(false); openCamera("text"); }}>TEXTE</button></div><input id="emi-camera-gallery" type="file" multiple accept="image/*,video/*" onChange={e => { const picked=Array.from(e.currentTarget.files||[]); const videos=picked.filter(f=>f.type.startsWith("video/")); const images=picked.filter(f=>f.type.startsWith("image/")); if(videos.length){const video=videos[0];if(video.size>50*1024*1024){setMessage("La vidéo doit faire moins de 50 Mo.");}else{setFile(video);setSelectedFiles([video]);setCaption("");setPublishDestination("post");setMessage("Vidéo sélectionnée. Ajoute une légende puis publie ta vidéo dans le fil.");stopCamera();setCameraOpen(false);setComposerOpen(true);}}else if(images.length>10){setSelectedFiles(images.slice(0,10));setFile(images[0]||null);setPublishDestination("post");setMessage("Tu peux choisir jusqu’à 10 photos. Les 10 premières ont été retenues.");}else if(images.length){setSelectedFiles(images);setFile(images[0]);setPublishDestination("post");setMessage(images.length>1?images.length+" photos sélectionnées. Appuie sur Continuer pour préparer une publication unique.":"Photo sélectionnée. Tu peux ajouter d’autres photos.");stopCamera();setCameraOpen(false);setComposerOpen(true);} e.currentTarget.value=""; }} hidden/></section></div>}
      {connectionsOpen && <div className="modal-backdrop" onClick={() => setConnectionsOpen(false)}><section className="connections-modal" role="dialog" aria-modal="true" aria-label={connectionTitle} onClick={e => e.stopPropagation()}><header><h2>{connectionTitle}</h2><button className="modal-close" onClick={() => setConnectionsOpen(false)} aria-label="Fermer"><X size={20}/></button></header><div className="connections-list">{connectionProfiles.map(person => <button className="connections-person" key={person.id} onClick={() => { setConnectionsOpen(false); void openProfile(person.id); }}><span className="connections-avatar">{person.avatar_url ? <img src={person.avatar_url} alt=""/> : (person.display_name || person.username || "EM").slice(0,2).toUpperCase()}</span><span><strong>{person.display_name || person.username || "Membre EMi"}</strong><small>@{person.username || "membre"}</small></span><span className="connections-chevron">›</span></button>)}</div>{connectionProfiles.length===0 && <p className="connections-empty">Aucun membre à afficher.</p>}</section></div>}
      {storyComposerOpen && <div className="modal-backdrop emi-story-backdrop" onClick={() => {setStoryComposerOpen(false);setStoryStep("choose");setStoryFile(null);setStoryFiles([]);}}><section className="modal-card story-composer-card emi-story-studio" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Studio de création de story"><button className="modal-close" onClick={() => {setStoryComposerOpen(false);setStoryStep("choose");}} aria-label="Fermer"><X size={21}/></button><div className="emi-story-brand"><span className="emi-story-brand-icon"><Camera size={24}/></span><div><span className="eyebrow">EMi · STUDIO STORIES</span><h2>{storyStep==="choose"?"Nouvelle story":"Crée ton moment"}</h2><p>{storyStep==="choose"?"Choisis le format qui te ressemble.":"Personnalise ton contenu avant de le partager."}</p></div></div>{storyStep==="choose"?<><div className="emi-story-format-list"><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("text");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon">Aa</span><span><strong>Story texte</strong><small>Exprime une pensée avec un fond élégant</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("photo");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><ImageIcon size={22}/></span><span><strong>Photo</strong><small>Ajoute une photo et une légende</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("album");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><Clapperboard size={22}/></span><span><strong>Story album</strong><small>Publie plusieurs photos dans l’ordre</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("video");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><Video size={22}/></span><span><strong>Story vidéo</strong><small>Une vidéo immersive en plein écran</small></span><ChevronRight size={20}/></button><button type="button" className="emi-story-format" onClick={()=>{setStoryMode("text");setStoryTextTheme("gold");setStoryCaption("✨ ");setStoryFiles([]);setStoryFile(null);setStoryStep("edit");}}><span className="emi-story-format-icon"><Sparkles size={22}/></span><span><strong>Texte & effets</strong><small>Créer un message sur fond or royal</small></span><ChevronRight size={20}/></button></div><div className="emi-story-footer-note"><ShieldCheck size={17}/> Tes stories disparaissent après 24 heures.</div></>:<><button type="button" className="emi-story-back" onClick={()=>setStoryStep("choose")}>‹&nbsp; Tous les formats</button><form className="story-studio-form emi-story-editor" onSubmit={publishStory}><input ref={storyFileInput} type="file" multiple={storyMode==="album"} accept={storyMode==="video"?"video/mp4,video/webm,video/quicktime":storyMode==="album"?"image/jpeg,image/png,image/webp,image/gif":"image/jpeg,image/png,image/webp,image/gif"} onChange={e=>{const fs=Array.from(e.target.files||[]);setStoryFiles(fs);setStoryFile(fs[0]||null);}} style={{display:"none"}}/>{storyMode==="text"?<div className={"emi-story-text-preview theme-"+storyTextTheme}><span>EMi · MOMENT</span><textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} placeholder="Écris ton message ici…" aria-label="Texte de la story"/><div className="emi-story-theme-picker"><button type="button" className={storyTextTheme==="emerald"?"selected":""} onClick={()=>setStoryTextTheme("emerald")}>Émeraude</button><button type="button" className={storyTextTheme==="gold"?"selected":""} onClick={()=>setStoryTextTheme("gold")}>Or</button><button type="button" className={storyTextTheme==="night"?"selected":""} onClick={()=>setStoryTextTheme("night")}>Nuit</button></div></div>:<><button type="button" className="story-studio-picker" onClick={()=>storyFileInput.current?.click()}><span className="emi-story-picker-icon">{storyMode==="video"?<Video size={23}/>:storyMode==="album"?<Clapperboard size={23}/>:<ImageIcon size={23}/>}</span><span><strong>{storyFiles.length>1?storyFiles.length+" photos sélectionnées":storyFile?storyFile.name:storyMode==="video"?"Choisir une vidéo":storyMode==="album"?"Choisir plusieurs photos":"Choisir une photo"}</strong><small>{storyMode==="album"?"Tu peux sélectionner plusieurs photos":storyMode==="video"?"La vidéo sera affichée en plein écran":"Depuis la galerie de ton téléphone"}</small></span><ChevronRight size={20}/></button>{storyFiles.length>0&&<div className="emi-story-selected-list">{storyFiles.map((f,index)=><div key={f.name+index}><span>{f.type.startsWith("video/")?"▶":"▧"} {f.name}</span><button type="button" aria-label={"Retirer "+f.name} onClick={()=>{const next=storyFiles.filter((_,n)=>n!==index);setStoryFiles(next);setStoryFile(next[0]||null);}}>×</button></div>)}</div>}{storyFile&&<div className="emi-story-preview"><span className="emi-story-preview-label">APERÇU</span>{storyFile.type.startsWith("video/")?<video src={URL.createObjectURL(storyFile)} controls playsInline/>:<img src={URL.createObjectURL(storyFile)} alt="Aperçu de la story"/>}</div>}<textarea value={storyCaption} onChange={e=>setStoryCaption(e.target.value)} maxLength={500} rows={2} placeholder="Ajouter un texte (facultatif)…" className="story-studio-caption"/></>}<div className="emi-story-footer-note"><Music2 size={16}/> Les photos sont publiées seules, avec leur description. Aucun morceau n’est ajouté.</div><div className="emi-story-footer-note"><ShieldCheck size={17}/> Aperçu avant publication · visible pendant 24 heures.</div>{message&&<p className="emi-story-inline-message" role="status">{message}</p>}<button className="modal-primary story-studio-publish" disabled={busy||(!storyCaption.trim()&&!storyFile)} type="submit">{busy?"Publication en cours…":"Publier ma story"} <ChevronRight size={19}/></button></form></>}</section></div>}
      {activeStory && <div className="emi-royal-story-backdrop" role="dialog" aria-modal="true" aria-label="Story EMi" onClick={()=>{setActiveStory(null);setStoryViewersOpen(false);}}>
        <article className="emi-royal-story-screen" onClick={e=>e.stopPropagation()} onTouchStart={e=>{if(e.touches.length){(e.currentTarget as HTMLDivElement).dataset.touchStartX=String(e.touches[0].clientX);(e.currentTarget as HTMLDivElement).dataset.touchStartY=String(e.touches[0].clientY);}}} onTouchEnd={e=>{const el=e.currentTarget as HTMLDivElement;const x=Number(el.dataset.touchStartX||0),y=Number(el.dataset.touchStartY||0);const dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)){const i=stories.findIndex(st=>st.id===activeStory.id);if(dx<0)setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);else if(i>0)setActiveStory(stories[i-1]);}}}>
          <div className="emi-royal-story-progress"><span key={activeStory.id} style={{animationDuration:activeStory.media_type==="video"?"15s":"6s"}}/></div>
          <header className="emi-royal-story-header">
            <div className="emi-royal-story-author">
              <span className="emi-royal-story-avatar">{activeStory.profiles?.avatar_url?<img src={activeStory.profiles.avatar_url} alt=""/>:<span>{(activeStory.profiles?.display_name||activeStory.profiles?.username||"M").slice(0,1).toUpperCase()}</span>}</span>
              <span className="emi-royal-story-author-meta"><strong>{activeStory.profiles?.display_name||activeStory.profiles?.username||"Membre EMi"}{hasBlueVerificationBadge(activeStory.profiles?.display_name,activeStory.profiles?.username)&&<span className="emi-verified-badge" role="img" aria-label="Profil vérifié par EMi"><BadgeCheck size={14} fill="#1877F2" stroke="#FFFFFF" strokeWidth={2.2}/></span>}</strong><small>{new Date(activeStory.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})} · <span>24 h</span></small></span>
            </div>
            <div className="emi-royal-story-header-actions">
              {user?.id===activeStory.user_id&&<button type="button" className="emi-royal-story-views" onClick={async()=>{const opening=!storyViewersOpen;setStoryViewersOpen(opening);if(opening&&supabase){const {data:rows,count,error}=await supabase.from("story_views").select("viewer_key",{count:"exact"}).eq("story_id",activeStory.id);if(!error){setStoryViewCounts(old=>({...old,[activeStory.id]:count??(rows||[]).length}));const ids=[...new Set((rows||[]).map(row=>row.viewer_key).filter((key):key is string=>!!key&&key!==activeStory.user_id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)))];if(ids.length){const {data:profiles}=await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids);setStoryViewers(old=>({...old,[activeStory.id]:(profiles||[]) as Profile[]}));}else setStoryViewers(old=>({...old,[activeStory.id]:[]}));}}}} aria-label="Afficher les personnes qui ont vu la story"><Eye size={17}/><strong>{formatSocialCount(storyViewCounts[activeStory.id]||0)}</strong></button>}
              <button type="button" className="emi-royal-story-close" onClick={()=>{setActiveStory(null);setStoryViewersOpen(false);}} aria-label="Fermer"><X size={22}/></button>
            </div>
          </header>
          <div className="emi-royal-story-media-stage">
            {activeStory.media_type==="video"?<video ref={storyVideoRef} className="emi-royal-story-media" src={activeStory.media_url} autoPlay playsInline preload="auto" onEnded={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);}}/>:<img className="emi-royal-story-media" src={activeStory.media_url} alt="Story publiée sur EMi"/>}
            <div className="emi-royal-story-shade"/>
            <button type="button" className="emi-royal-story-zone emi-royal-story-zone-left" aria-label="Story précédente" onClick={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);if(i>0)setActiveStory(stories[i-1]);}}/>
            <button type="button" className="emi-royal-story-zone emi-royal-story-zone-right" aria-label="Story suivante" onClick={()=>{const i=stories.findIndex(st=>st.id===activeStory.id);setActiveStory(i>=0&&i<stories.length-1?stories[i+1]:null);}}/>
            {activeStory.caption&&<p className="emi-royal-story-caption">{activeStory.caption}</p>}
          </div>
          {storyViewersOpen&&user?.id===activeStory.user_id&&<section className="emi-royal-story-viewers" aria-label="Personnes ayant vu cette story">
            <div className="emi-royal-story-viewers-heading"><span><Eye size={17}/> <strong>{storyViewCounts[activeStory.id]||0} vues</strong></span><button type="button" onClick={()=>setStoryViewersOpen(false)} aria-label="Fermer la liste"><X size={19}/></button></div>
            {(storyViewers[activeStory.id]||[]).length?(storyViewers[activeStory.id]||[]).map(viewer=><div className="emi-royal-story-viewer-person" key={viewer.id}>{viewer.avatar_url?<img src={viewer.avatar_url} alt=""/>:<span className="emi-royal-story-viewer-fallback">{(viewer.display_name||viewer.username||"?").slice(0,1).toUpperCase()}</span>}<strong>{viewer.display_name||viewer.username||"Membre EMi"}</strong><span className="emi-royal-story-online-mark"/></div>):<p className="emi-royal-story-empty-viewers">Les membres qui ont vu cette story apparaîtront ici.</p>}
          </section>}
          <section className="emi-royal-story-actions" aria-label="Réactions et réponse">
            <div className="emi-royal-story-reactions">{["❤️","👍","😂","😮","🔥"].map(reaction=><button type="button" key={reaction} aria-label={"Réagir "+reaction} aria-pressed={storyReaction===reaction} className={storyReaction===reaction?"is-selected":""} onClick={async()=>{if(!user||!supabase){setAuthOpen(true);setMessage("Connecte-toi pour réagir à une story.");return;}if(storyReaction===reaction)return;const previousReaction=storyReaction;setStoryReaction(reaction);const {data:existing,error:existingError}=await supabase.from("story_reactions").select("reaction").eq("story_id",activeStory.id).eq("user_id",user.id).maybeSingle();if(existingError){setStoryReaction(previousReaction);setMessage("Impossible de vérifier ta réaction. Réessaie.");return;}const {error}=await supabase.from("story_reactions").upsert({story_id:activeStory.id,user_id:user.id,reaction},{onConflict:"story_id,user_id"});if(error){setStoryReaction(previousReaction);setMessage("Réaction non enregistrée : "+error.message);return;}if(activeStory.user_id!==user.id&&existing?.reaction!==reaction){const {error:notificationError}=await supabase.from("notifications").insert({recipient_id:activeStory.user_id,actor_id:user.id,type:"story_reaction",story_id:activeStory.id,message:"a réagi "+reaction+" à ta story."});if(notificationError){console.error("Notification de réaction story non envoyée",notificationError.message);setMessage("Réaction enregistrée, mais notification non envoyée : "+notificationError.message);return;}}setMessage("Réaction "+reaction+" enregistrée et notification envoyée.");}}>{reaction}</button>)}</div>
            <form className="emi-royal-story-reply" onSubmit={async e=>{e.preventDefault();if(!user||!supabase){setAuthOpen(true);setMessage("Connecte-toi pour répondre à une story.");return;}const content=storyReply.trim();if(!content)return;const {error}=await supabase.from("story_replies").insert({story_id:activeStory.id,sender_id:user.id,content});if(error){setMessage("Réponse non envoyée : "+error.message);return;}if(activeStory.user_id!==user.id){const {error:notificationError}=await supabase.from("notifications").insert({recipient_id:activeStory.user_id,actor_id:user.id,type:"story_reply",story_id:activeStory.id,message:"t’a envoyé une réponse à ta story."});if(notificationError){console.error("Notification de réponse story non envoyée",notificationError.message);setMessage("Réponse enregistrée, mais notification non envoyée : "+notificationError.message);return;}}setStoryReply("");setMessage("Réponse enregistrée et notification envoyée à l’auteur.");}}>
              <MessageCircle size={19}/><input value={storyReply} onChange={e=>setStoryReply(e.target.value)} maxLength={1000} placeholder={"Répondre à "+(activeStory.profiles?.display_name||activeStory.profiles?.username||"cette story")+"…"} aria-label="Répondre à la story"/><button type="submit" aria-label="Envoyer la réponse"><Send size={18}/></button>
            </form>
          </section>
          {message&&<p className="emi-royal-story-feedback" role="status">{message}</p>}
          <footer className="emi-royal-story-footer"><span>EMi <i/> CONNECTER · PARTAGER · RÉUSSIR</span><span>{Math.max(1,stories.findIndex(st=>st.id===activeStory.id)+1)} / {stories.length}</span></footer>
        </article>
      </div>}
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
          <p>Un réseau social pour partager, échanger, découvrir des vidéos et faire grandir les opportunités commerciales.</p>
          <div className="emi-welcome-tribute">Un projet inspiré par une histoire familiale, tourné vers l’avenir.</div>
          <div className="emi-welcome-cta">
            <button className="emi-cta-primary" onClick={() => { setSignup(true); setRecoveryMode(false); setAuthOpen(true); setWelcomeDismissed(true); setMessage(""); }}>Créer mon compte <span aria-hidden="true">↗</span></button>
            <button className="emi-cta-secondary" onClick={() => { setSignup(false); setRecoveryMode(false); setAuthOpen(true); setWelcomeDismissed(true); setMessage(""); }}>J’ai déjà un compte <span aria-hidden="true">→</span></button>
          </div>
          <button className="emi-discover-link" onClick={() => setWelcomeDismissed(true)}>Explorer EMi d’abord <span aria-hidden="true">↓</span></button>
          <div className="emi-welcome-footer"><span><i/> VOTRE ESPACE. VOS HISTOIRES.</span><span>EMi © 2026</span></div>
        </div>
        <div className="emi-welcome-caption" aria-hidden="true"><span>CONNECTER</span><b>·</b><span>PARTAGER</span><b>·</b><span>APPARTENIR</span></div>
      </section>}
      {(composerOpen || authOpen || profileEditorOpen) && <div className="modal-backdrop" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}}><div className="modal-card" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={() => {setComposerOpen(false);setAuthOpen(false);setProfileEditorOpen(false);}} aria-label="Fermer"><X size={20}/></button>{message && <div role="alert" style={{margin:"12px 0",padding:12,borderRadius:10,border:"1px solid #8d6de0",background:"#282235",color:"#f7f3ff",fontSize:13,lineHeight:1.6,overflowWrap:"anywhere"}}>{message}</div>}{composerOpen ? <div className="emi-creator"><header className="emi-creator-header"><button type="button" aria-label="Retour" onClick={()=>{setComposerOpen(false);setCreateStudioOpen(true);}}><ChevronLeft size={25}/></button><strong>Nouvelle publication</strong><button type="button" aria-label="Fermer" onClick={()=>setComposerOpen(false)}><X size={22}/></button></header><form onSubmit={publish} className="emi-creator-form"><section className="emi-simple-publish-intro" aria-label="Guide de publication"><span className="emi-simple-step">ÉTAPE 1 SUR 3</span><h2>Que veux-tu partager ?</h2><p>Choisis une option ci-dessous. C’est tout simple.</p><div className="emi-simple-publish-choices"><button type="button" onClick={()=>{pickerDestination.current="post";setPublishDestination("post");if(fileInput.current){fileInput.current.value="";fileInput.current.accept="image/*";fileInput.current.multiple=true;fileInput.current.click();}}}><span className="emi-simple-choice-icon"><ImageIcon size={25}/></span><strong>Une photo</strong><small>Choisir dans mon téléphone</small></button><button type="button" onClick={()=>{pickerDestination.current="post";setPublishDestination("post");if(videoFileInput.current){videoFileInput.current.value="";videoFileInput.current.click();}}}><span className="emi-simple-choice-icon"><Video size={25}/></span><strong>Une vidéo</strong><small>Dans le fil d’accueil</small></button><button type="button" className={publishDestination === "reel" ? "is-selected" : ""} onClick={()=>{pickerDestination.current="reel";setPublishDestination("reel");if(videoFileInput.current){videoFileInput.current.value="";videoFileInput.current.click();}}}><span className="emi-simple-choice-icon"><Clapperboard size={25}/></span><strong>Créer un Reel</strong><small>Vidéo dans le flux Reels</small></button><button type="button" onClick={()=>{setPublishDestination("post");setTimeout(()=>document.getElementById("emi-post-caption")?.focus(),80);}}><span className="emi-simple-choice-icon"><MessageCircle size={25}/></span><strong>Un texte</strong><small>Écrire un message</small></button></div><div className="emi-simple-tip"><span>💡</span><span>Tu peux aussi ajouter une description ou une musique. Ce n’est pas obligatoire.</span></div></section>{offlineDrafts.length>0&&<section style={{marginBottom:14,padding:12,borderRadius:12,border:"1px solid #65528d",background:"#17131f"}}><button type="button" onClick={()=>setOfflineDraftsOpen(v=>!v)} style={{width:"100%",background:"transparent",border:0,color:"#e8d8ff",fontWeight:700,textAlign:"left",padding:4}}>📥 Brouillons hors connexion ({offlineDrafts.length}) {offlineDraftsOpen?"−":"+"}</button>{offlineDraftsOpen&&offlineDrafts.map(draft=><div key={draft.id} style={{padding:"10px 0",borderTop:"1px solid #393643"}}><button type="button" style={{display:"block",width:"100%",background:"transparent",border:0,color:"#f7f4ff",textAlign:"left"}} onClick={()=>{setCaption(draft.caption);setPublishDestination(draft.destination);setSelectedFiles(draft.mediaFiles.filter(f=>f.type.startsWith("image/")));setFile(draft.mediaFiles.find(f=>f.type.startsWith("video/"))||draft.mediaFiles[0]||null);setMusicFile(draft.musicFile);setMusicTitle(draft.musicTitle);setSelectedMusic(draft.selectedMusic);setMusicStart(draft.musicStart);setMusicEnd(draft.musicEnd);setMessage("Brouillon restauré. Vérifie les médias puis partage lorsque tu es connecté.");setOfflineDraftsOpen(false);}}><strong>{draft.caption||draft.mediaFiles.map(f=>f.name).join(", ")||"Publication sans texte"}</strong><small style={{display:"block",color:"#aaa6b7"}}>{new Date(draft.createdAt).toLocaleString("fr-FR")} · {draft.mediaFiles.length} média(s){draft.musicFile?" · musique":""}</small></button><button type="button" onClick={()=>void deleteOfflinePostDraft(draft.id).then(()=>setOfflineDrafts(rows=>rows.filter(row=>row.id!==draft.id)))} style={{marginTop:6,background:"transparent",border:0,color:"#f0b4bf"}}>Supprimer le brouillon</button></div>)}</section>}<div role="status" style={{margin:"0 0 14px",padding:"12px 14px",borderRadius:14,border:"1px solid #b99a43",background:"#0c241a",color:"#dce8df",fontSize:13,lineHeight:1.5}}><strong style={{display:"block",color:"#f0d88c",marginBottom:3}}>{publishDestination === "reel" ? "Créer un Reel" : "Publication vidéo"}</strong>{publishDestination === "reel" ? "Ton Reel sera visible dans le flux Reels et présenté aussi sur l’accueil." : "Ta vidéo sera publiée dans le fil d’accueil, sans être classée comme Reel."}</div><input ref={videoFileInput} type="file" accept="video/*" multiple={false} onChange={e=>{const input=e.currentTarget;const picked=input.files?.[0]||null;const destination=pickerDestination.current;input.value="";if(!picked){setMessage("Aucune vidéo sélectionnée. Réessaie en choisissant une vidéo enregistrée sur ton téléphone.");return;}const videoType=picked.type.startsWith("video/")||/\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(picked.name);if(!videoType){setMessage("Ce fichier n’est pas reconnu comme une vidéo. Choisis un MP4 ou une vidéo de ta galerie.");return;}setSelectedFiles([]);setFile(picked);setPublishDestination(destination);setMessage("Vidéo sélectionnée : "+picked.name+". Ajoute une description puis appuie sur Publier.");}} style={{display:"none"}}/><input ref={fileInput} type="file" multiple accept="image/*,video/*,video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v,.3gp,.mkv" onChange={e=>{const input=e.currentTarget;const files=Array.from(input.files||[]);const destination=pickerDestination.current;const isVideo=(f:File)=>f.type.startsWith("video/")||/\.(mp4|mov|webm|m4v|3gp|mkv)$/i.test(f.name);setPublishDestination(destination);if(files.length>10){setMessage("Tu peux sélectionner jusqu’à 10 photos à la fois.");setSelectedFiles(files.filter(f=>f.type.startsWith("image/")).slice(0,10));setFile(files.find(f=>f.type.startsWith("image/"))||null);}else if(files.some(isVideo)&&files.length>1){setMessage("Pour une publication multiple, sélectionne uniquement des photos. Une vidéo peut être publiée seule.");setSelectedFiles([]);setFile(files.find(isVideo)||null);}else{const photos=files.filter(f=>f.type.startsWith("image/"));const video=files.find(isVideo);setSelectedFiles(photos);setFile(video||photos[0]||null);setMessage(video?"Vidéo sélectionnée. Tu peux ajouter une légende puis publier ta vidéo.":photos.length>1?photos.length+" photos sélectionnées. Elles seront publiées ensemble.":"");}input.value="";}} style={{display:"none"}}/><div className={"emi-creator-preview filter-"+creatorFilter} style={{aspectRatio:creatorRatio==="1:1"?"1 / 1":creatorRatio==="16:9"?"16 / 9":"4 / 5",height:"auto",minHeight:creatorRatio==="16:9"?220:320,maxHeight:520,filter:`brightness(${creatorBrightness}%) contrast(${creatorContrast}%)`}}>{(selectedFiles.length?selectedFiles:file?[file]:[]).length ? <div style={{width:"100%",height:"100%",overflowY:"auto",scrollSnapType:"y mandatory"}}>{(selectedFiles.length?selectedFiles:file?[file]:[]).map((media,index)=><div key={media.name+index} style={{height:"100%",minHeight:260,scrollSnapAlign:"start",position:"relative",display:"grid",placeItems:"center"}}>{media.type.startsWith("video/")?<video src={URL.createObjectURL(media)} controls playsInline style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>:<img src={URL.createObjectURL(media)} alt={"Aperçu "+(index+1)} style={{width:"100%",height:"100%",objectFit:"contain"}}/>}<span style={{position:"absolute",right:10,top:10,background:"#092b20dd",color:"#fff",padding:"5px 9px",borderRadius:99,fontSize:11}}>{index+1}/{(selectedFiles.length?selectedFiles:file?[file]:[]).length}</span>{creatorTextOnPhoto&&creatorOverlayText.trim()&&<span style={{position:"absolute",left:14,right:14,bottom:24,textAlign:"center",fontWeight:800,fontSize:26,color:"#fff",textShadow:"0 2px 8px #000",whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{creatorOverlayText}</span>}{(selectedFiles.length?selectedFiles:[]).length>1&&<div style={{position:"absolute",left:8,top:8,display:"flex",gap:5}}><button type="button" disabled={index===0} onClick={()=>setSelectedFiles(old=>{const next=[...old];[next[index-1],next[index]]=[next[index],next[index-1]];return next;})} style={{padding:6,borderRadius:8}}>←</button><button type="button" disabled={index===(selectedFiles.length-1)} onClick={()=>setSelectedFiles(old=>{const next=[...old];[next[index+1],next[index]]=[next[index],next[index+1]];return next;})} style={{padding:6,borderRadius:8}}>→</button><button type="button" onClick={()=>setSelectedFiles(old=>old.filter((_,i)=>i!==index))} style={{padding:6,borderRadius:8}}>Retirer</button></div>}</div>)}</div> : <button type="button" onClick={()=>{if(fileInput.current){pickerDestination.current="post";fileInput.current.accept="image/*,video/*,.mp4,.mov,.webm,.m4v,.3gp,.mkv";fileInput.current.multiple=true;fileInput.current.click();}}}><ImageIcon size={34}/><span>Choisir plusieurs photos ou une vidéo</span></button>}{(selectedFiles.length>0||file) && <button className="emi-creator-change" type="button" onClick={()=>fileInput.current?.click()}>Ajouter / remplacer des photos</button>}</div><section className="emi-caption-editor" aria-label="Description de la publication"><label htmlFor="emi-post-caption">Description</label><textarea id="emi-post-caption" value={caption} onChange={e=>setCaption(e.target.value)} maxLength={5000} rows={3} placeholder="Écris une légende… Ajoute des hashtags si tu veux." style={{width:"100%",minHeight:92,maxHeight:180,resize:"vertical",boxSizing:"border-box",padding:"14px 15px",borderRadius:14,border:"1px solid #49665a",background:"#0b1713",color:"#f7f4e8",fontSize:16,lineHeight:1.5,outline:"none"}}/><div style={{display:"flex",justifyContent:"space-between",gap:8,color:"#a8b9b1",fontSize:12,marginTop:5}}><span>Raconte ce moment à ta communauté.</span><span>{caption.length}/5000</span></div></section><div className="emi-creator-tools"><button type="button" onClick={()=>{if(!((selectedFiles[0]||file)?.type.startsWith("image/"))){setMessage("Sélectionne d’abord une photo pour lui ajouter une musique.");fileInput.current?.click();return;}musicInput.current?.click();}}><Music2 size={22}/><span>Audio du téléphone</span></button><button type="button" onClick={()=>{setCreatorTextOnPhoto(v=>!v);setTimeout(()=>document.getElementById("emi-creator-overlay-text")?.focus(),0);}}><span className="emi-tool-aa">Aa</span><span>Texte</span></button><button type="button" onClick={()=>{if(fileInput.current){fileInput.current.accept="image/*,video/*";fileInput.current.multiple=true;fileInput.current.click();}}}><ImageIcon size={22}/><span>Photos / vidéo</span></button><button type="button" onClick={()=>setCreatorFilter(old=>old==="original"?"vivid":old==="vivid"?"warm":old==="warm"?"mono":old==="mono"?"fade":"original")}><Disc3 size={22}/><span>Filtre · {creatorFilter==="original"?"Original":creatorFilter==="vivid"?"Éclatant":creatorFilter==="warm"?"Chaud":creatorFilter==="mono"?"N&B":"Doux"}</span></button><button type="button" onClick={()=>setCreatorEditOpen(v=>!v)}><SlidersHorizontal size={22}/><span>Modifier</span></button><button type="button" onClick={()=>setCreatorRatio(v=>v==="4:5"?"1:1":v==="1:1"?"16:9":"4:5")}><Smartphone size={22}/><span>Ratio · {creatorRatio}</span></button></div>{creatorEditOpen && <div className="emi-audio-trim"><strong>Retouche photo</strong><label>Luminosité · {creatorBrightness}%<input type="range" min="60" max="150" value={creatorBrightness} onChange={e=>setCreatorBrightness(Number(e.target.value))}/></label><label>Contraste · {creatorContrast}%<input type="range" min="60" max="150" value={creatorContrast} onChange={e=>setCreatorContrast(Number(e.target.value))}/></label></div>}<div className="emi-creator-caption">{creatorTextOnPhoto&&<label style={{display:"block",marginBottom:10}}>Texte sur la photo<input id="emi-creator-overlay-text" value={creatorOverlayText} onChange={e=>setCreatorOverlayText(e.target.value)} maxLength={180} placeholder="Écris le texte à afficher sur la photo…" style={{display:"block",width:"100%",marginTop:6,padding:12,borderRadius:10,background:"#15141c",color:"white",border:"1px solid #65528d"}}/></label>}<textarea id="emi-creator-caption" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Écris une légende…" maxLength={5000} rows={2}/><div className="emi-creator-file">{(selectedFiles.length>0||file) ? <><ImageIcon size={18}/><span>{selectedFiles.length>1?selectedFiles.length+" photos sélectionnées":(selectedFiles[0]||file)?.name}</span><button type="button" onClick={()=>{setFile(null);setSelectedFiles([]);}}>Retirer</button></> : <button type="button" onClick={()=>fileInput.current?.click()}><Plus size={18}/> Sélectionner plusieurs photos</button>}</div>{((selectedFiles[0]||file)?.type.startsWith("image/")) && <div className="emi-compose-music"><div className="emi-compose-music-head"><span className="emi-compose-music-icon"><Music2 size={18}/></span><span><strong>Musique de la publication</strong><small>Ajoute un son que tu as le droit d’utiliser.</small></span></div><p style={{fontSize:12,color:"#aaa6b7",margin:"0 0 10px"}}>Le catalogue EMi Music est désactivé. Tu peux ajouter un fichier audio de ton téléphone.</p><input ref={musicInput} type="file" accept="audio/*" onChange={e=>{const picked=e.currentTarget.files?.[0]||null;if(picked&&!picked.type.startsWith("audio/")){setMessage("Choisis un fichier audio valide.");setMusicFile(null);}else if(picked&&picked.size>15*1024*1024){setMessage("Le fichier audio doit faire moins de 15 Mo.");setMusicFile(null);}else{setMusicFile(picked);if(picked)setMusicTitle(picked.name.replace(/\.[^.]+$/,""));setSelectedMusic(null);setMessage(picked?"Musique sélectionnée. Elle sera jointe à la publication.":"");}e.currentTarget.value="";}} style={{display:"none"}}/><button type="button" className="emi-compose-music-pick" onClick={()=>musicInput.current?.click()}><Music2 size={16}/><span>{musicFile ? "Musique choisie : "+musicFile.name : "Choisir une musique depuis mon téléphone"}</span><ChevronRight size={16}/></button>{musicFile&&<div className="emi-catalog-selected"><div><Music2 size={20}/></div><section><strong>{musicTitle||musicFile.name}</strong><small>Audio personnel · sera envoyé avec la publication</small></section><button type="button" onClick={()=>{setMusicFile(null);setMusicTitle("");setMusicStart(0);setMusicEnd(30);setMusicDuration(0);}}>Retirer</button><audio controls preload="metadata" src={localMusicPreviewUrl} style={{width:"100%",gridColumn:"1 / -1"}} onLoadedMetadata={e=>{const d=Math.floor(e.currentTarget.duration);if(Number.isFinite(d)&&d>0){setMusicDuration(d);setMusicEnd(Math.min(30,d));}}} onPlay={()=>setPreviewMusic(true)} onPause={()=>setPreviewMusic(false)}/><label style={{gridColumn:"1 / -1",display:"block"}}>Début de l’extrait : {Math.floor(musicStart/60)}:{String(musicStart%60).padStart(2,"0")}<input type="range" min="0" max={Math.max(0,musicDuration-1)} value={Math.min(musicStart,Math.max(0,musicDuration-1))} onChange={e=>{const v=Number(e.target.value);setMusicStart(v);if(musicEnd<=v)setMusicEnd(Math.min(musicDuration||30,v+10));}} style={{width:"100%"}}/></label><label style={{gridColumn:"1 / -1",display:"block"}}>Fin de l’extrait : {Math.floor(musicEnd/60)}:{String(musicEnd%60).padStart(2,"0")}<input type="range" min={Math.min(musicDuration||30,musicStart+1)} max={Math.max(1,musicDuration||30)} value={Math.max(musicStart+1,Math.min(musicEnd,musicDuration||30))} onChange={e=>setMusicEnd(Number(e.target.value))} style={{width:"100%"}}/></label><small style={{gridColumn:"1 / -1"}}>Choisis le passage à associer à ta photo (maximum conseillé : 30 secondes).</small></div>}{selectedMusic && <div className="emi-catalog-selected"><div>{selectedMusic.cover_url ? <img src={selectedMusic.cover_url} alt="" /> : <span><Music2 size={20}/></span>}</div><section><strong>{selectedMusic.title}</strong><small>{selectedMusic.artist}{selectedMusic.genre ? " · " + selectedMusic.genre : ""}</small></section><button type="button" onClick={()=>setSelectedMusic(null)}>Retirer</button></div>}{false && <div className="emi-catalog-panel"></div>}{selectedMusic && <div className="emi-audio-trim"><audio controls preload="none" src={selectedMusic.audio_url} style={{width:"100%"}} onPlay={()=>setPreviewMusic(true)} onPause={()=>setPreviewMusic(false)} /><div><strong>Extrait musical</strong><small>{Math.floor(musicStart/60)}:{String(musicStart%60).padStart(2,"0")} – {Math.floor(musicEnd/60)}:{String(musicEnd%60).padStart(2,"0")}</small></div><label>Début<input type="range" min="0" max={Math.max(1,(selectedMusic.duration_seconds||musicDuration||30)-1)} value={Math.min(musicStart,Math.max(0,(selectedMusic.duration_seconds||musicDuration||30)-1))} onChange={e=>{const v=Number(e.target.value);setMusicStart(v);if(musicEnd<=v)setMusicEnd(Math.min(selectedMusic.duration_seconds||musicDuration||30,v+10));}}/></label><label>Fin<input type="range" min={Math.min(selectedMusic.duration_seconds||musicDuration||30,musicStart+1)} max={Math.max(1,selectedMusic.duration_seconds||musicDuration||30)} value={Math.max(musicStart+1,Math.min(musicEnd,selectedMusic.duration_seconds||musicDuration||30))} onChange={e=>setMusicEnd(Number(e.target.value))}/></label><small>Le morceau sera lié à la publication, sans lecteur posé sur la photo.</small></div>}</div>}<p className="emi-creator-note">Ta publication sera publique. Publier nécessite un compte connecté.</p><div className="emi-publish-status" aria-live="polite" style={{display:busy?"flex":"none",alignItems:"center",gap:12,padding:"13px 15px",margin:"10px 0",borderRadius:14,border:"1px solid #6c4be8",background:"linear-gradient(135deg,#171321,#10151d)",color:"#f7f4ff"}}><span className="emi-publish-spinner" style={{width:20,height:20,border:"2px solid #51456e",borderTopColor:"#9b7cff",borderRadius:"50%",display:"inline-block",animation:"emiPublishSpin .8s linear infinite",flexShrink:0}}/><span><strong style={{display:"block",fontSize:13}}>Publication en cours</strong><small style={{display:"block",color:"#c5bdd8",marginTop:3}}>{publishProgress||"Préparation de ta publication…"}</small></span></div><button type="submit" className="emi-creator-next" disabled={busy}>{busy ? "Publication…" : "Publier"}</button></div></form></div> : profileEditorOpen ? <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · PROFIL</span><h2>Personnalise ton profil</h2><form onSubmit={saveProfile}><div className="profile-editor-avatar">{avatarFile ? avatarFile.name : user?.avatar_url ? <img src={user.avatar_url} alt="Photo actuelle"/> : <UserRound size={28}/>}</div><input ref={profileAvatarInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} style={{display:"none"}}/><input ref={profileCoverInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProfileCoverFile(e.target.files?.[0] || null)} style={{display:"none"}}/><button type="button" className="profile-back-button" onClick={()=>profileAvatarInput.current?.click()}>Choisir une photo de profil</button><button type="button" className="profile-back-button" onClick={()=>profileCoverInput.current?.click()}>Choisir une photo de couverture {profileCoverFile ? "· "+profileCoverFile.name : ""}</button><label className="profile-field-label">Nom affiché<input value={profileNameDraft} onChange={e=>setProfileNameDraft(e.target.value)} maxLength={80} placeholder="Ton nom"/></label><label className="profile-field-label">Nom d’utilisateur<input value={profileUsernameDraft} onChange={e=>setProfileUsernameDraft(e.target.value)} maxLength={30} placeholder="ex. emi_membre"/></label><label className="profile-field-label">Biographie<textarea value={profileBioDraft} onChange={e=>setProfileBioDraft(e.target.value)} maxLength={300} rows={4} placeholder="Présente-toi en quelques mots…"/></label><div style={{margin:"18px 0 12px",padding:"15px",border:"1px solid rgba(213,181,94,.3)",borderRadius:16,background:"rgba(12,48,34,.35)"}}><strong style={{display:"block",color:"#e6ca7a",marginBottom:5}}>Vitrine professionnelle</strong><small style={{display:"block",color:"#aebeb4",marginBottom:12}}>Facultatif · ajoute ton activité et tes coordonnées pour être contacté sur EMi.</small>{businessLoading ? <p>Chargement de ta fiche…</p> : <><label className="profile-field-label">Nom de l’activité<input value={businessDraft.name} onChange={e=>setBusinessDraft(v=>({...v,name:e.target.value}))} maxLength={120} placeholder="Ex. Boutique Éric"/></label><label className="profile-field-label">Secteur d’activité<input value={businessDraft.category} onChange={e=>setBusinessDraft(v=>({...v,category:e.target.value}))} maxLength={60} placeholder="Commerce, restauration, beauté…"/></label><label className="profile-field-label">Présentation<textarea value={businessDraft.description} onChange={e=>setBusinessDraft(v=>({...v,description:e.target.value}))} maxLength={1000} rows={3} placeholder="Décris tes produits ou services…"/></label><label className="profile-field-label">Téléphone<input type="tel" value={businessDraft.phone} onChange={e=>setBusinessDraft(v=>({...v,phone:e.target.value}))} maxLength={40} placeholder="+237…"/></label><label className="profile-field-label">WhatsApp<input type="tel" value={businessDraft.whatsapp} onChange={e=>setBusinessDraft(v=>({...v,whatsapp:e.target.value}))} maxLength={40} placeholder="+237…"/></label><label className="profile-field-label">E-mail professionnel<input type="email" value={businessDraft.email} onChange={e=>setBusinessDraft(v=>({...v,email:e.target.value}))} maxLength={120} placeholder="contact@entreprise.com"/></label><label className="profile-field-label">Ville<input value={businessDraft.city} onChange={e=>setBusinessDraft(v=>({...v,city:e.target.value}))} maxLength={100} placeholder="Yaoundé, Douala…"/></label><label className="profile-field-label">Adresse<input value={businessDraft.address} onChange={e=>setBusinessDraft(v=>({...v,address:e.target.value}))} maxLength={200} placeholder="Quartier, rue…"/></label><label style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0",color:"#e8e4d8"}}><input type="checkbox" checked={businessDraft.is_published} onChange={e=>setBusinessDraft(v=>({...v,is_published:e.target.checked}))}/> Publier ma vitrine et rendre les coordonnées visibles</label></>}</div><button className="modal-primary" type="submit" disabled={busy || businessLoading}>{busy ? "Enregistrement…" : "Enregistrer le profil"}</button></form></> : <><div className="modal-icon"><UserRound size={23}/></div><span className="eyebrow">EMi · TON COMPTE</span><h2>{recoveryMode ? "Nouveau mot de passe" : signup ? "Créer ton compte" : "Content de te revoir"}</h2><p>{recoveryMode ? "Choisis un mot de passe sûr pour retrouver ton compte." : signup ? "Inscris-toi avec ton adresse e-mail." : "Connecte-toi pour publier et aimer les moments."}</p>{!signup && !recoveryMode && <><div style={{display:"flex",gap:8,margin:"12px 0"}}><button type="button" onClick={()=>{setAuthMethod("email");setOtpSent(false);setOtpCode("");setMessage("");}} style={{flex:1,padding:10,borderRadius:9,border:"1px solid #8d6de0",background:"#302443",color:"#f7f6fb"}}>Connexion par e-mail</button></div><p style={{fontSize:12,lineHeight:1.6,color:"#aaa6b7",margin:"0 0 12px"}}>La connexion par SMS est temporairement indisponible. Utilise ton adresse e-mail et ton mot de passe.</p></>}<form onSubmit={authenticate}>{recoveryMode ? <input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nouveau mot de passe (8 caractères minimum)" autoComplete="new-password" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/> : authMethod==="phone" && !signup ? <><input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Téléphone (ex. +2376XXXXXXXX)" autoComplete="tel" disabled={otpSent} style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>{otpSent && <input type="text" inputMode="numeric" autoComplete="one-time-code" required value={otpCode} onChange={e=>setOtpCode(e.target.value)} placeholder="Code reçu par SMS" style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/>}</> : <><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email" style={{width:"100%",padding:13,marginBottom:10,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/><input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" autoComplete={signup?"new-password":"current-password"} style={{width:"100%",padding:13,marginBottom:14,borderRadius:10,border:"1px solid #393643",background:"#121218",color:"#f7f6fb"}}/></>}<button className="modal-primary" disabled={busy} type="submit">{busy ? "Patiente…" : recoveryMode ? "Enregistrer le nouveau mot de passe" : authMethod==="phone" && !signup ? (otpSent ? "Vérifier le code SMS" : "Recevoir un code SMS") : signup ? "Créer mon compte" : "Se connecter"}</button></form>{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void requestPasswordReset()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Mot de passe oublié ?</button>}{authMethod==="email" && !signup && !recoveryMode && <button type="button" onClick={()=>void resendConfirmationEmail()} disabled={busy} style={{width:"100%",marginTop:10,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>Renvoyer le courriel de confirmation</button>}{authMethod==="email" && !recoveryMode && <button onClick={()=>setSignup(v=>!v)} style={{width:"100%",marginTop:14,border:0,background:"none",color:"#c7b4ff",fontSize:12}}>{signup ? "J’ai déjà un compte" : "Créer un nouveau compte"}</button>}</>}</div></div>}
    <style jsx global>{`
      /* EMi Royal Nexus — styles globaux explicites pour le rendu mobile */
      .emi-home-nexus{display:block!important;position:relative!important;box-sizing:border-box!important;width:calc(100% - 24px)!important;margin:16px 12px 22px!important;padding:18px!important;overflow:hidden!important;border:1px solid rgba(212,185,91,.48)!important;border-radius:24px!important;background:radial-gradient(ellipse at 0% 0%,rgba(16,173,111,.22),transparent 48%),linear-gradient(145deg,#071e17 0%,#04120f 65%,#10291b 100%)!important;box-shadow:0 18px 42px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.08)!important}
      .emi-home-nexus-heading{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin:0 0 15px!important}
      .emi-home-nexus-heading>div{min-width:0!important}
      .emi-home-nexus-heading span{display:block!important;color:#68d8b1!important;font-size:9px!important;font-weight:900!important;letter-spacing:2px!important}
      .emi-home-nexus-heading h2{margin:6px 0 0!important;color:#fff4ce!important;font-size:17px!important;font-weight:900!important;line-height:1.25!important;letter-spacing:-.45px!important}
      .emi-home-nexus-heading button{display:flex!important;align-items:center!important;gap:3px!important;flex-shrink:0!important;border:0!important;background:none!important;color:#72e5bf!important;font-size:11px!important;font-weight:800!important;white-space:nowrap!important}
      .emi-home-nexus-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;width:100%!important}
      .emi-home-nexus-grid>.emi-nexus-tile{position:relative!important;display:flex!important;box-sizing:border-box!important;min-width:0!important;min-height:132px!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:6px!important;padding:13px!important;overflow:hidden!important;border:1px solid rgba(81,177,125,.34)!important;border-radius:17px!important;background:linear-gradient(145deg,rgba(13,77,48,.78),rgba(3,24,17,.98))!important;color:#f8f4e6!important;text-decoration:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 7px 18px rgba(0,0,0,.22)!important}
      .emi-home-nexus-grid>.emi-nexus-tile.emi-nexus-pro{border-color:rgba(229,199,94,.78)!important;background:linear-gradient(145deg,rgba(103,80,22,.48),rgba(4,37,25,.98) 68%)!important}
      .emi-home-nexus-grid .emi-nexus-icon{display:grid!important;flex:0 0 38px!important;width:38px!important;height:38px!important;place-items:center!important;border:1px solid rgba(228,200,102,.52)!important;border-radius:12px!important;background:linear-gradient(145deg,rgba(230,197,85,.2),rgba(10,91,58,.25))!important;color:#f0d16b!important}
      .emi-home-nexus-grid .emi-nexus-tile strong{display:block!important;margin:0!important;color:#fff8e8!important;font-size:13px!important;font-weight:900!important;line-height:1.25!important}
      .emi-home-nexus-grid .emi-nexus-tile small{display:block!important;margin:0!important;color:#b6cfc1!important;font-size:10px!important;line-height:1.35!important}
      .emi-home-nexus-grid .emi-nexus-tile b{display:flex!important;align-items:center!important;gap:2px!important;margin-top:auto!important;color:#e8cd75!important;font-size:10px!important;line-height:1.2!important}
      .emi-home-nexus-grid .emi-nexus-tile:active{transform:scale(.98)!important}
      @media(min-width:640px){.emi-home-nexus{width:100%!important;margin:20px 0 26px!important;padding:20px!important}.emi-home-nexus-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}.emi-home-nexus-grid>.emi-nexus-tile{min-height:145px!important;padding:14px!important}.emi-home-nexus-grid .emi-nexus-tile strong{font-size:14px!important}.emi-home-nexus-grid .emi-nexus-tile small{font-size:11px!important}}
      @media(max-width:360px){.emi-home-nexus-grid{grid-template-columns:1fr 1fr!important}.emi-home-nexus-grid>.emi-nexus-tile{min-height:124px!important;padding:11px!important}}
      .emi-royal-tools .emi-notification-bell{position:relative!important;display:grid!important;place-items:center!important}
      .emi-royal-tools .emi-notification-badge{position:absolute!important;top:-7px!important;right:-6px!important;min-width:19px!important;height:19px!important;padding:0 5px!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;border:2px solid #06130d!important;border-radius:999px!important;background:#e8c96c!important;color:#06130d!important;font-size:10px!important;font-weight:900!important;line-height:1!important;box-shadow:0 2px 8px #0008!important}
      .emi-nav-badge{min-width:17px!important;height:17px!important}
    `}</style>
    </main>
  );
}
