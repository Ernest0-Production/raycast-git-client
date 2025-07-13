import { ActionPanel, Action, Icon, List, confirmAlert, Alert, showToast, Toast, LaunchType } from "@raycast/api";
import { useRecentRepositories } from "./hooks/useRecentRepositories";
import { RepositoryDirectoryActions } from "./components/actions/RepositoryDirectoryActions";
import OpenRepository from "./open-repository";

export default function RecentRepositories() {
  const { repositories, clearRecentRepositories } = useRecentRepositories();

  const handleClearRepositories = async () => {
    const confirmed = await confirmAlert({
      title: "Clear list",
      message: "Are you sure you want to clear the recent repositories list?",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await clearRecentRepositories();
        await showToast({
          style: Toast.Style.Success,
          title: "List cleared",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear list",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  };

  return (
    <List navigationTitle="Recent Git Repositories">
      {repositories.length === 0 ? (
        <List.EmptyView
          title="No recent repositories"
          description="Open a Git repository via the 'Open Git Repository' command"
          icon={Icon.Folder}
        />
      ) : (
        repositories.map((repo) => (
          <List.Item
            key={repo.id}
            icon={Icon.Folder}
            title={repo.name}
            accessories={[{ text: repo.path }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Repository Actions">
                  <Action.Push
                    title="Open Repository"
                    target={<OpenRepository arguments={{ path: repo.path }} />}
                    icon={Icon.ArrowRight}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="File System">
                  <RepositoryDirectoryActions repositoryPath={repo.path} />
                </ActionPanel.Section>

                <ActionPanel.Section title="Raycast">
                  <Action.CreateQuicklink
                    quicklink={{
                      link: `raycast://extensions/ernest0n/git-client/open-repository?arguments=${encodeURIComponent(JSON.stringify({ path: repo.path }))}`,
                      name: `Git: ${repo.name}`,
                    }}
                    title="Create Quicklink"
                  />
                </ActionPanel.Section>

                {repositories.length > 1 && (
                  <ActionPanel.Section>
                    <Action
                      title="Clear List"
                      onAction={handleClearRepositories}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
