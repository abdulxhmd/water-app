"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { usePushNotifications } from "@/lib/usePushNotifications";
import { getUserNames } from "@/lib/users";
import { buildPassword } from "@/lib/credentials";
import UserAvatar from "@/components/UserAvatar";
import PageFooter from "@/components/PageFooter";
import { THEMES, applyThemeAccent, cacheTheme, isTheme } from "@/lib/theme";
import type { Theme } from "@/lib/types";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { currentName } = getUserNames(user?.email);
  const { status: pushStatus, subscribe, unsubscribe, checkStatus } = usePushNotifications();

  // Reminder preferences
  const [dailyReminder, setDailyReminder] = useState(false);
  const [partnerReminder, setPartnerReminder] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Presence: avatar + theme
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>("calm");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Passcode
  const [newPin, setNewPin] = useState("");
  const [pinStatus, setPinStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    if (loading || !user) return;
    checkStatus();

    const loadPreferences = async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("daily_reminder, partner_reminder, avatar_url, theme")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setReminderStatus({ type: "error", message: "Could not load preferences." });
        return;
      }

      if (data) {
        setDailyReminder(data.daily_reminder ?? false);
        setPartnerReminder(data.partner_reminder ?? false);
        setAvatarUrl(data.avatar_url ?? null);
        if (data.theme && isTheme(data.theme)) {
          setTheme(data.theme);
        }
      }
    };

    loadPreferences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setPresenceStatus({ type: "error", message: "Please choose an image file." });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setPresenceStatus({ type: "error", message: "Image must be smaller than 3MB." });
      return;
    }

    setIsUploadingAvatar(true);
    setPresenceStatus(null);

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setIsUploadingAvatar(false);
      setPresenceStatus({ type: "error", message: "Could not upload avatar." });
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const nextAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: saveError } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, avatar_url: nextAvatarUrl }, { onConflict: "user_id" });

    setIsUploadingAvatar(false);

    if (saveError) {
      setPresenceStatus({ type: "error", message: "Uploaded, but could not save your profile." });
      return;
    }

    setAvatarUrl(nextAvatarUrl);
    setPresenceStatus({ type: "success", message: "Avatar updated." });
  };

  const handleThemeChange = async (nextTheme: Theme) => {
    if (!user || nextTheme === theme) return;

    const previousTheme = theme;
    setTheme(nextTheme);
    setPresenceStatus(null);
    applyThemeAccent(nextTheme);

    const { error } = await supabase
      .from("user_preferences")
      .upsert({ user_id: user.id, theme: nextTheme }, { onConflict: "user_id" });

    if (error) {
      setTheme(previousTheme);
      applyThemeAccent(previousTheme);
      setPresenceStatus({ type: "error", message: "Could not save theme." });
      return;
    }

    cacheTheme(nextTheme);
  };

  const handleReminderToggle = async (field: "daily_reminder" | "partner_reminder", value: boolean) => {
    if (!user) return;

    // Optimistically update UI
    if (field === "daily_reminder") setDailyReminder(value);
    else setPartnerReminder(value);
    setReminderStatus(null);

    // If enabling daily reminder, request push permission + subscribe
    if (field === "daily_reminder" && value) {
      const ok = await subscribe(user.id);
      if (!ok) {
        setDailyReminder(false);
        setReminderStatus({ type: "error", message: "Could not enable notifications. Please allow notifications in your browser." });
        return;
      }
    }

    // If disabling daily reminder, unsubscribe from push
    if (field === "daily_reminder" && !value) {
      await unsubscribe(user.id);
    }    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          daily_reminder: field === "daily_reminder" ? value : dailyReminder,
          partner_reminder: field === "partner_reminder" ? value : partnerReminder,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      if (field === "daily_reminder") setDailyReminder(!value);
      else setPartnerReminder(!value);
      setReminderStatus({ type: "error", message: "Could not save preference." });
    } else {
      setReminderStatus({ type: "success", message: "Saved." });
      setTimeout(() => setReminderStatus(null), 3000);
    }
  };

  const handleUpdatePasscode = async () => {
    if (!/^\d{4}$/.test(newPin)) {
      setPinStatus({ type: "error", message: "Passcode must be exactly 4 digits." });
      return;
    }

    setIsUpdating(true);
    setPinStatus(null);

    const { error } = await supabase.auth.updateUser({
      password: buildPassword(newPin),
    });

    setIsUpdating(false);

    if (error) {
      setPinStatus({ type: "error", message: error.message });
    } else {
      setPinStatus({ type: "success", message: "Passcode updated successfully." });
      setNewPin("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#F7FAFF] text-slate-800 transition-colors duration-200 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E3E8F5] bg-white/80 px-4 py-4 backdrop-blur-md transition-colors duration-200 dark:border-[#dbe6f2] dark:bg-[#eef7ff]/80 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <span className="material-symbols-outlined text-[22px]">water_drop</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-600">
              Water App
            </span>
            <span className="text-lg font-semibold text-slate-800 dark:text-slate-800">
              Settings
            </span>
          </div>
        </div>
        <UserAvatar avatarUrl={avatarUrl} name={currentName} />
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-800">
              Personal settings
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-600">
              Adjust things in a way that feels right to you.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E3E8F5] bg-white p-6 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
            <p className="font-medium text-slate-800 dark:text-slate-800">
              Your presence
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-600">
              Choose how you show up in the app.
            </p>

            <div className="mt-4 flex items-center gap-4">
              <UserAvatar
                avatarUrl={avatarUrl}
                name={currentName}
                sizeClassName="h-14 w-14"
                className="text-lg"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="text-sm text-slate-700 underline transition-colors hover:text-brand disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-600"
              >
                {isUploadingAvatar ? "Uploading…" : "Change avatar"}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {THEMES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleThemeChange(option)}
                  className={`rounded-lg border py-2 text-sm capitalize transition-colors ${
                    theme === option
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-[#E3E8F5] text-slate-700 hover:border-brand/40 hover:text-brand dark:border-[#dbe6f2] dark:text-slate-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {presenceStatus ? (
              <p className={`mt-3 text-xs font-medium ${presenceStatus.type === "error" ? "text-rose-500" : "text-emerald-600"}`}>
                {presenceStatus.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#E3E8F5] bg-white p-6 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
            <p className="font-medium text-slate-800 dark:text-slate-800">
              Reminders
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-600">
              Gentle nudges to help you stay consistent.
            </p>

            <div className="mt-4 space-y-4 text-sm">
              <label className="flex items-center justify-between text-slate-700 dark:text-slate-700">
                <span>Daily reminder</span>
                <input
                  type="checkbox"
                  checked={dailyReminder}
                  onChange={(e) => handleReminderToggle("daily_reminder", e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 dark:text-slate-700">
                <span>Allow partner reminders</span>
                <input
                  type="checkbox"
                  checked={partnerReminder}
                  onChange={(e) => handleReminderToggle("partner_reminder", e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
              </label>

              {pushStatus === "denied" ? (
                <p className="text-xs font-medium text-rose-500">
                  Notifications are blocked in your browser. Allow them in your
                  browser&apos;s site settings to receive reminders.
                </p>
              ) : null}

              {reminderStatus ? (
                <p className={`text-xs font-medium ${reminderStatus.type === "error" ? "text-rose-500" : "text-emerald-600"}`}>
                  {reminderStatus.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E3E8F5] bg-white p-6 shadow-sm dark:border-[#dbe6f2] dark:bg-[#eef7ff]">
            <p className="font-medium text-slate-800 dark:text-slate-800">
              Passcode
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-600">
              Update your access if you need to.
            </p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="New 4-digit passcode"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                setPinStatus(null);
              }}
              className="mt-4 w-full rounded-lg border border-[#E3E8F5] bg-[#EEF7F1] px-3 py-2 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-800"
            />

            {pinStatus ? (
              <p className={`mt-2 text-xs font-medium ${pinStatus.type === "error" ? "text-rose-500" : "text-emerald-600"}`}>
                {pinStatus.message}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleUpdatePasscode}
              disabled={isUpdating}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] py-2 text-sm font-medium text-white shadow-[0_12px_28px_rgba(127,184,255,0.35)] transition-all hover:from-[#8fbfff] hover:via-[#b8a8ff] hover:to-[#aeecc7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUpdating ? "Updating…" : "Update passcode"}
            </button>
          </div>

          <p className="text-center text-xs text-slate-500 dark:text-slate-600">
            You can change these anytime. Nothing here is permanent.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl border border-[#E3E8F5] bg-white py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-brand/40 hover:text-brand dark:border-[#dbe6f2] dark:bg-[#eef7ff] dark:text-slate-700"
          >
            Log out
          </button>
        </div>
      </main>

      <PageFooter />
    </div>
  );
}



