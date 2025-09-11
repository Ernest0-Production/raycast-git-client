import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useGitBranches } from "../../hooks/useGitBranches";
import {
  BranchCheckoutAction,
  BranchDeleteAction,
  BranchPushAction,
  BranchMergeAction,
  BranchRebaseAction,
  BranchDeleteRemoteAction,
  BranchCheckoutRemoteAction,
  CreateBranchAction,
  FetchAction,
  PullAction,
} from "../../components/actions/BranchActions";
import { GitManager } from "../../utils/git-utils";
import { Branch, DetachedHead } from "../../types";

interface BranchesViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
}

export function BranchesView({ gitManager, navigationActions, viewDropdown }: BranchesViewProps) {
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

  // Group remote branches by remote (only if we have data)
  const remoteGroups = branchesState
    ? branchesState.remoteBranches.reduce(
        (groups, branch) => {
          const remote = branch.remote || "unknown";
          if (!groups[remote]) groups[remote] = [];
          groups[remote].push(branch);
          return groups;
        },
        {} as Record<string, typeof branchesState.remoteBranches>,
      )
    : {};

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Repository Branches"
      searchBarPlaceholder="Search branches by name..."
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch Management">
            <Action title="Refresh Branch List" onAction={revalidateAll} icon={Icon.ArrowClockwise} />
            <CreateBranchAction gitManager={gitManager} onRefresh={revalidateAll} />
            <FetchAction gitManager={gitManager} onRefresh={revalidateAll} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title="Error loading branches"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidateAll} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      ) : !branchesState ||
        (!branchesState.currentBranch &&
          !branchesState.detachedHead &&
          branchesState.localBranches.length === 0 &&
          branchesState.remoteBranches.length === 0) ? (
        <List.EmptyView
          title="No branches"
          description="No branches found in the repository. It might be an empty repository or there are access issues."
          icon={`git-branch.svg`}
        />
      ) : (
        <>
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
        </>
      )}
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
      icon: Icon.ExclamationMark,
      tooltip: "There are unresolved merge conflicts",
    });
  }

  // Add uncommitted changes indicator for current branch
  if (branch.type === "current" && branch.hasUncommittedChanges) {
    accessories.push({
      tag: { value: "Uncommitted", color: Color.Orange },
      icon: Icon.Document,
      tooltip: "There are uncommitted changes",
    });
  }

  // Add ahead/behind indicators
  if (branch.ahead || branch.behind) {
    const parts = [];
    if (branch.ahead) parts.push(`${branch.ahead} ↑`);
    if (branch.behind) parts.push(`${branch.behind} ↓`);
    accessories.push({
      text: parts.join(" "),
      tooltip: [
        branch.ahead ? `↑ ahead by ${branch.ahead} commits` : null,
        branch.behind ? `↓ behind by ${branch.behind} commits` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  if (branch.isGone) {
    accessories.push({
      tag: { value: "Removed", color: Color.Yellow },
      icon: Icon.ExclamationMark,
      tooltip: "Tracked branch was removed from remote",
    });
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
      key={branch.name}
      title={branch.name}
      subtitle={branch.lastCommitMessage || "No commit message"}
      icon={getIcon()}
      accessories={accessories}
      keywords={[branch.upstream, branch.remote].filter((keyword): keyword is string => Boolean(keyword))}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch Operations">
            {/* Actions for current branch */}
            {branch.type === "current" && (
              <>
                <PullAction gitManager={gitManager} onRefresh={onRefresh} />
                <BranchPushAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
              </>
            )}

            {/* Actions for local branches */}
            {branch.type === "local" && (
              <>
                <BranchCheckoutAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchMergeAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchRebaseAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchPushAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchDeleteAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
              </>
            )}

            {/* Actions for remote branches */}
            {branch.type === "remote" && (
              <>
                <BranchCheckoutRemoteAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchDeleteRemoteAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
              </>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Branch Management">
            <CreateBranchAction gitManager={gitManager} onRefresh={onRefresh} />
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          {navigationActions}
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
      key={detachedHead.shortCommitHash}
      title={`HEAD (${detachedHead.shortCommitHash})`}
      subtitle={detachedHead.commitMessage}
      icon={{ source: Icon.Anchor }}
      accessories={accessories}
      keywords={[detachedHead.commitHash]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch Management">
            <CreateBranchAction gitManager={gitManager} onRefresh={onRefresh} />
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
