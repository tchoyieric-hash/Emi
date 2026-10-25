/**
 * Builds a WhatsApp chat link with a pre-filled message for an EMi listing.
 * The caller must pass the real listing URL and seller phone in international format.
 */
export function genererLienWhatsApp(
  titreProduit: string,
  prix: number | string,
  idAnnonce: string,
  numeroVendeur: string,
  baseUrl = typeof window !== "undefined" ? window.location.origin : "https://emi-nu.vercel.app"
): string {
  const safeId = encodeURIComponent(String(idAnnonce).trim());
  const urlAnnonce = `${baseUrl.replace(/\/$/, "")}/annonce/${safeId}`;
  const prixFormate = typeof prix === "number" ? new Intl.NumberFormat("fr-FR").format(prix) : String(prix).trim();
  const message = `Bonjour ! Je suis intéressé(e) par votre article "${titreProduit}" au prix de ${prixFormate} FCFA aperçu sur l'application EMi.\n\nVoir l'annonce : ${urlAnnonce}`;
  const numeroFormate = numeroVendeur.replace(/[^0-9]/g, "");
  if (numeroFormate.length < 8 || numeroFormate.length > 15) {
    throw new Error("Le numéro WhatsApp du vendeur doit être au format international, par exemple 237XXXXXXXXX.");
  }
  return `https://wa.me/${numeroFormate}?text=${encodeURIComponent(message)}`;
}

export function ouvrirWhatsAppAnnonce(
  titreProduit: string,
  prix: number | string,
  idAnnonce: string,
  numeroVendeur: string,
  baseUrl?: string
): void {
  const url = genererLienWhatsApp(titreProduit, prix, idAnnonce, numeroVendeur, baseUrl);
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}
