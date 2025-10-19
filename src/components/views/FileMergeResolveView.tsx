import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { ConflictSegment } from "../../types";
import { useConflictResolver } from "../../hooks/useConflictResolver";
import { RepositoryContext } from "../../open-repository";
import { basename } from "path";
import { FileManagerActions } from "../actions/FileActions";
import { existsSync } from "fs";

export default function FileMergeResolveView(context: RepositoryContext & { filePath: string }) {
  const { pop } = useNavigation();
  const {
    segments,
    isLoading,
    resolveSegment,
    applyResolution,
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

      await context.gitManager.stageFile(context.filePath);
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

  return (
    <List
      isLoading={isLoading}
      navigationTitle={"Resolve Conflicts"}
      isShowingDetail={true}
    >
      {segments.length === 0 ? (
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
          {segments.map((segment) => (
            <ConflictSegmentItem
              key={segment.id}
              filePath={context.filePath}
              segment={segment}
              onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
              onApplyAll={applyResolutions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ConflictSegmentItem({
  filePath,
  segment,
  onSetResolution,
  onApplyAll,
}: {
  filePath: string;
  segment: ConflictSegment;
  onSetResolution: (resolution: "current" | "incoming" | null) => void;
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

  const detailMarkdown = useMemo(() => {
    const formatMarkdownContent = (content: string, label: string, selected: boolean) => {
      if (!content) {
        return [
          `> ${selected ? "✔︎" : "*"} ${label} (empty)`,
          ``,
        ].join("\n");
      }

      return [
        `> ${selected ? "✔︎" : "*"} ${label}`,
        ``,
        `\`\`\`\n${content}\n\`\`\``,
        ``,
      ]
        .join("\n");
    };

    return [
      `Lines: ${segment.startLine}-${segment.endLine}`,
      ``,
      formatMarkdownContent(segment.currentContent, segment.currentLabel, segment.resolution === "current"),
      ``,
      formatMarkdownContent(segment.incomingContent, segment.incomingLabel, segment.resolution === "incoming")
    ].join("\n");
  }, [segment]);

  return (
    <List.Item
      title={title}
      icon={icon}
      detail={
        <List.Item.Detail
          markdown={detailMarkdown}
        />
      }
      quickLook={existsSync(filePath) ? { path: filePath, name: basename(filePath) } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={`Select ${segment.currentLabel}`}
              icon={Icon.ChevronUp}
              onAction={() => onSetResolution("current")}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
            />
            <Action
              title={`Select ${segment.incomingLabel}`}
              icon={Icon.ChevronDown}
              onAction={() => onSetResolution("incoming")}
              shortcut={{ modifiers: ["cmd"], key: "]" }}
            />
            <Action
              title="Discard"
              icon={Icon.ArrowCounterClockwise}
              style={Action.Style.Destructive}
              onAction={() => onSetResolution(null)}
              shortcut={{ modifiers: ["cmd"], key: "z" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Apply All Resolutions"
              icon={{ source: Icon.Check, tintColor: Color.Green }}
              onAction={onApplyAll}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            />
          </ActionPanel.Section>

          <FileManagerActions filePath={filePath} />
        </ActionPanel>
      }
    />
  );
}
