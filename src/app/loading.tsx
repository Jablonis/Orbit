import { OrbitSplash } from "@/components/OrbitSplash";

/**
 * The Overview is where Orbit opens, from the home screen and from a cold tab,
 * so this is the app-open moment and it gets the splash. The inner routes keep
 * their skeletons: once you are inside, a shape that matches the page you are
 * going to beats a logo that does not.
 */
export default function Loading() {
  return <OrbitSplash label="Loading Orbit" />;
}
