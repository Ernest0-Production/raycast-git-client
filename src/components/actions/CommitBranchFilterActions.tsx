import { ActionPanel, Action, Icon } from "@raycast/api";
import { Branch, DetachedHead } from "../../types";
import { ALL_BRANCHES_FILTER, DETACHED_HEAD_FILTER } from "../../hooks/useCommitsBranchFilter";

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
    // Build branch options similar to the original dropdown logic
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
            const isSelected = selectedBranch === currentBranch.name;
            return (
                <Action
                    title={currentBranch.name}
                    icon={isSelected ? Icon.Checkmark : Icon.Dot}
                    autoFocus={selectedBranch === currentBranch.name}
                    onAction={() => updateSelectedBranch(currentBranch.name)}
                />
            );
        }
        return null;
    };

    const otherBranchOptions = () => {
        return allBranches
            .filter((branch) => {
                // Skip current branch if we're not in detached HEAD (it's already in currentBranchOption)
                if (!detachedHead && currentBranch && branch.name === currentBranch.name && branch.type === currentBranch.type) {
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
        <ActionPanel.Submenu
            title="Filter by Branch"
            icon={Icon.Filter}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
        >
            <ActionPanel.Section>
                <Action
                    title="All Branches"
                    icon={selectedBranch === ALL_BRANCHES_FILTER ? Icon.Checkmark : Icon.List}
                    autoFocus={selectedBranch === ALL_BRANCHES_FILTER}
                    onAction={() => updateSelectedBranch(ALL_BRANCHES_FILTER)}
                />
            </ActionPanel.Section>

            {currentBranchAction && (
                <ActionPanel.Section title="Current Branch">
                    {currentBranchAction}
                </ActionPanel.Section>
            )}

            {otherBranchActions.length > 0 && (
                <ActionPanel.Section>
                    {otherBranchActions}
                </ActionPanel.Section>
            )}
        </ActionPanel.Submenu>
    );
}

/**
 * Helper function to get display name for the current filter
 */
export function getBranchFilterDisplayName(
    selectedBranch: string,
    allBranches: Branch[],
    detachedHead?: DetachedHead,
    currentBranch?: Branch,
): string | undefined {
    if (selectedBranch === ALL_BRANCHES_FILTER) {
        return undefined;
    }

    if (selectedBranch === DETACHED_HEAD_FILTER && detachedHead) {
        return `Commits on HEAD (${detachedHead.shortCommitHash})`;
    }

    // Check if it's current branch
    if (currentBranch && selectedBranch === currentBranch.name) {
        return `Filtered by '${currentBranch.name}' branch`;
    }

    // Find the branch in allBranches
    const branch = allBranches.find((branch) => {
        if (branch.type === "remote") {
            return `${branch.remote}/${branch.name}` === selectedBranch;
        }
        return branch.name === selectedBranch;
    });

    if (branch) {
        return branch.type === "remote" ? `Filtered by '${branch.remote}/${branch.name}' branch` : `Filtered by '${branch.name}' branch`;
    }

    return selectedBranch;
}
