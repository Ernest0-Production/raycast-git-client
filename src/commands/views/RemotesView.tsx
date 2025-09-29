import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, showToast, Toast, Form, useNavigation } from "@raycast/api";
import { GitManager } from "../../utils/git-manager";
import { Remote } from "../../types";
import { useMemo, useState } from "react";
import { RemoteHostIcon } from "../../components/icons/RemoteHostIcons";
import { usePromise } from "@raycast/utils";

interface RemotesViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
  remoteHosts: Record<string, Remote>;
  onRevalidateRemotes: () => void;
}

type RemoteConnectivity = {
  reachable: boolean,
  reason?: string
};

export default function RemotesView({
  gitManager,
  navigationActions,
  viewDropdown,
  remoteHosts,
  onRevalidateRemotes
}: RemotesViewProps) {
  const { data: connectivity, isLoading: isChecking, revalidate: revalidateConnectivity } = usePromise(
    async (repoPath: string, remoteHosts: string[]) => {
      const entries = await Promise.all(
        remoteHosts.map(async (name) => {
          try {
            await gitManager.checkRemoteConnectivity(name);
            return [name, { reachable: true }] as const;
          } catch (error) {
            return [name, { reachable: false, reason: error instanceof Error ? error.message : "Unknown error" }] as const;
          }
        })
      );

      return Object.fromEntries(entries) as Record<string, RemoteConnectivity>;
    },
    [gitManager.repoPath, Object.keys(remoteHosts).map(name => name)]
  );

  const items: Remote[] = useMemo(() => Object.values(remoteHosts), [remoteHosts]);

  return (
    <List
      isLoading={isChecking}
      navigationTitle="Repository Remotes"
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Add Remote"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <RemoteEditorForm
                  gitManager={gitManager}
                  onCreated={onRevalidateRemotes}
                />
              }
            />
            <Action
              title="Check Again"
              onAction={revalidateConnectivity}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
          {navigationActions}
        </ActionPanel>
      }
    >
      {items.length === 0 ? (
        <List.EmptyView
          title="No remotes"
          description="This repository has no remote configured."
          icon={Icon.Network}
        />
      ) : (
        items.map((remote: Remote) => (
          <RemoteListItem
            key={remote.name}
            remote={remote}
            connectivity={connectivity?.[remote.name]}
            isLoading={isChecking}
            gitManager={gitManager}
            onRevalidate={onRevalidateRemotes}
            onCheckAgain={revalidateConnectivity}
            navigationActions={navigationActions}
          />
        ))
      )}
    </List>
  );
}

function RemoteListItem({
  remote,
  connectivity,
  isLoading,
  gitManager,
  onRevalidate,
  onCheckAgain,
  navigationActions
}: {
  remote: Remote;
  connectivity?: RemoteConnectivity;
  isLoading: boolean;
  gitManager: GitManager;
  onRevalidate: () => void;
  onCheckAgain: () => void;
  navigationActions: React.ReactNode
}) {
  const accessories: List.Item.Accessory[] = useMemo(() => {
    const result = [];
    if (isLoading) {
      result.push({
        text: { value: "Checking Connectivity...", color: Color.SecondaryText },
      });
    } else if (connectivity) {
      result.push({
        text: { value: connectivity.reachable ? "Online" : "Offline", color: connectivity.reachable ? Color.Green : Color.Red },
        tooltip: connectivity.reachable ? "Connection established via ls-remote" : connectivity.reason,
      });
    }

    return result;
  }, [connectivity, isLoading]);

  const handleRemoveRemote = async () => {
    const confirmed = await confirmAlert({
      title: "Remove Remote",
      message: `Are you sure you want to remove remote '${remote.name}'?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive
      },
    });

    if (!confirmed) return;

    try {
      await gitManager.removeRemote(remote.name);
      await showToast({ style: Toast.Style.Success, title: `Remote '${remote.name}' removed` });
      await onRevalidate();
    } catch {
      // error toast shown by manager
    }
  }

  return (
    <List.Item
      key={remote.name}
      title={remote.name}
      subtitle={`${remote.fetchUrl}`}
      icon={RemoteHostIcon(remote.provider)}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={remote.name}>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={remote.fetchUrl}
              icon={Icon.Link}
            />
            <Action.Push
              title="Edit Remote"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                <RemoteEditorForm
                  gitManager={gitManager}
                  onCreated={onRevalidate}
                  initialRemote={remote}
                />
              }
            />
            <Action.CopyToClipboard
              title="Copy Fetch URL"
              content={remote.fetchUrl || remote.pushUrl}
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              title="Copy Push URL"
              content={remote.pushUrl}
              icon={Icon.Clipboard}
            />
            <Action
              title="Remove Remote"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleRemoveRemote}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
          <Action.Push
            title="Add New Remote"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            target={
              <RemoteEditorForm
                gitManager={gitManager}
                onCreated={onRevalidate} />
            }
          />
          <Action
            title="Check Again"
            onAction={onCheckAgain}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          {navigationActions}
        </ActionPanel>
      }
    />
  );
}

function RemoteEditorForm({
  initialRemote,
  gitManager,
  onCreated
}: {
  initialRemote?: Remote;
  gitManager: GitManager;
  onCreated: () => void | Promise<unknown>;
}) {
  const { pop } = useNavigation();
  const [name, setName] = useState(initialRemote?.name ?? "");
  const [fetchUrl, setFetchUrl] = useState(initialRemote?.fetchUrl ?? "");
  const [pushUrl, setPushUrl] = useState(initialRemote?.pushUrl ?? "");

  const validateGitUrl = (url: string): string | undefined => {
    if (!url.trim()) return undefined;

    // Check SSH format (git@github.com:username/repo.git)
    const sshPattern = /^(?:ssh:\/\/)?(?:[^@]+@)?[^:]+:[^\/]+\/.*\.git$/;

    // Check HTTP/HTTPS format (https://github.com/username/repo.git)
    const httpPattern = /^https?:\/\/(?:.*@)?[^\/]+\/.*(?:\.git)?$/;

    if (sshPattern.test(url) || httpPattern.test(url)) {
      return undefined;
    }

    return "Incorrect SSH or HTTP format";
  };

  const handleSubmit = async (values: { name: string; fetchUrl: string; pushUrl: string }) => {
    try {
      if (initialRemote) {
        await gitManager.updateRemote(name.trim(), fetchUrl.trim(), pushUrl.trim());
      } else {
        await gitManager.addRemote(name.trim(), fetchUrl.trim(), pushUrl.trim());
      }
      await onCreated();
      pop();
    } catch (_error) {
      // Errors are handled globally in GitManager
    } finally {
    }
  };

  return (
    <Form
      navigationTitle={initialRemote ? "Edit Remote" : "Add Remote"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={initialRemote ? "Save Changes" : "Create Remote"}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="origin"
        value={name}
        onChange={setName}
        error={name.trim().length === 0 ? "Required" : undefined}
      />
      <Form.TextField
        id="fetchUrl"
        title="Fetch URL"
        placeholder="git@github.com:org/repo.git or https://github.com/org/repo.git"
        value={fetchUrl}
        onChange={setFetchUrl}
        error={fetchUrl.trim().length === 0 ? "Required" : validateGitUrl(fetchUrl)}
      />

      <Form.TextField
        id="pushUrl"
        title="Push URL"
        placeholder="git@github.com:org/repo.git or https://github.com/org/repo.git"
        value={pushUrl}
        error={pushUrl.trim().length === 0 ? undefined : validateGitUrl(pushUrl)}
        info={"Optional"}

        onChange={setPushUrl}
      />
    </Form>
  );
}

