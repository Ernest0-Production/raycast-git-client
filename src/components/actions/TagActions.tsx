import { Action, Icon, confirmAlert, Alert, ActionPanel, useNavigation, showToast, Toast, Form, List, Keyboard } from "@raycast/api";
import { Commit } from "../../types";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";
import { NavigationContext, RepositoryContext } from "../../open-repository";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { CommitDetailsView } from "../../commands/views/CommitDetailsView";

/**
 * Action for creating a tag on a commit.
 */
export function TagCreateAction(context: RepositoryContext & { commit: Commit }) {
  return (
    <Action.Push
      title="Create Tag"
      target={<TagCreateForm {...context} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
    />
  );
}

/**
 * Action for removing a tag from a commit.
 */
export function TagRemoveAction(context: RepositoryContext & { tagName: string }) {
  const handleRemoveTag = async (remote?: string) => {
    const confirmed = await confirmAlert({
      title: "Delete tag?",
      message: `Are you sure you want to delete tag "${context.tagName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      if (remote) {
        await context.gitManager.pushTag(context.tagName, remote, true);
      }

      if (Object.keys(context.remotes.data).length === 1) {
        const confirmed = await confirmAlert({
          title: "Delete remote tag",
          message: `Are you sure you want to delete remote tag "${context.tagName}"?`,
          primaryAction: {
            title: "Delete",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          await context.gitManager.pushTag(context.tagName, Object.keys(context.remotes.data)[0], true);
          context.commits.revalidate();
        }
      }

      await context.gitManager.deleteTag(context.tagName);
      context.commits.revalidate();
      context.tags.revalidate();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  if (!context.remotes.data || Object.keys(context.remotes.data).length <= 1) {
    return (
      <Action
        title={`Remove Tag '${context.tagName}'`}
        onAction={() => handleRemoveTag(undefined)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title={`Remove Tag '${context.tagName} from'`}
      icon={Icon.Trash}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
    >
      <Action
        title={`Local Only`}
        onAction={() => handleRemoveTag(undefined)}
        icon={Icon.Dot}
      />
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:remove-tag`}
          title={`Local and ${remote}`}
          onAction={() => handleRemoveTag(remote)}
          style={Action.Style.Destructive}
          icon={RemoteHostIcon(context.remotes.data[remote].provider)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for copying tag name to clipboard.
 */
export function TagCopyNameAction({ tagName, shortcut }: { tagName: string, shortcut?: Keyboard.Shortcut }) {
  return <Action.CopyToClipboard
    title={`Copy Tag Name '${tagName}'`}
    content={tagName} icon={Icon.Clipboard}
    shortcut={shortcut}
  />;
}

export function TagCopyCommitHashAction({ commitHash, shortcut }: { commitHash: string, shortcut?: Keyboard.Shortcut }) {
  return <Action.CopyToClipboard
    title={`Copy Commit Hash '${commitHash}'`}
    content={commitHash} icon={Icon.Clipboard}
    shortcut={shortcut}
  />;
}

/**
 * Action for checking out a tag (detached HEAD).
 */
export function TagCheckoutAction(context: RepositoryContext & NavigationContext & { tagName: string }) {
  const handleCheckout = async () => {
    const confirmed = await confirmAlert({
      title: "Checkout Tag",
      message: `Are you sure you want to checkout tag "${context.tagName}"? This will put HEAD into detached state.`,
      primaryAction: {
        title: "Checkout",
        style: Alert.ActionStyle.Default,
      },
    });
    if (!confirmed) return;

    try {
      await context.gitManager.checkoutTag(context.tagName);
      context.status.revalidate();
      context.branches.revalidate();
      context.commits.revalidate();
      context.navigateTo("status");
    } catch (error) {
      // handled by GitManager
    }
  };

  return (
    <Action
      title="Checkout Tag"
      onAction={handleCheckout}
      icon={`arrow-checkout.svg`}
    />
  );
}

/**
 * Action for pushing a tag to remote.
 */
export function TagPushAction(context: RepositoryContext & { tagName: string }) {
  const handlePush = async (remote: string) => {
    try {
      await context.gitManager.pushTag(context.tagName, remote);
      context.tags.revalidate();
    } catch (error) {
      // handled by GitManager
    }
  };

  if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
    return null;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Push Tag"
        icon={`git-push.svg`}
        onAction={() => handlePush(Object.keys(context.remotes.data)[0])}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Push Tag to"
      icon={`git-push.svg`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
    >
      {Object.keys(context.remotes.data).map((remote) => (
        <Action
          key={`${remote}:push-tag`}
          title={remote}
          icon={RemoteHostIcon(context.remotes.data[remote].provider)}
          onAction={() => handlePush(remote)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for renaming a tag.
 */
export function TagRenameAction(context: RepositoryContext & { tagName: string }) {
  return (
    <Action.Push
      title="Rename Tag"
      icon={Icon.Pencil}
      target={<TagRenameForm {...context} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
}

function TagRenameForm(context: RepositoryContext & { tagName: string }) {
  const { pop } = useNavigation();
  const [newName, setNewName] = useState(context.tagName);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (values: { newName: string }) => {
    setIsLoading(true);
    try {
      await context.gitManager.renameTag(context.tagName, values.newName);
      context.commits.revalidate();
      context.tags.revalidate();
      pop();
    } catch (error) {
      // handled by GitManager
    }
    setIsLoading(false);
  };

  return (
    <Form
      navigationTitle={`Rename Tag '${context.tagName}'`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New Name"
        value={newName}
        onChange={setNewName}
        placeholder="x.y.z"
        error={newName.trim().length === 0 ? "Required" : undefined}
      />
    </Form>
  );
}

/**
 * Action to open commit details for the tag's commit
 */
export function TagOpenCommitAction(context: RepositoryContext & NavigationContext & { commitHash: string }) {
  const { data: commit } = usePromise(async (hash: string) => {
    return await context.gitManager.getCommitByHash(hash);
  }, [context.commitHash]);

  if (!commit) {
    return undefined;
  }

  return (
    <Action.Push
      title="Show Commit"
      icon={Icon.Document}
      target={
        <CommitDetailsView
          {...context}
          index={0}
          onMoveToCommit={() => { }}
          commits={{
            ...context.commits,
            data: [commit]
          }}
        />
      }
    />
  );
}

function TagCreateForm(context: RepositoryContext & { commit: Commit }) {
  const { pop } = useNavigation();
  const [tagName, setTagName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (remote?: string) => {
    setIsLoading(true);
    try {
      // Create the tag
      await context.gitManager.createTag(tagName.trim(), context.commit.hash, message.trim() || undefined);

      // Show confirmation alert for pushing tags
      const shouldPushTags = await confirmAlert({
        title: "Push tags to remote?",
        message: `Tag "${tagName.trim()}" was created successfully. Do you want to push tags to remote repository?`,
        primaryAction: {
          title: "Push",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "Don't Push",
        },
      });

      if (shouldPushTags && remote) {
        await context.gitManager.pushTag(tagName.trim(), remote);
        await showToast({
          style: Toast.Style.Success,
          title: `Tags pushed to ${remote}`,
        });
      }

      // Refresh the commits list
      context.commits.revalidate();
      context.tags.revalidate();
      pop();
    } catch (error) {
      // Git error is already shown by GitManager
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      navigationTitle={`Create Tag on ${context.commit.shortHash}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Create Tag"
            onAction={() => handleSubmit(undefined)}
            icon={Icon.Tag}
          />
          <TagCreateAndPushAction
            {...context}
            handleSubmit={(remote) => handleSubmit(remote)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tagName"
        title="Tag Name"
        placeholder="e.g., v1.0.0"
        value={tagName}
        onChange={setTagName}
        error={tagName.trim() === "" ? "Required" : undefined}
      />
      <Form.TextArea
        id="message"
        title="Tag Message"
        placeholder="Release description..."
        value={message}
        onChange={setMessage}
        info="Optional message for annotated tag"
      />
    </Form>
  );
}

function TagCreateAndPushAction(context: RepositoryContext & {
  commit: Commit
  handleSubmit: (remote: string) => void;
}) {
  if (!context.remotes.data || Object.keys(context.remotes.data).length === 0) {
    return undefined;
  }

  if (Object.keys(context.remotes.data).length === 1) {
    return (
      <Action
        title="Create Tag and Push"
        onAction={() => context.handleSubmit(Object.keys(context.remotes.data)[0])}
        icon={Icon.Tag}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title="Create Tag and Push to"
      icon={Icon.Tag}
    >
      {
        Object.keys(context.remotes.data).map((remote) => (
          <Action
            key={`${remote}:create-tag-and-push`}
            title={remote}
            onAction={() => context.handleSubmit(remote)}
            icon={RemoteHostIcon(context.remotes.data[remote].provider)}
          />
        ))
      }
    </ActionPanel.Submenu >
  );
}
