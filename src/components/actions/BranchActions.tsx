import { ActionPanel, Action, Icon, confirmAlert, Alert, showToast, Toast, Form } from "@raycast/api";
import { useState } from "react";
import { GitManager } from "../../utils/git-utils";
import { Branch } from "../../types";

interface BranchActionsProps {
  branch: Branch;
  gitManager: GitManager;
  onRefresh: () => void;
}

/**
 * Reusable actions for working with branches.
 */
export function BranchActions({ branch, gitManager, onRefresh }: BranchActionsProps) {
  const handleCheckout = async () => {
    try {
      await gitManager.checkout(branch.name);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handleDeleteBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Delete branch",
      message: `Are you sure you want to delete branch "${branch.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await gitManager.deleteBranch(branch.name);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  const handlePush = async () => {
    try {
      await gitManager.push();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handlePull = async () => {
    try {
      await gitManager.pull();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  const handleFetch = async () => {
    try {
      await gitManager.fetch();
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

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

  const handleDeleteRemoteBranch = async () => {
    const confirmed = await confirmAlert({
      title: "Delete remote branch",
      message: `Are you sure you want to delete remote branch "${branch.name}"? This action cannot be undone.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        if (!branch.remote) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to delete remote branch",
            message: "Remote not found for this branch",
          });
          return;
        }
        await gitManager.deleteRemoteBranch(branch.remote, branch.name);
        onRefresh();
      } catch (error) {
        // Git error is already shown by GitManager
      }
    }
  };

  // Actions for the current branch
  if (branch.type === "current") {
    return (
      <>
        <Action
          title="Pull"
          onAction={handlePull}
          icon={Icon.ArrowDown}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
        />
        <Action
          title="Push"
          onAction={handlePush}
          icon={Icon.ArrowUp}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        />
        <Action
          title="Fetch"
          onAction={handleFetch}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      </>
    );
  }

  // Actions for local branches
  if (branch.type === "local") {
    return (
      <>
        <Action title="Checkout Branch" onAction={handleCheckout} icon={Icon.ArrowRight} />
        <Action
          title="Merge into Current"
          onAction={handleMergeBranch}
          icon={Icon.ArrowNe}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
        <Action
          title="Rebase Current onto This"
          onAction={handleRebaseBranch}
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
        <Action title="Push Branch" onAction={handlePush} icon={Icon.ArrowUp} />
        <Action
          title="Delete Branch"
          onAction={handleDeleteBranch}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
        />
      </>
    );
  }

  // Actions for remote branches
  if (branch.type === "remote") {
    return (
      <>
        <Action
          title="Checkout as New Local Branch"
          onAction={() => handleCheckoutRemote(branch, gitManager, onRefresh)}
          icon={Icon.ArrowRight}
        />
        <Action title="Fetch" onAction={handleFetch} icon={Icon.ArrowClockwise} />
        <Action
          title="Delete Remote Branch"
          onAction={handleDeleteRemoteBranch}
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      </>
    );
  }

  return null;
}

/**
 * Create a local branch from a remote branch.
 */
async function handleCheckoutRemote(branch: Branch, gitManager: GitManager, onRefresh: () => void) {
  try {
    // Create a local branch with the same name that tracks the remote branch
    await gitManager.createBranch(branch.name);
    onRefresh();
  } catch (error) {
    // Git error is already shown by GitManager
  }
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
 * Additional actions for creating a new branch.
 */
export function CreateBranchAction({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  return (
    <Action.Push
      title="Create Branch"
      target={<CreateBranchForm gitManager={gitManager} onRefresh={onRefresh} />}
      icon={Icon.Plus}
    />
  );
}

function CreateBranchForm({ gitManager, onRefresh }: { gitManager: GitManager; onRefresh: () => void }) {
  const [branchName, setBranchName] = useState("");

  const handleSubmit = async (values: { branchName: string }) => {
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
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  return (
    <Form
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
    </Form>
  );
}
