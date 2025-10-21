import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { ConflictSegment } from "../../types";
import { useConflictResolver } from "../../hooks/useConflictResolver";
import { RepositoryContext } from "../../open-repository";
import { basename } from "path";
import { FileManagerActions } from "../actions/FileActions";
import { existsSync, readFileSync } from "fs";

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
      title: "Apply Resolved Changes",
      message: `Are you sure you want to apply selected resolutions to "${basename(context.filePath)}"?`,
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

  const title = useMemo(() => {
    const selectingContent = type === "current" ? segment.currentContent : segment.incomingContent
    const firstLine = selectingContent.split("\n").find((line) => line.trim() !== "");
    return `${firstLine ? `${firstLine}` : "<empty>"}`;
  }, [type]);

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
    const selectedSegmentContent = type === "current" ? segment.currentContent : segment.incomingContent;

    return [
      `${label}`,
      "~~~diff",
      segment.beforeContent,
      `+ ${selectedSegmentContent.replace(/\n/g, `\n+ `)}`,
      segment.afterContent,
      "~~~"
    ].join("\n");
  }, [type, segment]);

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
            {segment.resolution !== type ?
              <Action
                title={`Select ${label}`}
                icon={{ source: Icon.Checkmark, tintColor: Color.Blue }}
                onAction={onSetResolution}
              /> :
              <Action
                title={`Deselect ${label}`}
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={onDiscardSelection}
              />
            }
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Save Resolved Changes"
              icon={Icon.SaveDocument}
              onAction={onApplyAll}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          </ActionPanel.Section>
          <FileManagerActions filePath={filePath} />
        </ActionPanel>
      }
    />
  );
}
