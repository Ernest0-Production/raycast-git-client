import { List, Icon, ActionPanel, Action } from "@raycast/api";

interface ErrorViewProps {
  title?: string;
  message: string;
  navigationTitle?: string;
  onRetry?: () => void;
}

/**
 * Component for displaying errors with a retry action.
 */
export function ErrorView({ title = "Error", message, navigationTitle, onRetry }: ErrorViewProps) {
  return (
    <List navigationTitle={navigationTitle}>
      <List.Item
        title={title}
        subtitle={message}
        icon={Icon.ExclamationMark}
        actions={
          onRetry ? (
            <ActionPanel>
              <Action title="Retry" onAction={onRetry} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          ) : undefined
        }
      />
    </List>
  );
}
