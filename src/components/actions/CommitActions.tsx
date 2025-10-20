import { ActionPanel, Action, Icon, confirmAlert, Alert, clearSearchBar, useNavigation, Clipboard, Form, Color } from "@raycast/api";
import { Commit } from "../../types";
import InteractiveRebaseEditorView from "../views/InteractiveRebaseEditorView";
import { ResetMode } from "simple-git";
import { useCachedState } from "@raycast/utils";
import { existsSync } from "fs";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { CommitMessageForm } from "../views/CommitMessageView";

/**
 * Action for checking out a commit.
 */
export function CommitCheckoutAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleCheckoutCommit = async () => {
    const targetName = context.commit.localBranches.length > 0 ? context.commit.localBranches[0] : context.commit.shortHash;

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
        await context.gitManager.checkoutCommit(targetName);
        clearSearchBar();
      } catch (error) {
        // Git error is already shown by GitManager
      } finally {
        context.branches.revalidate();
        context.status.revalidate();
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
 * Action for rewording a commit message.
 */
export function CommitRewordAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Reword Message"
      icon={{ source: Icon.Message, tintColor: Color.Yellow }}
      target={<CommitMessageForm {...context} />}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );
}

/**
 * Action for cherry-picking a commit.
 */
export function CommitCherryPickAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleCherryPick = async () => {
    const confirmed = await confirmAlert({
      title: "Cherry-pick commit",
      message: `Are you sure you want to cherry-pick commit '${context.commit.shortHash}'? This will create a new commit that undoes the changes.`,
      primaryAction: {
        title: "Cherry-pick",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.cherryPick(context.commit.hash);
        context.commits.revalidate();
        context.status.revalidate();
      } catch (error) {
        context.commits.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
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
export function CommitRevertAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleRevert = async () => {
    const confirmed = await confirmAlert({
      title: "Revert commit",
      message: `Are you sure you want to revert commit '${context.commit.message}'? This will create a new commit that undoes the changes.`,
      primaryAction: {
        title: "Revert",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.revert(context.commit.hash);
        context.commits.revalidate();
        context.status.revalidate();
      } catch (error) {
        context.commits.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return (
    <Action
      title="Revert Commit"
      onAction={handleRevert}
      style={Action.Style.Destructive}
      icon={Icon.ArrowCounterClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
    />
  );
}

/**
 * Action submenu for resetting to a commit.
 */
export function CommitResetAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleReset = async (mode: ResetMode) => {
    const confirmed = await confirmAlert({
      title: "Reset to commit",
      message: `Are you sure you want to reset to commit "${context.commit.shortHash}"? This action cannot be undone.`,
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.reset(context.commit.hash, mode);
        context.commits.revalidate();
        context.status.revalidate();
      } catch (error) {
        context.commits.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
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
 * Action for rebasing the current commit onto another commit.
 */
export function CommitRebaseAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  const handleRebaseCommit = async () => {
    const targetName = context.commit.localBranches.length > 0 ? context.commit.localBranches[0] : context.commit.shortHash;

    const confirmed = await confirmAlert({
      title: "Rebase commit",
      message: `Are you sure you want to rebase the current commit onto "${targetName}"?`,
      primaryAction: {
        title: "Rebase",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.rebase(targetName);
        context.branches.revalidate();
        context.commits.revalidate();
        context.status.revalidate();
      } catch (error) {
        context.branches.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return (
    <Action
      title="Rebase to Here"
      onAction={handleRebaseCommit}
      icon={`arrow-rebase.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}


/**
 * Action to open Interactive Rebase Editor starting from selected commit.
 */
export function CommitInteractiveRebaseAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Interactive Rebase from Here"
      icon={{ source: `arrow-rebase.svg`, tintColor: Color.Blue }}
      target={
        <InteractiveRebaseEditorView
          startFromCommit={context.commit.hash}
          {...context}
        />
      }
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

/**
 * Action to save a commit as a patch.
 */
export function CommitPatchCreateAction(context: RepositoryContext & NavigationContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Save as Patch"
      icon={`patch.svg`}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      target={PatchCreateForm(context)}
    />
  );
}

function PatchCreateForm(context: RepositoryContext & NavigationContext & { commit: Commit }) {
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
      const patchPath = await context.gitManager.createPatchFromCommit(context.commit.hash, values.directoryPath[0]);
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
 * Action for copying commit info to clipboard.
 */
export function CommitCopyInfoActions({ commit }: { commit: Commit }) {
  return (
    <>
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
        title="Copy Commit Message"
        content={commit.message}
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
