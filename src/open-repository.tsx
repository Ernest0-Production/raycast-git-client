import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { GitView } from "./types";
import { useCachedState } from "@raycast/utils";
import { useGitRepository } from "./hooks/useGitRepository";
import { useRecentRepositories } from "./hooks/useRecentRepositories";
import { BranchesView } from "./commands/views/BranchesView";
import { StatusView } from "./commands/views/StatusView";
import { CommitsView } from "./commands/views/CommitsView";
import { StashesView } from "./commands/views/StashesView";
import { useEffect, useMemo } from "react";
import { RepositoryDirectoryActions } from "./components/actions/RepositoryDirectoryActions";
import { useGitBranches } from "./hooks/useGitBranches";
import { useCommitsBranchFilter } from "./hooks/useCommitsBranchFilter";
import { useGitCommits } from "./hooks/useGitCommits";
import { useGitStash } from "./hooks/useGitStash";
import { useGitStatus } from "./hooks/useGitStatus";
import { Branch } from "./types";

interface Arguments {
  path: string;
}

export default function OpenRepository({ arguments: args }: { arguments: Arguments }) {
  const [currentView, setCurrentView] = useCachedState<GitView>("git-current-view", "commits");
  const repositoryPath = args.path;

  // Hook for working with a Git repository (synchronous validation)
  const { data: gitManager, error: repoError } = useGitRepository(repositoryPath);

  // Hook for managing recent repositories
  const { addToRecent } = useRecentRepositories();

  // Add repository to recent cache when successfully opened
  useEffect(() => {
    if (gitManager && repositoryPath) {
      addToRecent(repositoryPath);
    }
  }, [gitManager, repositoryPath, addToRecent]);

  // Validation error state
  if (repoError || !gitManager) {
    return (
      <List navigationTitle="Git Repository">
        <List.EmptyView
          title="Error opening repository"
          description={repoError?.message || "Unknown error"}
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  // Shared data hooks lifted to the top-level to persist across view switches
  const {
    data: branchesState,
    isLoading: branchesIsLoading,
    error: branchesError,
    revalidate: revalidateBranches,
  } = useGitBranches(gitManager);

  const allBranches: Branch[] = useMemo(() => {
    return [
      ...(branchesState?.currentBranch ? [branchesState.currentBranch] : []),
      ...(branchesState?.localBranches || []),
      ...(
        branchesState?.remoteBranches
          ? Object.values(branchesState.remoteBranches).flat()
          : []
      ),
    ];
  }, [branchesState]);

  const {
    branchFilter,
    selectedBranch,
    setBranchFilter,
  } = useCommitsBranchFilter(gitManager.repoPath, allBranches, branchesState?.detachedHead);

  const {
    isLoading: commitsIsLoading,
    data: commits,
    error: commitsError,
    revalidate: revalidateCommits,
    pagination,
  } = useGitCommits(gitManager, selectedBranch, branchesState !== undefined);

  const { stashes, isLoading: stashesIsLoading, revalidate: revalidateStashes } = useGitStash(gitManager);

  const {
    data: status,
    isLoading: statusIsLoading,
    error: statusError,
    revalidate: revalidateStatus,
  } = useGitStatus(gitManager);

  // Navigation actions for all views
  const navigationActions = (
    <>
      <ActionPanel.Section title="Navigation">
        <Action
          title="Go to Status"
          onAction={() => setCurrentView("status")}
          icon={Icon.NewDocument}
          shortcut={{ modifiers: ["cmd"], key: "1" }}
        />
        <Action
          title="Go to Commits"
          onAction={() => setCurrentView("commits")}
          icon={`git-commit.svg`}
          shortcut={{ modifiers: ["cmd"], key: "2" }}
        />
        <Action
          title="Go to Branches"
          onAction={() => setCurrentView("branches")}
          icon={`git-branch.svg`}
          shortcut={{ modifiers: ["cmd"], key: "3" }}
        />
        <Action
          title="Go to Stash"
          onAction={() => setCurrentView("stashes")}
          icon={Icon.Download}
          shortcut={{ modifiers: ["cmd"], key: "4" }}
        />
      </ActionPanel.Section>
      <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} />
    </>
  );

  // View selector dropdown for all views
  const viewSelectorDropdown = (
    <List.Dropdown
      tooltip="Select View"
      value={currentView}
      onChange={(newValue) => setCurrentView(newValue as GitView)}
    >
      <List.Dropdown.Item title="Status" value="status" keywords={["diff", "changes"]} icon={Icon.NewDocument} />
      <List.Dropdown.Item title="Commits" value="commits" keywords={["log"]} icon={`git-commit.svg`} />
      <List.Dropdown.Item title="Branches" value="branches" keywords={["graph"]} icon={`git-branch.svg`} />
      <List.Dropdown.Item title="Stashes" value="stashes" icon={Icon.Download} />
    </List.Dropdown>
  );

  // Render the corresponding view
  switch (currentView) {
    case "status":
      return (
        <StatusView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          onNavigateToCommits={() => setCurrentView("commits")}
          status={status}
          isLoading={statusIsLoading}
          error={statusError}
          revalidate={revalidateStatus}
        />
      );
    case "commits":
      return (
        <CommitsView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          // Branch context
          allBranches={allBranches}
          currentBranch={branchesState?.currentBranch}
          detachedHead={branchesState?.detachedHead}
          // Filter state
          branchFilter={branchFilter}
          selectedBranch={selectedBranch}
          setBranchFilter={setBranchFilter}
          // Commits data
          isLoading={commitsIsLoading}
          commits={commits}
          error={commitsError}
          revalidate={revalidateCommits}
          pagination={pagination}
        />
      );
    case "branches":
      return (
        <BranchesView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          branchesState={branchesState}
          isLoading={branchesIsLoading}
          error={branchesError}
          revalidateBranches={revalidateBranches}
          hasConflicts={status?.files?.some(file => file.type === "conflicted")}
          hasUncommittedChanges={status?.files?.length !== 0}
          revalidateStatus={revalidateStatus}
        />
      );
    case "stashes":
      return (
        <StashesView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          onNavigateToStatus={() => setCurrentView("status")}
          stashes={stashes}
          isLoading={stashesIsLoading}
          revalidate={revalidateStashes}
        />
      );
  }
}
