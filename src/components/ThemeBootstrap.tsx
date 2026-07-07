"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { applyThemeAccent, cacheTheme, getCachedTheme, isTheme } from "@/lib/theme";

export default function ThemeBootstrap() {
  const { user, loading } = useUser();

  useEffect(() => {
    applyThemeAccent(getCachedTheme());
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    supabase
      .from("user_preferences")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme && isTheme(data.theme)) {
          applyThemeAccent(data.theme);
          cacheTheme(data.theme);
        }
      });
  }, [loading, user]);

  return null;
}
