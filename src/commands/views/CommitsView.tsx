import { ActionPanel, List, Icon, Action, useNavigation, Color } from "@raycast/api";
import { getAvatarIcon, useCachedPromise, useCachedState } from "@raycast/utils";
import { useGitBranches } from "../../hooks/useGitBranches";
import { useGitCommits } from "../../hooks/useGitCommits";
import { useCommitsBranchFilter, ALL_BRANCHES_FILTER, DETACHED_HEAD_FILTER } from "../../hooks/useCommitsBranchFilter";
import { ErrorView } from "../../components/shared/ErrorView";
import { EmptyView } from "../../components/shared/EmptyView";
import { CommitActions, CommitHistoryActions } from "../../components/actions/CommitActions";
import { FetchAction, PullAction } from "../../components/actions/BranchActions";
import { RepositoryDirectoryActions } from "../../components/actions/RepositoryDirectoryActions";
import { CommitDiffView } from "./CommitDiffView";
import { ConfigureUrlTrackerForm } from "../../components/shared/ConfigureUrlTrackerForm";
import { GitManager } from "../../utils/git-utils";
import { loadUrlTrackerConfigs, extractUrlsFromCommitWithConfigs, replaceUrlPatternsWithLinks } from "../../utils/url-tracker-cache";
import { Branch, Commit, UrlTrackerConfig } from "../../types";
import { useMemo, useState, useEffect } from "react";

interface CommitsViewProps {
  gitManager: GitManager;
  navigationActions: React.ReactNode;
}

export function CommitsView({ gitManager, navigationActions }: CommitsViewProps) {
  const { data: branchesState } = useGitBranches(gitManager);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [isShowingMetadata, setIsShowingMetadata] = useCachedState("commits-metadata-visible", true);
  const [selectedCommitId, setSelectedCommitId] = useState<string | null>(null);

  // Load URL tracker configurations once for the entire view
  const { data: urlTrackerConfigs = [] } = useCachedPromise(() => loadUrlTrackerConfigs(), [], {
    keepPreviousData: true,
  });

  // Combine all branches from the state
  const allBranches: Branch[] = [
    ...(branchesState?.currentBranch ? [branchesState.currentBranch] : []),
    ...(branchesState?.localBranches || []),
    ...(branchesState?.remoteBranches || []),
  ];

  const { selectedBranch, updateSelectedBranch, getActualBranchFilter } = useCommitsBranchFilter(
    gitManager.repoPath,
    allBranches,
    branchesState?.detachedHead,
  );
  const { isLoading, data: commits, error, revalidate, pagination } = useGitCommits(gitManager, getActualBranchFilter());

  // Check if the selected branch is a local branch (current or local)
  const isLocalBranchSelected = useMemo(() => {
    if (selectedBranch === ALL_BRANCHES_FILTER || selectedBranch === DETACHED_HEAD_FILTER) {
      return false;
    }

    // Check if it's a local branch (current or local type)
    return allBranches.some(branch =>
      (branch.type === "current" || branch.type === "local") && branch.name === selectedBranch
    );
  }, [selectedBranch, allBranches]);

  if (error) {
    return (
      <ErrorView
        title="Error loading commits"
        message={error.message}
        navigationTitle={`Commits - ${gitManager.repoName}`}
        onRetry={revalidate}
      />
    );
  }

  const { currentBranchOption, otherBranchOptions } = useMemo(() => {
    const currentBranch = branchesState?.currentBranch;
    const detachedHead = branchesState?.detachedHead;
    let currentOption: React.ReactNode = null;
    const otherOptions: React.ReactNode[] = [];

    // Handle detached HEAD state
    if (detachedHead) {
      const detachedHeadItem = (
        <List.Dropdown.Item
          key="detached-head"
          title={`HEAD (${detachedHead.shortCommitHash})`}
          value={DETACHED_HEAD_FILTER}
          icon={Icon.Anchor}
        />
      );
      currentOption = detachedHeadItem;
    } else if (currentBranch) {
      // Handle current branch (when not in detached HEAD)
      const uniqueKey = `${currentBranch.type}-${currentBranch.name}`;
      const displayName = currentBranch.name;
      const icon = Icon.Dot;

      currentOption = <List.Dropdown.Item key={uniqueKey} title={displayName} value={currentBranch.name} icon={icon} />;
    }

    // Handle other branches
    allBranches.forEach((branch: Branch) => {
      // Skip current branch if we're not in detached HEAD (it's already in currentOption)
      if (!detachedHead && currentBranch && branch.name === currentBranch.name && branch.type === currentBranch.type) {
        return;
      }

      const uniqueKey = branch.type === "remote" ? `${branch.remote}/${branch.name}` : `${branch.type}-${branch.name}`;
      const displayName = branch.type === "remote" ? `${branch.remote}/${branch.name}` : branch.name;
      const branchValue = branch.type === "remote" ? `${branch.remote}/${branch.name}` : branch.name;
      const icon = branch.type === "remote" ? Icon.Globe : Icon.Dot;

      const dropdownItem = <List.Dropdown.Item key={uniqueKey} title={displayName} value={branchValue} icon={icon} />;

      otherOptions.push(dropdownItem);
    });

    return { currentBranchOption: currentOption, otherBranchOptions: otherOptions };
  }, [allBranches, branchesState?.currentBranch, branchesState?.detachedHead]);

  const toggleDetail = () => {
    setIsShowingDetail(!isShowingDetail);
  };

  const toggleMetadata = () => {
    setIsShowingMetadata(!isShowingMetadata);
  };

  if (!commits || commits.length === 0) {
    return (
      <EmptyView
        title="No commits"
        description="No commits in this branch."
        icon={Icon.List}
        navigationTitle={`Commits - ${gitManager.repoName}`}
        actions={
          <ActionPanel>
            <CommitHistoryActions onRefresh={revalidate} currentBranch={getActualBranchFilter()} />
            <FetchAction gitManager={gitManager} onRefresh={revalidate} />
            {navigationActions}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`Commits - ${gitManager.repoName}`}
      onSelectionChange={(id) => setSelectedCommitId(id)}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by branch" value={selectedBranch} onChange={updateSelectedBranch}>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="All Branches" value={ALL_BRANCHES_FILTER} icon={Icon.List} />
          </List.Dropdown.Section>

          {currentBranchOption && <List.Dropdown.Section>{currentBranchOption}</List.Dropdown.Section>}

          {otherBranchOptions.length > 0 && <List.Dropdown.Section>{otherBranchOptions}</List.Dropdown.Section>}
        </List.Dropdown>
      }
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="View Controls">
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
          </ActionPanel.Section>

          <ActionPanel.Section title="History Management">
            <CommitHistoryActions onRefresh={revalidate} currentBranch={getActualBranchFilter()} />
            {isLocalBranchSelected && <PullAction gitManager={gitManager} onRefresh={revalidate} />}
            <FetchAction gitManager={gitManager} onRefresh={revalidate} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository">
            <Action.Push title="Configure URL Tracker" icon={Icon.Gear} target={<ConfigureUrlTrackerForm />} />
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    >
      {commits.map((commit) => (
        <CommitListItem
          key={commit.hash}
          commit={commit}
          gitManager={gitManager}
          onRefresh={revalidate}
          navigationActions={navigationActions}
          isShowingDetail={isShowingDetail}
          isShowingMetadata={isShowingMetadata}
          onToggleDetail={toggleDetail}
          onToggleMetadata={toggleMetadata}
          urlTrackerConfigs={urlTrackerConfigs}
          selectedCommitId={selectedCommitId}
          isLocalBranchSelected={isLocalBranchSelected}
          isAllBranchesFilter={selectedBranch === ALL_BRANCHES_FILTER}
        />
      ))}
    </List>
  );
}

interface CommitListItemProps {
  commit: Commit;
  gitManager: GitManager;
  onRefresh: () => void;
  navigationActions: React.ReactNode;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  isShowingMetadata: boolean;
  onToggleMetadata: () => void;
  urlTrackerConfigs: UrlTrackerConfig[];
  selectedCommitId: string | null;
  isLocalBranchSelected: boolean;
  isAllBranchesFilter: boolean;
}

function CommitListItem({
  commit,
  gitManager,
  onRefresh,
  navigationActions,
  isShowingDetail,
  onToggleDetail,
  isShowingMetadata,
  onToggleMetadata,
  urlTrackerConfigs,
  selectedCommitId,
  isLocalBranchSelected,
  isAllBranchesFilter,
}: CommitListItemProps) {
  const { push } = useNavigation();
  const [commitUrls, setCommitUrls] = useState<Array<{ title: string; url: string }>>([]);

  // Extract URLs only for the selected commit to improve performance
  useEffect(() => {
    if (selectedCommitId === commit.hash) {
      const urls = extractUrlsFromCommitWithConfigs(commit.message, urlTrackerConfigs);
      setCommitUrls(urls);
    } else {
      setCommitUrls([]);
    }
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
        tooltip = commit.tags.slice(1).join('\n');
      }

      accessoryItems.push({
        tag: { value: title, color: Color.Blue },
        tooltip: tooltip,
        icon: Icon.Tag
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
          tooltip = allCommitBranches.join('\n');
        }
      } else if (allCommitBranches.length > 0) {
        const firstBranch = allCommitBranches[0];
        title = firstBranch;
        if (allCommitBranches.length > 1) {
          title += ` (+${allCommitBranches.length - 1})`;
          tooltip = allCommitBranches.slice(1).join('\n');
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
          icon: icon
        });
      }
    }

    return accessoryItems;
  }, [isShowingDetail, isAllBranchesFilter]);

  return (
    <List.Item
      id={commit.hash}
      title={commit.message}
      subtitle={isShowingDetail ? undefined : { value: commit.author, tooltip: commit.authorEmail }}
      accessories={accessories}
      keywords={[
        commit.hash,
        commit.shortHash,
        commit.body,
        ...commit.author.split(" "),
        commit.authorEmail,
        ...commit.tags,
        ...(commit.changedFiles?.map(f => f.path.split("/").pop()) || [])
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
          <ActionPanel.Section title="View Commit Files">
            <Action
              title="View Commit Files"
              icon={Icon.Document}
              onAction={() =>
                push(<CommitDiffView commit={commit} gitManager={gitManager} navigationActions={navigationActions} />)
              }
            />
            {commitUrls.map((urlInfo: { title: string; url: string }, index: number) => (
              <Action.OpenInBrowser
                key={`${urlInfo.url}-${index}`}
                title={`Open ${urlInfo.title}`}
                url={urlInfo.url}
                icon={Icon.Globe}
                shortcut={index === 0 ? { modifiers: ["cmd"], key: "l" } : undefined}
              />
            ))}
          </ActionPanel.Section>

          <ActionPanel.Section title="View Controls">
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
          </ActionPanel.Section>

          <ActionPanel.Section title="Commit Operations">
            <CommitActions commit={commit} gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Repository Operations">
            <Action.Push title="Configure URL Tracker" icon={Icon.Gear} target={<ConfigureUrlTrackerForm />} />
            <RepositoryDirectoryActions repositoryPath={gitManager.repoPath} secondary />
            {isLocalBranchSelected && <PullAction gitManager={gitManager} onRefresh={onRefresh} />}
            <FetchAction gitManager={gitManager} onRefresh={onRefresh} />
          </ActionPanel.Section>

          <ActionPanel.Section>{navigationActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
