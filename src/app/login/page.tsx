"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { buildCredentials, isValidPin } from "@/lib/credentials";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const pinRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!name.trim() || !isValidPin(pinDigits)) {
      setErrorMessage("Enter your name and 4-digit pin to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const { email, password } = buildCredentials(name, pinDigits.join(""));
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      setErrorMessage("Login failed. Check your name and pin.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/today");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#F7FAFF] p-6 text-slate-800 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute left-[-5%] top-[-10%] h-[40%] w-[40%] rounded-full bg-[#E9E2FF]/30 blur-[100px] dark:bg-brand/10" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[40%] w-[40%] rounded-full bg-brand/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-fade-in">
        <div className="relative flex flex-col gap-8 overflow-hidden rounded-2xl border border-[#E3E8F5] bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] dark:border-[#dbe6f2] dark:bg-[#eef7ff] md:p-10">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-brand/30 to-transparent" />

          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand animate-float">
              <span className="material-symbols-outlined text-2xl">water_drop</span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-medium italic tracking-wide text-slate-800 dark:text-slate-800">
                It&apos;s good to see you
              </h1>
              <p className="mt-1 text-sm font-light text-slate-500 dark:text-slate-600">
                Ready for a mindful sip?
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="group flex flex-col gap-2">
              <label
                className="ml-1 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-600"
                htmlFor="name"
              >
                Your name
              </label>
              <div className="relative transform transition-all duration-300 group-focus-within:scale-[1.01]">
                <input
                  id="name"
                  type="text"
                  autoComplete="username"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder=""
                  className="h-12 w-full rounded-lg border border-slate-200 bg-[#EEF7F1] px-4 text-center text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-[#dbe6f2] dark:bg-[#eef7ff]/70 dark:text-slate-800 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-600">
                  4-digit pin
                </label>
              </div>
              <div className="flex justify-center gap-3">
                {pinDigits.map((digit, index) => (
                  <input
                    key={`pin-${index}`}
                    ref={(el) => {
                      pinRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => {
                      const nextValue = event.target.value.replace(/\D/g, "");
                      const updated = [...pinDigits];
                      updated[index] = nextValue.slice(-1);
                      setPinDigits(updated);

                      if (nextValue && index < pinDigits.length - 1) {
                        pinRefs.current[index + 1]?.focus();
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Backspace" && !pinDigits[index] && index > 0) {
                        pinRefs.current[index - 1]?.focus();
                      }
                    }}
                    className="h-12 w-12 rounded-lg border border-slate-200 bg-[#EEF7F1] text-center text-xl text-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-[#dbe6f2] dark:bg-[#eef7ff]/70"
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="group mt-4 flex h-12 w-full transform items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] text-sm font-medium tracking-wide text-white shadow-[0_12px_28px_rgba(127,184,255,0.35)] transition-all duration-300 hover:from-[#8fbfff] hover:via-[#b8a8ff] hover:to-[#aeecc7] hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span>{isSubmitting ? "Signing in..." : "Enter Space"}</span>
              <span className="material-symbols-outlined text-lg opacity-70 transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </button>
            {errorMessage ? (
              <p className="text-center text-xs font-medium text-rose-500">
                {errorMessage}
              </p>
            ) : null}
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/setup-passcode"
              className="text-xs text-slate-500/70 underline decoration-dotted underline-offset-4 transition-colors duration-200 hover:text-brand dark:text-slate-500/70"
            >
              First time? Set up your passcode
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-xs animate-fade-in text-center [animation-delay:0.2s]">
          <div className="mb-2 flex items-center justify-center gap-2 text-brand/60">
            <span className="material-symbols-outlined text-lg">spa</span>
          </div>
          <p className="text-sm italic leading-relaxed text-slate-500/80 dark:text-slate-600/80">
            &quot;Drinking water first thing in the morning activates your internal
            organs.&quot;
          </p>
        </div>
      </div>
    </main>
  );
}



