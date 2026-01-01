"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function RootPage() {
  const router = useRouter();

  const resolveTenantSlug = async (tenantKey: string | null) => {
    if (!tenantKey) throw new Error("tenant was not returned");

    const uuidLike =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidLike.test(tenantKey)) return tenantKey;

    const { data, error } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", tenantKey)
      .single();

    if (error || !data?.slug) {
      throw new Error(error?.message ?? "workspace slug not found");
    }

    return data.slug;
  };

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

      const tenantSlug = await resolveTenantSlug(tenantId as string | null);

      // 3. tenant配下へ
      router.replace(`/t/${tenantSlug}/projects`);
    };

    redirect();
  }, [router]);

  return (
    <main className="flex h-screen items-center justify-center text-sm text-gray-500">
      Redirecting...
    </main>
  );
}
