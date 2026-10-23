"use client";

import { useState } from "react";
import {
  Bell, Camera, Compass, Heart, Home, MessageCircle, Plus, Search,
  Send, Settings, Sparkles, UserRound, Video, X
} from "lucide-react";

const stories = [
  { name: "Ajouter", color: "story-add", initials: "+" },
  { name: "Amina", color: "story-pink", initials: "AM" },
  { name: "Junior", color: "story-blue", initials: "JD" },
  { name: "Merveille", color: "story-orange", initials: "MK" },
  { name: "Samuel", color: "story-green", initials: "SN" },
];

const posts = [
  { name: "Amina N.", handle: "@amina.crea", place: "Douala, Cameroun", initials: "AN", tone: "sunset", caption: "Les petits moments font les plus beaux souvenirs ✨", likes: "248", comments: "32", time: "12 min" },
  { name: "Junior D.", handle: "@junior.d", place: "Yaoundé, Cameroun", initials: "JD", tone: "night", caption: "Nouvelle journée, nouvelle énergie. On avance ensemble. 🌍", likes: "126", comments: "18", time: "38 min" },
];

export default function HomePage() {
  const [active, setActive] = useState("Accueil");
  const [liked, setLiked] = useState<string[]>([]);
  const [storyOpen, setStoryOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="EMi accueil"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a>
        <div className="profile-mini"><div className="avatar avatar-me">ME</div><div><strong>Bienvenue sur EMi</strong><span>Ton espace social</span></div></div>
        <nav className="nav-list" aria-label="Navigation principale">
          {[["Accueil", Home], ["Découvrir", Compass], ["Messages", MessageCircle], ["Notifications", Bell], ["Mon profil", UserRound]].map(([label, Icon]) => {
            const title = label as string;
            const Glyph = Icon as typeof Home;
            return <button key={title} className={`nav-item ${active === title ? "selected" : ""}`} onClick={() => setActive(title)}><Glyph size={20} strokeWidth={1.8}/><span>{title}</span>{title === "Messages" && <i className="nav-badge">2</i>}</button>;
          })}
        </nav>
        <button className="create-button" onClick={() => setComposerOpen(true)}><Plus size={20}/> Créer une publication</button>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => setActive("Paramètres")}><Settings size={20}/><span>Paramètres</span></button><div className="sidebar-note"><Sparkles size={16}/><p>Des moments vrais.<br/><strong>Des liens qui comptent.</strong></p></div><span className="version">EMi · Première version</span></div>
      </aside>

      <section className="main-column">
        <header className="mobile-header"><a className="brand" href="#"><span className="brand-mark">e</span><span>EMi<span className="brand-dot">.</span></span></a><button className="icon-button" aria-label="Notifications" onClick={() => setActive("Notifications")}><Bell size={21}/></button></header>
        <div className="feed-header"><div><span className="eyebrow">TON UNIVERS, TES LIENS</span><h1>{active === "Accueil" ? "Le fil des moments" : active}</h1><p>Retrouve ce qui compte pour toi.</p></div><button className="round-action" onClick={() => setComposerOpen(true)} aria-label="Créer une publication"><Plus size={22}/></button></div>

        <div className="stories-card"><div className="section-label"><strong>Les moments</strong><button onClick={() => setStoryOpen(true)}>Voir tout <span>→</span></button></div><div className="stories-row">{stories.map((s, i) => <button key={s.name} className="story" onClick={() => i === 0 ? setComposerOpen(true) : setStoryOpen(true)}><span className={`story-ring ${s.color}`}><span className="story-avatar">{s.initials}</span>{i === 0 && <span className="story-plus"><Plus size={13}/></span>}</span><span className="story-name">{s.name}</span></button>)}</div></div>

        <div className="feed-tabs"><button className="tab-active" onClick={() => setActive("Accueil")}>Pour toi</button><button onClick={() => setActive("Abonnements")}>Abonnements</button><button onClick={() => setActive("Vidéos")}>Vidéos <Video size={14}/></button></div>
        <div className="feed-list">{posts.map((post) => <article className="post-card" key={post.handle}><div className="post-top"><div className={`avatar avatar-${post.tone}`}>{post.initials}</div><div className="post-author"><strong>{post.name}</strong><span>{post.handle} · {post.time}</span><small>{post.place}</small></div><button className="more-button" aria-label="Plus d'options">···</button></div><p className="post-caption">{post.caption}</p><div className={`post-visual visual-${post.tone}`}><div className="visual-grain"/><span className="visual-kicker">EMi MOMENTS</span><span className="visual-title">{post.tone === "sunset" ? <>La beauté<br/>du quotidien.</> : <>On avance<br/>ensemble.</>}</span><span className="visual-bottom">{post.place.toUpperCase()}</span><button className="visual-play" aria-label="Lire la vidéo" onClick={() => setActive("Vidéos")}><Video size={18}/></button></div><div className="post-actions"><button className={liked.includes(post.handle) ? "liked" : ""} onClick={() => setLiked((old) => old.includes(post.handle) ? old.filter((x) => x !== post.handle) : [...old, post.handle])}><Heart size={20} fill={liked.includes(post.handle) ? "currentColor" : "none"}/><span>{Number(post.likes) + (liked.includes(post.handle) ? 1 : 0)}</span></button><button onClick={() => setActive("Commentaires")}><MessageCircle size={20}/><span>{post.comments}</span></button><button onClick={() => setActive("Messages")}><Send size={19}/><span>Partager</span></button><span className="post-spacer"/><button aria-label="Enregistrer"><Sparkles size={19}/></button></div></article>)}</div>
        <div className="demo-note"><Sparkles size={16}/><span>Voici la base visuelle d’EMi. La connexion à Neon est en cours de validation. Les comptes, publications et messages réels ne sont pas encore activés.</span></div>
      </section>

      <aside className="right-column"><div className="right-search"><Search size={18}/><input aria-label="Rechercher" placeholder="Rechercher sur EMi..." value={query} onChange={(e) => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="welcome-card"><div className="welcome-orb"><Sparkles size={23}/></div><span className="eyebrow">BIENVENUE DANS TON MONDE</span><h2>Chaque moment<br/>mérite d’exister.</h2><p>Partage tes histoires, découvre des talents et garde le lien avec ta communauté.</p><button onClick={() => setComposerOpen(true)}>Partager un moment <Plus size={16}/></button><div className="welcome-decoration">e.</div></div><div className="suggest-card"><div className="section-label"><strong>À découvrir</strong><button onClick={() => setActive("Découvrir")}>Explorer →</button></div><div className="suggest-item"><div className="suggest-avatar suggest-a">C</div><div><strong>Créateurs locaux</strong><span>Des voix près de chez toi</span></div><button onClick={() => setActive("Découvrir")} aria-label="Découvrir les créateurs"><Plus size={17}/></button></div><div className="suggest-item"><div className="suggest-avatar suggest-b"><Camera size={18}/></div><div><strong>Moments en vidéo</strong><span>Des histoires à regarder</span></div><button onClick={() => setActive("Vidéos")} aria-label="Voir les vidéos"><Plus size={17}/></button></div><div className="suggest-item"><div className="suggest-avatar suggest-c"><Heart size={18}/></div><div><strong>Communauté EMi</strong><span>Des liens authentiques</span></div><button onClick={() => setActive("Découvrir")} aria-label="Voir la communauté"><Plus size={17}/></button></div></div><div className="right-footer">À propos · Confidentialité · Aide<br/>© 2026 EMi · Fait avec soin</div></aside>

      <nav className="mobile-nav" aria-label="Navigation mobile"><button className={active === "Accueil" ? "mobile-active" : ""} onClick={() => setActive("Accueil")}><Home size={21}/><span>Accueil</span></button><button onClick={() => setActive("Découvrir")}><Compass size={21}/><span>Explorer</span></button><button className="mobile-create" onClick={() => setComposerOpen(true)}><Plus size={23}/></button><button onClick={() => setActive("Vidéos")}><Video size={21}/><span>Vidéos</span></button><button onClick={() => setActive("Mon profil")}><UserRound size={21}/><span>Profil</span></button></nav>

      {(composerOpen || storyOpen) && <div className="modal-backdrop" onClick={() => {setComposerOpen(false);setStoryOpen(false);}}><div className="modal-card" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => {setComposerOpen(false);setStoryOpen(false);}} aria-label="Fermer"><X size={20}/></button><div className="modal-icon">{composerOpen ? <Camera size={23}/> : <Sparkles size={23}/>}</div><span className="eyebrow">EMi · TON ESPACE</span><h2>{composerOpen ? "Un moment à partager ?" : "Les moments arrivent bientôt"}</h2><p>{composerOpen ? "La création de publications avec photo, vidéo et texte sera activée après la mise en place du backend Neon et d’un stockage média sécurisé. Cette version de démonstration ne publie encore rien." : "Les stories éphémères seront ajoutées après la mise en place des comptes et du stockage sécurisé."}</p><button className="modal-primary" onClick={() => {setComposerOpen(false);setStoryOpen(false);}}>J’ai compris</button></div></div>}
    </main>
  );
}