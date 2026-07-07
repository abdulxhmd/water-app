import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type UsePartnerResult = {
  partnerId: string | null;
  isLoaded: boolean;
};

/** Resolves the current user's paired partner from `user_pairs`. */
export function usePartner(userId: string | null, authLoading: boolean): UsePartnerResult {
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (authLoading || !userId) {
      return;
    }

    let isMounted = true;

    const loadPair = async () => {
      const { data, error } = await supabase
        .from("user_pairs")
        .select("user_a_id, user_b_id")
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Error loading user pair:", error);
        setIsLoaded(true);
        return;
      }

      if (!data) {
        setPartnerId(null);
        setIsLoaded(true);
        return;
      }

      const nextPartnerId = data.user_a_id === userId ? data.user_b_id : data.user_a_id;
      setPartnerId(nextPartnerId);
      setIsLoaded(true);
    };

    loadPair();

    return () => {
      isMounted = false;
    };
  }, [authLoading, userId]);

  return { partnerId, isLoaded };
}
