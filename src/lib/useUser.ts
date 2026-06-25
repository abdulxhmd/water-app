import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type UseUserResult = {
  user: any;
  loading: boolean;
};

export function useUser(): UseUserResult {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setUser(data.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, loading };
}
