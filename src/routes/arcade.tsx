import { Link, createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy } from "react";

const Arcade = lazy(() => import("@/components/Arcade"));

export const Route = createFileRoute("/arcade")({
  component: ArcadePage,
  head: () => ({
    meta: [
      { title: "Debug Run — Wesley Lima" },
      {
        name: "description",
        content: "A hidden arcade session: jump the incidents and keep the service up.",
      },
    ],
  }),
});

/**
 * Its own route rather than a modal.
 *
 * "Isolated session" is the literal requirement — a modal still sits on top of the
 * console, sharing its scroll and z-index stack with the repo and project modals. A
 * route gives the game its own address, its own history entry, and a clean mount with
 * no backdrop or focus-trap bookkeeping to get wrong. It also keeps the mascot as the
 * only door in: the page is real and linkable, but nothing in the nav points to it.
 */
function ArcadePage() {
  return (
    <main className="shell arcade-page">
      <Link className="btn" to="/">
        ← Back to console
      </Link>

      <div className="arcade-session">
        <p className="eyebrow">session // debug-run</p>
        <h1 className="section-title">Debug Run</h1>
        <p className="section-note">
          A break from the dashboards: hop over incidents and keep the service up. Space, arrow up
          or tap to jump.
        </p>

        <div className="arcade-enter">
          <Suspense
            fallback={
              <div
                className="arcade-stage"
                style={{ aspectRatio: "720 / 300", width: "100%" }}
                aria-hidden="true"
              />
            }
          >
            <Arcade />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
