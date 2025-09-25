import { ActionPanel, List, Icon, Action, Color } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import {
  CommitCheckoutAction,
  CommitCherryPickAction,
  CommitRevertAction,
  CommitResetAction,
  CommitCopyHashAction,
  CommitCopyShortHashAction,
  CommitCopyAuthorAction,
  CommitCopyAuthorEmailAction,
  CommitCopyMessageAction,
  CommitInteractiveRebaseAction,
} from "../../components/actions/CommitActions";
import { TagCreateAction, TagRemoveAction, TagCopyNameAction } from "../../components/actions/TagActions";
import { BranchCopyNameAction, BranchPushAction, FetchAction, PullAction } from "../../components/actions/BranchActions";
import { CommitDiffView } from "./CommitDiffView";
import { ConfigureUrlTrackerForm } from "../../components/shared/ConfigureUrlTrackerForm";
import {
  CommitBranchFilterAction,
  getBranchFilterDisplayName,
} from "../../components/actions/CommitBranchFilterActions";
import { GitManager } from "../../utils/git-manager";
import {
  useUrlTracker,
  extractUrlsFromCommitWithConfigs,
  replaceUrlPatternsWithLinks,
} from "../../hooks/useUrlTracker";
import "../../utils/date-utils";
import { Commit, UrlTrackerConfig, BranchesState, Branch, DetachedHead, GitView } from "../../types";
import { useMemo, useState } from "react";
import { CommitMessageForm } from "./CommitMessageView";

type ListPagination = {
  pageSize: number;
  hasMore: boolean;
  onLoadMore: () => void;
};

interface CommitsViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
  viewDropdown: React.ReactElement<any>;
  // Branch context
  branchesState?: BranchesState;
  // Filter state
  branchFilter: string;
  selectedBranch?: Branch | DetachedHead;
  setBranchFilter: (branchName: string) => void;
  // Commits data
  isLoading: boolean;
  commits?: Commit[];
  error?: Error;
  revalidateCommits: () => void;
  revalidateStatus: () => void;
  revalidateBranches: () => void;
  pagination?: ListPagination;
  navigateTo: (destination: GitView) => void;
}

export function CommitsView({
  gitManager,
  navigationActions,
  viewDropdown,
  branchesState,
  branchFilter,
  selectedBranch,
  setBranchFilter,
  isLoading,
  commits,
  error,
  revalidateCommits,
  revalidateStatus,
  revalidateBranches,
  pagination,
  navigateTo,
}: CommitsViewProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [isShowingMetadata, setIsShowingMetadata] = useCachedState("commits-metadata-visible", true);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);

  // Load URL tracker configurations once for the entire view
  const { configs: urlTrackerConfigs } = useUrlTracker(gitManager.repoPath);

  // Get current filter display name for List.Section title
  const currentFilterDisplayName = getBranchFilterDisplayName(branchFilter, branchesState);

  const toggleDetail = () => {
    setIsShowingDetail(!isShowingDetail);
  };

  const toggleMetadata = () => {
    setIsShowingMetadata(!isShowingMetadata);
  };

  const revalidateAll = (error?: Error) => {
    revalidateCommits();
    revalidateStatus();
    revalidateBranches();
    if (error) {
      navigateTo("status");
    }
  };

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle="Repository Commits"
      searchBarPlaceholder="Search commits by message, sha, author, tags, files..."
      onSelectionChange={(id) => setSelectedCommitId(id)}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={viewDropdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Branch">
            <Action
              title="Refresh History"
              onAction={revalidateAll}
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <PullAction gitManager={gitManager} onRefresh={revalidateAll} />
            {branchesState?.currentBranch && branchesState.currentBranch.type === "current" && (
              <BranchPushAction branch={branchesState.currentBranch} gitManager={gitManager} onRefresh={revalidateAll} />
            )}
            <FetchAction gitManager={gitManager} onRefresh={revalidateAll} />
            {branchFilter && branchesState && (
              <CommitBranchFilterAction
                branchFilter={branchFilter}
                updateSelectedBranch={setBranchFilter}
                branchesState={branchesState}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={toggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            {isShowingDetail && (
              <Action
                title={isShowingMetadata ? "Hide Metadata" : "Show Metadata"}
                icon={Icon.Info}
                onAction={toggleMetadata}
                shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
              />
            )}
            <Action.Push
              title="Configure URL Tracker"
              icon={Icon.Gear}
              target={
                <ConfigureUrlTrackerForm
                  repositoryPath={gitManager.repoPath}
                  onConfigurationSaved={revalidateAll}
                />
              }
            />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    >
      {error ? (
        <List.EmptyView
          title="Error loading commits"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry"
                onAction={revalidateAll}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      ) : !commits || commits.length === 0 ? (
        <List.EmptyView title="No commits" description="No commits in this branch." icon={`git-commit.svg`} />
      ) : (
        <List.Section title={currentFilterDisplayName}>
          {commits.map((commit, index) => (
            <CommitListItem
              key={commit.hash}
              commit={commit}
              index={index}
              gitManager={gitManager}
              onRefresh={revalidateAll}
              navigationActions={navigationActions}
              isShowingDetail={isShowingDetail}
              isShowingMetadata={isShowingMetadata}
              onToggleDetail={toggleDetail}
              onToggleMetadata={toggleMetadata}
              urlTrackerConfigs={urlTrackerConfigs}
              selectedCommitId={selectedCommitId}
              isAllBranchesFilter={selectedBranch === undefined}
              selectedBranch={selectedBranch}
              branchFilter={branchFilter}
              updateSelectedBranch={setBranchFilter}
              branchesState={branchesState}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface CommitListItemProps {
  commit: Commit;
  index: number;
  gitManager: GitManager;
  onRefresh: (error?: Error) => void;
  navigationActions: React.ReactNode;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  isShowingMetadata: boolean;
  onToggleMetadata: () => void;
  urlTrackerConfigs: UrlTrackerConfig[];
  selectedCommitId: string | null;
  isAllBranchesFilter: boolean;
  selectedBranch?: Branch | DetachedHead;
  branchFilter: string;
  updateSelectedBranch: (branchName: string) => void;
  branchesState?: BranchesState;
}

function CommitListItem({
  commit,
  index,
  gitManager,
  onRefresh,
  navigationActions,
  isShowingDetail,
  onToggleDetail,
  isShowingMetadata,
  onToggleMetadata,
  urlTrackerConfigs,
  selectedCommitId,
  isAllBranchesFilter,
  selectedBranch,
  branchFilter,
  updateSelectedBranch,
  branchesState,
}: CommitListItemProps) {
  const icon = useMemo(() => {
    if (selectedBranch && 'type' in selectedBranch && selectedBranch.ahead) {
      if (selectedBranch.ahead > index) {
        return { source: Icon.Dot, tintColor: Color.Orange, tooltip: "Unpushed" };
      }
    }
    return undefined;
  }, [selectedBranch]);

  const commitUrls = useMemo(() => {
    if (selectedCommitId !== commit.hash) return [];
    return extractUrlsFromCommitWithConfigs(commit.message, urlTrackerConfigs);
  }, [selectedCommitId, commit.hash, commit.message, urlTrackerConfigs]);

  const formatCommitDetail = (commit: Commit, urlTrackerConfigs: UrlTrackerConfig[]): string => {
    // 1. Commit title (## heading) with URL patterns replaced by links
    const commitMessageWithLinks = replaceUrlPatternsWithLinks(commit.message, urlTrackerConfigs);
    let detail = `### ${commitMessageWithLinks}\n\n`;

    // 2. Rest of commit description (if exists)
    if (commit.body && commit.body.trim()) {
      detail += "---\n\n";

      // Format commit body for markdown:
      // 1. Split by double newlines to preserve paragraphs
      // 2. Within each paragraph, replace single newlines with markdown line breaks (two spaces + newline)
      // 3. Escape markdown characters that should not be interpreted as formatting
      const formatBodyForMarkdown = (text: string): string => {
        return (
          text
            .trim()
            // Split into paragraphs (separated by empty lines)
            .split(/\n\s*\n/)
            .map((paragraph) => {
              // Within each paragraph, convert single newlines to markdown line breaks
              return paragraph
                .trim()
                .split("\n")
                .map((line) => {
                  // Escape markdown special characters
                  const escapedLine = line.trim().replace(/[_#>+|~!]/g, "\\$&");
                  return escapedLine;
                })
                .filter((line) => line.length > 0)
                .join("  \n"); // Two spaces + newline = markdown line break
            })
            .filter((paragraph) => paragraph.length > 0)
            .join("\n\n")
        ); // Double newline = paragraph break in markdown
      };

      const formattedBody = formatBodyForMarkdown(commit.body);
      detail += `${formattedBody}\n\n`;
    }

    return detail;
  };

  // Prepare accessories based on filter and detail view state
  const accessories = useMemo(() => {
    if (isShowingDetail) {
      return undefined;
    }

    const accessoryItems = [];

    // Handle tags - show maximum 1 tag
    if (commit.tags.length > 0) {
      let title = commit.tags[0];
      let tooltip: string | undefined = undefined;

      // Add remaining tags to remainingRefs
      if (commit.tags.length > 1) {
        title += ` (+${commit.tags.length - 1})`;
        tooltip = commit.tags.slice(1).join("\n");
      }

      accessoryItems.push({
        tag: { value: title, color: Color.Blue },
        tooltip: tooltip,
        icon: Icon.Tag,
      });
    }

    // Handle branches only when All branches filter is selected - show maximum 1 branch
    if (isAllBranchesFilter) {
      let title: string | undefined = undefined;
      let tooltip: string | undefined = undefined;
      let color: Color = Color.SecondaryText;
      let icon: Icon = Icon.Dot;

      const allCommitBranches = commit.localBranches.concat(commit.remoteBranches);

      if (commit.currentBranchName) {
        title = commit.currentBranchName;
        color = Color.Green;
        if (allCommitBranches.length > 0) {
          title += ` (+${allCommitBranches.length})`;
          tooltip = allCommitBranches.join("\n");
        }
      } else if (allCommitBranches.length > 0) {
        const firstBranch = allCommitBranches[0];
        title = firstBranch;
        if (allCommitBranches.length > 1) {
          title += ` (+${allCommitBranches.length - 1})`;
          tooltip = allCommitBranches.slice(1).join("\n");
        }

        if (commit.localBranches.length > 0) {
          icon = Icon.Dot;
        } else if (commit.remoteBranches.length > 0) {
          icon = Icon.Globe;
        }
      }

      if (title) {
        accessoryItems.push({
          tag: { value: title, color: color },
          tooltip: tooltip,
          icon: icon,
        });
      }
    }

    accessoryItems.push({
      text: { value: commit.author },
      tooltip: commit.authorEmail,
    });

    accessoryItems.push({
      text: commit.date.toRelativeDateString(),
      tooltip: Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(commit.date),
    });

    return accessoryItems;
  }, [
    isShowingDetail,
    isAllBranchesFilter,
    commit.tags,
    commit.localBranches,
    commit.remoteBranches,
    commit.currentBranchName,
  ]);

  return (
    <List.Item
      id={commit.hash}
      title={commit.message}
      icon={icon}
      accessories={accessories}
      keywords={[
        commit.hash,
        commit.shortHash,
        commit.body,
        ...commit.author.split(" "),
        commit.authorEmail,
        ...commit.tags,
        ...(commit.changedFiles?.map((f) => f.path.split("/").pop()) || []),
      ].filter((keyword): keyword is string => Boolean(keyword))}
      detail={
        isShowingDetail ? (
          <List.Item.Detail
            markdown={formatCommitDetail(commit, urlTrackerConfigs)}
            metadata={
              isShowingMetadata ? (
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Author" text={commit.author} />
                  <List.Item.Detail.Metadata.Label title="Email" text={commit.authorEmail} />
                  <List.Item.Detail.Metadata.Label title="Date" text={commit.date.toLocaleString()} />
                  <List.Item.Detail.Metadata.Label title="Hash" text={commit.hash} />
                  {/* Tags as TagList */}
                  {commit.tags.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {commit.tags.map((tag) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={tag}
                          icon={Icon.Tag}
                          text={tag}
                          color={Color.Blue}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  {/* Branches as TagList */}
                  {(commit.localBranches.length > 0 || commit.remoteBranches.length > 0) && (
                    <List.Item.Detail.Metadata.TagList title="Branches">
                      {commit.localBranches.map((branch) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={branch}
                          icon={Icon.Dot}
                          text={branch}
                          color={Color.SecondaryText}
                        />
                      ))}
                      {commit.remoteBranches.map((branch) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={branch}
                          icon={Icon.Globe}
                          text={branch}
                          color={Color.SecondaryText}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                </List.Item.Detail.Metadata>
              ) : undefined
            }
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Commit">
            <Action.Push
              title="View Commit Files"
              icon={Icon.Document}
              target={
                <CommitDiffView
                  commit={commit}
                  gitManager={gitManager}
                  navigationActions={navigationActions}
                  onRefresh={onRefresh}
                />
              }
            />
            <CommitCheckoutAction commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
            <CommitCherryPickAction commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
            <CommitRevertAction commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
            <CommitResetAction commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
            <CommitInteractiveRebaseAction commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
            {commitUrls.map((urlInfo: { title: string; url: string }, index: number) => (
              <Action.OpenInBrowser
                key={`${urlInfo.url}-${index}`}
                title={`Open ${urlInfo.title}`}
                url={urlInfo.url}
                icon={getFavicon(urlInfo.url, { fallback: Icon.Link })}
                shortcut={index === 0 ? { modifiers: ["cmd"], key: "l" } : undefined}
              />
            ))}
            <CommitCopyHashAction commit={commit} />
            <CommitCopyMessageAction commit={commit} />
            <CommitCopyShortHashAction commit={commit} />
            <CommitCopyAuthorAction commit={commit} />
            <CommitCopyAuthorEmailAction commit={commit} />
            {commit.currentBranchName && branchesState?.currentBranch &&
              <Action.Push
                title="Reword Commit Message"
                icon={Icon.Message}
                target={
                  <CommitMessageForm
                    currentBranch={branchesState.currentBranch}
                    amendOnly={true}
                    gitManager={gitManager}
                    onFinish={onRefresh}
                  />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              />
            }
          </ActionPanel.Section>

          {commit.tags.map((tag) => (
            <ActionPanel.Section key={`tag-${tag}`} title={`Tag '${tag}'`}>
              <TagCopyNameAction key={`copy-${tag}`} tagName={tag} />
              <TagRemoveAction key={`remove-${tag}`} tagName={tag} gitManager={gitManager} onRefresh={onRefresh} />
            </ActionPanel.Section>
          ))}
          <ActionPanel.Section>
            <TagCreateAction commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Branch">
            {branchesState && (
              <CommitBranchFilterAction
                branchFilter={branchFilter}
                updateSelectedBranch={updateSelectedBranch}
                branchesState={branchesState}
              />
            )}
            <PullAction gitManager={gitManager} onRefresh={onRefresh} />
            {branchesState?.currentBranch && branchesState.currentBranch.type === "current" && (
              <BranchPushAction branch={branchesState.currentBranch} gitManager={gitManager} onRefresh={onRefresh} />
            )}
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
            {selectedBranch && 'name' in selectedBranch &&
              <BranchCopyNameAction branch={selectedBranch.displayName} />
            }
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={isShowingDetail ? "Hide Detail" : "Show Detail"}
              icon={Icon.AppWindowSidebarLeft}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            {isShowingDetail && (
              <Action
                title={isShowingMetadata ? "Hide Metadata" : "Show Metadata"}
                icon={Icon.Info}
                onAction={onToggleMetadata}
                shortcut={{ modifiers: ["shift", "cmd"], key: "i" }}
              />
            )}
            <Action.Push
              title="Configure URL Tracker"
              icon={Icon.Link}
              target={
                <ConfigureUrlTrackerForm
                  repositoryPath={gitManager.repoPath}
                  onConfigurationSaved={onRefresh}
                />
              }
            />
          </ActionPanel.Section>

          {navigationActions}
        </ActionPanel>
      }
    />
  );
}
