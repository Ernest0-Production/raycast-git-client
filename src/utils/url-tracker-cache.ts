import { LocalStorage } from "@raycast/api";
import { UrlTrackerConfig } from "../types";

const URL_TRACKER_CACHE_KEY = "url-tracker-configs";

/**
 * Loads URL tracker configurations from cache.
 */
export async function loadUrlTrackerConfigs(): Promise<UrlTrackerConfig[]> {
  try {
    const cached = await LocalStorage.getItem<string>(URL_TRACKER_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as UrlTrackerConfig[];
    }
  } catch (error) {
    console.error("Failed to load URL tracker configs:", error);
  }
  return [];
}

/**
 * Saves URL tracker configurations to cache.
 */
export async function saveUrlTrackerConfigs(configs: UrlTrackerConfig[]): Promise<void> {
  try {
    await LocalStorage.setItem(URL_TRACKER_CACHE_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error("Failed to save URL tracker configs:", error);
    throw error;
  }
}

/**
 * Validates URL tracker configuration.
 */
export function validateUrlTrackerConfig(config: UrlTrackerConfig): string | null {
  if (!config.title || config.title.trim() === "") {
    return "Title is required";
  }

  if (!config.regex || config.regex.trim() === "") {
    return "Regex pattern is required";
  }

  if (!config.url_placeholder || config.url_placeholder.trim() === "") {
    return "URL template is required";
  }

  // Test regex validity
  try {
    new RegExp(config.regex);
  } catch (error) {
    return "Invalid regex pattern";
  }

  // Check if URL template contains @key placeholder
  if (!config.url_placeholder.includes("@key")) {
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
        const url = config.url_placeholder.replace("@key", extractedKey);
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
        const isInsideLink = beforeMatch.includes('[') && afterMatch.includes('](') &&
          beforeMatch.lastIndexOf('[') > beforeMatch.lastIndexOf(']');

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

        const url = config.url_placeholder.replace("@key", extractedKey);
        return `[${match}](${url})`;
      });
    } catch {
      // Skip invalid regex patterns
      console.error(`Invalid regex pattern in config "${config.title}"`);
    }
  }

  return result;
}

/**
 * Extracts URLs from commit message using cached configurations.
 * @deprecated Use extractUrlsFromCommitWithConfigs with pre-loaded configs for better performance
 */
export async function extractUrlsFromCommit(message: string): Promise<Array<{ title: string; url: string }>> {
  const configs = await loadUrlTrackerConfigs();
  return extractUrlsFromCommitWithConfigs(message, configs);
}
