import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Water App",
    short_name: "Water",
    description:
      "A shared hydration tracker for two — log daily water intake and compare weekly and monthly.",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F7FAFF",
    theme_color: "#7FB8FF",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
