import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { StashApplyAction, StashDropAction, CreateStashAction } from "../../components/actions/StashActions";
import { GitManager } from "../../utils/git-manager";
import "../../utils/date-utils";
import { Stash } from "../../types";
import { getAvatarIcon } from "@raycast/utils";

interface StashesViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
  onNavigateToStatus?: () => void;
  stashes?: Stash[];
  isLoading: boolean;
  revalidate: () => void | Promise<unknown>;
}

export function StashesView({
  gitManager,
  navigationActions,
  viewDropdown,
  onNavigateToStatus,
  stashes,
  isLoading,
  revalidate
}: StashesViewProps) {

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Repository Stashes"
      searchBarPlaceholder="Search stashes by message, author..."
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Stash Management">
            <Action title="Refresh Stash" onAction={revalidate} icon={Icon.ArrowClockwise} />
            <CreateStashAction gitManager={gitManager} onRefresh={revalidate} />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    >
      {!stashes || stashes.length === 0 ? (
        <List.EmptyView title="No stashes" description="No saved changes in the stash." icon={Icon.Bookmark} />
      ) : (
        stashes.map((stash, index) => (
          <StashListItem
            key={index}
            stash={stash}
            index={index}
            gitManager={gitManager}
            onRefresh={revalidate}
            navigationActions={navigationActions}
            onNavigateToStatus={onNavigateToStatus}
          />
        ))
      )}
    </List>
  );
}

function StashListItem({
  stash,
  index,
  gitManager,
  onRefresh,
  navigationActions,
  onNavigateToStatus,
}: {
  stash: Stash;
  index: number;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  onNavigateToStatus?: () => void;
}) {
  return (
    <List.Item
      title={stash.message}
      icon={{ source: getAvatarIcon(stash.author), tooltip: stash.author }}
      subtitle={{ value: stash.author, tooltip: stash.authorEmail }}
      accessories={[{ text: stash.date.toRelativeDateString(), tooltip: stash.date.toRelativeDateString() }]}
      keywords={[stash.hash, stash.author, stash.authorEmail].filter(Boolean)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <StashApplyAction
              stash={stash}
              index={index}
              gitManager={gitManager}
              onRefresh={onRefresh}
              onNavigateToStatus={onNavigateToStatus}
            />
          </ActionPanel.Section>

          <StashDropAction
            stash={stash}
            index={index}
            gitManager={gitManager}
            onRefresh={onRefresh}
          />

          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
