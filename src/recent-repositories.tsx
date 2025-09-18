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
                    title="Show Repository"
                    target={<OpenRepository arguments={{ path: repo.path }} />}
                    icon={Icon.Book}
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

  // Compute validation errors for multiple repositories
  const validateMultipleRepositories = (paths: string[]): string | undefined => {
    if (paths.length === 0) {
      return "Required";
    }

    const invalidRepos: string[] = [];
    paths.forEach((path) => {
      const validation = validateGitRepository(path);
      if (!validation.isValid) {
        const repoName = path.split("/").pop() || path;
        invalidRepos.push(repoName);
      }
    });

    return invalidRepos.length > 0 ? `Invalid repositories: ${invalidRepos.join(", ")}` : undefined;
  };

  const handleSubmit = async (values: { repositoryPath: string[] }) => {
    for (const repoPath of values.repositoryPath) {
      const repoName = repoPath.split("/").pop() || repoPath;

      addToRecent(repoPath);

      await showToast({
        style: Toast.Style.Animated,
        title: `${repoName} added to recent list`
      });
    }

    await showToast({
      style: Toast.Style.Success,
      title: repositoryPaths.length > 1 ? "All repositories added" : "Repository added"
    });
    pop();
  };

  return (
    <Form
      navigationTitle="Add Git Repository"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={repositoryPaths.length > 1 ? "Add Repositories" : "Add Repository"}
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="repositoryPath"
        title="Select Git Repository"
        value={repositoryPaths}
        error={validateMultipleRepositories(repositoryPaths)}
        onChange={setRepositoryPaths}
        allowMultipleSelection={true}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
