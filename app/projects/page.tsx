// app/projects/page.tsx
type Project = {
  id: string;
  name: string;
  description?: string;
};

const projects: Project[] = [
  { id: "p1", name: "My first project", description: "Personal task management" },
  { id: "p2", name: "Website launch", description: "Prepare and publish website" },
];

export default function ProjectsPage() {
  return (
    <main>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + New Project
        </button>
      </div>

      {/* Project list */}
      <div className="grid gap-4">
        {projects.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition"
          >
            <h2 className="text-lg font-semibold">{p.name}</h2>
            {p.description && (
              <p className="mt-1 text-sm text-gray-600">
                {p.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
