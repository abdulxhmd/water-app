"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import NavBar from "@/components/NavBar";
import { useUser } from "@/lib/useUser";

const PROTECTED_ROUTES = new Set(["/today", "/week", "/month", "/settings"]);
const AUTH_ROUTES = new Set(["/", "/login", "/setup-passcode"]);

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();

  const isProtectedRoute = PROTECTED_ROUTES.has(pathname);
  const isAuthRoute = AUTH_ROUTES.has(pathname);
  const showNav = PROTECTED_ROUTES.has(pathname);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user && isProtectedRoute) {
      router.replace("/login");
      return;
    }

    if (user && isAuthRoute) {
      router.replace("/today");
    }
  }, [isAuthRoute, isProtectedRoute, loading, pathname, router, user]);

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
