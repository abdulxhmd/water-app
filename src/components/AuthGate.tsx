"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import NavBar from "@/components/NavBar";
import { useUser } from "@/lib/useUser";
import { useOfflineSync } from "@/lib/useOfflineSync";

const PROTECTED_ROUTES = new Set(["/today", "/week", "/month", "/settings", "/history"]);
const AUTH_ROUTES = new Set(["/", "/login", "/setup-passcode"]);

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const { isOnline } = useOfflineSync();

  const isProtectedRoute = PROTECTED_ROUTES.has(pathname);
  const isAuthRoute = AUTH_ROUTES.has(pathname);
  const showNav = PROTECTED_ROUTES.has(pathname);

  // Offline with no session (e.g. it expired and can't refresh without a
  // network) — the login page can't authenticate either, so kicking the
  // user there would strand them. Explain instead.
  const isOfflineWithoutSession = !isOnline && !user && isProtectedRoute;

  useEffect(() => {
    if (loading || isOfflineWithoutSession) {
      return;
    }

    if (!user && isProtectedRoute) {
      router.replace("/login");
      return;
    }

    if (user && isAuthRoute) {
      router.replace("/today");
    }
  }, [isAuthRoute, isOfflineWithoutSession, isProtectedRoute, loading, pathname, router, user]);

  if (!loading && isOfflineWithoutSession) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-[#F7FAFF] px-6 text-center">
        <p className="text-sm font-medium text-slate-600">You&apos;re offline</p>
        <p className="text-xs text-slate-500">
          Your session couldn&apos;t be verified without a connection. The app will pick up
          where you left off once you&apos;re back online.
        </p>
      </div>
    );
  }

  const isRedirecting =
    loading || (!user && isProtectedRoute) || (user && isAuthRoute);

  if (isRedirecting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7FAFF] px-6 text-sm font-medium text-slate-500">
        Checking your session...
      </div>
    );
  }

  return (
    <>
      <div className={showNav ? "min-h-dvh pb-24 sm:pb-28" : "min-h-dvh"}>
        {children}
      </div>
      {showNav ? <NavBar /> : null}
    </>
  );
}
