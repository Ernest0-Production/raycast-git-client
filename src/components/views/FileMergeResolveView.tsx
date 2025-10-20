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

  const allResolved = segments.every(seg => seg.resolution !== null);

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
        <>
          {segments.map((segment, index) => (
            <List.Section
              key={segment.id}
              title={`Conflict ${index + 1} of ${segments.length}`}
              subtitle={`Lines ${segment.startLine}-${segment.endLine} • ${segment.resolution ? "Resolved" : "Unresolved"}`}
            >
              <ConflictOptionItem
                filePath={context.filePath}
                segment={segment}
                type="current"
                onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
                onApplyAll={applyResolutions}
                allResolved={allResolved}
              />
              <ConflictOptionItem
                filePath={context.filePath}
                segment={segment}
                type="incoming"
                onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
                onApplyAll={applyResolutions}
                allResolved={allResolved}
              />
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function ConflictOptionItem({
  filePath,
  segment,
  type,
  onSetResolution,
  onApplyAll,
  allResolved,
}: {
  filePath: string;
  segment: ConflictSegment;
  type: "current" | "incoming";
  onSetResolution: (resolution: "current" | "incoming" | null) => void;
  onApplyAll?: () => void;
  allResolved: boolean;
}) {
  const isCurrent = type === "current";
  const label = isCurrent ? segment.currentLabel : segment.incomingLabel;
  const content = isCurrent ? segment.currentContent : segment.incomingContent;
  const isSelected = segment.resolution === type;
  const nothingSelected = segment.resolution === null;

  const title = useMemo(() => {
    const firstLine = content.split("\n").find((line) => line.trim() !== "");
    return `${label}${firstLine ? `: ${firstLine}` : " (empty)"}`;
  }, [content, label]);

  const icon = useMemo(() => {
    if (nothingSelected) {
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    }
    if (isSelected) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    }
    return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }, [isSelected, nothingSelected]);

  const detailMarkdown = useMemo(() => {
    if (!content || content.trim() === "") {
      return `# ${label}\n\n*Empty content*`;
    }

    return [
      `# ${label}`,
      ``,
      `\`\`\``,
      content,
      `\`\`\``,
    ].join("\n");
  }, [content, label]);

  const accessories = useMemo(() => {
    const result = [];
    if (isSelected) {
      result.push({ icon: { source: Icon.Check, tintColor: Color.Green }, tooltip: "Selected" });
    }
    return result;
  }, [isSelected]);

  return (
    <List.Item
      title={title}
      icon={icon}
      accessories={accessories}
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
              title={`Select This (${label})`}
              icon={Icon.CheckCircle}
              onAction={() => onSetResolution(type)}
              shortcut={{ modifiers: ["cmd"], key: "enter" }}
            />
            {!nothingSelected && (
              <Action
                title="Discard Selection"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={() => onSetResolution(null)}
                shortcut={{ modifiers: ["cmd"], key: "z" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section>
            {allResolved && (
              <Action
                title="Apply All Resolutions"
                icon={{ source: Icon.Check, tintColor: Color.Green }}
                onAction={onApplyAll}
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
            )}
          </ActionPanel.Section>

          <FileManagerActions filePath={filePath} />
        </ActionPanel>
      }
    />
  );
}
