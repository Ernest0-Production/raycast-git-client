import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useMemo } from "react";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { Tag } from "../../types";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../../components/actions/WorkspaceNavigationActions";
import { CommitDetailsByRefView } from "./CommitDetailsView";
import { TagCheckoutAction, TagPushAction, TagRenameAction, TagRemoveAction, TagCopyNameAction, TagOpenCommitAction } from "../../components/actions/TagActions";

export default function TagsView(context: RepositoryContext & NavigationContext) {
  return (
    <List
      isLoading={context.tags.isLoading}
      navigationTitle="Repository Tags"
      searchBarPlaceholder="Search tags by name..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Tags">
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={context.tags.revalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
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
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={context.tags.revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (!context.tags.data || (context.tags.data.local.length === 0 && Object.values(context.tags.data.remotes).every(arr => arr.length === 0))) ? (
        <List.EmptyView title="No tags" description="No tags found in the repository." icon={Icon.Tag} />
      ) : (
        <>
          {context.tags.data.local.length > 0 && (
            <List.Section title="Local Tags">
              {context.tags.data.local.map((tag) => (
                <TagListItem key={`local:${tag.name}`} scope="local" tag={tag} {...context} />
              ))}
            </List.Section>
          )}

          {Object.entries(context.tags.data.remotes).map(([remoteName, tags]) => (
            tags.length > 0 && (
              <List.Section key={remoteName} title={`${remoteName} • ${context.remotes.data[remoteName]?.organizationName}/${context.remotes.data[remoteName]?.repositoryName}`}>
                {tags.map((tag) => (
                  <TagListItem key={`remote:${remoteName}:${tag.name}`} scope={remoteName} tag={tag} {...context} />
                ))}
              </List.Section>
            )
          ))}
        </>
      )}
    </List>
  );
}

function TagListItem(context: RepositoryContext & NavigationContext & { tag: Tag; scope: "local" | string }) {
  const accessories = useMemo(() => {
    const items: List.Item.Accessory[] = [];
    if (context.scope !== "local") {
      items.push({ tag: { value: context.scope, color: Color.SecondaryText }, icon: Icon.Network });
    }
    if (context.tag.commitHash) {
      items.push({ text: context.tag.commitHash.substring(0, 7), tooltip: context.tag.commitHash });
    }
    return items;
  }, [context.tag, context.scope]);

  const icon: Image.ImageLike = useMemo(() => {
    return context.scope === "local" ? Icon.Tag : Icon.Upload;
  }, [context.scope]);

  return (
    <List.Item
      key={`${context.scope}:${context.tag.name}`}
      title={context.tag.name}
      subtitle={context.tag.message}
      icon={icon}
      accessories={accessories}
      keywords={[context.tag.commitHash].filter(Boolean) as string[]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={context.tag.name}>
            <TagCheckoutAction tagName={context.tag.name} remoteName={context.scope === "local" ? undefined : context.scope} {...context} />
            <TagCopyNameAction tagName={context.tag.name} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Tag">
            <TagPushAction tagName={context.tag.name} {...context} />
            <TagRenameAction tagName={context.tag.name} {...context} />
            <TagRemoveAction tagName={context.tag.name} {...context} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Explore">
            <TagOpenCommitAction tagName={context.tag.name} {...context} />
          </ActionPanel.Section>
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

