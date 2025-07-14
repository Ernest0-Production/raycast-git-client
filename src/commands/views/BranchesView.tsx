import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useGitBranches } from "../../hooks/useGitBranches";
import { ErrorView } from "../../components/shared/ErrorView";
import { EmptyView } from "../../components/shared/EmptyView";
import { BranchActions, CreateBranchAction, FetchAction } from "../../components/actions/BranchActions";
import { RepositoryDirectoryActions } from "../../components/actions/RepositoryDirectoryActions";
import { GitManager } from "../../utils/git-utils";
import { Branch, DetachedHead } from "../../types";

interface BranchesViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
}

export function BranchesView({ gitManager, navigationActions }: BranchesViewProps) {
  const { data: branchesState, isLoading, error, revalidate } = useGitBranches(gitManager);

  // Check for conflicts separately
  const { data: hasConflicts, revalidate: revalidateConflicts } = useCachedPromise(
    async (repoPath: string) => {
      return await gitManager.hasConflicts();
    },
    [gitManager.repoPath],
    {
      initialData: false,
    },
  );

  const revalidateAll = () => {
    revalidate();
    revalidateConflicts();
  };

  if (error) {
    return (
      <ErrorView
        title="Error loading branches state"
        message={error.message}
        navigationTitle={`Branches - ${gitManager.repoName}`}
        onRetry={revalidateAll}
      />
    );
  }

  if (
    !branchesState ||
    (!branchesState.currentBranch &&
      !branchesState.detachedHead &&
      branchesState.localBranches.length === 0 &&
      branchesState.remoteBranches.length === 0)
  ) {
    return (
      <EmptyView
        title="No branches"
        description="No branches found in the repository. It might be an empty repository or there are access issues."
        icon={Icon.Terminal}
        navigationTitle={`Branches - ${gitManager.repoName}`}
        actions={
          <ActionPanel>
            <Action title="Refresh Branch List" onAction={revalidateAll} icon={Icon.ArrowClockwise} />
            {navigationActions}
          </ActionPanel>
        }
      />
    );
  }

  // Group remote branches by remote
  const remoteGroups = branchesState.remoteBranches.reduce(
    (groups, branch) => {
      const remote = branch.remote || "unknown";
      if (!groups[remote]) groups[remote] = [];
      groups[remote].push(branch);
      return groups;
    },
    {} as Record<string, typeof branchesState.remoteBranches>,
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Branches - ${gitManager.repoName}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch Management">
            <CreateBranchAction gitManager={gitManager} onRefresh={revalidateAll} />
            <FetchAction gitManager={gitManager} onRefresh={revalidateAll} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    >
      {/* Current Branch Section */}
      {branchesState.currentBranch && (
        <List.Section title="Current Branch">
          <BranchListItem
            branch={branchesState.currentBranch}
            gitManager={gitManager}
            onRefresh={revalidateAll}
            navigationActions={navigationActions}
            hasConflicts={hasConflicts}
          />
        </List.Section>
      )}

      {/* Detached HEAD Section */}
      {branchesState.detachedHead && (
        <List.Section title="Detached HEAD">
          <DetachedHeadListItem
            detachedHead={branchesState.detachedHead}
            gitManager={gitManager}
            onRefresh={revalidateAll}
            navigationActions={navigationActions}
          />
        </List.Section>
      )}

      {/* Local Branches Section */}
      {branchesState.localBranches.length > 0 && (
        <List.Section title="Local Branches">
          {branchesState.localBranches.map((branch) => (
            <BranchListItem
              key={branch.name}
              branch={branch}
              gitManager={gitManager}
              onRefresh={revalidateAll}
              navigationActions={navigationActions}
            />
          ))}
        </List.Section>
      )}

      {/* Remote Branches Sections */}
      {Object.entries(remoteGroups).map(([remoteName, remoteBranches]) => (
        <List.Section key={remoteName} title={`Remote: ${remoteName}`}>
          {remoteBranches.map((branch) => (
            <BranchListItem
              key={`${branch.remote}/${branch.name}`}
              branch={branch}
              gitManager={gitManager}
              onRefresh={revalidateAll}
              navigationActions={navigationActions}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function BranchListItem({
  branch,
  gitManager,
  onRefresh,
  navigationActions,
  hasConflicts,
}: {
  branch: Branch;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  hasConflicts?: boolean;
}) {
  const accessories = [];

  // Add conflict warning indicator for current branch
  if (branch.type === "current" && hasConflicts) {
    accessories.push({
      tag: { value: "Conflicts", color: Color.Red },
    });
  }

  // Add uncommitted changes indicator for current branch
  if (branch.type === "current" && branch.hasUncommittedChanges) {
    accessories.push({
      tag: { value: "Uncommitted", color: Color.Orange },
    });
  }

  // Add ahead/behind indicators
  if (branch.ahead || branch.behind) {
    const parts = [];
    if (branch.ahead) parts.push(`${branch.ahead} ↑`);
    if (branch.behind) parts.push(`${branch.behind} ↓`);
    accessories.push({ text: parts.join(" ") });
  }

  // Determine icon based on branch type
  const getIcon = () => {
    if (branch.type === "current") {
      return { source: Icon.Dot, tintColor: Color.Green };
    } else if (branch.type === "remote") {
      return { source: Icon.Globe, tintColor: Color.SecondaryText };
    } else {
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
    }
  };

  return (
    <List.Item
      title={branch.name}
      subtitle={branch.lastCommitMessage || "No commit message"}
      icon={getIcon()}
      accessories={accessories}
      keywords={[
        branch.upstream,
        branch.remote
      ].filter((keyword): keyword is string => Boolean(keyword))}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch Operations">
            <BranchActions branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Branch Management">
            <CreateBranchAction gitManager={gitManager} onRefresh={onRefresh} />
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function DetachedHeadListItem({
  detachedHead,
  gitManager,
  onRefresh,
  navigationActions,
}: {
  detachedHead: DetachedHead;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
}) {
  const accessories = [];

  // Add uncommitted changes indicator
  if (detachedHead.hasUncommittedChanges) {
    accessories.push({
      icon: { source: Icon.Dot, tintColor: Color.Orange },
      tooltip: "Uncommitted changes",
    });
  }

  return (
    <List.Item
      title={`HEAD (${detachedHead.shortCommitHash})`}
      subtitle={detachedHead.commitMessage}
      icon={{ source: Icon.Anchor }}
      accessories={accessories}
      keywords={[
        detachedHead.commitHash,
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch Management">
            <CreateBranchAction gitManager={gitManager} onRefresh={onRefresh} />
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
