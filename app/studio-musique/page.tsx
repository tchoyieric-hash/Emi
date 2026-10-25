"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Music2, UploadCloud, Play, Pause, Volume2, Disc3, Activity, BadgeCheck, Image as ImageIcon, Sparkles, ArrowLeft, Send } from "lucide-react";

type Track = { id:string; title:string; artist:string; audio_url:string; cover_url:string|null; duration_seconds:number|null; genre:string|null };
const supabase = createSupabaseBrowserClient();
const presets = [
  { name:"Nuit urbaine", url:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=90" },
  { name:"Studio", url:"https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=90" },
  { name:"Néon", url:"https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=90" },
];

export default function MusicStoryStudioPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [track, setTrack] = useState<Track|null>(null);
  const [style, setStyle] = useState<"classic"|"vinyl"|"waveform">("classic");
  const [imageUrl, setImageUrl] = useState(presets[0].url);
  const [imageFile, setImageFile] = useState<File|null>(null);
  const [audioFile, setAudioFile] = useState<File|null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    async function init() {
      if (!supabase) { setNotice("La connexion Supabase n’est pas configurée."); return; }
      const [{ data: auth }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("music_catalog").select("id,title,artist,audio_url,cover_url,duration_seconds,genre").eq("is_published", true).eq("rights_confirmed", true).order("title").limit(100)
      ]);
      if (!alive) return;
      if (auth.user) setUserId(auth.user.id);
      if (error) setNotice("Catalogue musical indisponible : " + error.message);
      const rows = (data || []) as Track[];
      setTracks(rows);
      if (rows[0]) chooseTrack(rows[0]);
    }
    void init();
    return () => { alive = false; };
  }, []);

  function chooseTrack(item: Track) {
    setTrack(item); setTitle(item.title); setArtist(item.artist); setAudioFile(null); setAudioUrl(item.audio_url);
    setPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; audioRef.current.src = item.audio_url; }
  }

  function pickAudio(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setNotice("Choisis un fichier audio valide."); return; }
    if (file.size > 15*1024*1024) { setNotice("Le fichier audio doit faire moins de 15 Mo."); return; }
    if (audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioFile(file); setAudioUrl(url); setTitle(file.name.replace(/\.[^.]+$/, "")); setArtist("Musique importée");
    setTrack(null); setPlaying(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = url; audioRef.current.currentTime = 0; }
  }

  function pickImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Choisis une image."); return; }
    if (file.size > 25*1024*1024) { setNotice("La photo doit faire moins de 25 Mo."); return; }
    if (imageUrl.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    setImageFile(file); setImageUrl(URL.createObjectURL(file));
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !audioUrl) { setNotice("Sélectionne un morceau ou importe un fichier audio."); return; }
    if (playing) { audio.pause(); setPlaying(false); return; }
    try { await audio.play(); setPlaying(true); } catch { setNotice("Lecture impossible. Vérifie le format ou l’accès au fichier audio."); }
  }

  async function publishStory() {
    if (!supabase) return;
    if (!userId) { setNotice("Connecte-toi à EMi pour publier une story musicale."); return; }
    if (!imageFile) { setNotice("Importe une photo depuis ton téléphone avant de publier."); return; }
    if (!audioFile && !track) { setNotice("Sélectionne une musique du catalogue ou importe un fichier audio."); return; }
    setBusy(true); setNotice("");
    let imagePath = ""; let audioPath = "";
    try {
      imagePath = userId + "/" + crypto.randomUUID() + "-" + imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const { error: imageError } = await supabase.storage.from("story-media").upload(imagePath, imageFile, { contentType:imageFile.type, upsert:false });
      if (imageError) throw imageError;
      const imagePublicUrl = supabase.storage.from("story-media").getPublicUrl(imagePath).data.publicUrl;
      let finalAudioUrl = track?.audio_url || "";
      if (audioFile) {
        audioPath = userId + "/music-" + crypto.randomUUID() + "-" + audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const { error: audioError } = await supabase.storage.from("story-media").upload(audioPath, audioFile, { contentType:audioFile.type, upsert:false });
        if (audioError) throw audioError;
        finalAudioUrl = supabase.storage.from("story-media").getPublicUrl(audioPath).data.publicUrl;
      }
      const now = new Date();
      const { error: insertError } = await supabase.from("stories").insert({
        user_id:userId, media_url:imagePublicUrl, media_type:"image", caption:"", music_url:finalAudioUrl,
        music_title:[title.trim(), artist.trim()].filter(Boolean).join(" — ") || "Musique EMi",
        visibility:"public", created_at:now.toISOString(), expires_at:new Date(now.getTime()+86400000).toISOString()
      });
      if (insertError) throw insertError;
      setNotice("Story musicale publiée sur EMi. Elle sera visible pendant 24 heures.");
    } catch (error) {
      const paths = [imagePath,audioPath].filter(Boolean);
      if (paths.length) await supabase.storage.from("story-media").remove(paths).catch(()=>undefined);
      setNotice("Publication impossible : " + (error instanceof Error ? error.message : "erreur inconnue"));
    } finally { setBusy(false); }
  }

  const visibleTracks = tracks.filter(t => (t.title+" "+t.artist+" "+(t.genre||"")).toLowerCase().includes(search.toLowerCase()));
  return <main className="min-h-screen bg-[#080a12] text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <a href="/" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft size={18}/> Retour à EMi</a>
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-600 via-rose-500 to-amber-400"><Music2 size={22}/></div><div><h1 className="font-bold">EMi Music Studio</h1><p className="text-xs text-slate-400">Story musicale · aperçu en direct</p></div></div>
        <span className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300 sm:block">Médias Supabase</span>
      </div>
    </header>
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-7 px-4 py-7 lg:grid-cols-[1.1fr_.9fr]">
      <section className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Music2 className="text-rose-400" size={19}/>1. Choisir une musique</h2>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un titre, un artiste ou un genre…" className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-rose-400"/>
          <div className="grid gap-2 sm:grid-cols-2">
            {visibleTracks.map(t=><button key={t.id} onClick={()=>chooseTrack(t)} className={"flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition "+(track?.id===t.id?"border-rose-400 bg-rose-500/10":"border-white/10 bg-black/20 hover:bg-white/5")}>
              {t.cover_url?<img src={t.cover_url} alt="" className="h-12 w-12 rounded-lg object-cover"/>:<div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-600 to-rose-500"><Disc3/></div>}
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{t.title}</span><span className="block truncate text-xs text-slate-400">{t.artist}</span></span>
              {track?.id===t.id&&<span className="text-xs text-rose-300">Choisie</span>}
            </button>)}
          </div>
          {!tracks.length&&<p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">Le catalogue officiel est vide pour le moment. Importe un fichier audio original ou dont tu possèdes les droits.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={()=>audioInputRef.current?.click()} className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm hover:bg-slate-700"><UploadCloud size={17}/> Importer une musique</button>
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={e=>pickAudio(e.target.files?.[0])}/>
            {audioFile&&<span className="self-center text-xs text-emerald-300">Fichier local prêt · sera envoyé à Supabase à la publication</span>}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><BadgeCheck className="text-violet-300" size={19}/>2. Style du sticker</h2>
          <div className="grid grid-cols-3 gap-2">
            {([{id:"classic",label:"Classique",Icon:BadgeCheck},{id:"vinyl",label:"Vinyle animé",Icon:Disc3},{id:"waveform",label:"Onde épurée",Icon:Activity}] as const).map(opt=><button key={opt.id} onClick={()=>setStyle(opt.id)} className={"flex flex-col items-center gap-2 rounded-xl border p-3 text-xs "+(style===opt.id?"border-fuchsia-400 bg-fuchsia-500/10 text-white":"border-white/10 text-slate-400 hover:bg-white/5")}><opt.Icon size={22}/>{opt.label}</button>)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ImageIcon className="text-cyan-300" size={19}/>3. Photo de la story</h2>
          <div className="flex gap-2"><button onClick={()=>imageInputRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm hover:bg-slate-700"><UploadCloud size={17}/> Importer une photo</button><input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e=>pickImage(e.target.files?.[0])}/></div>
          <div className="mt-3 flex gap-2 overflow-x-auto">{presets.map(p=><button key={p.name} onClick={()=>{setImageUrl(p.url);setImageFile(null)}} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10"><img src={p.url} alt={p.name} className="h-full w-full object-cover"/><span className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-[9px]">{p.name}</span></button>)}</div>
          <p className="mt-2 text-xs text-slate-500">Les fonds prédéfinis servent à l’aperçu. Pour publier ta propre story, importe une photo personnelle.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
          <h2 className="mb-3 font-semibold">4. Informations du morceau</h2>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Titre<input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"/></label><label className="text-xs text-slate-400">Artiste<input value={artist} onChange={e=>setArtist(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white"/></label></div>
          <button disabled={busy} onClick={()=>void publishStory()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-400 px-4 py-3 font-semibold disabled:opacity-50"><Send size={17}/>{busy?"Publication…":"Publier la story musicale"}</button>
          {notice&&<p role="status" className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-slate-200">{notice}</p>}
        </div>
      </section>
      <aside className="flex flex-col items-center lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[36px] border-[5px] border-slate-800 bg-slate-900 shadow-2xl shadow-rose-950/30">
          <img src={imageUrl} alt="Aperçu story" className="absolute inset-0 h-full w-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70"/>
          <div className="absolute inset-x-4 top-5 z-10"><div className="h-1 rounded-full bg-white/30"><div className="h-1 w-1/3 rounded-full bg-white"/></div><div className="mt-3 flex items-center gap-2 text-xs"><div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-amber-400 font-bold">E</div><div><b>{userId?"mon_compte_emi":"studio_creator"}</b><div className="text-[10px] text-white/75">♫ {title||"Sélectionne une musique"}</div></div></div></div>
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2">
            {style==="classic"&&<div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/15 p-3 shadow-xl backdrop-blur-xl"><img src={track?.cover_url||imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover"/><div className="min-w-0"><b className="block truncate text-xs">{title||"Titre du morceau"}</b><span className="block truncate text-[11px] text-white/75">{artist||"Artiste"}</span><div className="mt-2 flex h-3 items-end gap-[3px]">{[5,9,4,11,7,10,4].map((h,i)=><span key={i} className="w-[3px] rounded-full bg-rose-300" style={{height:h,animation:"equalize .7s ease-in-out infinite alternate",animationDelay:(i*90)+"ms"}}/>)}</div></div></div>}
            {style==="vinyl"&&<div className="flex flex-col items-center gap-3 rounded-3xl border border-white/20 bg-white/15 p-5 text-center backdrop-blur-xl"><div className={"relative grid h-24 w-24 place-items-center rounded-full border-[7px] border-slate-800 bg-black "+(playing?"animate-spin":"")}><div className="absolute inset-2 rounded-full border border-slate-700"/><img src={track?.cover_url||imageUrl} alt="" className="h-9 w-9 rounded-full object-cover"/></div><b className="text-xs">{title||"Titre du morceau"}</b><span className="text-[10px] text-white/70">{artist||"Artiste"}</span></div>}
            {style==="waveform"&&<div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl"><Disc3 className="shrink-0 text-rose-300"/><div className="min-w-0 flex-1 truncate text-xs"><b>{title||"Titre"}</b><span className="text-white/60"> · {artist||"Artiste"}</span></div><div className="flex h-6 items-center gap-[3px]">{[4,12,8,19,10,15,5,17].map((h,i)=><span key={i} className="w-[3px] rounded-full bg-amber-300" style={{height:h}}/>)}</div></div>}
          </div>
          <div className="absolute inset-x-4 bottom-5 rounded-2xl border border-white/10 bg-black/65 p-3 backdrop-blur-xl"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold">{title||"Aperçu musical"}</div><div className="text-[10px] text-white/60">{artist||"EMi Music Studio"}</div></div><div className="flex items-center gap-2"><button onClick={()=>{if(audioRef.current){audioRef.current.muted=!muted;setMuted(!muted)}}} className="rounded-full p-2 hover:bg-white/10" aria-label="Activer ou couper le son"><Volume2 size={17}/></button><button onClick={()=>void togglePlayback()} className="grid h-9 w-9 place-items-center rounded-full bg-rose-500" aria-label={playing?"Pause":"Lecture"}>{playing?<Pause size={16}/>:<Play size={16}/>}</button></div></div><audio ref={audioRef} src={audioUrl||undefined} preload="metadata" onEnded={()=>setPlaying(false)} onPause={()=>setPlaying(false)} onPlay={()=>setPlaying(true)} className="hidden"/></div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-center text-xs text-slate-500"><Sparkles size={14} className="text-rose-300"/>Aperçu en direct · choisissez un style puis écoutez l’extrait</p>
      </aside>
    </div>
    <style jsx global>{`@keyframes equalize { from { transform:scaleY(.45); } to { transform:scaleY(1.1); } }`}</style>
  </main>;
}
