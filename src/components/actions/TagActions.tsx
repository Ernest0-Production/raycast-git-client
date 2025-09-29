import { Action, Icon, confirmAlert, Alert, ActionPanel } from "@raycast/api";
import { GitManager } from "../../utils/git-manager";
import { Commit } from "../../types";
import { CreateTagForm } from "../shared/CreateTagForm";
import { RemotesHosts } from "../../hooks/useGitRemotes";
import { RemoteHostIcon } from "../icons/RemoteHostIcons";

interface TagActionProps {
  commit: Commit;
  gitManager: GitManager;
  onRefresh: () => void;
  remotesHosts: RemotesHosts;
}

/**
 * Action for creating a tag on a commit.
 */
export function TagCreateAction({ commit, gitManager, onRefresh, remotesHosts }: TagActionProps) {
  return (
    <Action.Push
      title="Create Tag"
      target={<CreateTagForm commit={commit} gitManager={gitManager} onRefresh={onRefresh} remotesHosts={remotesHosts} />}
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
    />
  );
}

/**
 * Action for removing a tag from a commit.
 */
export function TagRemoveAction({
  tagName,
  gitManager,
  onRefresh,
  remotesHosts,
}: {
  tagName: string;
  gitManager: GitManager;
  onRefresh: () => void;
  remotesHosts: RemotesHosts;
}) {
  const handleRemoveTag = async (remote?: string) => {
    const confirmed = await confirmAlert({
      title: "Push tag deletion to remote?",
      message: `Are you sure you want to push tag deletion to remote?`,
      primaryAction: {
        title: "Push",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      if (remote) {
        await gitManager.pushTag(tagName, remote, true);
      }

      if (Object.keys(remotesHosts).length === 1) {
        const confirmed = await confirmAlert({
          title: "Remove tag",
          message: `Are you sure you want to remove tag "${tagName}"?`,
          primaryAction: {
            title: "Remove",
            style: Alert.ActionStyle.Destructive,
          },
        });

        if (confirmed) {
          await gitManager.pushTag(tagName, Object.keys(remotesHosts)[0], true);
          onRefresh();
        }
      }

      await gitManager.deleteTag(tagName);
      onRefresh();
    } catch (error) {
      // Git error is already shown by GitManager
    }
  };

  if (!remotesHosts || Object.keys(remotesHosts).length <= 1) {
    return (
      <Action
        title={`Remove Tag '${tagName}'`}
        onAction={() => handleRemoveTag(undefined)}
        icon={Icon.Trash}
        style={Action.Style.Destructive}
      />
    );
  }

  return (
    <ActionPanel.Submenu
      title={`Remove Tag '${tagName} from'`}
      icon={Icon.Trash}
    >
      <Action
        title={`Local Only`}
        onAction={() => handleRemoveTag(undefined)}
        icon={Icon.Dot}
      />
      {Object.keys(remotesHosts).map((remote) => (
        <Action
          key={`${remote}:remove-tag`}
          title={`Local and ${remote}`}
          onAction={() => handleRemoveTag(remote)}
          style={Action.Style.Destructive}
          icon={RemoteHostIcon(remotesHosts[remote].provider)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/**
 * Action for copying tag name to clipboard.
 */
export function TagCopyNameAction({ tagName }: { tagName: string }) {
  return <Action.CopyToClipboard
    title={`Copy Tag Name '${tagName}'`}
    content={tagName} icon={Icon.Clipboard}
  />;
}
