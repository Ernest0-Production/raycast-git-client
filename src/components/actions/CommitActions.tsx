import { ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { GitManager } from "../../utils/git-utils";
import { Commit } from "../../types";

interface CommitActionsProps {
  commit: Commit;
  gitManager: GitManager;
  onRefresh: () => void;
}

/**
 * Reusable actions for working with commits.
 */
export function CommitActions({ commit, gitManager, onRefresh }: CommitActionsProps) {
  const handleCheckoutCommit = async () => {
    const confirmed = await confirmAlert({
      title: "Checkout commit",
      message: `Are you sure you want to checkout commit "${commit.shortHash}"? This will put you in a detached HEAD state.`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.checkoutCommit(commit.hash);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  const handleCherryPick = async () => {
    try {
      await gitManager.cherryPick(commit.hash);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handleRevert = async () => {
    const confirmed = await confirmAlert({
      title: "Revert commit",
      message: `Are you sure you want to revert commit "${commit.shortHash}"? This will create a new commit that undoes the changes.`,
      primaryAction: {
        title: "Revert",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.revert(commit.hash);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  const handleReset = async (mode: string) => {
    const confirmed = await confirmAlert({
      title: "Reset to commit",
      message: `Are you sure you want to reset to commit "${commit.shortHash}"? This action cannot be undone.`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await gitManager.reset(commit.hash, mode);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <>
      <Action
        title="Checkout Commit"
        onAction={handleCheckoutCommit}
        icon={Icon.Checkmark}
      />
      <Action
        title="Cherry-Pick Commit"
        onAction={handleCherryPick}
        icon={Icon.Download}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
      <Action
        title="Revert Commit"
        onAction={handleRevert}
        icon={Icon.ArrowCounterClockwise}
        shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
      />
      <ActionPanel.Submenu title="Reset to This Commit" icon={Icon.ArrowClockwise}>
        <Action
          title="Soft Reset (Keep Changes Staged)"
          onAction={() => handleReset("--soft")}
          icon={Icon.ArrowClockwise}
        />
        <Action
          title="Mixed Reset (Keep Changes Unstaged)"
          onAction={() => handleReset("--mixed")}
          icon={Icon.ArrowClockwise}
        />
        <Action
          title="Hard Reset (Discard All Changes)"
          onAction={() => handleReset("--hard")}
          icon={Icon.ArrowClockwise}
          style={Action.Style.Destructive}
        />
      </ActionPanel.Submenu>
      <Action.CopyToClipboard
        title="Copy Commit Hash"
        content={commit.hash}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.CopyToClipboard
        title="Copy Short Hash"
        content={commit.shortHash}
      />
      <Action.CopyToClipboard
        title="Copy Author Name"
        content={commit.author}
      />
      <Action.CopyToClipboard
        title="Copy Author Email"
        content={commit.authorEmail}
      />
    </>
  );
}

/**
 * Additional actions for commit history.
 */
export function CommitHistoryActions({ onRefresh, currentBranch }: { onRefresh: () => void; currentBranch?: string }) {
  const handleRefresh = async () => {
    onRefresh();
  };

  return (
    <>
      <Action
        title="Refresh History"
        onAction={handleRefresh}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      {currentBranch && (
        <Action.CopyToClipboard
          title="Copy Branch Name"
          content={currentBranch}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />
      )}
    </>
  );
}
