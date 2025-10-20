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

      const isAllResolved = segments.every(segment => segment.resolution !== null);
      if (isAllResolved) {
        await context.gitManager.stageFile(context.filePath);
        context.status.revalidate();
      }
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
        <>
          {segments.map((segment) => (
            <List.Section
              key={segment.id}
              title={`Lines ${segment.startLine}-${segment.endLine}`}
            >
              <ConflictOptionItem
                filePath={context.filePath}
                segment={segment}
                type="current"
                onSetResolution={() => resolveSegment(segment.id, "current")}
                onDiscardSelection={() => resolveSegment(segment.id, null)}
                onApplyAll={applyResolutions}
              />
              <ConflictOptionItem
                filePath={context.filePath}
                segment={segment}
                type="incoming"
                onSetResolution={() => resolveSegment(segment.id, "incoming")}
                onDiscardSelection={() => resolveSegment(segment.id, null)}
                onApplyAll={applyResolutions}
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
  onDiscardSelection,
  onApplyAll,
}: {
  filePath: string;
  segment: ConflictSegment;
  type: "current" | "incoming";
  onSetResolution: () => void;
  onDiscardSelection: () => void;
  onApplyAll?: () => void;
}) {
  const label = type === "current" ? segment.currentLabel : segment.incomingLabel;
  const content = type === "current" ? segment.currentContent : segment.incomingContent;

  const title = useMemo(() => {
    const firstLine = content.split("\n").find((line) => line.trim() !== "");
    return `${firstLine ? `${firstLine}` : "<empty>"}`;
  }, [content]);

  const icon = useMemo(() => {
    if (segment.resolution === null) {
      return {
        tooltip: "Unresolved",
        value: { source: `tag-solid.svg`, tintColor: Color.SecondaryText }
      };
    }
    if (segment.resolution === type) {
      return {
        tooltip: "Selected",
        value: { source: `tag-solid.svg`, tintColor: Color.Blue }
      };
    }
    return {
      tooltip: "Unselected",
      value: { source: `tag-outline.svg`, tintColor: Color.SecondaryText }
    };
  }, [segment.resolution, type]);

  const detailMarkdown = useMemo(() => {
    if (content === "") {
      return [
        `${label}`,
        "```",
        "Empty content",
        "```",
      ].join("\n");
    }

    return [
      `${label}`,
      "",
      "```diff",
      content,
      "```",
    ].join("\n");
  }, [content, label]);

  return (
    <List.Item
      title={{
        value: title,
        tooltip: label,
      }}
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
              title={`Select ${label}`}
              icon={Icon.CheckCircle}
              onAction={onSetResolution}
            />
            {segment.resolution !== null && (
              <Action
                title="Discard Selection"
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={onDiscardSelection}
                shortcut={{ modifiers: ["cmd"], key: "z" }}
              />
            )}
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
