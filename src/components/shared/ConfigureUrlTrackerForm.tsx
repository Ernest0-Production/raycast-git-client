import { ActionPanel, Action, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import React, { useState, useEffect } from "react";
import { UrlTrackerConfig } from "../../types";
import { loadUrlTrackerConfigs, saveUrlTrackerConfigs, validateUrlTrackerConfig } from "../../utils/url-tracker-cache";

interface ConfigureUrlTrackerFormProps {
  onConfigurationSaved?: () => void;
}

interface FormConfigState extends UrlTrackerConfig {
  id: string;
}

export function ConfigureUrlTrackerForm({ onConfigurationSaved }: ConfigureUrlTrackerFormProps) {
  const { pop } = useNavigation();
  const [configs, setConfigs] = useState<FormConfigState[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load existing configurations on mount
  useEffect(() => {
    loadExistingConfigs();
  }, []);

  const loadExistingConfigs = async () => {
    try {
      const existingConfigs = await loadUrlTrackerConfigs();
      const formConfigs = existingConfigs.map((config, index) => ({
        ...config,
        id: `config-${index}`,
      }));

      // Add empty config if no existing configurations
      if (formConfigs.length === 0) {
        formConfigs.push(createEmptyConfig());
      }

      setConfigs(formConfigs);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load configurations",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createEmptyConfig = (): FormConfigState => ({
    id: `config-${Date.now()}`,
    title: "",
    regex: "",
    url_placeholder: "",
  });

  const addNewConfig = () => {
    setConfigs([...configs, createEmptyConfig()]);
  };

  const removeConfig = (configId: string) => {
    if (configs.length <= 1) {
      // Keep at least one config
      setConfigs([createEmptyConfig()]);
    } else {
      setConfigs(configs.filter((config) => config.id !== configId));
    }

    // Clear errors for removed config
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach((key) => {
      if (key.startsWith(configId)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const updateConfig = (configId: string, field: keyof UrlTrackerConfig, value: string) => {
    setConfigs(configs.map((config) => (config.id === configId ? { ...config, [field]: value } : config)));

    // Clear field error when user starts typing
    const errorKey = `${configId}-${field}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Check for at least one non-empty configuration
    const hasValidConfig = configs.some(
      (config) => config.title.trim() !== "" || config.regex.trim() !== "" || config.url_placeholder.trim() !== "",
    );

    if (!hasValidConfig) {
      newErrors.form = "At least one configuration is required";
      isValid = false;
    }

    configs.forEach((config) => {
      // Skip validation for completely empty configs (they will be filtered out)
      const isEmpty = config.title.trim() === "" && config.regex.trim() === "" && config.url_placeholder.trim() === "";
      if (isEmpty) return;

      const validationError = validateUrlTrackerConfig(config);
      if (validationError) {
        // Determine which field has the error
        if (validationError.includes("Title")) {
          newErrors[`${config.id}-title`] = validationError;
        } else if (validationError.includes("Regex") || validationError.includes("regex")) {
          newErrors[`${config.id}-regex`] = validationError;
        } else if (validationError.includes("URL") || validationError.includes("@key")) {
          newErrors[`${config.id}-url_placeholder`] = validationError;
        }
        isValid = false;
      }

      // Check for duplicate titles
      const duplicateTitle = configs.find(
        (c) => c.id !== config.id && c.title.trim() !== "" && c.title.trim() === config.title.trim(),
      );
      if (duplicateTitle) {
        newErrors[`${config.id}-title`] = "Title must be unique";
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Filter out empty configurations and convert to UrlTrackerConfig[]
      const validConfigs: UrlTrackerConfig[] = configs
        .filter(
          (config) => config.title.trim() !== "" || config.regex.trim() !== "" || config.url_placeholder.trim() !== "",
        )
        .map(({ id, ...config }) => config);

      await saveUrlTrackerConfigs(validConfigs);

      await showToast({
        style: Toast.Style.Success,
        title: "Configuration saved",
        message: `${validConfigs.length} URL tracker${validConfigs.length === 1 ? "" : "s"} configured`,
      });

      if (onConfigurationSaved) {
        onConfigurationSaved();
      }

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save configuration",
        message: error instanceof Error ? error.message : "Unknown error",
      });
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
          {configs.length > 1 && (
            <ActionPanel.Section title="Remove Configurations">
              {configs.map((config, _index) => (
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
      {errors.form && <Form.Description text={`❌ ${errors.form}`} />}

      {configs.map((config, index) => {
        const isFirst = index === 0;

        return (
          <React.Fragment key={config.id}>
            {!isFirst && <Form.Separator />}

            <Form.TextField
              id={`${config.id}-title`}
              title="Title"
              placeholder="e.g., Jira Ticket, GitHub Issue, Pull Request"
              value={config.title}
              error={errors[`${config.id}-title`]}
              onChange={(value) => updateConfig(config.id, "title", value)}
            />

            <Form.TextField
              id={`${config.id}-regex`}
              title="Regex Pattern"
              placeholder="e.g., ([A-Z]+-\\d+) for JIRA-123"
              value={config.regex}
              error={errors[`${config.id}-regex`]}
              onChange={(value) => updateConfig(config.id, "regex", value)}
            />

            <Form.TextField
              id={`${config.id}-url_placeholder`}
              title="URL Template"
              placeholder="e.g., https://company.atlassian.net/browse/@key"
              info="Use @key placeholder where the regex match should be inserted"
              value={config.url_placeholder}
              error={errors[`${config.id}-url_placeholder`]}
              onChange={(value) => updateConfig(config.id, "url_placeholder", value)}
            />
          </React.Fragment>
        );
      })}
    </Form>
  );
}
