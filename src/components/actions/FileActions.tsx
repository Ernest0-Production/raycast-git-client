import { Action, Icon } from "@raycast/api";
import { existsSync } from "fs";
import { RepositoryContext } from "../../open-repository";


/**
 * Action for opening a file in default editor by absolute path.
 */
export function FileOpenAction({ filePath, onOpen }: { filePath: string, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.Open
      title="Open"
      target={filePath}
      icon={Icon.Document}
      shortcut={{ modifiers: ["cmd"], key: "o" }}
      onOpen={onOpen}
    />
  );
}

/**
 * Action for opening a file with a custom application by absolute path.
 */
export function FileOpenWithAction({ filePath, onOpen }: { filePath: string, onOpen?: () => void }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.OpenWith
      path={filePath}
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
      onOpen={onOpen}
    />
  );
}

export function FileQuickLookAction({ filePath }: { filePath: string }) {
  if (!existsSync(filePath)) return null;

  return (
    <Action.ToggleQuickLook
      shortcut={{ modifiers: ["cmd"], key: "y" }}
    />
  );
}

/**
 * Action for copying file path to clipboard.
 */
export function FileCopyPathAction({ filePath }: { filePath: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy File Path"
      content={filePath}
      shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
    />
  );
}

/**
 * Action for moving a file to trash.
 */
export function FileMoveToTrashAction(context: RepositoryContext & {
  filePath: string;
  isAddedFile: boolean;
}) {
  if (!context.isAddedFile || !existsSync(context.filePath)) return null;

  return (
    <Action.Trash
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      paths={[context.filePath]}
      onTrash={context.status.revalidate}
    />
  );
}
