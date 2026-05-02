import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export const ACTIVE_WORKSPACE_STORAGE_KEY = "teamspace:active-workspace-id";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  avatar_url?: string | null;
  role: "owner" | "admin" | "member" | "guest";
  joined_at: string;
}

interface WorkspaceContextType {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  activeWorkspace: WorkspaceSummary | null;
  activeRole: WorkspaceSummary["role"] | null;
  canManageWorkspace: boolean;
  isWorkspaceOwner: boolean;
  loading: boolean;
  setActiveWorkspaceId: (workspaceId: string) => void;
  refreshWorkspaces: (preferredWorkspaceId?: string | null) => Promise<number>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const bootstrapAttemptedRef = useRef<string | null>(null);

  const refreshWorkspaces = async (preferredWorkspaceId?: string | null) => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
      setLoading(false);
      return 0;
    }

    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("workspace_members")
      .select(
        "workspace_id, role, joined_at, workspaces(id, name, slug, created_by, avatar_url)",
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .is("removed_at", null);

    if (error) {
      console.error("Failed to load workspaces", error);
      setWorkspaces([]);
      setActiveWorkspaceIdState(null);
      setLoading(false);
      return 0;
    }

    const nextWorkspaces = (((data as any[]) ?? [])
      .map((row) => {
        const workspace = row.workspaces;

        if (!workspace?.id) return null;

        return {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          created_by: workspace.created_by,
          avatar_url: workspace.avatar_url,
          role: row.role,
          joined_at: row.joined_at,
        } as WorkspaceSummary;
      })
      .filter(Boolean) as WorkspaceSummary[]).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    setWorkspaces(nextWorkspaces);

    const storedWorkspaceId =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);

    const nextActiveWorkspaceId =
      nextWorkspaces.find((workspace) => workspace.id === preferredWorkspaceId)
        ?.id ??
      nextWorkspaces.find((workspace) => workspace.id === activeWorkspaceId)
        ?.id ??
      nextWorkspaces.find((workspace) => workspace.id === storedWorkspaceId)
        ?.id ??
      nextWorkspaces[0]?.id ??
      null;

    setActiveWorkspaceIdState(nextActiveWorkspaceId);
    setLoading(false);
    return nextWorkspaces.length;
  };

  const bootstrapWorkspace = async () => {
    if (!user) return;
    if (bootstrapAttemptedRef.current === user.id) return;

    bootstrapAttemptedRef.current = user.id;

    const { error } = await (supabase as any).rpc(
      "bootstrap_workspace_for_current_user",
    );

    if (error) {
      console.error("Failed to bootstrap workspace", error);
      return;
    }

    await refreshWorkspaces();
  };

  useEffect(() => {
    void (async () => {
      const workspaceCount = await refreshWorkspaces();
      if (user && workspaceCount === 0) {
        await bootstrapWorkspace();
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel(`workspace-memberships-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `user_id=eq.${user.id}`,
        },
        () => void refreshWorkspaces(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (activeWorkspaceId) {
      window.localStorage.setItem(
        ACTIVE_WORKSPACE_STORAGE_KEY,
        activeWorkspaceId,
      );
      return;
    }

    window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  }, [activeWorkspaceId]);

  const value = useMemo(() => {
    const activeWorkspace =
      workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;
    const activeRole = activeWorkspace?.role ?? null;

    return {
      workspaces,
      activeWorkspaceId,
      activeWorkspace,
      activeRole,
      canManageWorkspace: activeRole === "owner" || activeRole === "admin",
      isWorkspaceOwner: activeRole === "owner",
      loading,
      setActiveWorkspaceId: setActiveWorkspaceIdState,
      refreshWorkspaces,
    };
  }, [activeWorkspaceId, loading, workspaces]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspaces must be used within a WorkspaceProvider");
  }

  return context;
}
