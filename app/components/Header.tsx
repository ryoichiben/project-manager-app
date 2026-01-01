"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type UserInfo = {
  id: string;
  email: string | null;
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname(); // ← Hookは必ず呼ぶ
  const [user, setUser] = useState<UserInfo | null>(null);

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("getSession error:", error);
      return;
    }
    const u = data.session?.user ?? null;
    setUser(u ? { id: u.id, email: u.email ?? null } : null);
  };

  useEffect(() => {
    refreshUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  };

  // ✅ Hooksの後に表示制御（ここでreturn nullはOK）
  if (pathname === "/login") return null;

  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold">Project Manager</h1>

        <div className="mt-1 text-xs text-gray-600 space-y-0.5">
          <div>
            <span className="font-medium">Email:</span>{" "}
            {user?.email ?? "—"}
          </div>
          <div className="truncate max-w-[520px]">
            <span className="font-medium">Auth ID:</span>{" "}
            {user?.id ?? "—"}
          </div>
        </div>
      </div>

      {/* userがいる時だけログアウト表示 */}
      {user && (
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => router.push("/settings")}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
