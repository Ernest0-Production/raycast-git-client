import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { RepositoryContext, NavigationContext } from "../../open-repository";
import { WorkspaceNavigationActions, WorkspaceNavigationDropdown } from "../../components/actions/WorkspaceNavigationActions";
import { useGitTags } from "../../hooks/useGitTags";
import { RemoteFetchAction } from "../../components/actions/RemoteActions";
import { useMemo } from "react";
import { TagCheckoutAction, TagCopyNameAction, TagOpenCommitAction, TagPushAction, TagRemoveAction, TagRenameAction } from "../../components/actions/TagActions";

export default function TagsView(context: RepositoryContext & NavigationContext) {
  const { data, isLoading, error, revalidate } = useGitTags(context.gitManager, context.remotes.data);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Repository Tags"
      searchBarPlaceholder="Search tags by name..."
      searchBarAccessory={WorkspaceNavigationDropdown(context)}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <RemoteFetchAction {...context} />
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title="Error loading tags"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <RemoteFetchAction {...context} />
              <WorkspaceNavigationActions {...context} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {/* Local tags */}
          {(data.local?.length ?? 0) > 0 && (
            <List.Section title="Local Tags">
              {data.local.map((tag) => (
                <TagListItem key={`local:${tag.name}`} tagName={tag.name} commitHash={tag.commitHash} {...context} />
              ))}
            </List.Section>
          )}

          {/* Remote tags grouped by remote */}
          {Object.entries(data.remotes || {}).map(([remote, tags]) => (
            <List.Section key={remote} title={`${remote} • ${context.remotes.data[remote]?.organizationName}/${context.remotes.data[remote]?.repositoryName}`}>
              {tags.map((tag) => (
                <TagListItem key={`${remote}:${tag.name}`} tagName={tag.name} commitHash={tag.commitHash} remote={remote} {...context} />
              ))}
            </List.Section>
          ))}

          {/* Empty state if nothing */}
          {(!data.local || data.local.length === 0) && Object.values(data.remotes || {}).every((arr) => (arr?.length ?? 0) === 0) && (
            <List.EmptyView title="No tags" description="Repository has no tags." icon={Icon.Tag} />
          )}
        </>
      )}
    </List>
  );
}

function TagListItem(context: RepositoryContext & NavigationContext & { tagName: string; commitHash: string; remote?: string }) {
  const accessories = useMemo(() => {
    const items: List.Item.Accessory[] = [];
    items.push({ text: context.commitHash.substring(0, 7), tooltip: context.commitHash });
    if (context.remote) items.push({ tag: { value: context.remote, color: Color.SecondaryText }, icon: Icon.Network });
    return items;
  }, [context.commitHash, context.remote]);

  return (
    <List.Item
      title={context.tagName}
      icon={Icon.Tag}
      accessories={accessories}
      keywords={[context.tagName, context.commitHash, context.remote].filter(Boolean) as string[]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Tag '${context.tagName}'`}>
            <TagOpenCommitAction commitHash={context.commitHash} {...context} />
            <TagCheckoutAction tagName={context.tagName} {...context} />
            <TagPushAction tagName={context.tagName} {...context} />
            <TagRenameAction tagName={context.tagName} {...context} />
            <TagCopyNameAction tagName={context.tagName} />
            <TagRemoveAction tagName={context.tagName} {...context} />
          </ActionPanel.Section>
          <WorkspaceNavigationActions {...context} />
        </ActionPanel>
      }
    />
  );
}

