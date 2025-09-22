import { ActionPanel, Action, Icon, Color } from "@raycast/api";
import { BranchesState, DetachedHead, Branch } from "../../types";
import { ALL_BRANCHES_FILTER, CURRENT_BRANCH_FILTER } from "../../hooks/useCommitsBranchFilter";

interface CommitBranchFilterActionProps {
  branchFilter: string;
  updateSelectedBranch: (branchName: string) => void;
  branchesState: BranchesState;
}

/**
 * Action submenu for filtering commits by branch.
 * Shows same structure as dropdown but in ActionPanel.Submenu format.
 */
export function CommitBranchFilterAction({
  branchFilter,
  updateSelectedBranch,
  branchesState,
}: CommitBranchFilterActionProps) {
  return (
    <ActionPanel.Submenu title="Filter by Branch" icon={Icon.Filter} shortcut={{ modifiers: ["cmd"], key: "f" }}>
      <ActionPanel.Section>
        <Action
          title="All Branches"
          icon={branchFilter === ALL_BRANCHES_FILTER ? Icon.Checkmark : Icon.List}
          autoFocus={branchFilter === ALL_BRANCHES_FILTER}
          onAction={() => updateSelectedBranch(ALL_BRANCHES_FILTER)}
        />
      </ActionPanel.Section>

      {/* Current Branch / Detached HEAD Section */}
      <ActionPanel.Section title={branchesState.detachedHead ? "Detached HEAD" : "Current Branch"}>
        {branchesState.detachedHead && (
          <Action
            title={`HEAD (${branchesState.detachedHead.shortCommitHash})`}
            icon={branchFilter === CURRENT_BRANCH_FILTER ? Icon.Checkmark : Icon.Anchor}
            autoFocus={branchFilter === CURRENT_BRANCH_FILTER}
            onAction={() => updateSelectedBranch(CURRENT_BRANCH_FILTER)}
          />
        )}
        {branchesState.currentBranch && (
          <Action
            title={branchesState.currentBranch.displayName}
            icon={{ source: branchFilter === CURRENT_BRANCH_FILTER ? Icon.Checkmark : Icon.Dot, tintColor: Color.Green }}
            autoFocus={branchFilter === CURRENT_BRANCH_FILTER}
            onAction={() => updateSelectedBranch(CURRENT_BRANCH_FILTER)}
          />
        )}
      </ActionPanel.Section>

      {/* Local Branches Section */}
      {branchesState.localBranches.length > 0 && (
        <ActionPanel.Section title="Local Branches">
          {branchesState.localBranches.map((branch) => (
            <BranchFilterAction
              branch={branch}
              branchFilter={branchFilter}
              updateSelectedBranch={updateSelectedBranch}
            />
          ))}
        </ActionPanel.Section>
      )}

      {/* Remote Branches Sections */}
      {Object.entries(branchesState.remoteBranches).map(([remoteName, branches]) => (
        <ActionPanel.Section key={remoteName} title={`Remote: ${remoteName}`}>
          {branches.map((branch) => (
            <BranchFilterAction
              branch={branch}
              branchFilter={branchFilter}
              updateSelectedBranch={updateSelectedBranch}
            />
          ))}
        </ActionPanel.Section>
      ))}
    </ActionPanel.Submenu>
  );
}

function BranchFilterAction({
  branch,
  branchFilter,
  updateSelectedBranch,
}: {
  branch: Branch;
  branchFilter: string;
  updateSelectedBranch: (name: string) => void;
}) {
  const branchValue = branch.displayName;
  const isSelected = branchFilter === branchValue;
  const baseIcon = branch.type === "remote" ? Icon.Globe : Icon.Dot;
  const icon = isSelected ? Icon.Checkmark : baseIcon;

  return (
    <Action
      key={branchValue}
      title={branchValue}
      icon={icon}
      autoFocus={isSelected}
      onAction={() => updateSelectedBranch(branchValue)}
    />
  );
}

/**
 * Helper function to get display name for the current filter
 */
export function getBranchFilterDisplayName(
  selectedBranch: string,
  branchesState?: BranchesState
): string | undefined {
  if (selectedBranch === ALL_BRANCHES_FILTER) {
    return undefined;
  }

  if (selectedBranch === CURRENT_BRANCH_FILTER) {
    if (branchesState?.detachedHead) {
      return `Commits on HEAD '${branchesState.detachedHead.shortCommitHash}'`;
    }
    if (branchesState?.currentBranch) {
      const aheadBehindInfo = getAheadBehindInfo(branchesState.currentBranch);
      return `Filtered by '${branchesState.currentBranch.name}' branch ${aheadBehindInfo ? ` • ${aheadBehindInfo}` : ""}`;
    }
    return undefined;
  }

  const localBranch = branchesState?.localBranches.find((branch) => branch.name === selectedBranch);
  if (localBranch) {
    const aheadBehindInfo = getAheadBehindInfo(localBranch);
    return `Filtered by '${localBranch.name}' branch ${aheadBehindInfo ? ` • ${aheadBehindInfo}` : ""}`;
  }

  return `Filtered by '${selectedBranch}' branch`;
}

function getAheadBehindInfo(branch: Branch): string | undefined {
  const parts = [];
  if (branch.ahead) parts.push(`↑ ${branch.ahead} ahead`);
  if (branch.behind) parts.push(`↓ ${branch.behind} behind`);

  if (parts.length > 0) return parts.join(" • ");
  return undefined;
}
