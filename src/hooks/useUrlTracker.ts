import { useCachedState } from "@raycast/utils";
import { UrlTrackerConfig } from "../types";

/**
 * Hook to manage URL tracker configurations for a specific repository.
 *
 * @param repositoryPath The path of the repository.
 */
export function useUrlTracker(repositoryPath: string) {
    const [allConfigs, setAllConfigs] = useCachedState<UrlTrackerConfig[]>(
        `url-tracker-all-configs-${repositoryPath}`,
        []
    );

    const addConfig = (newConfig: UrlTrackerConfig) => {
        setAllConfigs([...allConfigs, newConfig]);
        return newConfig;
    };

    const updateConfig = (updatedConfig: UrlTrackerConfig) => {
        setAllConfigs(allConfigs.map((c) => (c.id === updatedConfig.id ? updatedConfig : c)));
    };

    const deleteConfig = (configId: string) => {
        setAllConfigs(allConfigs.filter((c) => c.id !== configId));
    };

    return {
        configs: allConfigs,
        setConfigs: setAllConfigs,
        addConfig,
        updateConfig,
        deleteConfig,
    };
}

/**
 * Validates URL tracker configuration.
 */
export function validateUrlTrackerConfig(config: UrlTrackerConfig): string | null {
    // Test regex validity
    try {
        new RegExp(config.regex);
    } catch (error) {
        return "Invalid regex pattern";
    }

    // Check if URL template contains @key placeholder
    if (!config.urlPlaceholder.includes("@key")) {
        return "URL template must contain @key placeholder";
    }

    return null;
}

/**
 * Extracts URLs from commit message using provided configurations.
 */
export function extractUrlsFromCommitWithConfigs(
    message: string,
    configs: UrlTrackerConfig[],
): Array<{ title: string; url: string }> {
    const results: Array<{ title: string; url: string }> = [];

    for (const config of configs) {
        try {
            const regex = new RegExp(config.regex, "i");
            const match = message.match(regex);

            let extractedKey: string | null = null;

            if (match && match.length > 1) {
                // Use first capture group
                extractedKey = match[1];
            } else if (match && match.length === 1) {
                // Use full match if no capture groups
                extractedKey = match[0];
            }

            if (extractedKey) {
                const url = config.urlPlaceholder.replace("@key", extractedKey);
                results.push({ title: config.title, url });
            }
        } catch {
            // Skip invalid regex patterns
            console.error(`Invalid regex pattern in config "${config.title}"`);
        }
    }

    return results;
}

/**
 * Replaces URL patterns in text with markdown links using provided configurations.
 */
export function replaceUrlPatternsWithLinks(text: string, configs: UrlTrackerConfig[]): string {
    let result = text;

    for (const config of configs) {
        try {
            const regex = new RegExp(config.regex, "gi"); // Global flag to replace all matches

            result = result.replace(regex, (match, captureGroup, offset, string) => {
                // Check if this match is already inside a markdown link
                const beforeMatch = string.substring(0, offset);
                const afterMatch = string.substring(offset + match.length);

                // Simple check for existing markdown link format [text](url)
                const isInsideLink =
                    beforeMatch.includes("[") &&
                    afterMatch.includes("](") &&
                    beforeMatch.lastIndexOf("[") > beforeMatch.lastIndexOf("]");

                if (isInsideLink) {
                    return match; // Don't replace if already inside a link
                }

                let extractedKey: string;

                if (captureGroup) {
                    // Use first capture group if available
                    extractedKey = captureGroup;
                } else {
                    // Use full match if no capture groups
                    extractedKey = match;
                }

                const url = config.urlPlaceholder.replace("@key", extractedKey);
                return `[${match}](${url})`;
            });
        } catch {
            // Skip invalid regex patterns
            console.error(`Invalid regex pattern in config "${config.title}"`);
        }
    }

    return result;
}
