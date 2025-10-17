import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ConflictSegment, FileConflicts } from "../../types";
import { parseConflictedFile, applyConflictResolutions } from "../../utils/conflict-parser";
import { RepositoryContext } from "../../open-repository";
import { writeFileSync } from "fs";
import { basename } from "path";

export default function FileMergeResolveView(context: RepositoryContext & { filePath: string }) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [conflicts, setConflicts] = useState<FileConflicts | null>(null);
  const [segments, setSegments] = useState<ConflictSegment[]>([]);

  useEffect(() => {
    try {
      setIsLoading(true);
      const parsed = parseConflictedFile(context.filePath);
      setConflicts(parsed);
      setSegments(parsed.segments);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to parse conflicts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [context.filePath]);

  const setResolution = (segmentId: string, resolution: "current" | "incoming") => {
    setSegments((prev) =>
      prev.map((seg) =>
        seg.id === segmentId ? { ...seg, resolution } : seg
      )
    );
  };

  const allResolved = segments.every((seg) => seg.resolution !== null);

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
      const resolvedContent = applyConflictResolutions(context.filePath, segments);
      writeFileSync(context.filePath, resolvedContent, "utf-8");

      await showToast({
        style: Toast.Style.Success,
        title: "Conflicts resolved",
        message: `File "${basename(context.filePath)}" has been updated`,
      });

      context.status.revalidate();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply resolutions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const getSegmentTitle = (segment: ConflictSegment): string => {
    // Get first non-empty line from current or incoming content
    const currentFirstLine = segment.currentContent.split("\n").find((line) => line.trim() !== "");
    const incomingFirstLine = segment.incomingContent.split("\n").find((line) => line.trim() !== "");
    
    return currentFirstLine || incomingFirstLine || "Empty conflict";
  };

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
              title={getSegmentTitle(segment)}
              onSetResolution={setResolution}
              onApplyAll={allResolved ? applyResolutions : undefined}
            />
          ))}
        </List.Section>
      )}

      {allResolved && segments.length > 0 && (
        <List.Item
          title="✅ All conflicts resolved"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="Apply Resolutions"
                icon={{ source: Icon.Check, tintColor: Color.Green }}
                onAction={applyResolutions}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function ConflictSegmentItem({
  segment,
  index,
  totalSegments,
  title,
  onSetResolution,
  onApplyAll,
}: {
  segment: ConflictSegment;
  index: number;
  totalSegments: number;
  title: string;
  onSetResolution: (segmentId: string, resolution: "current" | "incoming") => void;
  onApplyAll?: () => void;
}) {
  const isResolved = segment.resolution !== null;

  const getIcon = () => {
    if (!isResolved) {
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    }
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  };

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
      subtitle={isResolved ? `✓ Resolved: ${segment.resolution === "current" ? segment.currentLabel : segment.incomingLabel}` : "Not resolved"}
      icon={getIcon()}
      accessories={[
        { text: `Conflict ${index}/${totalSegments}` },
        { text: `Lines ${segment.startLine}-${segment.endLine}` },
      ]}
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
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action
              title={`Select ${segment.incomingLabel}`}
              icon={{ source: Icon.ChevronDown, tintColor: Color.Purple }}
              onAction={() => onSetResolution(segment.id, "incoming")}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
          </ActionPanel.Section>

          {onApplyAll && (
            <ActionPanel.Section title="Apply">
              <Action
                title="Apply All Resolutions"
                icon={{ source: Icon.Check, tintColor: Color.Green }}
                onAction={onApplyAll}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
