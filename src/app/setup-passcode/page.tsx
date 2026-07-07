"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { buildCredentials, isValidPin } from "@/lib/credentials";

export default function SetupPasscodePage() {
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
      setErrorMessage("Enter your name and a 4-digit pin to continue.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { email, password } = buildCredentials(name, pinDigits.join(""));
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setIsSubmitting(false);
      if (error.message.toLowerCase().includes("already registered")) {
        setErrorMessage("That name already has a passcode. Try logging in instead.");
      } else {
        setErrorMessage("Could not set up your passcode. Please try again.");
      }
      return;
    }

    if (!data.session) {
      // Email confirmation is required by the Supabase project's auth
      // settings. This app has no real inbox to confirm against, so the
      // account exists but can't sign in yet until that's disabled.
      setIsSubmitting(false);
      setErrorMessage(
        "Account created, but it needs to be confirmed before you can log in. Ask whoever manages the app to finish setup."
      );
      return;
    }

    router.replace("/today");
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#F7FAFF] p-6 text-slate-800 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute left-[-10%] top-[-20%] h-[60%] w-[60%] rounded-full bg-[#eef4f8] blur-[120px] dark:bg-[#7FB8FF]/10" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[60%] w-[60%] rounded-full bg-[#fcf5f0] blur-[120px] dark:bg-orange-100/10" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-white/50 bg-white/80 p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-sm dark:border-white/5 dark:bg-[#eef7ff]/80 md:p-12">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-medium leading-tight text-slate-800 dark:text-slate-800 md:text-4xl">
              Choose a passcode
              <br />
              only you will know.
            </h1>
            <p className="mt-4 text-sm font-light text-slate-500 dark:text-slate-500">
              A small secret, kept just for you.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <label
                className="ml-1 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-600"
                htmlFor="name"
              >
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="username"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-200 bg-transparent px-4 text-center text-slate-800 focus:border-[#7FB8FF] focus:outline-none focus:ring-1 focus:ring-[#7FB8FF] dark:border-[#dbe6f2] dark:text-slate-800"
              />
            </div>

            <div className="flex justify-center gap-4">
              {pinDigits.map((digit, index) => (
                <input
                  key={`pin-${index}`}
                  ref={(el) => {
                    pinRefs.current[index] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                  className="h-14 w-12 border-b-2 border-slate-200 bg-transparent text-center text-2xl font-light text-slate-800 focus:border-[#7FB8FF] focus:outline-none dark:border-[#dbe6f2] dark:text-slate-800"
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="w-full rounded-xl bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] py-3 text-sm font-medium text-white shadow-[0_12px_28px_rgba(127,184,255,0.35)] transition-all hover:from-[#8fbfff] hover:via-[#b8a8ff] hover:to-[#aeecc7] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Setting up…" : "Begin"}
              </button>
              {errorMessage ? (
                <p className="text-center text-xs font-medium text-rose-500">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center opacity-60 transition-opacity hover:opacity-100">
          <Link
            href="/login"
            className="text-xs text-slate-500 transition-colors hover:text-[#7FB8FF] dark:text-slate-500"
          >
            Already have a passcode? Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
