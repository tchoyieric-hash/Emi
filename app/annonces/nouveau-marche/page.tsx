"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, ShoppingBag, Store, SlidersHorizontal, Sparkles, ShieldCheck, MapPin, Plus, Package, Heart, ShoppingCart, Share2, Pencil, Trash2, Bell, Settings2, TrendingUp, BadgeCheck, Truck, X, Star } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  stock: number;
  image_urls: unknown;
  status: string;
  business_id: string;
  owner_id: string;
  category_id: string | null;
  product_categories?: { name?: string } | { name?: string }[] | null;
  businesses?: { name?: string; city?: string; is_published?: boolean } | { name?: string; city?: string; is_published?: boolean }[] | null;
};
const supabase = createSupabaseBrowserClient();
const categories = ["Tout", "Mode & Beauté", "Téléphones & Électronique", "Maison & Équipement", "Alimentation", "Véhicules", "Immobilier", "Services"];
const categoryIcons = ["✦", "✧", "▣", "⌂", "◈", "◇", "⌂", "↗"];

function imageOf(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : ""; }
    catch { return value.startsWith("http") ? value : ""; }
  }
  return "";
}
function productCategoryOf(p: Product) { return Array.isArray(p.product_categories) ? p.product_categories[0]?.name : p.product_categories?.name; }
function businessOf(p: Product) {
  return Array.isArray(p.businesses) ? p.businesses[0] : p.businesses;
}
function money(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0)) + " " + (currency === "XAF" ? "FCFA" : currency);
}

export default function NouveauMarchePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tout");
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [actionNotice, setActionNotice] = useState("");
  const [busyProduct, setBusyProduct] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) { setError("La connexion au marché est momentanément indisponible."); setLoading(false); return; }
      const [{ data: auth }, { data, error: queryError }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("products")
          .select("id,name,description,price,currency,stock,image_urls,status,business_id,owner_id,category_id,businesses(name,city,is_published),product_categories(name)")
          .eq("status", "active")
          .gt("stock", 0)
          .order("created_at", { ascending: false })
          .limit(48)
      ]);
      if (!active) return;
      setUserId(auth.user?.id || "");
      try { const raw = localStorage.getItem("emi-market-cart-v1"); const lines = raw ? JSON.parse(raw) : []; setCartCount(Array.isArray(lines) ? lines.reduce((n: number, x: any) => n + (Number(x.quantity) || 0), 0) : 0); } catch { setCartCount(0); }
      try { const saved = localStorage.getItem("emi-market-favorites-v1"); setFavorites(saved ? JSON.parse(saved) : []); } catch { setFavorites([]); }
      if (queryError) setError("Les produits ne peuvent pas être chargés pour le moment. " + queryError.message);
      else setProducts((data || []) as unknown as Product[]);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => products.filter(p => {
    const q = query.trim().toLocaleLowerCase("fr");
    const b = businessOf(p);
    const textMatch = !q || [p.name, p.description, b?.name, b?.city].some(v => String(v || "").toLocaleLowerCase("fr").includes(q));
    const categoryMatch = category === "Tout" || productCategoryOf(p) === category;
    return textMatch && categoryMatch && (!favoritesOnly || favorites.includes(p.id));
  }).sort((a,b) => sortBy === "price-low" ? a.price-b.price : sortBy === "price-high" ? b.price-a.price : 0), [products, query, category, favoritesOnly, favorites, sortBy]);

  function toggleFavorite(p: Product) {
    setFavorites(current => {
      const next = current.includes(p.id) ? current.filter(id => id !== p.id) : [...current, p.id];
      try { localStorage.setItem("emi-market-favorites-v1", JSON.stringify(next)); } catch { /* stockage local facultatif */ }
      return next;
    });
  }

  async function shareProduct(p: Product) {
    const url = window.location.origin + "/annonces/business?product=" + encodeURIComponent(p.id);
    const payload = { title: p.name, text: p.description || "Découvre ce produit sur EMi Market", url };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(url); setActionNotice("Lien du produit copié."); }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setActionNotice("Partage indisponible sur cet appareil.");
    }
  }

  async function editProduct(p: Product) {
    if (!supabase || p.owner_id !== userId) return;
    const name = window.prompt("Nom du produit :", p.name);
    if (name === null) return;
    const description = window.prompt("Description :", p.description || "");
    if (description === null) return;
    const priceText = window.prompt("Prix en FCFA :", String(p.price));
    if (priceText === null) return;
    const price = Number(priceText.replace(/\\s/g, "").replace(",", "."));
    if (!name.trim() || !Number.isFinite(price) || price < 0) {
      setActionNotice("Nom ou prix invalide. Aucune modification enregistrée."); return;
    }
    setBusyProduct(p.id); setActionNotice("");
    const { error: updateError } = await supabase.from("products")
      .update({ name: name.trim(), description: description.trim(), price })
      .eq("id", p.id).eq("owner_id", userId);
    if (updateError) setActionNotice("Modification impossible : " + updateError.message);
    else {
      setProducts(current => current.map(item => item.id === p.id ? { ...item, name: name.trim(), description: description.trim(), price } : item));
      setActionNotice("Produit modifié avec succès.");
    }
    setBusyProduct("");
  }

  async function deleteProduct(p: Product) {
    if (!supabase || p.owner_id !== userId) return;
    if (!window.confirm("Supprimer « " + p.name + " » du catalogue ? Cette action est définitive pour ce produit.")) return;
    setBusyProduct(p.id); setActionNotice("");
    const { error: deleteError } = await supabase.from("products")
      .delete().eq("id", p.id).eq("owner_id", userId);
    if (deleteError) setActionNotice("Suppression impossible : " + deleteError.message);
    else {
      setProducts(current => current.filter(item => item.id !== p.id));
      setActionNotice("Produit supprimé du catalogue.");
    }
    setBusyProduct("");
  }

  function addToCart(p: Product) {
    try {
      const raw = localStorage.getItem("emi-market-cart-v1");
      const lines: { product_id: string; quantity: number }[] = raw ? JSON.parse(raw) : [];
      const otherLine = lines.find(line => {
        const product = products.find(item => item.id === line.product_id);
        return product && product.business_id !== p.business_id;
      });
      if (otherLine) { window.location.assign("/annonces/business"); return; }
      const found = lines.find(line => line.product_id === p.id);
      if (found) found.quantity = Math.min(found.quantity + 1, p.stock);
      else lines.push({ product_id: p.id, quantity: 1 });
      localStorage.setItem("emi-market-cart-v1", JSON.stringify(lines));
      setCartCount(lines.reduce((sum, line) => sum + line.quantity, 0));
      window.location.assign("/annonces/business?openCart=1");
    } catch { window.location.assign("/annonces/business"); }
  }

  return (
    <main className="emi-market-v2 min-h-screen text-white">
      <div className="emi-market-v2-wrap">
        <header className="emi-v2-top">
          <Link href="/" className="emi-v2-back"><ArrowLeft size={16}/> EMi</Link>
          <Link href="/annonces/business" className="emi-v2-top-link"><ShoppingCart size={17}/> Panier & catalogue</Link>
        </header>

        <section className="emi-v2-hero">
          <div className="emi-v2-hero-glow" />
          <div className="emi-v2-brand"><span className="emi-v2-mark">♛</span><span><b>EMi MARKET</b><small>ACHETEZ · VENDEZ · PARTAGEZ · GAGNEZ</small></span><span className="emi-v2-live"><i/> MARKETPLACE PREMIUM</span></div>
          <div className="emi-v2-hero-content">
            <div className="emi-v2-hero-copy">
              <span className="emi-v2-kicker"><Sparkles size={13}/> ACHETER LOCAL · VENDRE PLUS LOIN</span>
              <h1>Le commerce<br/><em>prend une nouvelle dimension.</em></h1>
              <p>Découvrez des produits, explorez les boutiques et échangez directement avec les vendeurs de la communauté EMi.</p>
              <div className="emi-v2-trust"><span><ShieldCheck size={15}/> Boutiques de la communauté</span><span><MapPin size={15}/> Partout au Cameroun</span></div>
            </div>
            <div className="emi-v2-orb" aria-hidden="true"><div className="emi-v2-orb-ring"/><div className="emi-v2-cube">M</div><span>ACHETER · VENDRE · GRANDIR</span></div>
          </div>
          <div className="emi-v2-hero-actions">
            <Link href="/annonces/business"><Store size={17}/> Explorer les boutiques <ArrowRight size={16}/></Link>
            <Link href="/annonces/business"><Plus size={17}/> Gérer ma boutique</Link>
          </div>
        </section>

        <section className="emi-v2-search-area">
          <div className="emi-v2-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un produit, une marque ou une boutique…" aria-label="Rechercher un produit ou une boutique"/><button onClick={()=>setFavoritesOnly(v=>!v)} className={favoritesOnly?"active":""} aria-label="Filtrer les favoris" title="Mes favoris"><Heart size={18}/></button><SlidersHorizontal size={18}/></div>\n          <div className="emi-v2-filter-row"><button className={favoritesOnly?"active":""} onClick={()=>setFavoritesOnly(v=>!v)}><Heart size={14}/> {favoritesOnly?"Mes favoris":"Favoris"}</button><label>Trier par <select value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="recent">Récents</option><option value="price-low">Prix croissant</option><option value="price-high">Prix décroissant</option></select></label><Link href="/annonces/business"><Store size={14}/> Toutes les boutiques</Link></div>
        </section>

        <section className="emi-v2-categories">
          <div className="emi-v2-section-head"><div><span className="emi-v2-kicker">PARCOURIR</span><h2>Les univers du marché</h2></div><span className="emi-v2-count">08 UNIVERS</span></div>
          <div className="emi-v2-category-row">
            {categories.map((c,i)=><button key={c} onClick={()=>setCategory(c)} className={category===c?"active":""}><span>{categoryIcons[i]}</span>{c}</button>)}
          </div>
          {category !== "Tout" && <p className="emi-v2-category-hint">Produits classés dans : {category}</p> }
        </section>

        <section className="emi-v2-products">
          <div className="emi-v2-section-head"><div><span className="emi-v2-kicker">SÉLECTION EMi</span><h2>À découvrir maintenant</h2><p>Les produits publiés et disponibles dans les boutiques.</p></div><span className="emi-v2-count">{loading ? "…" : visible.length + " PRODUIT(S)"}</span></div>
          {(error || actionNotice) && <div className="emi-v2-message" role="status">{actionNotice || error}</div>}
          {loading ? <div className="emi-v2-empty"><span className="emi-v2-loader"/>Chargement des produits du marché…</div> :
            visible.length ? <div className="emi-v2-grid">{visible.map(p=>{const b=businessOf(p);const img=imageOf(p.image_urls);return <article className="emi-v2-product" key={p.id}>
              <div className="emi-v2-product-image">{img ? <img src={img} alt={p.name} loading="lazy"/> : <div className="emi-v2-no-image"><ShoppingBag size={32}/><span>EMi MARKET</span></div>}<span className="emi-v2-stock">En stock · {p.stock}</span><div className="emi-v2-card-tools"><button className={"emi-v2-fav "+(favorites.includes(p.id)?"is-favorite":"")} onClick={()=>toggleFavorite(p)} aria-label={"Ajouter "+p.name+" aux favoris"} title="Favori"><Heart size={16}/></button><button className="emi-v2-fav" onClick={()=>void shareProduct(p)} aria-label={"Partager "+p.name} title="Partager"><Share2 size={16}/></button></div></div>
              <div className="emi-v2-product-body"><span className="emi-v2-shop-name"><Store size={13}/>{b?.name || "Boutique EMi"}</span><h3>{p.name}</h3><p>{p.description || "Découvrez ce produit auprès de son vendeur."}</p><div className="emi-v2-product-bottom"><strong>{money(p.price,p.currency)}</strong><div className="emi-v2-product-actions">{p.owner_id === userId && <><button className="emi-v2-edit" disabled={busyProduct===p.id} onClick={()=>void editProduct(p)} title="Modifier le produit" aria-label="Modifier le produit"><Pencil size={15}/></button><button className="emi-v2-delete" disabled={busyProduct===p.id} onClick={()=>void deleteProduct(p)} title="Supprimer le produit" aria-label="Supprimer le produit"><Trash2 size={15}/></button></>}<button className="emi-v2-add" onClick={()=>addToCart(p)} aria-label={"Ajouter "+p.name+" au panier"} title="Ajouter au panier"><ShoppingCart size={17}/></button></div></div>{b?.city && <small className="emi-v2-city"><MapPin size={12}/>{b.city}</small>}</div>
            </article>})}</div> : <div className="emi-v2-empty"><ShoppingBag size={30}/><strong>Aucun produit disponible pour le moment</strong><p>Les nouveaux produits publiés par les vendeurs apparaîtront ici.</p><Link href="/annonces/espace-vendeur"><Plus size={16}/> Publier un produit</Link></div>
          }
        </section>

        <section className="emi-v2-seller-banner"><div><span className="emi-v2-kicker">VOUS ÊTES COMMERÇANT ?</span><h2>Votre boutique mérite<br/>une vitrine à sa hauteur.</h2><p>Présentez vos produits et gérez votre activité depuis votre espace vendeur.</p></div><Link href="/annonces/espace-vendeur">Accéder à mon espace <ArrowRight size={17}/></Link></section>
        <section className="emi-v2-benefits"><div><ShieldCheck/><b>Confiance</b><span>Vendeurs et boutiques de la communauté</span></div><div><Truck/><b>Livraison</b><span>Organisation au Cameroun</span></div><div><TrendingUp/><b>Performance</b><span>Outils de gestion pour vendeurs</span></div><div><Star/><b>Expérience premium</b><span>Simple, claire et mobile-first</span></div></section><footer className="emi-v2-footer"><span>EMi MARKET</span><span>Un marché. Des opportunités. Une communauté.</span></footer>
      </div>
      <nav className="emi-v2-mobile-nav"><Link href="/">Accueil</Link><a href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:"smooth"})}} className="selected">Marché</a><Link href="/annonces/business?openCart=1">Panier <b>{cartCount}</b></Link><Link href="/annonces/espace-vendeur">Vendre</Link><Link href="/annonces/commandes">Commandes</Link></nav>
      <style jsx global>{`
        .emi-market-v2{background:#06130f;color:#f8f5e9;background-image:radial-gradient(ellipse at 50% -10%,rgba(17,100,65,.35),transparent 45%),linear-gradient(180deg,#071a13 0%,#050c09 100%);font-family:Arial, sans-serif;padding:0 0 40px}
        .emi-market-v2-wrap{max-width:1180px;margin:auto;padding:18px 24px 50px}
        .emi-v2-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
        .emi-v2-back,.emi-v2-top-link{display:inline-flex;align-items:center;gap:8px;color:#e6d18a;font-size:13px;font-weight:700}
        .emi-v2-top-link{padding:10px 14px;border:1px solid #c7a64b55;border-radius:999px;background:#d8b9570c}.emi-v2-header-actions{display:flex;align-items:center;gap:9px}.emi-v2-icon-link{width:40px;height:40px;display:grid;place-items:center;border:1px solid #c7a64b55;border-radius:13px;background:#d8b9570c;color:#e8d18b}.emi-v2-settings{position:absolute;z-index:30;right:max(24px,calc((100vw - 1180px)/2 + 24px));top:70px;width:min(300px,calc(100vw - 30px));padding:14px;border:1px solid #c9a94f88;border-radius:16px;background:#071a13;box-shadow:0 18px 55px #000b}.emi-v2-settings>div,.emi-v2-settings>a,.emi-v2-settings>button{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:11px;border:0;border-bottom:1px solid #ffffff12;background:none;color:#e9ddb2;font-size:12px;text-align:left}.emi-v2-settings>div button{border:0;background:none;color:#e9ddb2}.emi-v2-live{margin-left:auto;display:flex;align-items:center;gap:7px;color:#c8d8ca;font-size:9px;letter-spacing:1.2px}.emi-v2-live i{width:7px;height:7px;border-radius:50%;background:#6ee7a0;box-shadow:0 0 10px #6ee7a0}.emi-v2-filter-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px}.emi-v2-filter-row button,.emi-v2-filter-row label,.emi-v2-filter-row>a{display:flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid #294638;border-radius:10px;background:#0b2118;color:#b8c9bc;font-size:10px}.emi-v2-filter-row button.active{border-color:#d9ba5b;color:#f1d981}.emi-v2-filter-row select{border:0;background:#0b2118;color:#e7d28d;font-size:10px;outline:0}.emi-v2-search>button{border:0;background:none;color:#e1cb83}.emi-v2-search>button.active{color:#f0c94e}.emi-v2-card-tools{position:absolute;right:10px;top:10px;display:flex;gap:6px}.emi-v2-fav.is-favorite{color:#f6d34f;background:#4a3b12e8}.emi-v2-benefits{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:28px}.emi-v2-benefits>div{display:flex;flex-direction:column;gap:7px;padding:16px;border:1px solid #294638;border-radius:14px;background:#0a2017}.emi-v2-benefits svg{color:#dfc36b}.emi-v2-benefits b{font-size:12px;color:#f1d981}.emi-v2-benefits span{font-size:10px;line-height:1.5;color:#9db0a3}
        .emi-v2-hero{position:relative;overflow:hidden;border:1px solid #c9a94f88;border-radius:27px;background:linear-gradient(115deg,#071c14 0%,#0b3927 54%,#07160f 100%);box-shadow:0 25px 70px #0007,inset 0 0 0 1px #f6d87918;padding:30px 34px 0}
        .emi-v2-hero-glow{position:absolute;width:450px;height:450px;border-radius:50%;right:5%;top:-220px;background:#d8b9571b;filter:blur(35px);pointer-events:none}
        .emi-v2-brand{position:relative;display:flex;align-items:center;gap:13px}.emi-v2-mark{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#ffefad,#b68a28 55%,#f5d46d);color:#082117;font-size:31px;font-weight:900;box-shadow:0 0 0 4px #d5ad3c20}.emi-v2-brand b{display:block;font-size:20px;letter-spacing:2px;color:#f5dc91}.emi-v2-brand small{display:block;margin-top:4px;font-size:8px;letter-spacing:2.1px;color:#c8b875}
        .emi-v2-hero-content{position:relative;display:grid;grid-template-columns:1.2fr .8fr;align-items:center;gap:20px;min-height:300px}.emi-v2-kicker{display:inline-flex;align-items:center;gap:7px;color:#e3c76f;font-size:10px;font-weight:800;letter-spacing:1.8px}.emi-v2-hero h1{margin:17px 0 13px;font-size:clamp(35px,5vw,58px);line-height:1.02;letter-spacing:-2px;font-weight:900}.emi-v2-hero h1 em{font-style:normal;color:#d9bd67}.emi-v2-hero-copy>p{max-width:520px;color:#c3d2c8;font-size:14px;line-height:1.8}.emi-v2-trust{display:flex;gap:20px;flex-wrap:wrap;margin-top:22px;color:#c8d6cd;font-size:11px}.emi-v2-trust span{display:flex;align-items:center;gap:7px}.emi-v2-trust svg{color:#dfc36b}
        .emi-v2-orb{height:255px;position:relative;display:grid;place-items:center}.emi-v2-orb-ring{position:absolute;width:230px;height:230px;border:1px solid #e5c66b55;border-radius:50%;box-shadow:0 0 45px #d6b95714,inset 0 0 35px #d6b9570b}.emi-v2-orb-ring:before,.emi-v2-orb-ring:after{content:"";position:absolute;inset:18px;border:1px dashed #d9bd6760;border-radius:50%}.emi-v2-orb-ring:after{inset:39px;border-style:solid;opacity:.5}.emi-v2-cube{width:120px;height:120px;display:grid;place-items:center;transform:rotate(-8deg);border:1px solid #ffedaa;background:linear-gradient(145deg,#f8e6a2 0%,#c59b38 38%,#315d42 39%,#09251a 100%);box-shadow:18px 22px 35px #0009,inset 0 0 20px #fff6;color:#fff0b0;font-size:78px;font-weight:900;text-shadow:0 4px 12px #0008}.emi-v2-orb>span{position:absolute;bottom:0;color:#e4ca79;font-size:8px;letter-spacing:2.2px;font-weight:800}
        .emi-v2-hero-actions{position:relative;display:flex;gap:12px;flex-wrap:wrap;padding:17px 0 21px;border-top:1px solid #e4c66c33}.emi-v2-hero-actions a{display:inline-flex;align-items:center;gap:9px;padding:12px 16px;border-radius:12px;background:#e4c66e;color:#10271b;font-size:12px;font-weight:800}.emi-v2-hero-actions a+ a{background:#ffffff0b;color:#f2dfa0;border:1px solid #d8b95766}
        .emi-v2-search-area{margin:28px 0 35px}.emi-v2-search{display:flex;align-items:center;gap:13px;padding:15px 18px;border:1px solid #d5b65355;border-radius:15px;background:#0b2118;box-shadow:0 10px 25px #0003;color:#e0c46c}.emi-v2-search input{flex:1;min-width:0;border:0;outline:0;background:transparent;color:white;font-size:14px}.emi-v2-search input::placeholder{color:#8fa397}
        .emi-v2-section-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:17px}.emi-v2-section-head h2{margin:6px 0 0;font-size:25px;letter-spacing:-.6px}.emi-v2-section-head p{margin:6px 0 0;color:#94a99d;font-size:12px}.emi-v2-count{color:#cbb46b;font-size:9px;font-weight:800;letter-spacing:1.4px;white-space:nowrap}
        .emi-v2-category-row{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:10px}.emi-v2-category-row button{display:flex;min-width:0;min-height:86px;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px 5px;border:1px solid #294538;border-radius:15px;background:#0c2119;color:#cbd7cd;font-size:10px;text-align:center}.emi-v2-category-row button span{font-size:22px;color:#dfc36b}.emi-v2-category-row button.active{border-color:#d9ba5b;background:linear-gradient(145deg,#173d2b,#0b2017);color:#f4e5b1;box-shadow:inset 0 0 0 1px #d9ba5b22}.emi-v2-category-hint{font-size:11px;color:#b5a16a;margin:10px 0 0}
        .emi-v2-products{margin-top:42px}.emi-v2-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.emi-v2-product{min-width:0;overflow:hidden;border:1px solid #294638;border-radius:17px;background:linear-gradient(180deg,#10291f,#091a13);transition:transform .2s,border-color .2s}.emi-v2-product:hover{transform:translateY(-3px);border-color:#c8a94f99}.emi-v2-product-image{height:190px;position:relative;overflow:hidden;background:#132b20}.emi-v2-product-image img{width:100%;height:100%;object-fit:cover}.emi-v2-stock{position:absolute;left:10px;top:10px;padding:6px 8px;border-radius:99px;background:#071b13df;color:#d9e7d9;font-size:9px;font-weight:700}.emi-v2-fav{position:absolute;right:10px;top:10px;width:32px;height:32px;display:grid;place-items:center;border:1px solid #ffffff4a;border-radius:50%;background:#06130f9c;color:white}.emi-v2-no-image{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#cbb46b}.emi-v2-no-image span{font-size:9px;letter-spacing:2px}.emi-v2-product-body{padding:13px}.emi-v2-shop-name{display:flex;align-items:center;gap:6px;color:#d3bc73;font-size:10px}.emi-v2-product h3{margin:9px 0 5px;font-size:15px;line-height:1.3}.emi-v2-product-body>p{height:34px;overflow:hidden;margin:0;color:#9db0a3;font-size:10px;line-height:1.6}.emi-v2-product-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px}.emi-v2-product-bottom strong{color:#f1d981;font-size:15px}.emi-v2-product-actions{display:flex;align-items:center;gap:6px}.emi-v2-product-actions button{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;border:1px solid #d9ba5d66;background:#10291f;color:#e7d28d}.emi-v2-product-actions button.emi-v2-add{background:#d9ba5d;color:#102419;border-color:#d9ba5d}.emi-v2-product-actions button.emi-v2-delete{color:#ffb3a8;border-color:#a75a4e88}.emi-v2-product-actions button:disabled{opacity:.45}.emi-v2-city{display:flex;align-items:center;gap:5px;margin-top:8px;color:#92a79a;font-size:9px}
        .emi-v2-empty{min-height:190px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;border:1px dashed #3c5949;border-radius:18px;color:#cbb66f;text-align:center}.emi-v2-empty p{margin:0;color:#9daf9f;font-size:12px}.emi-v2-empty a{display:inline-flex;align-items:center;gap:7px;margin-top:7px;padding:10px 14px;border-radius:10px;background:#d8ba60;color:#102419;font-size:11px;font-weight:800}.emi-v2-message{padding:13px;border:1px solid #b58a4566;border-radius:12px;background:#5a421b33;color:#f3d98c;font-size:12px}.emi-v2-loader{width:25px;height:25px;border:2px solid #d8ba6055;border-top-color:#d8ba60;border-radius:50%;animation:emiV2Spin .8s linear infinite}@keyframes emiV2Spin{to{transform:rotate(360deg)}}
        .emi-v2-seller-banner{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:45px;padding:27px 30px;border:1px solid #c7a84d77;border-radius:20px;background:radial-gradient(ellipse at 90% 0,#d6b95720,transparent 45%),linear-gradient(120deg,#0b2c1e,#07160f)}.emi-v2-seller-banner h2{margin:9px 0;font-size:25px;line-height:1.2}.emi-v2-seller-banner p{margin:0;color:#9fb3a5;font-size:12px;line-height:1.7}.emi-v2-seller-banner>a{display:inline-flex;align-items:center;gap:10px;flex:none;padding:13px 16px;border-radius:12px;background:#dfc36b;color:#10271b;font-size:11px;font-weight:800}.emi-v2-footer{display:flex;justify-content:space-between;gap:15px;padding:25px 0 0;color:#809487;font-size:10px}.emi-v2-footer span:first-child{color:#d9bd67;font-weight:900;letter-spacing:2px}.emi-v2-mobile-nav{display:none}
        @media(max-width:900px){.emi-v2-category-row{grid-template-columns:repeat(4,minmax(0,1fr))}.emi-v2-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.emi-v2-product-image{height:170px}}
        @media(max-width:640px){.emi-market-v2-wrap{padding:13px 13px 110px}.emi-v2-live{display:none}.emi-v2-header-actions{gap:6px}.emi-v2-icon-link{width:36px;height:36px}.emi-v2-top-link{padding:9px 10px;font-size:11px}.emi-v2-filter-row{gap:6px}.emi-v2-filter-row button,.emi-v2-filter-row label,.emi-v2-filter-row>a{font-size:9px;padding:7px 8px}.emi-v2-benefits{grid-template-columns:repeat(2,minmax(0,1fr))}.emi-v2-settings{right:12px;top:62px}.emi-v2-top{margin-bottom:14px}.emi-v2-hero{padding:20px 17px 0;border-radius:21px}.emi-v2-brand b{font-size:17px}.emi-v2-hero-content{grid-template-columns:1fr;min-height:unset;padding-top:23px}.emi-v2-hero h1{font-size:37px;margin:13px 0 10px}.emi-v2-hero-copy>p{font-size:12px;line-height:1.7}.emi-v2-orb{height:175px;margin-top:2px}.emi-v2-orb-ring{width:155px;height:155px}.emi-v2-cube{width:86px;height:86px;font-size:55px}.emi-v2-orb>span{bottom:-2px}.emi-v2-hero-actions{padding:14px 0 16px}.emi-v2-hero-actions a{padding:11px 12px;font-size:10px}.emi-v2-search-area{margin:21px 0 27px}.emi-v2-search{padding:13px}.emi-v2-search input{font-size:12px}.emi-v2-section-head h2{font-size:21px}.emi-v2-category-row{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.emi-v2-category-row button{min-height:76px;font-size:9px;padding:8px 3px}.emi-v2-category-row button span{font-size:19px}.emi-v2-products{margin-top:32px}.emi-v2-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.emi-v2-product-image{height:145px}.emi-v2-product-body{padding:10px}.emi-v2-product h3{font-size:13px}.emi-v2-product-body>p{font-size:9px;height:31px}.emi-v2-product-bottom strong{font-size:12px}.emi-v2-product-actions{gap:4px}.emi-v2-product-actions button{width:29px;height:29px}.emi-v2-seller-banner{align-items:flex-start;flex-direction:column;padding:21px;margin-top:32px}.emi-v2-seller-banner h2{font-size:22px}.emi-v2-footer{flex-direction:column;gap:6px}.emi-v2-mobile-nav{position:fixed;z-index:20;bottom:0;left:0;right:0;display:flex;justify-content:space-around;padding:12px 8px calc(12px + env(safe-area-inset-bottom));background:#07140ff2;border-top:1px solid #b99b4a55;backdrop-filter:blur(14px)}.emi-v2-mobile-nav a{font-size:10px;color:#b5c4b8}.emi-v2-mobile-nav a.selected{color:#e7ce7d;font-weight:900}.emi-v2-mobile-nav b{color:#f1d981}}
        @media(prefers-reduced-motion:reduce){.emi-v2-loader{animation:none}.emi-v2-product{transition:none}}
      `}</style>
    </main>
  );
}
