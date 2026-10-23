import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Check,
  ChevronDown,
  Plus,
  User,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getWorkspaces,
  type Workspace,
} from "../collaboration/collaborationApi.ts";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal.tsx";
import { WorkspaceMembersModal } from "./WorkspaceMembersModal.tsx";

interface WorkspaceSwitcherProps {
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (workspace: Workspace | null) => void;
}

export function WorkspaceSwitcher({
  activeWorkspace,
  onSelectWorkspace,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2" ref={containerRef}>
      {/* Switcher Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-2xs hover:bg-neutral-50 hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          {activeWorkspace ? (
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-violet-700 text-[10px] font-bold">
                {activeWorkspace.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-[130px] truncate">{activeWorkspace.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-neutral-500" />
              <span>Personal Forms</span>
            </div>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 mt-1.5 w-60 rounded-2xl border border-neutral-200 bg-white py-1.5 shadow-xl z-40 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-neutral-400">
              Personal
            </div>
            <button
              type="button"
              onClick={() => {
                onSelectWorkspace(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-neutral-900">Personal Forms</span>
              </div>
              {!activeWorkspace && <Check className="h-4 w-4 text-indigo-600" />}
            </button>

            <div className="my-1.5 border-t border-neutral-100" />

            <div className="px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wider text-neutral-400 flex items-center justify-between">
              <span>Workspaces ({workspaces.length})</span>
            </div>

            {workspaces.map((ws) => {
              const isSelected = activeWorkspace?.id === ws.id;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSelectWorkspace(ws);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-neutral-50 transition-colors cursor-pointer ${
                    isSelected ? "bg-indigo-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100 text-violet-700 text-xs font-bold flex-shrink-0">
                      {ws.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className="font-medium text-neutral-900 truncate block">
                        {ws.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 capitalize">
                        {ws.currentUserRole || "member"}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
                </button>
              );
            })}

            <div className="my-1.5 border-t border-neutral-100" />

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-indigo-600 font-semibold hover:bg-indigo-50/60 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        )}
      </div>

      {/* If workspace is selected, show Members button */}
      {activeWorkspace && (
        <button
          type="button"
          onClick={() => setIsMembersOpen(true)}
          title="Manage workspace members"
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
        >
          <Users className="h-3.5 w-3.5 text-neutral-500" />
          <span>Members</span>
        </button>
      )}

      {/* Modals */}
      <CreateWorkspaceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(ws) => onSelectWorkspace(ws)}
      />

      {activeWorkspace && (
        <WorkspaceMembersModal
          workspace={activeWorkspace}
          isOpen={isMembersOpen}
          onClose={() => setIsMembersOpen(false)}
        />
      )}
    </div>
  );
}
