"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);

    try {
        if (mode === "signup") {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });

  if (error) {
    alert(error.message);
    return;
  }

  // 登録完了メッセージ
  alert(
    "Account created. Please sign in with your email and password."
  );

  // ★ projects に行かない
  // ★ サインイン画面に戻す
  setMode("signin");
  setPassword("");

  return;
}
      // signin
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert(error.message);
        return;
      }

      router.push("/projects");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      alert("Please enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/reset-password`,
    });
    if (error) alert(error.message);
    else alert("Password reset email sent.");
  };

  return (
    <main className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h1>

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border ${
              mode === "signin" ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border ${
              mode === "signup" ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"
            }`}
          >
            Sign up
          </button>
        </div>

        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password (8+ chars)"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {mode === "signin" && (
          <button
            onClick={resetPassword}
            className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Forgot password?
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">
        By continuing, you agree to our Terms and Privacy Policy. (placeholder)
      </p>
    </main>
  );
}
