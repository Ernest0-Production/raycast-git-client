import { Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useGitRepository } from "./hooks/useGitRepository";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import { BranchesView } from "./commands/views/BranchesView";
import { StatusView } from "./commands/views/StatusView";
import { CommitsView } from "./commands/views/CommitsView";
import { StashesView } from "./commands/views/StashesView";
import FilesView from "./commands/views/FilesView";
import { useEffect } from "react";
import { useGitBranches } from "./hooks/useGitBranches";
import { useGitCommits } from "./hooks/useGitCommits";
import { useGitStash } from "./hooks/useGitStash";
import { useGitStatus } from "./hooks/useGitStatus";
import { GitView, BranchesState, StatusState, Stash, Commit, ListPagination } from "./types";
import { useGitRemotes } from "./hooks/useGitRemotes";
import RemotesView from "./commands/views/RemotesView";
import { Branch, Remote } from "./types";
import { GitManager } from "./utils/git-manager";

interface Arguments {
  path: string;
}

export type BranchFilter =
  { kind: 'all' } |
  { kind: 'current' } |
  { kind: 'branch', value: Pick<Branch, 'name' | 'type' | 'remote'> }

export type RepositoryContext = {
  gitManager: GitManager;
  remotes: {
    data: Record<string, Remote>;
    isLoading: boolean;
    revalidate: () => void;
  };
  branches: {
    data: BranchesState;
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
  commits: {
    data: Commit[];
    selectedBranch?: Branch;
    filter: BranchFilter;
    isLoading: boolean;
    error: Error | undefined;
    pagination: ListPagination | undefined;
    setFilter: (filter: BranchFilter) => void;
    revalidate: () => void;
  };
  stashes: {
    data: Stash[];
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
  status: {
    data: StatusState;
    isLoading: boolean;
    error: Error | undefined;
    revalidate: () => void;
  };
};

export type NavigationContext = {
  currentView: GitView;
  navigateTo: (destination: GitView) => void;
}

export default function OpenRepository({ arguments: args }: { arguments: Arguments }) {
  const [currentView, setCurrentView] = useCachedState<GitView>("git-current-view", "branches");
  const repositoryPath = args.path;

  // Hook for working with a Git repository (synchronous validation)
  const { gitManager, error } = useGitRepository(repositoryPath);

  // Hook for managing recent repositories
  const { visitRepository } = useRepositoriesList();

  // Add repository to recent cache when successfully opened
  useEffect(() => {
    if (gitManager && repositoryPath) {
      visitRepository(repositoryPath);
    }
  }, [gitManager, repositoryPath, visitRepository]);

  // Validation error state
  if (error || !gitManager) {
    return (
      <List navigationTitle="Git Repository">
        <List.EmptyView
          title="Error opening repository"
          description={error?.message || "Unknown error"}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  // Shared data hooks lifted to the top-level to persist across view switches
  const remotesContext = useGitRemotes(gitManager);
  const branchesContext = useGitBranches(gitManager);
  const commitsContext = useGitCommits(gitManager, branchesContext.data);
  const stashesContext = useGitStash(gitManager);
  const statusContext = useGitStatus(gitManager);

  const rootContext: RepositoryContext & NavigationContext = {
    gitManager,
    remotes: remotesContext,
    branches: branchesContext,
    commits: commitsContext,
    stashes: stashesContext,
    status: statusContext,
    currentView,
    navigateTo: setCurrentView,
  };

  // Render the corresponding view
  switch (currentView) {
    case "status":
      return (
        <StatusView {...rootContext} />
      );
    case "commits":
      return (
        <CommitsView {...rootContext} />
      );
    case "branches":
      return (
        <BranchesView {...rootContext} />
      );
    case "remotes":
      return (
        <RemotesView {...rootContext} />
      );
    case "files":
      return (
        <FilesView {...rootContext} />
      );
    case "stashes":
      return (
        <StashesView {...rootContext} />
      );
    default:
      setCurrentView("branches");
  }
}
