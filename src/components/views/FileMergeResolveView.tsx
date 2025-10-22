import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { ConflictSegment, FileStatus } from "../../types";
import { useConflictResolver } from "../../hooks/useConflictResolver";
import { RepositoryContext } from "../../open-repository";
import { basename } from "path";
import { FileManagerActions } from "../actions/FileActions";
import { existsSync, readFileSync } from "fs";

export default function FileMergeResolveView(context: RepositoryContext & { filePath: string }) {
  const conflictState = useMemo(() => {
    const fileStatuses = context.status.data.files.filter(f => f.path === context.filePath);
    const staged = fileStatuses.find(f => f.status === "staged")!;
    const unstaged = fileStatuses.find(f => f.status === "unstaged")!;

    if (!staged || !unstaged) {
      return undefined;
    }

    return { staged, unstaged };
  }, [context.filePath]);

  if (!conflictState) {
    return <List>
      <List.EmptyView
        title="No conflicts found"
        description="This file doesn't contain any conflict markers."
        icon={Icon.CheckCircle}
      />
    </List>
  }

  const bothModified = conflictState.staged.type === "modified" && conflictState.unstaged.type === "modified";
  if (bothModified) {
    return <SegmentsMergeResolveView {...context} />
  }
  return <FileLevelMergeResolveView
    {...context}
    stageStatus={conflictState.staged}
    unstagedStatus={conflictState.unstaged}
  />
}

function SegmentsMergeResolveView(context: RepositoryContext & { filePath: string }) {
  const { pop } = useNavigation();
  const {
    segments,
    isLoading,
    resolveSegment,
    applyResolution,
  } = useConflictResolver(context.filePath);

  const setAllResolution = (type: "current" | "incoming") => {
    for (const segment of segments) {
      resolveSegment(segment.id, type);
    }
  };

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
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply resolutions",
        message: error instanceof Error ? error.message : "Unknown error",
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
              <ConflictSegmentOptionItem
                filePath={context.filePath}
                segment={segment}
                type="current"
                onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
                onSetAllResolution={setAllResolution}
                onApplyAll={applyResolutions}
              />
              <ConflictSegmentOptionItem
                filePath={context.filePath}
                segment={segment}
                type="incoming"
                onSetResolution={(resolution) => resolveSegment(segment.id, resolution)}
                onSetAllResolution={setAllResolution}
                onApplyAll={applyResolutions}
              />
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

function ConflictSegmentOptionItem({
  filePath,
  segment,
  type,
  onSetResolution,
  onSetAllResolution,
  onApplyAll,
}: {
  filePath: string;
  segment: ConflictSegment;
  type: "current" | "incoming";
  onSetResolution: (type: "current" | "incoming" | null) => void;
  onSetAllResolution: (type: "current" | "incoming") => void;
  onApplyAll?: () => void;
}) {
  const label = type === "current" ? segment.current.label : segment.incoming.label;
  const otherType = type === "current" ? "incoming" : "current";
  const otherLabel = otherType === "current" ? segment.current.label : segment.incoming.label;

  const title = useMemo(() => {
    const selectingContent = type === "current" ? segment.current.content : segment.incoming.content
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
    const selectedSegmentContent = type === "current" ? segment.current.content : segment.incoming.content;

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
          <ActionPanel.Section title={`Lines ${segment.startLine}-${segment.endLine}`}>
            {segment.resolution !== type ?
              <Action
                title={`Select ${label}`}
                icon={{ source: Icon.Checkmark, tintColor: Color.Blue }}
                onAction={() => onSetResolution(type)}
                shortcut={{ modifiers: ["cmd"], key: type === "current" ? "[" : "]" }}
              /> :
              <Action
                title={`Deselect ${label}`}
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={() => onSetResolution(null)}
                shortcut={{ modifiers: ["cmd"], key: type === "current" ? "[" : "]" }}
              />
            }
            {segment.resolution !== otherType ?
              <Action
                title={`Select ${otherLabel}`}
                icon={{ source: Icon.Checkmark, tintColor: Color.Blue }}
                onAction={() => onSetResolution(otherType)}
                shortcut={{ modifiers: ["cmd"], key: otherType === "current" ? "[" : "]" }}
              /> :
              <Action
                title={`Deselect ${otherLabel}`}
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={() => onSetResolution(null)}
                shortcut={{ modifiers: ["cmd"], key: otherType === "current" ? "[" : "]" }}
              />
            }
          </ActionPanel.Section>

          <ActionPanel.Section title="All Lines">
            <Action
              title={`Select ${segment.current.label}`}
              onAction={() => onSetAllResolution("current")}
              shortcut={{ modifiers: ["cmd", "ctrl", "opt"], key: "[" }}
            />
            <Action
              title={`Select ${segment.incoming.label}`}
              onAction={() => onSetAllResolution("incoming")}
              shortcut={{ modifiers: ["cmd", "ctrl", "opt"], key: "]" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title={basename(filePath)}>
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

function FileLevelMergeResolveView(context: RepositoryContext & {
  filePath: string;
  stageStatus: FileStatus;
  unstagedStatus: FileStatus;
}) {
  const { pop } = useNavigation();
  const [resolution, setResolution] = useState<"current" | "incoming" | null>(null);

  const applyResolution = async () => {
    const confirmed = await confirmAlert({
      title: "Apply Resolved Changes",
      message: `Are you sure you want to apply selected resolution to "${basename(context.filePath)}"?`,
      primaryAction: {
        title: "Apply",
        style: Alert.ActionStyle.Default,
      },
    });

    if (!confirmed) return;

    try {
      if (resolution === "current") {
        await context.gitManager.resolveConflictWithOurs(context.filePath);
      } else {
        await context.gitManager.resolveConflictWithTheirs(context.filePath);
      }

      await context.gitManager.stageFile(context.filePath);
      context.status.revalidate();

      await showToast({
        style: Toast.Style.Success,
        title: "Conflicts resolved",
        message: `File "${basename(context.filePath)}" has been updated`,
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to apply resolution",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <List
      navigationTitle="Resolve Conflicts"
      isShowingDetail={false}
    >
      <List.Section title={context.stageStatus.relativePath}>
        <ConflictFileOptionItem
          fileStatus={context.stageStatus}
          resolution={resolution}
          onSetResolution={setResolution}
          onApplyResolution={applyResolution}
        />
        <ConflictFileOptionItem
          fileStatus={context.unstagedStatus}
          resolution={resolution}
          onSetResolution={setResolution}
          onApplyResolution={applyResolution}
        />
      </List.Section>
    </List>
  );
}

function ConflictFileOptionItem({
  fileStatus,
  resolution,
  onSetResolution,
  onApplyResolution,
}: {
  fileStatus: FileStatus;
  resolution: "current" | "incoming" | null;
  onSetResolution: (type: "current" | "incoming" | null) => void;
  onApplyResolution: () => void;
}) {
  const currentVersionType = fileStatus.status === "staged" ? "current" : "incoming";
  const currentVersionName = fileStatus.status === "staged" ? "Local" : "Remote";
  const otherVersionType = currentVersionType === "current" ? "incoming" : "current";
  const otherVersionName = currentVersionType === "current" ? "Remote" : "Local";

  const changeTypeName = useMemo(() => {
    switch (fileStatus.type) {
      case "added": return "Added";
      case "deleted": return "Deleted";
      case "modified": return "Modified";
      case "renamed": return "Renamed";
      case "copied": return "Copied";
      default: return "Changed";
    }
  }, [fileStatus.type]);

  const icon = useMemo(() => {
    if (resolution === null) {
      return {
        tooltip: "Unresolved",
        value: { source: `tag-solid.svg`, tintColor: Color.SecondaryText }
      };
    }
    if (resolution === currentVersionType) {
      return {
        tooltip: "Selected",
        value: { source: `tag-solid.svg`, tintColor: Color.Blue }
      };
    }
    return {
      tooltip: "Unselected",
      value: { source: `tag-outline.svg`, tintColor: Color.SecondaryText }
    };
  }, [resolution, currentVersionType]);

  return (
    <List.Item
      title={`${changeTypeName} Version from ${currentVersionName}`}
      icon={icon}
      quickLook={existsSync(fileStatus.path) ? { path: fileStatus.path, name: basename(fileStatus.path) } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {resolution !== currentVersionType ? (
              <Action
                title={`Select ${currentVersionName} Version`}
                icon={{ source: Icon.Checkmark, tintColor: Color.Blue }}
                onAction={() => onSetResolution(currentVersionType)}
                shortcut={{ modifiers: ["cmd"], key: currentVersionType === "current" ? "[" : "]" }}
              />
            ) : (
              <Action
                title={`Deselect ${currentVersionName} Version`}
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={() => onSetResolution(null)}
                shortcut={{ modifiers: ["cmd"], key: currentVersionType === "current" ? "[" : "]" }}
              />
            )}
            {resolution !== otherVersionType ? (
              <Action
                title={`Select ${otherVersionName} Version`}
                icon={{ source: Icon.Checkmark, tintColor: Color.Blue }}
                onAction={() => onSetResolution(otherVersionType)}
                shortcut={{ modifiers: ["cmd"], key: otherVersionType === "current" ? "[" : "]" }}
              />
            ) : (
              <Action
                title={`Deselect ${otherVersionName} Version`}
                icon={Icon.ArrowCounterClockwise}
                style={Action.Style.Destructive}
                onAction={() => onSetResolution(null)}
                shortcut={{ modifiers: ["cmd"], key: otherVersionType === "current" ? "[" : "]" }}
              />
            )}
          </ActionPanel.Section>
          {resolution !== null && (
            <ActionPanel.Section title={basename(fileStatus.path)}>
              <Action
                title="Save Resolved Changes"
                icon={Icon.SaveDocument}
                onAction={onApplyResolution}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
            </ActionPanel.Section>
          )}
          <FileManagerActions filePath={fileStatus.path} />
        </ActionPanel>
      }
    />
  );
}
