"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const toSlug = (value: string) => {
    const base = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return base || `workspace-${Date.now()}`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // ログイン確認
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      // 所属テナントの slug を取得
      const { data: tenantSlug, error: slugError } = await supabase.rpc(
        "ensure_default_tenant"
      );
      if (slugError || !tenantSlug) {
        alert(slugError?.message ?? "Workspace not found");
        setLoading(false);
        return;
      }

      setWorkspaceSlug(tenantSlug as string);

      // テナント情報を読み込み
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id, name, slug")
        .eq("slug", tenantSlug as string)
        .single();

      if (tenantError || !tenant) {
        alert(tenantError?.message ?? "Workspace not found");
        setLoading(false);
        return;
      }

      setTenantId(tenant.id);
      setWorkspaceName(tenant.name ?? "");
      setWorkspaceSlug(tenant.slug);
      setLoading(false);
    };

    load();
  }, [router]);

  const save = async () => {
    if (!tenantId) return;
    const nextName = workspaceName.trim();
    if (!nextName) {
      alert("Workspace name is required.");
      return;
    }

    const nextSlug = toSlug(nextName);

    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({ name: nextName, slug: nextSlug })
      .eq("id", tenantId);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setWorkspaceSlug(nextSlug);
    setWorkspaceName(nextName);
    router.push(`/t/${nextSlug}/projects`);
  };

  if (loading) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-600">Loading workspace...</p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Update your workspace details.
        </p>
      </div>

      <div className="rounded border bg-white p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Workspace name</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Workspace name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Current slug</label>
          <input
            className="w-full rounded border px-3 py-2 bg-gray-50"
            value={workspaceSlug}
            readOnly
          />
          <p className="text-xs text-gray-500">
            保存すると新しい slug を生成し、URL も更新されます。
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => router.push(`/t/${workspaceSlug}/projects`)}
            className="rounded border px-4 py-2 text-sm"
          >
            Back to projects
          </button>
        </div>
      </div>
    </main>
  );
}
