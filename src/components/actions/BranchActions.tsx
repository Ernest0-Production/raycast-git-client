import { ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast, Form, useNavigation, clearSearchBar, Color } from "@raycast/api";
import { useState } from "react";
import { Branch, MergeMode } from "../../types";
import { usePromise } from "@raycast/utils";
import InteractiveRebaseEditorView from "../../commands/views/InteractiveRebaseEditorView";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";

/**
 * Unified action for checking out a branch (local or remote).
 */
export function BranchCkeckoutAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const handleCheckout = async () => {
    const isRemote = context.branch.type === "remote";

    const confirmed = await confirmAlert({
      title: "Checkout branch",
      message: `Are you sure you want to checkout ${isRemote ? "remote " : ""}branch "${context.branch.name}"?`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        if (isRemote) {
          await context.gitManager.checkoutRemoteBranch(context.branch.name, context.branch.upstream!);
        } else {
          await context.gitManager.checkoutLocalBranch(context.branch.name);
        }
        clearSearchBar();
        context.branches.revalidate();
        context.status.revalidate();
        context.commits.revalidate();
      } catch (error) {
        context.branches.revalidate();
        context.status.revalidate();
        context.commits.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return (
    <Action
      title="Checkout"
      onAction={handleCheckout}
      icon={`arrow-checkout.svg`}
    />
  );
}

/**
 * Action for showing commits for a branch.
 */
export function BranchShowCommitsAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  return (
    <Action
      title="Show Commits"
      onAction={() => {
        if (context.branch.type === "current") {
          context.commits.setFilter({ kind: 'current' });
        } else {
          context.commits.setFilter({ kind: 'branch', value: context.branch });
        }
        context.navigateTo("commits");
      }}
      icon={Icon.List}
    />
  );
}

/**
 * Action for deleting a branch.
 */
export function BranchDeleteAction(context: RepositoryContext & { branch: Branch }) {
  const handleDeleteBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Delete branch?",
      message: `Are you sure you want to delete branch "${context.branch.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        if (context.branch.type === "local") {
          if (context.branch.upstream && !context.branch.isGone) {
            const confirmed = await confirmAlert({
              title: "Delete remote branch",
              message: `Also delete remote branch "${context.branch.upstream}"?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
              dismissAction: {
                title: "Only Local",
              },
            });
            if (confirmed) {
              const summaryConfirm = await confirmAlert({
                title: "Final confirmation of deletion",
                message: `This action will delete local and remote branch. This action cannot be undone.`,
                primaryAction: {
                  title: "Delete Both",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (summaryConfirm) {
                await context.gitManager.deleteUpstreamBranch(context.branch.upstream);
              }
            }
          }
          await context.gitManager.deleteBranch(context.branch.name);
        } else if (context.branch.remote) {
          await context.gitManager.deleteRemoteBranch(context.branch.remote, context.branch.name);
        }

        context.branches.revalidate();
        context.status.revalidate();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Delete Branch"
      onAction={handleDeleteBranch}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    />
  );
}

/**
 * Action for copying current branch name to clipboard.
 */
export function BranchCopyNameAction({ branch }: { branch: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Branch Name"
      content={branch}
      shortcut={{ modifiers: ["cmd"], key: "c" }}
    />
  );
}

/**
 * Action for pushing the current branch.
 */
export function BranchPushAction(context: RepositoryContext & { branch: Branch }) {
  const handlePushToRemote = async (remote: string) => {
    try {
      await context.gitManager.push(false, context.branch, remote);
      context.branches.revalidate();
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Push"
        onAction={() => handlePushToRemote(Object.keys(context.remotes.data)[0])}
        icon={`git-push.svg`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu title="Push to" icon={`git-push.svg`} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}>
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:push`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote].provider)}
          onAction={() => handlePushToRemote(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

export function BranchPushForceAction(context: RepositoryContext & { branch: Branch }) {
  const handleForcePushToRemote = async (remote: string) => {
    const confirmed = await confirmAlert({
      title: "Push Force",
      message: `Are you sure you want to force push the current branch to '${remote}'?`,
      primaryAction: {
        title: "Force Push",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;
    try {
      await context.gitManager.push(true, context.branch, remote);
      context.branches.revalidate();
      context.status.revalidate();
    } catch {
      // Git error is already shown by GitManager
    }
  };

  if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Force Push"
        onAction={() => handleForcePushToRemote(Object.keys(context.remotes.data)[0])}
        icon={{ source: `git-push.svg`, tintColor: Color.Red }}
        shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
        style={Action.Style.Destructive}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Force Push to"
      icon={{ source: `git-push.svg`, tintColor: Color.Red }}
      shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "p" }}
    >
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:force-push`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote].provider)}
          onAction={() => handleForcePushToRemote(remote)}
          style={Action.Style.Destructive}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for merging a branch into the current branch.
 */
export function BranchMergeAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const handleMergeBranch = async (mode: MergeMode) => {
    const confirmed = await confirmAlert({
      title: "Merge branch",
      message: `Are you sure you want to merge branch "${context.branch.name}" into the current branch?`,
      primaryAction: {
        title: "Merge",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.mergeBranch(context.branch.name, mode);
        context.branches.revalidate();
        context.status.revalidate();
      } catch (error) {
        context.branches.revalidate();
        context.status.revalidate();
        context.navigateTo("status");
      }
    }
  };

  return (
    <ActionPanel.Submenu
      title="Merge into Current"
      icon={`git-merge.svg`}
      shortcut={{ modifiers: ["cmd"], key: "m" }}>
      <Action
        title="Fast Forward (if possible)"
        onAction={() => handleMergeBranch(MergeMode.FAST_FORWARD)}
      />
      <Action
        title="No Fast Forward"
        onAction={() => handleMergeBranch(MergeMode.NO_FF)}
      />
      <Action
        title="Squash"
        onAction={() => handleMergeBranch(MergeMode.SQUASH)}
      />
      <Action
        title="No Commit"
        onAction={() => handleMergeBranch(MergeMode.NO_COMMIT)}
      />
    </ActionPanel.Submenu>
  );
}

/**
 * Action for rebasing the current branch onto another branch.
 */
export function BranchRebaseAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  const handleRebaseBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Rebase branch",
      message: `Are you sure you want to rebase the current branch onto "${context.branch.name}"?`,
      primaryAction: {
        title: "Rebase",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await context.gitManager.rebase(context.branch.name);
        context.branches.revalidate();
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
      onAction={handleRebaseBranch}
      icon={`arrow-rebase.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}

/**
 * Action to open Interactive Rebase Editor starting from selected branch.
 */
export function BranchInteractiveRebaseAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  return (
    <Action.Push
      title="Interactive Rebase from Here"
      icon={`arrow-rebase.svg`}
      target={
        <InteractiveRebaseEditorView
          {...context}
          startFromCommit={context.branch.name}
        />
      }
      shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "e" }}
    />
  );
}

/**
 * Additional actions for creating a new branch.
 */
export function BranchCreateAction(context: RepositoryContext) {
  return (
    <Action.Push
      title="Create Branch"
      target={<BranchCreateForm {...context} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

/**
 * Action for renaming a branch.
 */
export function BranchRenameAction(context: RepositoryContext & NavigationContext & { branch: Branch }) {
  return (
    <Action.Push
      title="Rename"
      target={<BranchRenameForm {...context} />}
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

function BranchCreateForm(context: RepositoryContext) {
  const { pop } = useNavigation();
  const [branchName, setBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: currentBranch } = usePromise(async () => await context.branches.data.currentBranch, []);

  const handleSubmit = async (values: { branchName: string }) => {
    setIsLoading(true);
    try {
      await context.gitManager.createBranch(values.branchName);
      context.branches.revalidate();
      context.status.revalidate();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle="Create Branch"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Branch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="branchName"
        title="Branch Name"
        placeholder="Enter branch name"
        error={branchName.trim().length === 0 ? "Required" : undefined}
        value={branchName}
        onChange={(value) => setBranchName(value.replace(/ /g, "-"))}
      />
      {currentBranch && <Form.Description text={`From branch '${currentBranch}'`} />}
    </Form>
  );
}

function BranchRenameForm(context: RepositoryContext & { branch: Branch }) {
  const { pop } = useNavigation();
  const [newBranchName, setNewBranchName] = useState(context.branch.name);
  const [renameRemote, setRenameRemote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: { newBranchName: string; renameRemote?: boolean }) => {
    setIsLoading(true);

    try {
      await context.gitManager.renameBranch(values.newBranchName, context.branch.name, renameRemote ? context.branch.upstream : undefined);

      await showToast({
        style: Toast.Style.Success,
        title: "Branch renamed successfully"
      });

      context.branches.revalidate();
      context.status.revalidate();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle="Rename Branch"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Branch" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newBranchName"
        title="Branch Name"
        placeholder="New branch name"
        error={newBranchName.trim().length === 0 ? "Required" : undefined}
        value={newBranchName}
        onChange={(value) => setNewBranchName(value.replace(/ /g, "-"))}
      />

      {context.branch.upstream && (
        <Form.Checkbox
          id="renameRemote"
          label={`Rename remote branch '${context.branch.upstream}'`}
          value={renameRemote}
          onChange={setRenameRemote}
          info="This will delete the old remote branch and push the new one"
        />
      )}
    </Form>
  );
}

