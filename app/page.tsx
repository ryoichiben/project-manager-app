"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      // 1. ログイン状態チェック
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
        router.replace("/login");
        return;
      }

      const user = data.session?.user;
      if (!user) {
        // 未ログイン → login
        router.replace("/login");
        return;
      }

      // 2. tenant を確保（なければ作る）
      const { data: tenantId, error: rpcError } =
        await supabase.rpc("ensure_default_tenant");

      if (rpcError || !tenantId) {
        console.error(rpcError);
        router.replace("/login");
        return;
      }

      // 3. tenant配下へ
      router.replace(`/t/${tenantId}/projects`);
    };

    redirect();
  }, [router]);

  return (
    <main className="flex h-screen items-center justify-center text-sm text-gray-500">
      Redirecting...
    </main>
  );
}
