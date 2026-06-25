"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

export default function AuthBootstrap() {
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("session", session?.user.id);
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  return null;
}
