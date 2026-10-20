import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Trash2 } from "lucide-react";
import { BuilderFieldCard } from "./BuilderFieldCard.tsx";
import type { BuilderActions, BuilderState } from "./types.ts";

interface BuilderCanvasProps {
  state: BuilderState;
  actions: BuilderActions;
}

export function BuilderCanvas({ state, actions }: BuilderCanvasProps) {
  const { schema, selectedFieldId, selectedSectionId } = state;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      actions.reorderFields(sectionId, String(active.id), String(over.id));
    }
  }

  return (
    <main
      onClick={() => actions.selectField(null)}
      className="flex-1 bg-neutral-100/60 p-4 sm:p-8 overflow-y-auto min-h-[calc(100vh-4rem)]"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Form Title & Description Header Card */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-xs border-t-4 border-t-indigo-600">
          <input
            type="text"
            value={schema.title}
            onChange={(e) => actions.updateTitle(e.target.value)}
            placeholder="Form title"
            className="w-full text-2xl sm:text-3xl font-bold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-indigo-500 outline-none pb-1 transition-colors"
          />
          <textarea
            value={schema.description || ""}
            onChange={(e) => actions.updateDescription(e.target.value)}
            placeholder="Form description (optional)"
            rows={2}
            className="mt-3 w-full resize-none text-sm text-neutral-600 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-indigo-500 outline-none pb-1 transition-colors"
          />
        </div>

        {/* Sections */}
        {schema.sections.map((section, secIdx) => {
          const fieldIds = section.fields.map((f) => f.id);
          const isSecSelected = section.id === selectedSectionId;

          return (
            <div
              key={section.id}
              onClick={(e) => {
                e.stopPropagation();
                actions.selectSection(section.id);
              }}
              className={`rounded-xl border transition-all ${
                isSecSelected ? "border-neutral-300" : "border-neutral-200/80"
              } bg-transparent space-y-4`}
            >
              {/* Section Header Card */}
              <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Section {secIdx + 1} of {schema.sections.length}
                  </span>
                  {schema.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.deleteSection(section.id);
                      }}
                      title="Delete section"
                      className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={section.title || ""}
                  onChange={(e) =>
                    actions.updateSection(section.id, { title: e.target.value })
                  }
                  placeholder={`Section ${secIdx + 1} Title`}
                  className="mt-2 w-full text-lg font-semibold text-neutral-900 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-indigo-500 outline-none pb-1 transition-colors"
                />

                <input
                  type="text"
                  value={section.description || ""}
                  onChange={(e) =>
                    actions.updateSection(section.id, { description: e.target.value })
                  }
                  placeholder="Section description (optional)"
                  className="mt-1 w-full text-xs text-neutral-500 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-indigo-500 outline-none pb-0.5 transition-colors"
                />
              </div>

              {/* Sortable Field List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(section.id, event)}
              >
                <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {section.fields.map((field) => (
                      <div key={field.id} className="relative group/field">
                        <BuilderFieldCard
                          field={field}
                          sectionId={section.id}
                          isSelected={field.id === selectedFieldId}
                          onSelect={() => actions.selectField(field.id, section.id)}
                          actions={actions}
                        />

                        {/* Inline Insertion Line */}
                        <div className="absolute -bottom-2.5 left-0 right-0 z-10 flex justify-center opacity-0 group-hover/field:opacity-100 hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              actions.addField(section.id, "short_text", field.id);
                            }}
                            className="flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-0.5 text-[10px] font-medium text-white shadow-md hover:bg-indigo-500 hover:scale-105 transition-all"
                          >
                            <Plus className="h-3 w-3" />
                            Add Question Here
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Empty section state */}
              {section.fields.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-neutral-300 bg-white/50 p-8 text-center">
                  <p className="text-xs text-neutral-500">
                    This section has no questions yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => actions.addField(section.id, "short_text")}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section Button */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={actions.addSection}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 shadow-xs transition-all"
          >
            <Plus className="h-4 w-4 text-neutral-500" />
            Add Another Section
          </button>
        </div>
      </div>
    </main>
  );
}
