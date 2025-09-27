import { ActionPanel, Action, Icon, List, confirmAlert, Alert, showToast, Toast, Form, useNavigation, Color } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRepositoriesList } from "./hooks/useRepositoriesList";
import { RepositoryDirectoryActions } from "./components/actions/RepositoryDirectoryActions";
import { validateGitRepository } from "./utils/validation";
import OpenRepository from "./open-repository";
import { showFailureToast } from "@raycast/utils";
import { Repository } from "./types";
import { RepositoriesView, useRepositoriesView } from "./hooks/useRepositoriesView";

export default function ManageRepositories() {
  const { repositories, addRepository, visitRepository, removeRepository, clearRepositoriesList } = useRepositoriesList();
  const { currentView, setCurrentView, displayedRepositories, lastVisitedRepository } = useRepositoriesView(repositories);
  const [selectedRepositoryItem, setSelectedRepositoryItem] = useState<string | undefined>(undefined);

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
        await clearRepositoriesList();
        await showToast({
          style: Toast.Style.Success,
          title: "List cleared",
        });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to clear list" });
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
      await removeRepository(repoPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Repository removed",
        message: `"${repoName}" removed from recent list`,
      });
    }
  };

  const repositoryItemId = (repoId: string, groupTitle?: string) => {
    let groupTitleToUse = groupTitle;

    if (!groupTitle) {
      const group = displayedRepositories.find((group) => group.repositories.some((repo) => repo.id === repoId));
      groupTitleToUse = group?.groupTitle;
    }

    return `${groupTitleToUse}-${repoId}`;
  };

  return (
    <List
      searchBarPlaceholder="Search by name, path"
      selectedItemId={selectedRepositoryItem}
      onSelectionChange={(id) => {
        if (!selectedRepositoryItem && id) {
          console.log("initial auto select");
          setSelectedRepositoryItem(repositoryItemId(lastVisitedRepository.id));
        } else {
          setSelectedRepositoryItem(id || undefined);
        }
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Repository"
            target={<AddRepositoryForm onAddRepository={addRepository} />}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {repositories.length === 0 ? (
        <List.EmptyView
          title="No recent repositories"
          description="Open a Git repository via the 'Open Git Repository' command or add one using the 'Add Repository' action"
          icon={`git-project.svg`}
        />
      ) : (
        displayedRepositories.map((group) => (
          <List.Section key={group.groupTitle} title={group.groupTitle}>
            {group.repositories.map((repo) => (
              <RepositoryListItem
                key={repositoryItemId(repo.id, group.groupTitle)}
                id={repositoryItemId(repo.id, group.groupTitle)}
                repo={repo}
                onOpen={() => visitRepository(repo.path)}
                onRemove={() => handleRemoveRepository(repo.name, repo.path)}
                onAddRepository={addRepository}
                repositoriesCount={repositories.length}
                onClearAll={handleClearRepositories}
                selectedView={currentView}
                onViewChange={setCurrentView}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function RepositoryListItem({
  id,
  repo,
  onOpen,
  onRemove,
  onAddRepository,
  repositoriesCount,
  onClearAll,
  selectedView,
  onViewChange,
}: {
  id: string;
  repo: Repository;
  onOpen: () => void;
  onRemove: () => void;
  onAddRepository: (repoPath: string) => void;
  repositoriesCount: number;
  onClearAll: () => Promise<void> | void;
  selectedView: RepositoriesView;
  onViewChange: (view: RepositoriesView) => void;
}) {
  const accessories = useMemo(() => {
    if (repo.languageStats && repo.languageStats.length > 0) {
      return repo.languageStats.map((lang) => ({ tag: { value: lang.name, color: lang.color } }));
    }
    return undefined;
  }, [repo.languageStats]);

  return (
    <List.Item
      id={id}
      key={repo.id}
      icon={{ source: `git-project.svg`, tintColor: Color.SecondaryText }}
      title={repo.name}
      subtitle={repo.path}
      keywords={[
        repo.path,
        ...(repo.languageStats?.map((lang) => lang.name) || [])
      ].filter((keyword): keyword is string => Boolean(keyword))}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Repository"
              target={<OpenRepository arguments={{ path: repo.path }} />}
              icon={Icon.Book}
              onPush={onOpen}
            />
            <Action.CreateQuicklink
              title="Create Quicklink"
              quicklink={{
                link: `raycast://extensions/ernest0n/git-client/open-repository?arguments=${encodeURIComponent(
                  JSON.stringify({ path: repo.path }),
                )}`,
                name: `Show ${repo.name} in Git`,
              }}
              shortcut={{ modifiers: ["shift", "cmd"], key: "l" }}
            />
            <Action
              title="Remove"
              onAction={onRemove}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>

          <RepositoryDirectoryActions repositoryPath={repo.path} onOpen={onOpen} />

          <ActionPanel.Section title="View">
            <ActionPanel.Submenu title="Sort by" icon={Icon.NumberList}>
              <Action
                title="Visit Date"
                icon={selectedView.order === "visit-date" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Clock}
                onAction={() => onViewChange({ ...selectedView, order: "visit-date" })}
              />
              <Action
                title="Alphabetically"
                icon={selectedView.order === "alphabetical" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Lowercase}
                onAction={() => onViewChange({ ...selectedView, order: "alphabetical" })}
              />
            </ActionPanel.Submenu>

            <ActionPanel.Submenu title="Group by" icon={Icon.List}>
              <Action
                title="None"
                icon={selectedView.group === "none" ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined}
                onAction={() => onViewChange({ ...selectedView, group: "none" })}
              />
              <Action
                title="Language"
                icon={selectedView.group === "language" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Code}
                onAction={() => onViewChange({ ...selectedView, group: "language" })}
              />
              <Action
                title="Directory"
                icon={selectedView.group === "parent" ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.Folder}
                onAction={() => onViewChange({ ...selectedView, group: "parent" })}
              />
            </ActionPanel.Submenu>
          </ActionPanel.Section>

          <ActionPanel.Section title="List">
            <Action.Push
              title="Add Repository"
              target={<AddRepositoryForm onAddRepository={onAddRepository} />}
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            {repositoriesCount > 1 && (
              <Action
                title="Remove All"
                onAction={onClearAll}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "ctrl"], key: "x" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AddRepositoryForm({ onAddRepository }: { onAddRepository: (repoPath: string) => void }) {
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

      onAddRepository(repoPath);

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
