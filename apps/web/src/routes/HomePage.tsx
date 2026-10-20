import { FIELD_REGISTRY, FIELD_TYPES } from "@formit/schema";

export function HomePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-3xl font-semibold">FormIT</h1>
      <p className="text-neutral-600">
        Open a form at <code>/f/&lt;slug&gt;</code>. The builder and dashboard come next.
      </p>
      <ul className="flex flex-wrap gap-2">
        {FIELD_TYPES.map((t) => (
          <li key={t} className="rounded-md border bg-white px-3 py-1 text-sm">
            {FIELD_REGISTRY[t].label}
          </li>
        ))}
      </ul>
    </main>
  );
}
