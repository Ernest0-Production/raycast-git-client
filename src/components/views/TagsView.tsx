import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../actions/WorkspaceNavigationActions";
import { RemoteFetchAction } from "../actions/RemoteActions";
import { useMemo, useState } from "react";
import { TagCheckoutAction, TagCopyCommitHashAction, TagCopyNameAction, TagDetailsView, TagPushAction, TagRemoveAction, TagRenameAction } from "../actions/TagActions";
import { Tag } from "../../types";

export default function TagsView(context: RepositoryContext & NavigationContext) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  return (
    <List
      isLoading={context.tags.isLoading}
      navigationTitle="Repository Tags"
      searchBarPlaceholder="Search tags by name..."
      selectedItemId={selectedTagId || undefined}
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
        />
      ) : (!context.tags.isLoading && context.tags.data.length === 0) ? (
        <List.EmptyView
          title="No tags"
          description="Repository has no tags."
          icon={Icon.Tag}
        />
      ) : (
        context.tags.data.map((tag, index) => (
          <TagListItem
            key={tag.name}
            tag={tag}
            index={index}
            onMoveToTag={setSelectedTagId}
            {...context}
          />
        ))
      )}
    </List>
  );
}

function TagListItem(context: RepositoryContext & NavigationContext & {
  tag: Tag,
  index: number,
  onMoveToTag: (tagName: string) => void
}) {
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
      id={context.tag.name}
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
          <ActionPanel.Section title={context.tag.name}>
            <Action.Push
              title="Show Commit"
              icon={Icon.Document}
              target={<TagDetailsView {...context} />}
            />
            <TagCheckoutAction tagName={context.tag.name} {...context} />
            <TagRenameAction tagName={context.tag.name} {...context} />
            <TagPushAction tagName={context.tag.name} {...context} />
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
