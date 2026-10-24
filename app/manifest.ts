import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "EMi — Un lien, une histoire, une famille",
    short_name: "EMi",
    description: "Partage tes moments et reste proche de ta communauté.",
    start_url: "/",
    display: "standalone",
    background_color: "#171044",
    theme_color: "#5520c9",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ]
  };
}