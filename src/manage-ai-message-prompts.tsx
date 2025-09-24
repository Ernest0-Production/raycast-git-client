import { ActionPanel, Action, Icon, List, Form, useNavigation, confirmAlert, Alert, AI } from "@raycast/api";
import { useState } from "react";
import { useAiPromptPresets, AiPromptPreset } from "./hooks/useAiPromptPresets";

export default function ManageAiMessagePrompts() {
    const { presets, deletePreset, movePreset } = useAiPromptPresets();

    return (
        <List
            navigationTitle="AI Message Prompts"
            searchBarPlaceholder="Search presets by name..."
            actions={
                <ActionPanel>
                    <Action.Push
                        title="Add New Preset"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={<AiMessagePresetEditorForm />}
                    />
                </ActionPanel>
            }
        >
            {presets.map((preset) => (
                <PresetListItem
                    key={preset.id}
                    preset={preset}
                    isDefault={preset.id === "default"}
                    onDelete={(id) => deletePreset(id)}
                    onMove={(id, direction) => movePreset(id, direction)}
                />
            ))}
        </List>
    );
}

function PresetListItem({
    preset,
    isDefault,
    onDelete,
    onMove
}: {
    preset: AiPromptPreset;
    isDefault: boolean;
    onDelete: (id: string) => void;
    onMove: (id: string, direction: "up" | "down") => void;
}) {
    const handleDelete = async () => {
        const confirmed = await confirmAlert({
            title: "Delete Preset",
            message: `Are you sure you want to delete preset "${preset.name}"?`,
            primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
            },
        });

        if (confirmed) {
            onDelete(preset.id);
        }
    };

    return (
        <List.Item
            title={preset.name}
            accessories={preset.model ? [{ text: preset.model }] : [{ text: "Auto" }]}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title={preset.name}>
                        {!isDefault &&
                            <Action.Push
                                title="Edit Preset"
                                icon={Icon.Pencil}
                                target={<AiMessagePresetEditorForm initialPreset={preset} />}
                                shortcut={{ modifiers: ["cmd"], key: "e" }}
                            />
                        }
                        {!isDefault &&
                            <Action
                                title="Delete Preset"
                                icon={Icon.Trash}
                                style={Action.Style.Destructive}
                                onAction={handleDelete}
                                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                            />
                        }
                    </ActionPanel.Section>
                    <Action.Push
                        title="Add New Preset"
                        icon={Icon.Plus}
                        shortcut={{ modifiers: ["cmd"], key: "n" }}
                        target={<AiMessagePresetEditorForm />}
                    />

                    <ActionPanel.Section title="Order">
                        <Action
                            title="Move Up"
                            icon={Icon.ChevronUp}
                            onAction={() => onMove(preset.id, "up")}
                            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                        />
                        <Action
                            title="Move Down"
                            icon={Icon.ChevronDown}
                            onAction={() => onMove(preset.id, "down")}
                            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                        />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    );
}

export function AiMessagePresetEditorForm({ initialPreset }: { initialPreset?: AiPromptPreset; }) {
    const { pop } = useNavigation();
    const { addPreset, updatePreset } = useAiPromptPresets();
    const [name, setName] = useState(initialPreset?.name ?? "");
    const [prompt, setPrompt] = useState(initialPreset?.prompt ?? "");
    const [model, setModel] = useState<string>(initialPreset?.model ?? "auto");

    const handleSubmit = (values: { name: string; prompt: string, model: string }) => {
        const aiModel = values.model === "auto" ? undefined : values.model;
        if (initialPreset) {
            updatePreset(initialPreset.id, values.name.trim(), values.prompt.trim(), aiModel);
        } else {
            addPreset(values.name.trim(), values.prompt.trim(), aiModel);
        }
        pop();
    };

    return (
        <Form
            navigationTitle={initialPreset ? `Edit Preset` : "Add Preset"}
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title={initialPreset ? "Save Changes" : "Create Preset"}
                        onSubmit={handleSubmit}
                    />
                </ActionPanel>
            }
        >
            <Form.TextField
                id="name"
                title="Name"
                placeholder="e.g., Conventional Commits"
                value={name}
                error={name.trim().length === 0 ? "Required" : undefined}
                onChange={setName}
            />
            <Form.TextArea
                id="prompt"
                title="Prompt"
                placeholder="Write system prompt for AI commit generation..."
                value={prompt}
                error={prompt.trim().length === 0 ? "Required" : undefined}
                onChange={setPrompt}
            />

            <Form.Dropdown
                id="model"
                title="AI Model"
                value={model ?? "auto"}
                onChange={setModel}
            >
                <Form.Dropdown.Item value={"auto"} title="Auto" />
                {Object.keys(AI.Model).map((model) => (
                    <Form.Dropdown.Item key={model} value={model} title={model} />
                ))}
            </Form.Dropdown>

            <Form.Description
                text="Prompt is used to generate commit message based on diff content. It will be available via 'Generate Commit Message' action in Commit Message Form."
            />
        </Form>
    );
}


