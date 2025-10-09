import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { StashApplyAction, StashDropAction } from "../../components/actions/StashActions";
import { GitManager } from "../../utils/git-manager";
import "../../utils/date-utils";
import { Stash } from "../../types";
import { getAvatarIcon } from "@raycast/utils";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../../components/actions/WorkspaceNavigationActions";

export function StashesView(context: RepositoryContext & NavigationContext) {
  return (
    <List
      isLoading={context.stashes.isLoading}
      navigationTitle="Repository Stashes"
      searchBarPlaceholder="Search stashes by message, author..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <SharedActionsSection {...context} />
        </ActionPanel>
      }
    >
      {!context.stashes.data || context.stashes.data.length === 0 ? (
        <List.EmptyView
          title="No stashes"
          description="No saved changes in the stash."
          icon={Icon.Bookmark}
          actions={
            <ActionPanel>
              <SharedActionsSection {...context} />
            </ActionPanel>
          }
        />
      ) : (
        context.stashes.data.map((stash, index) => (
          <StashListItem
            key={index}
            stash={stash}
            index={index}
            {...context}
          />
        ))
      )}
    </List>
  );
}

function StashListItem(context: RepositoryContext & NavigationContext & {
  stash: Stash;
  index: number;
}) {
  return (
    <List.Item
      title={context.stash.message}
      icon={{ source: getAvatarIcon(context.stash.author), tooltip: context.stash.author }}
      subtitle={{ value: context.stash.author, tooltip: context.stash.authorEmail }}
      accessories={[{ text: context.stash.date.toRelativeDateString(), tooltip: context.stash.date.toRelativeDateString() }]}
      keywords={[context.stash.hash, context.stash.author, context.stash.authorEmail].filter(Boolean)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <StashApplyAction {...context} />
            <StashDropAction {...context} />
          </ActionPanel.Section>

          <SharedActionsSection {...context} />
        </ActionPanel>
      }
    />
  );
}

function SharedActionsSection(context: RepositoryContext & NavigationContext) {
  return (
    <>
      <Action title="Refresh Stash"
        onAction={context.stashes.revalidate}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <WorkspaceNavigationActions {...context} />
    </>
  )
}
