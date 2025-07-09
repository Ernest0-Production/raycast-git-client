import { List, Icon } from "@raycast/api";

interface LoadingViewProps {
  title?: string;
  navigationTitle?: string;
}

/**
 * Component for displaying loading state.
 */
export function LoadingView({ title = "Loading...", navigationTitle }: LoadingViewProps) {
  return (
    <List isLoading={true} navigationTitle={navigationTitle}>
      <List.Item title={title} icon={Icon.Clock} />
    </List>
  );
}
