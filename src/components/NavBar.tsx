"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavBar() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const doc = document.documentElement;
      const threshold = 8;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - threshold;

      setIsVisible(true);
      setIsAtBottom(atBottom);

      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }

      if (!atBottom) {
        hideTimer.current = setTimeout(() => {
          setIsVisible(false);
        }, 3000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const getLinkClass = (href: string) =>
    `group flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 transition-all ${
      pathname === href
        ? "bg-gradient-to-r from-[#d9cfff]/60 via-[#cfe6ff]/60 to-[#d6f6e6]/70 text-[#2f4f86] shadow-[0_8px_20px_rgba(127,184,255,0.35)]"
        : "text-slate-500 hover:text-[#2f4f86]"
    }`;

  return (
    <nav
      className={`fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 transition-[opacity,transform] duration-900 ease-out ${
        isVisible || isAtBottom
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-10 opacity-0"
      }`}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-gradient-to-r from-white/90 via-[#f5f0ff]/85 to-[#eefcf3]/90 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.15)] backdrop-blur-md dark:border-[#dbe6f2] dark:bg-gradient-to-r dark:from-[#f7f3ff]/90 dark:via-[#edf7ff]/90 dark:to-[#eefcf3]/90">
        <div className="grid grid-cols-4 text-[11px] font-semibold">
          <Link
            href="/today"
            className={getLinkClass("/today")}
            aria-current={pathname === "/today" ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">today</span>
            Today
          </Link>
          <Link
            href="/week"
            className={getLinkClass("/week")}
            aria-current={pathname === "/week" ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
            Week
          </Link>
          <Link
            href="/month"
            className={getLinkClass("/month")}
            aria-current={pathname === "/month" ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Month
          </Link>
          <Link
            href="/settings"
            className={getLinkClass("/settings")}
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
}



