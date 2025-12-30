"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error(error);
          router.replace("/login");
          return;
        }
      }
      router.replace("/projects");
    };

    run();
  }, [router]);

  return (
    <main className="p-6">
      <p className="text-sm text-gray-600">Signing you in...</p>
    </main>
  );
}
