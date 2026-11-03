import { redirect } from "next/navigation";

// Ancienne entrée Elite Hospitality retirée : les fiches restent conservées
// dans elite_directory_profiles et sont désormais gérées depuis EMi PRO.
export default function EliteDirectoryLegacyRedirect() {
  redirect("/annonces/emi-pro");
}
