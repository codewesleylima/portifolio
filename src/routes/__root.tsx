import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import SoundControl from "@/components/SoundControl";
import NavMenu from "@/components/NavMenu";
import LanguageMenu from "@/components/LanguageMenu";
import { LocaleProvider, useLocale } from "@/lib/i18n";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AmbientAudio } from "../components/AmbientAudio";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Wesley Lima — Backend Engineer Console" },
      {
        name: "description",
        content:
          "Service health console of a Java / Spring Boot / AWS backend engineer in São Paulo.",
      },
      { name: "author", content: "Wesley Lima" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Fonts are served from this origin (see styles.css). Only the two faces that
      // paint above the fold are preloaded; the rest load on demand per subset.
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        href: "/fonts/jetbrainsmono-v24-tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
        href: "/fonts/chakrapetch-v13-cIflMapbsEk7TDLdtEz1BwkeJI91R5_F.woff2",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function SiteNav({
  isMuted,
  volume,
  onToggleMute,
  onVolume,
  onShuffle,
}: {
  isMuted: boolean;
  volume: number;
  onToggleMute: () => void;
  onVolume: (value: number) => void;
  onShuffle: () => void;
}) {
  const { t } = useLocale();
  return (
    <nav className="site-nav no-print" aria-label="Main">
      <div className="shell site-nav-inner">
        {/* Menu anchors the left edge; sound sits at the far right; the brand and the
            two direct links keep the centre. */}
        <div className="site-nav-left">
          <NavMenu />
          <LanguageMenu />
        </div>

        <Link to="/" className="site-nav-brand">
          wesley lima
        </Link>

        <div className="site-nav-links">
          <Link to="/">{t("nav.console")}</Link>
          <Link to="/resume">{t("nav.resume")}</Link>
          <SoundControl
            isMuted={isMuted}
            volume={volume}
            onToggleMute={onToggleMute}
            onVolume={onVolume}
            onShuffle={onShuffle}
          />
        </div>
      </div>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [isMuted, setIsMuted] = useState(true);
  const [trackNonce, setTrackNonce] = useState(0);
  const [volume, setVolume] = useState(35);

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <SiteNav
          isMuted={isMuted}
          volume={volume}
          onVolume={setVolume}
          onToggleMute={() => setIsMuted((m) => !m)}
          onShuffle={() => setTrackNonce((n) => n + 1)}
        />
        <AmbientAudio
          isMuted={isMuted}
          volume={volume}
          trackNonce={trackNonce}
          onFirstGesture={() => setIsMuted(false)}
        />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </LocaleProvider>
    </QueryClientProvider>
  );
}
