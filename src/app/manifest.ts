import type { MetadataRoute } from "next";

/**
 * Orbit is a personal app, so it ships as an installable PWA instead of a
 * store build: add it to the home screen and it opens standalone.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#0d0d0e",
    description:
      "Personal operating system for tasks, training, money, and daily momentum.",
    display: "standalone",
    icons: [
      { sizes: "192x192", src: "/icon-192.png", type: "image/png" },
      { sizes: "512x512", src: "/icon-512.png", type: "image/png" },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icon-512.png",
        type: "image/png",
      },
    ],
    name: "Orbit",
    orientation: "portrait",
    scope: "/",
    short_name: "Orbit",
    shortcuts: [
      { name: "Tasks", url: "/tasks" },
      { name: "Fitness", url: "/fitness" },
      { name: "Finance", url: "/finance" },
    ],
    start_url: "/",
    theme_color: "#0d0d0e",
  };
}
