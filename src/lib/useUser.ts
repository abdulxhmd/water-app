import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

type UseUserResult = {
  user: User | null;
  loading: boolean;
};

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      // getSession() reads the locally persisted session without a network
      // round trip, so auth still resolves while offline (getUser() would
      // fail and lock the whole app out).
      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) {
          return;
        }

        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
