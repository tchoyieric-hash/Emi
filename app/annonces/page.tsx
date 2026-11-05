import { redirect } from "next/navigation";

/**
 * Ancienne route EMi Market désactivée.
 * Redirige vers l'accueil sans modifier les autres espaces de l'application.
 */
export default function AnnoncesPage(): never {
  redirect("/");
}
