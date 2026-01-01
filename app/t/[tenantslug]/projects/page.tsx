"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  user_id?: string;
  created_at?: string;
};

export default function TenantProjectsPage() {
  // Next.js では動的セグメント名そのまま (tenantslug) がキーになる
  const { tenantslug } = useParams<{ tenantslug: string }>();
  const tenantSlug = tenantslug;

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [workspaceName, setWorkspaceName] = useState("");

  /* -------------------------
   * projects
   * ------------------------- */
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------
   * project modal
   * ------------------------- */
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const isEdit = useMemo(() => !!editing, [editing]);

  /* -------------------------
   * auth
   * ------------------------- */
  const loadUser = async () => {
    const { data } = await supabase.auth.getSession();
    setUserId(data.session?.user?.id ?? null);
  };

  /* -------------------------
   * slug -> tenantId 解決
   * ------------------------- */
  const resolveTenant = async () => {
    if (!tenantSlug) return;

    const { data, error } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("slug", tenantSlug)
      .single();

    if (error || !data) {
      alert("Workspace not found.");
      return;
    }

    setTenantId(data.id);
    setWorkspaceName(data.name ?? "");
  };

  /* -------------------------
   * projects
   * ------------------------- */
  const loadProjects = async () => {
    if (!tenantId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setProjects((data ?? []) as Project[]);
    setLoading(false);
  };

  /* -------------------------
   * effects
   * ------------------------- */
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    resolveTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  useEffect(() => {
    if (tenantId) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  /* -------------------------
   * project CRUD
   * ------------------------- */
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
    setName(p.name);
    setDescription(p.description ?? "");
    setOpen(true);
  };

  const upsertProject = async () => {
    if (!tenantId || !userId) return;
    if (!name.trim()) {
      alert("Project name is required.");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      tenant_id: tenantId,
      user_id: userId,
    };

    const { error } = editing
      ? await supabase.from("projects").update(payload).eq("id", editing.id)
      : await supabase.from("projects").insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    closeModal();
    loadProjects();
  };

  const deleteProject = async (p: Project) => {
    if (!confirm(`Delete "${p.name}"?`)) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", p.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadProjects();
  };

  /* -------------------------
   * render
   * ------------------------- */
  return (
    <main className="space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Workspace:</span>
            <span className="font-semibold">
              {workspaceName || "Untitled"}
            </span>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {/* projects */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-500">No projects yet.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id} className="rounded border bg-white p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold text-black">{p.name}</div>
                  {p.description && (
                    <div className="text-sm text-gray-600">
                      {p.description}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded border px-2 py-1 text-sm text-black"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProject(p)}
                    className="rounded border px-2 py-1 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* project modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded bg-white p-6 space-y-4">
            <h3 className="text-lg font-bold">
              {isEdit ? "Edit Project" : "New Project"}
            </h3>

            <input
              className="w-full rounded border border-black px-3 py-2 text-black"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <textarea
              className="w-full rounded border border-black px-3 py-2 text-black"
              placeholder="Description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="rounded border border-black px-4 py-2 text-black"
              >
                Cancel
              </button>
              <button
                onClick={upsertProject}
                className="rounded border border-black px-4 py-2 text-black hover:bg-gray-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
