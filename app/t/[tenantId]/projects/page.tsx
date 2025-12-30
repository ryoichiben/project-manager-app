"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  user_id?: string; // ある前提（なければDB側で消してOK）
  created_at?: string;
};

export default function TenantProjectsPage() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [userId, setUserId] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isEdit = useMemo(() => !!editing, [editing]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setDescription("");
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    setName(p.name ?? "");
    setDescription(p.description ?? "");
    setOpen(true);
  };

  const loadUser = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error(error);
      return;
    }
    setUserId(data.session?.user?.id ?? null);
  };

  const loadProjects = async () => {
    if (!tenantId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

if (error) {
  console.error("loadProjects error:", error);
  alert(JSON.stringify(error, null, 2));
  setLoading(false);
  return;
}

    setProjects((data ?? []) as Project[]);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const upsertProject = async () => {
    if (!tenantId) return;
    if (!name.trim()) {
      alert("Project name is required.");
      return;
    }
    if (!userId) {
      alert("Not logged in.");
      return;
    }

    // ★ マルチテナント要：tenant_id を必ず入れる
    // ★ 既存の設計で user_id を持ってるなら、必ず入れる（RLS/整合性のため）
    const payload: any = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      tenant_id: tenantId,
      user_id: userId, // もし projects に user_id が無いなら、この1行を削除してOK
    };

    let error: any = null;

    if (isEdit && editing) {
      const res = await supabase
        .from("projects")
        .update(payload)
        .eq("id", editing.id);
      error = res.error;
    } else {
      const res = await supabase.from("projects").insert(payload);
      error = res.error;
    }

if (error) {
  console.error("loadProjects error:", error);
  alert(JSON.stringify(error, null, 2));
  setLoading(false);
  return;
}

    closeModal();
    await loadProjects();
  };

  const deleteProject = async (p: Project) => {
    const ok = confirm(`Delete "${p.name}"? This cannot be undone.`);
    if (!ok) return;

    const { error } = await supabase.from("projects").delete().eq("id", p.id);
    if (error) {
      console.error(error);
      alert(error.message ?? "Failed to delete project");
      return;
    }

    await loadProjects();
  };

  return (
    <main className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <div className="mt-1 text-sm text-gray-500">
            Workspace (tenant): <span className="font-mono">{tenantId}</span>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
          No projects yet. Click <b>New Project</b> to create one.
        </div>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  {p.description && (
                    <div className="mt-1 text-sm text-gray-600">
                      {p.description}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-400 font-mono">
                    id: {p.id}
                  </div>
                </div>

                <div className="shrink-0 flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProject(p)}
                    className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold">
                {isEdit ? "Edit Project" : "New Project"}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Website renewal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short memo..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={upsertProject}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {isEdit ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
