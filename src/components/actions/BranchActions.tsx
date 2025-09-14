import { ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { GitManager } from "../../utils/git-utils";
import { Branch } from "../../types";
import { usePromise } from "@raycast/utils";

interface BranchActionProps {
  branch: Branch;
  gitManager: GitManager;
  onRefresh: () => void;
}

/**
 * Action for checking out a branch.
 */
export function BranchCheckoutAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  const handleCheckout = async () => {
    const confirmed = await confirmAlert({
      title: "Checkout branch",
      message: `Are you sure you want to checkout branch "${branch.name}"?`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.checkoutLocalBranch(branch.name);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return <Action title="Checkout" onAction={handleCheckout} icon={Icon.ArrowRight} />;
}

/**
 * Action for deleting a branch.
 */
export function BranchDeleteAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  const handleDeleteBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Delete",
      message: `Are you sure you want to delete branch "${branch.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        if (branch.type === "local") {
          await gitManager.deleteBranch(branch.name);

          if (branch.upstream) {
            const confirmed = await confirmAlert({
              title: "Delete remote branch",
              message: `Also delete remote branch "${branch.upstream}"?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (confirmed) {
              await gitManager.deleteRemoteBranch(branch.upstream.split("/")[0], branch.upstream.split("/")[1]);
            }
          }
        } else if (branch.remote) {
          await gitManager.deleteRemoteBranch(branch.remote, branch.name);
        }

        onRefresh();
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
export function BranchPushAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  const handlePush = async () => {
    try {

      // Upstream exists, do regular push
      try {
        await gitManager.push(false, branch);
        onRefresh();
      } catch (pushError) {
        // Push failed, offer force push for branches with upstream
        const errorMessage = pushError instanceof Error ? pushError.message : "Unknown error";

        const forceConfirmed = await confirmAlert({
          title: "Push rejected",
          message: `Reason: ${errorMessage}`,
          primaryAction: {
            title: "Force Push",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (forceConfirmed) {
          // Execute force push
          await gitManager.push(true, branch);
          onRefresh();
        }
      }
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Push"
      onAction={handlePush}
      icon={Icon.ArrowUp}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    />
  );
}

/**
 * Action for merging a branch into the current branch.
 */
export function BranchMergeAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  const handleMergeBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Merge branch",
      message: `Are you sure you want to merge branch "${branch.name}" into the current branch?`,
      primaryAction: {
        title: "Merge",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.mergeBranch(branch.name);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Merge into Current"
      onAction={handleMergeBranch}
      icon={Icon.ArrowNe}
      shortcut={{ modifiers: ["cmd"], key: "m" }}
    />
  );
}

/**
 * Action for rebasing the current branch onto another branch.
 */
export function BranchRebaseAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  const handleRebaseBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Rebase branch",
      message: `Are you sure you want to rebase the current branch onto "${branch.name}"?`,
      primaryAction: {
        title: "Rebase",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.rebase(branch.name);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return (
    <Action
      title="Rebase Current onto This"
      onAction={handleRebaseBranch}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}

/**
 * Action for checking out a remote branch (creates local branch).
 */
export function BranchCheckoutRemoteAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  const handleCheckoutRemote = async () => {
    const confirmed = await confirmAlert({
      title: "Checkout remote branch",
      message: `Are you sure you want to checkout remote branch "${branch.name}"?`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });

    if (confirmed) {
      try {
        await gitManager.checkoutRemoteBranch(branch.name);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  return <Action title="Checkout Remote Branch" onAction={handleCheckoutRemote} icon={Icon.ArrowRight} />;
}

/**
 * Global fetch action that can be reused across different views.
 */
export function FetchAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const handleFetch = async () => {
    try {
      await gitManager.fetch();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Fetch"
      onAction={handleFetch}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}

/**
 * Global pull action that can be reused across different views.
 */
export function PullAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const handlePull = async () => {
    try {
      await gitManager.pull();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Action
      title="Pull"
      onAction={handlePull}
      icon={Icon.ArrowDown}
      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
    />
  );
}

/**
 * Additional actions for creating a new branch.
 */
export function CreateBranchAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  return (
    <Action.Push
      title="Create Branch"
      target={<CreateBranchForm gitManager={gitManager} onRefresh={onRefresh} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
    />
  );
}

/**
 * Action for renaming a branch.
 */
export function BranchRenameAction({ branch, gitManager, onRefresh }: BranchActionProps) {
  return (
    <Action.Push
      title="Rename"
      target={<RenameBranchForm branch={branch} gitManager={gitManager} onRefresh={onRefresh} />}
      icon={Icon.Pencil}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

function CreateBranchForm({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [branchName, setBranchName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: currentBranch } = usePromise(async () => await gitManager.getCurrentBranch(), []);

  const handleSubmit = async (values: { branchName: string }) => {
    setIsLoading(true);
    if (!values.branchName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Branch name is required",
      });
      return;
    }

    try {
      await gitManager.createBranch(values.branchName);
      onRefresh();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
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
        value={branchName}
        onChange={setBranchName}
      />
      {currentBranch && <Form.Description text={`From branch '${currentBranch}'`} />}
    </Form>
  );
}

function RenameBranchForm({ branch, gitManager, onRefresh }: { branch: Branch; gitManager: GitManager; onRefresh: () => void }) {
  const { pop } = useNavigation();
  const [newBranchName, setNewBranchName] = useState(branch.name);
  const [renameRemote, setRenameRemote] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced validation
  const getValidationError = (): string | undefined => {
    if (newBranchName.length === 0) {
      return "Required";
    }
    // Git branch name validation
    if (newBranchName.includes("..") || newBranchName.includes(" ") || newBranchName.startsWith("-")) {
      return "Invalid characters";
    }
    return undefined;
  };

  const handleSubmit = async (values: { newBranchName: string; renameRemote?: boolean }) => {
    setIsLoading(true);

    try {
      await gitManager.renameBranch(values.newBranchName, branch.name, renameRemote ? branch.upstream : undefined);

      await showToast({
        style: Toast.Style.Success,
        title: "Branch renamed successfully"
      });

      onRefresh();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
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
        value={newBranchName}
        onChange={setNewBranchName}
        error={getValidationError()}
      />

      {branch.upstream && (
        <Form.Checkbox
          id="renameRemote"
          label={`Rename remote branch '${branch.upstream}'`}
          value={renameRemote}
          onChange={setRenameRemote}
          info="This will delete the old remote branch and push the new one"
        />
      )}
    </Form>
  );
}

