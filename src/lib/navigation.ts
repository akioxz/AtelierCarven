import type { Href, ImperativeRouter } from "expo-router";

export function goBackOr(router: ImperativeRouter, fallback: Href) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}