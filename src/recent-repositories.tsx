import { ActionPanel, Action, Icon, List, confirmAlert, Alert, showToast, Toast, LaunchType, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useRecentRepositories } from "./hooks/useRecentRepositories";
import { RepositoryDirectoryActions } from "./components/actions/RepositoryDirectoryActions";
import { validateGitRepository } from "./utils/validation";
import OpenRepository from "./open-repository";

export default function RecentRepositories() {
  const { repositories, addToRecent, removeFromRecent, clearRecentRepositories } = useRecentRepositories();

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

  const handleRemoveRepository = async (repoName: string, repoPath: string) => {
    const confirmed = await confirmAlert({
      title: "Remove from recent?",
      message: `Are you sure you want to remove "${repoName}" from the recent repositories list?`,
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeFromRecent(repoPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Repository removed",
        message: `"${repoName}" removed from recent list`,
      });
    }
  };


  return (
    <List
      navigationTitle="Recent Git Repositories"
      searchBarPlaceholder="Search by name, path"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Add Repository">
            <Action.Push
              title="Add Repository"
              target={<AddRepositoryForm />}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {repositories.length === 0 ? (
        <List.EmptyView
          title="No recent repositories"
          description="Open a Git repository via the 'Open Git Repository' command or add one using the 'Add Repository' action"
          icon={Icon.Folder}
        />
      ) : (
        repositories.map((repo) => (
          <List.Item
            key={repo.id}
            icon={Icon.Folder}
            title={repo.name}
            subtitle={repo.path}
            keywords={[repo.path]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Repository Actions">
                  <Action.Push
                    title="Open Repository"
                    target={<OpenRepository arguments={{ path: repo.path }} />}
                    icon={Icon.ArrowRight}
                    onPush={() => addToRecent(repo.path)}
                  />
                  <Action.Push
                    title="Add Repository"
                    target={<AddRepositoryForm />}
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                  />
                </ActionPanel.Section>

                <RepositoryDirectoryActions repositoryPath={repo.path} onOpen={() => addToRecent(repo.path)} />

                <ActionPanel.Section title="Raycast">
                  <Action.CreateQuicklink
                    quicklink={{
                      link: `raycast://extensions/ernest0n/git-client/open-repository?arguments=${encodeURIComponent(JSON.stringify({ path: repo.path }))}`,
                      name: `Show ${repo.name} repository`,
                    }}
                    title="Create Quicklink"
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Remove from Recent"
                    onAction={() => handleRemoveRepository(repo.name, repo.path)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                  {repositories.length > 1 && (
                    <Action
                      title="Clear List"
                      onAction={handleClearRepositories}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddRepositoryForm() {
  const { addToRecent } = useRecentRepositories();
  const { pop } = useNavigation();
  const [repositoryPaths, setRepositoryPaths] = useState<string[]>([]);

  // Compute derived values
  const folderPath = repositoryPaths.length > 0 ? repositoryPaths[0] : "";

  const handleSubmit = async (values: { repositoryPath: string[] }) => {
    try {
      const folderPath = values.repositoryPath[0];
      addToRecent(folderPath);
      const repoName = folderPath.split("/").pop() || folderPath;

      await showToast({
        style: Toast.Style.Success,
        title: "Repository added",
        message: `"${repoName}" added to recent repositories`,
      });

      // Return to the parent view
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add repository",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      navigationTitle="Add Git Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Repository"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="repositoryPath"
        title="Select Git Repository"
        value={repositoryPaths}
        error={folderPath.length === 0 ? "Required" : validateGitRepository(folderPath).error}
        onChange={setRepositoryPaths}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
