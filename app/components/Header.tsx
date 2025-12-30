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
  const pathname = usePathname(); // ★ 追加
  const [user, setUser] = useState<UserInfo | null>(null);

  // ★ ログイン画面ではヘッダー自体を出さない
  if (pathname === "/login") {
    return null;
  }

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
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

  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold">Project Manager</h1>

        {user && (
          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
            <div>
              <span className="font-medium">Email:</span>{" "}
              {user.email ?? "—"}
            </div>
            <div className="truncate max-w-[520px]">
              <span className="font-medium">Auth ID:</span>{" "}
              {user.id}
            </div>
          </div>
        )}
      </div>

      {user && (
        <button
          onClick={logout}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
        >
          Logout
        </button>
      )}
    </header>
  );
}
