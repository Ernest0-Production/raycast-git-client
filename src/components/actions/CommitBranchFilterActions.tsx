import { ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Branch, DetachedHead } from "../../types";
import { ALL_BRANCHES_FILTER, CURRENT_BRANCH_FILTER, DETACHED_HEAD_FILTER } from "../../hooks/useCommitsBranchFilter";

interface CommitBranchFilterActionProps {
  selectedBranch: string;
  updateSelectedBranch: (branchName: string) => void;
  allBranches: Branch[];
  detachedHead?: DetachedHead;
  currentBranch?: Branch;
}

/**
 * Action submenu for filtering commits by branch.
 * Shows same structure as dropdown but in ActionPanel.Submenu format.
 */
export function CommitBranchFilterAction({
  selectedBranch,
  updateSelectedBranch,
  allBranches,
  detachedHead,
  currentBranch,
}: CommitBranchFilterActionProps) {
  const currentBranchOption = () => {
    if (detachedHead) {
      return (
        <Action
          title={`HEAD (${detachedHead.shortCommitHash})`}
          icon={selectedBranch === DETACHED_HEAD_FILTER ? Icon.Checkmark : Icon.Anchor}
          autoFocus={selectedBranch === detachedHead?.shortCommitHash}
          onAction={() => updateSelectedBranch(DETACHED_HEAD_FILTER)}
        />
      );
    } else if (currentBranch) {
      return (
        <Action
          title="Current Branch"
          icon={selectedBranch === CURRENT_BRANCH_FILTER ? Icon.Checkmark : { source: Icon.Dot, tintColor: Color.Green }}
          autoFocus={selectedBranch === CURRENT_BRANCH_FILTER}
          onAction={() => updateSelectedBranch(CURRENT_BRANCH_FILTER)}
        />
      );
    }
    return null;
  };

  const otherBranchOptions = () => {
    return allBranches
      .filter((branch) => {
        // Skip current branch if we're not in detached HEAD (it's already in currentBranchOption)
        if (
          !detachedHead &&
          currentBranch &&
          branch.name === currentBranch.name &&
          branch.type === currentBranch.type
        ) {
          return false;
        }
        return true;
      })
      .map((branch) => {
        const branchValue = branch.type === "remote" ? `${branch.remote}/${branch.name}` : branch.name;
        const displayName = branch.type === "remote" ? `${branch.remote}/${branch.name}` : branch.name;
        const isSelected = selectedBranch === branchValue;
        const baseIcon = branch.type === "remote" ? Icon.Globe : Icon.Dot;
        const icon = isSelected ? Icon.Checkmark : baseIcon;

        return (
          <Action
            key={branchValue}
            title={displayName}
            icon={icon}
            autoFocus={selectedBranch === branchValue}
            onAction={() => updateSelectedBranch(branchValue)}
          />
        );
      });
  };

  const currentBranchAction = currentBranchOption();
  const otherBranchActions = otherBranchOptions();

  return (
    <ActionPanel.Submenu title="Filter by Branch" icon={Icon.Filter} shortcut={{ modifiers: ["cmd"], key: "f" }}>
      <ActionPanel.Section>
        <Action
          title="All Branches"
          icon={selectedBranch === ALL_BRANCHES_FILTER ? Icon.Checkmark : Icon.List}
          autoFocus={selectedBranch === ALL_BRANCHES_FILTER}
          onAction={() => updateSelectedBranch(ALL_BRANCHES_FILTER)}
        />
        {currentBranchAction}
      </ActionPanel.Section>

      {otherBranchActions.length > 0 && <ActionPanel.Section>{otherBranchActions}</ActionPanel.Section>}
    </ActionPanel.Submenu>
  );
}

/**
 * Helper function to get display name for the current filter
 */
export function getBranchFilterDisplayName(
  selectedBranch: string,
  detachedHead?: DetachedHead,
  currentBranch?: Branch,
): string | undefined {
  if (selectedBranch === ALL_BRANCHES_FILTER) {
    return undefined;
  }

  if (selectedBranch === DETACHED_HEAD_FILTER && detachedHead) {
    return `Commits on HEAD (${detachedHead.shortCommitHash})`;
  }

  if (selectedBranch === CURRENT_BRANCH_FILTER && currentBranch) {
    return `Filtered by '${currentBranch.name}' branch`;
  }

  // Check if it's current branch
  if (currentBranch && selectedBranch === currentBranch.name) {
    return `Filtered by '${currentBranch.name}' branch`;
  }

  return `Filtered by '${selectedBranch}' branch`;
}
