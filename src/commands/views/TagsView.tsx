import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../../components/actions/WorkspaceNavigationActions";
import { RemoteFetchAction } from "../../components/actions/RemoteActions";
import { useMemo } from "react";
import { TagCheckoutAction, TagCopyCommitHashAction, TagCopyNameAction, TagOpenCommitAction, TagPushAction, TagRemoveAction, TagRenameAction } from "../../components/actions/TagActions";
import { Tag } from "../../types";

export default function TagsView(context: RepositoryContext & NavigationContext) {
  return (
    <List
      isLoading={context.tags.isLoading}
      navigationTitle="Repository Tags"
      searchBarPlaceholder="Search tags by name..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <RefreshTagsAction {...context} />
          <RemoteFetchAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {context.tags.error ? (
        <List.EmptyView
          title="Error loading tags"
          description={context.tags.error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <RefreshTagsAction {...context} />
              <RemoteFetchAction {...context} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : !context.tags.isLoading && context.tags.data.length === 0 ? (
        <List.EmptyView
          title="No tags"
          description="Repository has no tags."
          icon={Icon.Tag}
          actions={
            <ActionPanel>
              <RefreshTagsAction {...context} />
              <RemoteFetchAction {...context} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (
        context.tags.data.map((tag) => (
          <TagListItem
            key={`local:${tag.name}`}
            tag={tag}
            {...context}
          />
        ))
      )}
    </List>
  );
}

function TagListItem(context: RepositoryContext & NavigationContext & { tag: Tag }) {
  const accessories = useMemo(() => {
    const items: List.Item.Accessory[] = [];

    if (context.tag.author) {
      items.push({ text: context.tag.author, tooltip: context.tag.authorEmail });
    }

    if (context.tag.date) {
      items.push({
        text: context.tag.date.toRelativeDateString(),
        tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(context.tag.date)
      });
    }

    return items;
  }, [context.tag.author, context.tag.date]);

  return (
    <List.Item
      title={context.tag.name}
      subtitle={{
        value: context.tag.message,
        tooltip: context.tag.message
      }}
      icon={Icon.Tag}
      accessories={accessories}
      keywords={[
        context.tag.name,
        context.tag.commitHash,
        context.tag.message,
        context.tag.author,
        context.tag.authorEmail
      ].filter(Boolean) as string[]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Tag '${context.tag.name}'`}>
            <TagOpenCommitAction commitHash={context.tag.commitHash} {...context} />
            <TagCheckoutAction tagName={context.tag.name} {...context} />
            <TagPushAction tagName={context.tag.name} {...context} />
            <TagRenameAction tagName={context.tag.name} {...context} />
            <TagCopyNameAction
              tagName={context.tag.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <TagCopyCommitHashAction
              commitHash={context.tag.commitHash}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
            <TagRemoveAction tagName={context.tag.name} {...context} />
          </ActionPanel.Section>
          <RefreshTagsAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

function RefreshTagsAction(context: RepositoryContext & NavigationContext) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      onAction={context.tags.revalidate}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
}
