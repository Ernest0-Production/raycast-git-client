import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import React, { useEffect, useMemo, useState } from "react";
import OpenRepository from "./open-repository";
import { GitManager } from "./utils/git-manager";

interface Arguments {
  url?: string;
}

export default function CloneRepository({ arguments: args }: { arguments?: Arguments }) {
  const { push } = useNavigation();

  const [repoUrl, setRepoUrl] = useState<string>(args?.url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remember last used parent directory for future clones
  const [cachedParentDir, setCachedParentDir] = useCachedState<string>(
    "git-last-clone-parent-dir",
    ""
  );
  const [parentDirectory, setParentDirectory] = useState<string[]>(
    cachedParentDir ? [cachedParentDir] : []
  );

  // HTTPS optional credentials
  const [httpsUsername, setHttpsUsername] = useState("");
  const [httpsPassword, setHttpsPassword] = useState("");

  useEffect(() => {
    if (parentDirectory.length > 0) {
      setCachedParentDir(parentDirectory[0]);
    }
  }, [parentDirectory, setCachedParentDir]);

  const urlType: "https" | "ssh" | "invalid" | "empty" = useMemo(() => {
    if (!repoUrl || repoUrl.trim() === "") return "empty";
    if (/^https?:\/\//i.test(repoUrl.trim())) return "https";
    if (/^ssh:\/\//i.test(repoUrl.trim())) return "ssh";
    if (/^[\w.-]+@[^:]+:.+/.test(repoUrl.trim())) return "ssh"; // git@github.com:org/repo.git
    return "invalid";
  }, [repoUrl]);

  const urlValidationError = useMemo(() => {
    if (urlType === "empty") return undefined; // optional field
    if (urlType === "invalid") return "Enter a valid SSH or HTTPS URL";
    return undefined;
  }, [urlType]);

  const parentDirValidationError = useMemo(() => {
    if (parentDirectory.length === 0) return "Required";
    return undefined;
  }, [parentDirectory]);

  const handleSubmit = async () => {
    if (urlType !== "https" && urlType !== "ssh") {
      return; // Do nothing if URL is invalid or empty
    }
    if (parentDirectory.length === 0) {
      return; // Required field
    }

    setIsSubmitting(true);
    try {
      const targetPath = await GitManager.cloneRepository({
        url: repoUrl.trim(),
        parentDirectory: parentDirectory[0],
        httpsCredentials:
          urlType === "https"
            ? {
                username: httpsUsername.trim() || undefined,
                password: httpsPassword,
              }
            : undefined,
      });

      // On success open the repository view
      push(<OpenRepository arguments={{ path: targetPath }} />);
    } catch (_error) {
      // Intentionally do nothing on failure as requested
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      navigationTitle="Clone Repository"
      isLoading={isSubmitting}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clone Repository" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="Repository URL"
        placeholder="SSH or HTTPS URL"
        value={repoUrl}
        onChange={setRepoUrl}
        error={urlValidationError}
      />

      <Form.FilePicker
        id="parentDirectory"
        title="Parent Directory"
        value={parentDirectory}
        onChange={setParentDirectory}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={parentDirValidationError}
      />

      {urlType === "https" && (
        <>
          <Form.Separator />
          <Form.TextField
            id="username"
            title="Username (HTTPS)"
            placeholder="Optional"
            value={httpsUsername}
            onChange={setHttpsUsername}
          />
          {/* Password is optional; leave blank to use credential helper */}
          <Form.PasswordField
            id="password"
            title="Password (HTTPS)"
            placeholder="Optional"
            value={httpsPassword}
            onChange={setHttpsPassword}
          />
        </>
      )}

      {urlType === "ssh" && (
        <>
          <Form.Separator />
          <Form.Description text="Using SSH. Credentials are managed by your SSH agent (if configured)." />
        </>
      )}
    </Form>
  );
}

