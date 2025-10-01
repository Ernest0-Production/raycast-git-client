import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useGitRepository } from "./hooks/useGitRepository";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import { BranchesView } from "./commands/views/BranchesView";
import { StatusView } from "./commands/views/StatusView";
import { CommitsView } from "./commands/views/CommitsView";
import { StashesView } from "./commands/views/StashesView";
import FilesView from "./commands/views/FilesView";
import { useEffect, useMemo } from "react";
import { RepositoryDirectoryActions } from "./components/actions/RepositoryDirectoryActions";
import { useGitBranches } from "./hooks/useGitBranches";
import { useCommitsBranchFilter } from "./hooks/useCommitsBranchFilter";
import { useGitCommits } from "./hooks/useGitCommits";
import { useGitStash } from "./hooks/useGitStash";
import { useGitStatus } from "./hooks/useGitStatus";
import { GitView, FileStatus } from "./types";
import { useGitRemotes } from "./hooks/useGitRemotes";
import { RemoteCreatePullRequestAction, RemoteOpenPullRequestAction } from "./components/actions/RemoteHostActions";
import RemotesView from "./commands/views/RemotesView";

interface Arguments {
  path: string;
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

  const { data: remotes, revalidate: revalidateRemotes } = useGitRemotes(gitManager);

  // Shared data hooks lifted to the top-level to persist across view switches
  const {
    data: branchesState,
    isLoading: branchesIsLoading,
    error: branchesError,
    revalidate: revalidateBranches,
  } = useGitBranches(gitManager);

  const {
    branchFilter,
    selectedBranch,
    setBranchFilter,
  } = useCommitsBranchFilter(gitManager.repoPath, branchesState);

  const selectedSourceName = useMemo(() => {
    if (!selectedBranch) {
      return undefined;
    }
    if ('name' in selectedBranch) {
      switch (selectedBranch.type) {
        case 'local':
        case 'current':
          return selectedBranch.name;
        case 'remote':
          return `${selectedBranch.remote}/${selectedBranch.name}`;
      }
    }
    if ('commitHash' in selectedBranch) {
      return selectedBranch.commitHash;
    }
    return undefined;
  }, [selectedBranch]);

  const {
    isLoading: commitsIsLoading,
    data: commits,
    error: commitsError,
    revalidate: revalidateCommits,
    pagination,
  } = useGitCommits(
    gitManager,
    selectedSourceName,
    branchesState !== undefined
  );

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
          title="Go to Remotes"
          onAction={() => setCurrentView("remotes")}
          icon={Icon.Network}
          shortcut={{ modifiers: ["cmd"], key: "4" }}
        />
        <Action
          title="Go to Files History"
          onAction={() => setCurrentView("files")}
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd"], key: "5" }}
        />
        <Action
          title="Go to Stash"
          onAction={() => setCurrentView("stashes")}
          icon={Icon.Bookmark}
          shortcut={{ modifiers: ["cmd"], key: "6" }}
        />
      </ActionPanel.Section>
      <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} />
      {remotes && Object.keys(remotes).map((remote) => (
        <ActionPanel.Section
          key={remote}
          title={`${remote} • ${remotes[remote].organizationName}/${remotes[remote].repositoryName}`}
        >
          <RemoteOpenPullRequestAction remote={remotes[remote]} />
          {branchesState?.currentBranch && (
            <RemoteCreatePullRequestAction
              branch={branchesState.currentBranch.name}
              remote={remotes[remote]}
            />
          )}
        </ActionPanel.Section>
      ))}
    </>
  );

  // View selector dropdown for all views
  const viewSelectorDropdown = (
    <List.Dropdown
      tooltip="Select View"
      value={currentView}
      onChange={(newValue: string) => setCurrentView(newValue as GitView)}
    >
      <List.Dropdown.Item title="Status" value="status" keywords={["diff", "changes", "state", "workspace", "patch"]} icon={Icon.NewDocument} />
      <List.Dropdown.Item title="Commits" value="commits" keywords={["log", "history"]} icon={`git-commit.svg`} />
      <List.Dropdown.Item title="Branches" value="branches" keywords={["graph", "remote"]} icon={`git-branch.svg`} />
      <List.Dropdown.Item title="Remotes" value="remotes" keywords={["origin"]} icon={Icon.Network} />
      <List.Dropdown.Item title="Files" value="files" keywords={["history", "ls-files", "workspace", "project"]} icon={Icon.Clock} />
      <List.Dropdown.Item title="Stashes" value="stashes" keywords={["bookmark"]} icon={Icon.Bookmark} />
    </List.Dropdown>
  );

  // Render the corresponding view
  switch (currentView) {
    case "status":
      return (
        <StatusView
          gitManager={gitManager}
          currentBranch={branchesState?.currentBranch}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          onNavigateToCommits={() => setCurrentView("commits")}
          status={status}
          isLoading={statusIsLoading}
          error={statusError}
          revalidateStatus={revalidateStatus}
          revalidateCommits={revalidateCommits}
          revalidateBranches={revalidateBranches}
          remotesHosts={remotes ?? {}}
        />
      );
    case "commits":
      return (
        <CommitsView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          // Branch context
          branchesState={branchesState}
          // Filter state
          branchFilter={branchFilter}
          selectedBranch={selectedBranch}
          setBranchFilter={setBranchFilter}
          // Commits data
          isLoading={commitsIsLoading}
          commits={commits}
          error={commitsError}
          revalidateCommits={revalidateCommits}
          revalidateStatus={revalidateStatus}
          revalidateBranches={revalidateBranches}
          navigateTo={setCurrentView}
          pagination={pagination}
          remotesHosts={remotes ?? {}}
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
          hasConflicts={status?.files?.some((file: FileStatus) => file.type === "conflicted")}
          hasUncommittedChanges={status?.files?.length !== 0}
          revalidateStatus={revalidateStatus}
          navigateTo={setCurrentView}
          remotesHosts={remotes ?? {}}
        />
      );
    case "remotes":
      return (
        <RemotesView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          remoteHosts={remotes ?? {}}
          onRevalidateRemotes={revalidateRemotes}
        />
      );
    case "files":
      return (
        <FilesView
          gitManager={gitManager}
          navigationActions={navigationActions}
          viewDropdown={viewSelectorDropdown}
          remotesHosts={remotes ?? {}}
          onRefresh={() => {
            revalidateStatus();
          }}
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
    default:
      setCurrentView("branches");
  }
}
