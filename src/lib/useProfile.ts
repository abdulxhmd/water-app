import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/** Fetches another user's public profile fields (avatar) for display. */
export function useProfile(userId: string | null) {
  const [avatarUrlByUser, setAvatarUrlByUser] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    if (!userId) {
      return;
    }

    let isMounted = true;

    supabase
      .from("user_preferences")
      .select("avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }
        if (error) {
          console.error("Error loading profile:", error);
          return;
        }
        setAvatarUrlByUser((prev) => ({
          ...prev,
          [userId]: data?.avatar_url ?? null,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return userId ? (avatarUrlByUser[userId] ?? null) : null;
}
