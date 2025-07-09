import { List, Icon } from "@raycast/api";

interface EmptyViewProps {
  title: string;
  description?: string;
  icon?: Icon;
  navigationTitle?: string;
  actions?: React.ReactNode;
}

/**
 * Component for displaying empty state.
 */
export function EmptyView({ title, description, icon = Icon.Folder, navigationTitle, actions }: EmptyViewProps) {
  return (
    <List navigationTitle={navigationTitle}>
      <List.EmptyView title={title} description={description} icon={icon} actions={actions} />
    </List>
  );
}
