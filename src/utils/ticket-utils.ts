import { extractUrlsFromCommit } from "./url-tracker-cache";

/**
 * Legacy function - kept for backward compatibility.
 * Now delegates to the new URL tracker system.
 * @deprecated Use extractUrlsFromCommit directly
 */
export async function getTicketInfoFromCommit(
  message: string,
): Promise<{ ticketKey: string; ticketUrl: string } | null> {
  const urls = await extractUrlsFromCommit(message);

  // Return the first URL tracker result for backward compatibility
  if (urls.length > 0) {
    const firstResult = urls[0];
    // Extract key from URL by reversing the @key replacement
    // This is a best-effort attempt for backward compatibility
    const ticketKey = extractKeyFromUrl(firstResult.url, firstResult.title);
    return {
      ticketKey: ticketKey || "Unknown",
      ticketUrl: firstResult.url,
    };
  }

  return null;
}

/**
 * Attempts to extract the key from a generated URL for backward compatibility.
 * This is a best-effort function and may not work for all URL patterns.
 */
function extractKeyFromUrl(url: string, _title: string): string | null {
  // Try common patterns to extract the key
  const patterns = [
    /\/([A-Z]+-\d+)(?:[/#?]|$)/i, // JIRA-style: PROJ-123
    /\/(\d+)(?:[/#?]|$)/, // GitHub issues: #123
    /\/([A-Z]{2,4}-\d+)(?:[/#?]|$)/i, // Linear-style: ABC-123
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // If no pattern matches, try to extract the last path segment
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split("/").filter((segment) => segment.length > 0);
  if (pathSegments.length > 0) {
    return pathSegments[pathSegments.length - 1];
  }

  return null;
}
