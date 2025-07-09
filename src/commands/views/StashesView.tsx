import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useGitStash } from "../../hooks/useGitStash";
import { EmptyView } from "../../components/shared/EmptyView";
import { StashActions, CreateStashAction } from "../../components/actions/StashActions";
import { RepositoryActions } from "../../components/actions/RepositoryActions";
import { GitManager } from "../../utils/git-utils";
import { Stash } from "../../types";

interface StashesViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
}

export function StashesView({ gitManager, navigationActions }: StashesViewProps) {
  const { stashes, isLoading, revalidate } = useGitStash(gitManager);

  if (!stashes || stashes.length === 0) {
    return (
      <EmptyView
        title="No stashes"
        description="No saved changes in the stash."
        icon={Icon.Box}
        navigationTitle={`Stash - ${gitManager.repoName}`}
        actions={
          <ActionPanel>
            <Action title="Refresh Stash" onAction={revalidate} icon={Icon.ArrowClockwise} />
            <CreateStashAction gitManager={gitManager} onRefresh={revalidate} />
            {navigationActions}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Stash - ${gitManager.repoName}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Stash Management">
            <CreateStashAction gitManager={gitManager} onRefresh={revalidate} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {navigationActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {stashes.map((stash, index) => (
        <StashListItem
          key={index}
          stash={stash}
          gitManager={gitManager}
          onRefresh={revalidate}
          navigationActions={navigationActions}
        />
      ))}
    </List>
  );
}

function StashListItem({
  stash,
  gitManager,
  onRefresh,
  navigationActions,
}: {
  stash: Stash;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
}) {
  return (
    <List.Item
      title={stash.message}
      subtitle={stash.ref}
      icon={Icon.Box}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Stash Operations">
            <StashActions stash={stash} gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Stash Management">
            <CreateStashAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <RepositoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>
            {navigationActions}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
