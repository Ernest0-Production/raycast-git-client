import { ActionPanel, Action, Icon, List, Form, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useState } from "react";
import { UrlTrackerConfig } from "./types";
import { useUrlTracker } from "./hooks/useUrlTracker";

export default function ConfigureUrlTrackers() {
    const { configs, deleteConfig } = useUrlTracker();

    return (
        <List
            navigationTitle="Configure URL Trackers"
            searchBarPlaceholder="Search rules by title..."
            actions={
                <ActionPanel>
                    <Action.Push
                        title="Add New Rule"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={<UrlTrackerEditorForm />}
                    />
                </ActionPanel>
            }
        >
            {configs.map((config) => (
                <RuleListItem
                    key={config.id}
                    config={config}
                    onDelete={deleteConfig}
                />
            ))}
        </List>
    );
}

function RuleListItem({
    config,
    onDelete
}: {
    config: UrlTrackerConfig;
    onDelete: (id: string) => void;
}) {
    const handleDelete = async () => {
        const confirmed = await confirmAlert({
            title: "Delete Rule",
            message: `Are you sure you want to delete rule "${config.title}"?`,
            primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (confirmed) {
            onDelete(config.id);
        }
    };

    return (
        <List.Item
            title={config.title}
            accessories={[{ text: config.urlPlaceholder }]}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title={config.title}>
                        <Action.Push
                            title="Edit Rule"
                            icon={Icon.Pencil}
                            shortcut={{ modifiers: ["cmd"], key: "e" }}
                            target={<UrlTrackerEditorForm initialConfig={config} />}
                        />
                        <Action
                            title="Delete Rule"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={handleDelete}
                            shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        />
                    </ActionPanel.Section>

                    <Action.Push
                        title="Add New Rule"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={<UrlTrackerEditorForm />}
                    />
                </ActionPanel>
            }
        />
    );
}

function UrlTrackerEditorForm({ initialConfig }: { initialConfig?: UrlTrackerConfig }) {
    const { pop } = useNavigation();
    const { addConfig, updateConfig, validateConfig } = useUrlTracker();

    const [title, setTitle] = useState(initialConfig?.title ?? "");
    const [regex, setRegex] = useState(initialConfig?.regex ?? "");
    const [urlPlaceholder, setUrlPlaceholder] = useState(initialConfig?.urlPlaceholder ?? "");

    const handleSubmit = (values: { title: string; regex: string; urlPlaceholder: string }) => {
        validateConfig(values);

        if (initialConfig) {
            updateConfig(initialConfig.id, values.title.trim(), values.regex.trim(), values.urlPlaceholder.trim());
        } else {
            addConfig(values.title.trim(), values.regex.trim(), values.urlPlaceholder.trim());
        }
        pop();
    };

    return (
        <Form
            navigationTitle={initialConfig ? "Edit Rule" : "Add Rule"}
            searchBarAccessory={
                <Form.LinkAccessory
                    text="Regex Playground"
                    target="https://regex101.com/"
                />
            }
            actions={
                <ActionPanel>
                    <Action.SubmitForm title={initialConfig ? "Save Changes" : "Create Rule"} onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="title"
                title="Title"
                placeholder="e.g., Jira Ticket, GitHub Issue, Pull Request"
                value={title}
                error={title.trim().length === 0 ? "Required" : undefined}
                onChange={setTitle}
            />
            <Form.TextField
                id="regex"
                title="Regex Pattern"
                placeholder="([A-Z]+-\\d+) for JIRA-123"
                value={regex}
                error={regex.trim().length === 0 ? "Required" : undefined}
                onChange={setRegex}
            />
            <Form.TextField
                id="urlPlaceholder"
                title="URL Template"
                placeholder="https://company.atlassian.net/browse/@key"
                info="Use @key placeholder where the regex match should be inserted"
                value={urlPlaceholder}
                error={urlPlaceholder.trim().length === 0 ? "Required" : undefined}
                onChange={setUrlPlaceholder}
            />
        </Form>
    );
}


