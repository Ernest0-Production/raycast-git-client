import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { UrlTrackerConfig } from "../../types";
import { useUrlTracker, validateUrlTrackerConfig } from "../../hooks/useUrlTracker";
import { nanoid } from "nanoid";
import { showFailureToast } from "@raycast/utils";

interface ConfigureUrlTrackerFormProps {
  repositoryPath: string;
  onConfigurationSaved?: () => void;
}

export function ConfigureUrlTrackerForm({ repositoryPath, onConfigurationSaved }: ConfigureUrlTrackerFormProps) {
  const { pop } = useNavigation();
  const { configs: initialConfigs, setConfigs: saveConfigs } = useUrlTracker(repositoryPath);
  const [draftConfigs, setDraftConfigs] = useState<UrlTrackerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing configurations on mount
  useEffect(() => {
    const formConfigs = [...initialConfigs];
    // Add empty config if no existing configurations
    if (formConfigs.length === 0) {
      formConfigs.push(createEmptyConfig());
    }

    setDraftConfigs(formConfigs);
    setIsLoading(false);
  }, [initialConfigs]);

  const createEmptyConfig = (): UrlTrackerConfig => ({
    id: nanoid(),
    title: "",
    regex: "",
    urlPlaceholder: "",
  });

  const addNewConfig = () => {
    setDraftConfigs([...draftConfigs, createEmptyConfig()]);
  };

  const removeConfig = (configId: string) => {
    if (draftConfigs.length <= 1) {
      // Keep at least one config
      setDraftConfigs([createEmptyConfig()]);
    } else {
      setDraftConfigs(draftConfigs.filter((config) => config.id !== configId));
    }
  };

  const updateConfig = (configId: string, field: keyof UrlTrackerConfig, value: string) => {
    setDraftConfigs(draftConfigs.map((config) => (config.id === configId ? { ...config, [field]: value } : config)));
  };

  const handleSubmit = async () => {
    try {
      // Filter out empty configurations
      const validConfigs: UrlTrackerConfig[] = draftConfigs.filter(
        (config) => config.title.trim() !== "" || config.regex.trim() !== "" || config.urlPlaceholder.trim() !== "",
      );

      saveConfigs(validConfigs);

      await showToast({
        style: Toast.Style.Success,
        title: "Configuration saved"
      });

      onConfigurationSaved?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to save configuration" });
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Configure URL Tracker"
      actions={
        <ActionPanel>
          <Action title="Save Configuration" onAction={handleSubmit} icon={Icon.Check} />
          <Action
            title="Add New Tracker"
            onAction={addNewConfig}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {draftConfigs.length > 1 && (
            <ActionPanel.Section title="Remove Configurations">
              {draftConfigs.map((config, _index) => (
                <Action
                  key={config.id}
                  title={`Remove "${config.title || `Configuration ${_index + 1}`}"`}
                  onAction={() => removeConfig(config.id)}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >

      {draftConfigs.map((config, index) => {
        const isFirst = index === 0;

        return (
          <React.Fragment key={config.id}>
            {!isFirst && <Form.Separator />}

            <Form.TextField
              id={`${config.id}-title`}
              title="Title"
              placeholder="Jira Ticket, GitHub Issue, Pull Request"
              value={config.title}
              error={config.title.trim() === "" ? "Required" : undefined}
              onChange={(value) => updateConfig(config.id, "title", value)}
            />

            <Form.TextField
              id={`${config.id}-regex`}
              title="Regex Pattern"
              placeholder="([A-Z]+-\\d+) for JIRA-123"
              value={config.regex}
              error={config.regex.trim() === "" ? "Required" : undefined}
              onChange={(value) => updateConfig(config.id, "regex", value)}
            />

            <Form.TextField
              id={`${config.id}-url_placeholder`}
              title="URL Template"
              placeholder="https://company.atlassian.net/browse/@key"
              info="Use @key placeholder where the regex match should be inserted"
              value={config.urlPlaceholder}
              error={config.urlPlaceholder.trim() === "" ? "Required" : undefined}
              onChange={(value) => updateConfig(config.id, "urlPlaceholder", value)}
            />

            {(() => {
              const validationMessage = validateUrlTrackerConfig(config);
              return validationMessage ? <Form.Description text={validationMessage} /> : null;
            })()}
          </React.Fragment>
        );
      })}

    </Form>
  );
}
