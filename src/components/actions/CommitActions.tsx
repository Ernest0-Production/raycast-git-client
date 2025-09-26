import { ActionPanel, Action, Icon, confirmAlert, Alert, clearSearchBar, useNavigation, Clipboard, Form } from "@raycast/api";
import { GitManager } from "../../utils/git-manager";
import { Commit } from "../../types";
import InteractiveRebaseEditorView from "../../commands/views/InteractiveRebaseEditorView";
import { ResetMode } from "simple-git";
import { useCachedState } from "@raycast/utils";
import { existsSync } from "fs";

interface CommitActionProps {
  commit: Commit;
  gitManager: GitManager;
  onRefresh: (error?: Error) => void;
}

/**
 * Action for checking out a commit.
 */
export function CommitCheckoutAction({ commit, gitManager, onRefresh }: CommitActionProps) {
  const handleCheckoutCommit = async () => {
    const targetName = commit.localBranches.length > 0 ? commit.localBranches[0] : commit.shortHash;

    const confirmed = await confirmAlert({
      title: "Checkout commit",
      message: `Are you sure you want to checkout commit '${targetName}'? This will put you in a detached HEAD state.`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.checkoutCommit(targetName);
        clearSearchBar();
      } catch (error) {
        // Git error is already shown by GitManager
      } finally {
        onRefresh();
      }
    }
  };

  return <Action
    title="Checkout Commit"
    onAction={handleCheckoutCommit}
    icon={`arrow-checkout.svg`}
  />;
}

/**
 * Action for cherry-picking a commit.
 */
export function CommitCherryPickAction({ commit, gitManager, onRefresh }: CommitActionProps) {
  const handleCherryPick = async () => {
    const confirmed = await confirmAlert({
      title: "Cherry-pick commit",
      message: `Are you sure you want to cherry-pick commit '${commit.shortHash}'? This will create a new commit that undoes the changes.`,
      primaryAction: {
        title: "Cherry-pick",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.cherryPick(commit.hash);
        onRefresh();
      } catch (error) {
        onRefresh(error as Error);
      }
    }
  };

  return <Action
    title="Cherry-Pick Commit"
    onAction={handleCherryPick}
    icon={`arrow-bounce.svg`}
  />;
}

/**
 * Action for reverting a commit.
 */
export function CommitRevertAction({ commit, gitManager, onRefresh }: CommitActionProps) {
  const handleRevert = async () => {
    const confirmed = await confirmAlert({
      title: "Revert commit",
      message: `Are you sure you want to revert commit '${commit.message}'? This will create a new commit that undoes the changes.`,
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
        onRefresh(error as Error);
      }
    }
  };

  return (
    <Action
      title="Revert Commit"
      onAction={handleRevert}
      icon={Icon.ArrowCounterClockwise}
    />
  );
}

/**
 * Action submenu for resetting to a commit.
 */
export function CommitResetAction({ commit, gitManager, onRefresh }: CommitActionProps) {
  const handleReset = async (mode: ResetMode) => {
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
        onRefresh(error as Error);
      }
    }
  };

  return (
    <ActionPanel.Submenu title="Reset to Here" icon={Icon.ArrowClockwise}>
      <Action
        title="Soft Reset (Keep Changes Staged)"
        onAction={() => handleReset(ResetMode.SOFT)}
      />
      <Action
        title="Mixed Reset (Keep Changes Unstaged)"
        onAction={() => handleReset(ResetMode.MIXED)}
      />
      <Action
        title="Hard Reset (Discard All Changes)"
        onAction={() => handleReset(ResetMode.HARD)}
        style={Action.Style.Destructive}
      />
    </ActionPanel.Submenu>
  );
}

/**
 * Action to open Interactive Rebase Editor starting from selected commit.
 */
export function CommitInteractiveRebaseAction({ commit, gitManager, onRefresh }: CommitActionProps) {
  return (
    <Action.Push
      title="Interactive Rebase from Here"
      icon={`arrow-rebase.svg`}
      target={
        <InteractiveRebaseEditorView
          gitManager={gitManager}
          startFromCommit={commit.hash}
          onFinish={onRefresh}
        />
      }
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

/**
 * Action to save a commit as a patch.
 */
export function CommitCreatePatchAction({ commit, gitManager }: { commit: Commit, gitManager: GitManager }) {
  return (
    <Action.Push
      title="Save as Patch"
      icon={`patch.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      target={
        <CreatePatchForm
          commit={commit}
          gitManager={gitManager}
        />}
    />
  );
}

function CreatePatchForm({ gitManager, commit }: { gitManager: GitManager, commit: Commit }) {
  const { pop } = useNavigation();
  const [directoryPath, setDirectoryPath] = useCachedState<string[]>(`patches-directory`, []);

  const validateDirectoryPath = (directoryPath: string[]) => {
    if (directoryPath.length === 0) {
      return "Required";
    }

    if (!existsSync(directoryPath[0])) {
      return "Not exists";
    }

    return undefined;
  };

  const handleSubmit = async (values: { directoryPath: string[] }) => {
    try {
      const patchPath = await gitManager.createPatchFromCommit(commit.hash, values.directoryPath[0]);
      await Clipboard.copy(patchPath);
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
      navigationTitle="Create Patch"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Patch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directoryPath"
        title="Output Directory"
        value={directoryPath}
        error={validateDirectoryPath(directoryPath)}
        onChange={setDirectoryPath}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}

/**
 * Action for copying commit hash to clipboard.
 */
export function CommitCopyHashAction({ commit }: { commit: Commit }) {
  return (
    <Action.CopyToClipboard
      title="Copy Commit Hash"
      content={commit.hash}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
    />
  );
}

export function CommitCopyMessageAction({ commit }: { commit: Commit }) {
  return <Action.CopyToClipboard
    title="Copy Commit Message"
    content={commit.message}
  />;
}

/**
 * Action for copying short commit hash to clipboard.
 */
export function CommitCopyShortHashAction({ commit }: { commit: Commit }) {
  return <Action.CopyToClipboard
    title="Copy Short Hash"
    content={commit.shortHash}
  />;
}

/**
 * Action for copying commit author to clipboard.
 */
export function CommitCopyAuthorAction({ commit }: { commit: Commit }) {
  return <Action.CopyToClipboard
    title="Copy Author Name"
    content={commit.author}
  />;
}

/**
 * Action for copying commit author email to clipboard.
 */
export function CommitCopyAuthorEmailAction({ commit }: { commit: Commit }) {
  return <Action.CopyToClipboard
    title="Copy Author Email"
    content={commit.authorEmail}
  />;
}
