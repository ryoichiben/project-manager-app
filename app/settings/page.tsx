"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Member = {
  userId: string;
  email: string | null;
  role: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const toSlug = (value: string) => {
    const base = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return base || `workspace-${Date.now()}`;
  };

  const fetchMembers = async (tenantIdToLoad: string) => {
    setMembersLoading(true);
    const res = await fetch(`/api/members?tenantId=${tenantIdToLoad}`);
    if (res.ok) {
      const json = await res.json();
      setMembers(json.members ?? []);
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to load members");
    }
    setMembersLoading(false);
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
      setCurrentUserId(sessionData.session.user.id);

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

      await fetchMembers(tenant.id);
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

  const invite = async () => {
    if (!tenantId) return;
    const email = inviteEmail.trim();
    if (!email) {
      alert("Email is required.");
      return;
    }
    setInviting(true);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, tenantId }),
    });
    setInviting(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to invite user");
      return;
    }
    setInviteEmail("");
    await fetchMembers(tenantId);
  };

  const removeMember = async (userId: string) => {
    if (!tenantId) return;
    const ok = window.confirm("Remove this member?");
    if (!ok) return;
    const res = await fetch("/api/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, userId }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Failed to remove user");
      return;
    }
    await fetchMembers(tenantId);
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

      <div className="rounded border bg-white p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold">Users</h2>
          <p className="text-sm text-gray-600 mt-1">
            Invite members to this workspace and manage access.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="w-full rounded border px-3 py-2"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              type="email"
            />
            <button
              onClick={invite}
              disabled={inviting}
              className="sm:w-auto w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {inviting ? "Sending..." : "Invite"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            招待メールを送信します。承諾するとこのワークスペースに参加できます。
          </p>
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Members</h3>
            {membersLoading && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
          </div>

          {members.length === 0 ? (
            <p className="text-sm text-gray-600">No members yet.</p>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {m.email ?? m.userId}
                    </div>
                    <div className="text-xs text-gray-500">
                      role: {m.role}
                    </div>
                  </div>
                  {m.userId !== currentUserId && (
                    <button
                      onClick={() => removeMember(m.userId)}
                      className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
