"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const updatePassword = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        alert(error.message);
        return;
      }
      alert("Password updated.");
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Reset password</h1>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <input
          type="password"
          placeholder="New password"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <button
          onClick={updatePassword}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Please wait..." : "Update password"}
        </button>
      </div>
    </main>
  );
}
