import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { ConflictSegment } from "../../types";
import { useConflictResolver } from "../../hooks/useConflictResolver";
import { RepositoryContext } from "../../open-repository";
import { basename } from "path";

export default function FileMergeResolveView(context: RepositoryContext & { filePath: string }) {
  const { pop } = useNavigation();
  const {
    conflicts,
    segments,
    isLoading,
    error,
    resolveSegment,
    applyResolution,
    allResolved,
  } = useConflictResolver(context.filePath);

  const applyResolutions = async () => {
    const confirmed = await confirmAlert({
      title: "Apply Conflict Resolutions",
      message: `Are you sure you want to apply the resolutions to "${basename(context.filePath)}"?`,
      primaryAction: {
        title: "Apply",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      applyResolution();

      await showToast({
        style: Toast.Style.Success,
        title: "Conflicts resolved",
        message: `File "${basename(context.filePath)}" has been updated`,
      });

      context.status.revalidate();
      pop();
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply resolutions",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to parse conflicts",
      message: error,
    });
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Resolve Conflicts: ${basename(context.filePath)}`}
      isShowingDetail={true}
    >
      {conflicts && segments.length === 0 ? (
        <List.EmptyView
          title="No conflicts found"
          description="This file doesn't contain any conflict markers."
          icon={Icon.CheckCircle}
        />
      ) : (
        <List.Section
          title={basename(context.filePath)}
          subtitle={`${segments.length} conflict${segments.length !== 1 ? "s" : ""}`}
        >
          {segments.map((segment, index) => (
            <ConflictSegmentItem
              key={segment.id}
              segment={segment}
              index={index + 1}
              totalSegments={segments.length}
              onSetResolution={resolveSegment}
              onApplyAll={allResolved ? applyResolutions : undefined}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ConflictSegmentItem({
  segment,
  index,
  totalSegments,
  onSetResolution,
  onApplyAll,
}: {
  segment: ConflictSegment;
  index: number;
  totalSegments: number;
  onSetResolution: (segmentId: string, resolution: "current" | "incoming") => void;
  onApplyAll?: () => void;
}) {
  const isResolved = segment.resolution !== null;

  const title = useMemo(() => {
    // Get first non-empty line from current or incoming content
    const currentFirstLine = segment.currentContent.split("\n").find((line) => line.trim() !== "");
    const incomingFirstLine = segment.incomingContent.split("\n").find((line) => line.trim() !== "");
    
    return currentFirstLine || incomingFirstLine || "Empty conflict";
  }, [segment.currentContent, segment.incomingContent]);

  const icon = useMemo(() => {
    if (!isResolved) {
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    }
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }, [isResolved]);

  const formatMarkdownContent = (content: string, label: string) => {
    // Trim empty lines from start and end
    const trimmedContent = content.trim();
    
    if (!trimmedContent) {
      return `**${label}** (empty)\n\n`;
    }

    return `**${label}**\n\n\`\`\`\n${trimmedContent}\n\`\`\`\n\n`;
  };

  const detailMarkdown = 
    `## Conflict ${index} of ${totalSegments}\n\n` +
    `**Lines:** ${segment.startLine}-${segment.endLine}\n\n---\n\n` +
    formatMarkdownContent(segment.currentContent, segment.currentLabel) +
    `---\n\n` +
    formatMarkdownContent(segment.incomingContent, segment.incomingLabel);

  return (
    <List.Item
      title={title}
      icon={icon}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
        />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title={`Conflict ${index}`}>
            <Action
              title={`Select ${segment.currentLabel}`}
              icon={{ source: Icon.ChevronUp, tintColor: Color.Blue }}
              onAction={() => onSetResolution(segment.id, "current")}
              shortcut={{ modifiers: [], key: "[" }}
            />
            <Action
              title={`Select ${segment.incomingLabel}`}
              icon={{ source: Icon.ChevronDown, tintColor: Color.Purple }}
              onAction={() => onSetResolution(segment.id, "incoming")}
              shortcut={{ modifiers: [], key: "]" }}
            />
          </ActionPanel.Section>

          {onApplyAll && (
            <ActionPanel.Section title="Apply">
              <Action
                title="Apply All Resolutions"
                icon={{ source: Icon.Check, tintColor: Color.Green }}
                onAction={onApplyAll}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
