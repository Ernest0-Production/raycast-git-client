import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  BranchCkeckoutAction,
  BranchDeleteAction,
  BranchPushAction,
  BranchMergeAction,
  BranchRebaseAction,
  BranchRenameAction,
  CreateBranchAction,
  FetchAction,
  PullAction,
  BranchCopyNameAction,
} from "../../components/actions/BranchActions";
import { GitManager } from "../../utils/git-utils";
import { Branch, DetachedHead, BranchesState } from "../../types";
import { useMemo } from "react";

interface BranchesViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
  branchesState?: BranchesState;
  isLoading: boolean;
  error?: Error;
  revalidateBranches: () => void | Promise<unknown>;
  hasConflicts?: boolean;
  hasUncommittedChanges?: boolean;
  revalidateStatus: () => void | Promise<unknown>;
}

export function BranchesView({
  gitManager,
  navigationActions,
  viewDropdown,
  branchesState,
  isLoading,
  error,
  revalidateBranches,
  hasConflicts,
  hasUncommittedChanges,
  revalidateStatus
}: BranchesViewProps) {

  const revalidateAll = () => {
    revalidateBranches();
    revalidateStatus();
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Repository Branches"
      searchBarPlaceholder="Search branches by name..."
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branches">
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
        (!branchesState.currentBranch && !branchesState.detachedHead) ? (
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
                hasUncommittedChanges={hasUncommittedChanges}
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
                hasUncommittedChanges={hasUncommittedChanges}
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
                  hasUncommittedChanges={hasUncommittedChanges}
                />
              ))}
            </List.Section>
          )}

          {/* Remote Branches Sections */}
          {Object.entries(branchesState.remoteBranches).map(([remoteName, remoteBranches]) => (
            <List.Section key={remoteName} title={`Remote: ${remoteName}`}>
              {remoteBranches.map((branch) => (
                <BranchListItem
                  key={`${branch.remote}/${branch.name}`}
                  branch={branch}
                  gitManager={gitManager}
                  onRefresh={revalidateAll}
                  navigationActions={navigationActions}
                  hasUncommittedChanges={hasUncommittedChanges}
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
  hasUncommittedChanges,
}: {
  branch: Branch;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  hasConflicts?: boolean;
  hasUncommittedChanges?: boolean;
}) {
  const accessories = useMemo(() => {
    const result = [];

    // Add conflict warning indicator for current branch
    if (branch.type === "current" && hasConflicts) {
      result.push({
        tag: { value: "Conflicts", color: Color.Red },
        icon: Icon.ExclamationMark,
        tooltip: "There are unresolved merge conflicts",
      });
    }

    // Add uncommitted changes indicator for current branch
    if (branch.type === "current" && hasUncommittedChanges) {
      result.push({
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
      result.push({
        text: parts.join(" "),
        tooltip: [
          branch.ahead ? `↑ ahead by ${branch.ahead} commits` : null,
          branch.behind ? `↓ behind by ${branch.behind} commits` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }

    if ((branch.type === "local" || branch.type === "current") && branch.upstream) {
      result.push({
        tag: {
          value: branch.upstream,
          color: branch.isGone ? Color.Yellow : Color.SecondaryText,
        },
        tooltip: branch.isGone ? "Upstream was removed from remote" : "Tracked upstream",
        icon: branch.isGone ? Icon.ExclamationMark : Icon.Globe
      });
    }

    return result;
  }, [branch, hasConflicts, hasUncommittedChanges]);

  // Determine icon based on branch type
  const getIcon = useMemo(() => {
    return () => {
      if (branch.type === "current") {
        return { source: Icon.Dot, tintColor: Color.Green };
      } else if (branch.type === "remote") {
        return { source: Icon.Globe, tintColor: Color.SecondaryText };
      } else {
        return { source: Icon.Dot, tintColor: Color.SecondaryText };
      }
    };
  }, [branch.type]);

  return (
    <List.Item
      key={branch.name}
      title={branch.name}
      icon={getIcon()}
      accessories={accessories}
      keywords={[branch.upstream, branch.remote].filter((keyword): keyword is string => Boolean(keyword))}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={branch.name}>
            {/* Actions for current branch */}
            {branch.type === "current" && (
              <>
                <PullAction gitManager={gitManager} onRefresh={onRefresh} />
                <BranchPushAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchCopyNameAction branch={branch.name} />
                <BranchRenameAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
              </>
            )}

            {/* Actions for local branches */}
            {branch.type === "local" && (
              <>
                <BranchCkeckoutAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchCopyNameAction branch={branch.name} />
                <BranchPushAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchRebaseAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchMergeAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchRenameAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchDeleteAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
              </>
            )}

            {/* Actions for remote branches */}
            {branch.type === "remote" && (
              <>
                <BranchCkeckoutAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
                <BranchCopyNameAction branch={branch.name} />
                <BranchDeleteAction branch={branch} gitManager={gitManager} onRefresh={onRefresh} />
              </>
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Branches">
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
  hasUncommittedChanges,
}: {
  detachedHead: DetachedHead;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  hasUncommittedChanges?: boolean;
}) {
  const accessories = [];

  // Add uncommitted changes indicator
  if (hasUncommittedChanges) {
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
          <ActionPanel.Section title="Branches">
            <CreateBranchAction gitManager={gitManager} onRefresh={onRefresh} />
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
