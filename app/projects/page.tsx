"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type ModalMode = "create" | "edit";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const editingProject = useMemo(
    () => projects.find((p) => p.id === editingId) ?? null,
    [projects, editingId]
  );

  const loadProjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Failed to load projects");
    } else {
      setProjects(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setName("");
    setDescription("");
    setMode("create");
  };

  const openCreate = () => {
    setMode("create");
    setEditingId(null);
    setName("");
    setDescription("");
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setMode("edit");
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description ?? "");
    setOpen(true);
  };

  const upsertProject = async () => {
    if (!name.trim()) return;

    if (mode === "create") {
      const { error } = await supabase.from("projects").insert({
        name: name.trim(),
        description: description.trim() || null,
      });
     
      if (error) {
        console.error(error);
        alert(`${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.trim());
        
      }
      closeModal();
      await loadProjects();
      return;
    }

    if (!editingId) return;
    const { error } = await supabase
      .from("projects")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);
      
      if (error) {
        console.error(error);
        alert(`${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.trim());
        return;
      }

    closeModal();
    await loadProjects();
  };

  const deleteProject = async (id: string) => {
    const p = projects.find((x) => x.id === id);
    const ok = window.confirm(`Delete "${p?.name ?? "this project"}"? This cannot be undone.`);
    if (!ok) return;

    const { error } = await supabase.from("projects").delete().eq("id", id);
     
      if (error) {
        console.error(error);
        alert(`${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.trim());
        
    }
    await loadProjects();
  };

  return (
    <main>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-600">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-gray-700 font-medium">No projects yet</p>
          <p className="mt-1 text-sm text-gray-500">Create your first project to get started.</p>
          <button
            onClick={openCreate}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold truncate">{p.name}</h2>
                  {p.description && (
                    <p className="mt-1 text-sm text-gray-600">{p.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-4">
              {mode === "create" ? "New Project" : "Edit Project"}
            </h2>

            {mode === "edit" && !editingProject ? (
              <p className="text-sm text-gray-600">This project no longer exists.</p>
            ) : (
              <>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Project name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    onClick={closeModal}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={upsertProject}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    {mode === "create" ? "Create" : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
