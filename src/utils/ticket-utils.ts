import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../types";

/**
 * Extracts ticket number from commit message using configured regex pattern.
 */
export function extractTicketFromMessage(message: string): string | null {
  const preferences = getPreferenceValues<Preferences>();
  const { ticketRegex } = preferences;

  if (!ticketRegex || ticketRegex.trim() === "") {
    return null;
  }

  try {
    const regex = new RegExp(ticketRegex, "i");
    const match = message.match(regex);
    
    if (match && match.length > 1) {
      // Return first capture group
      return match[1];
    } else if (match && match.length === 1) {
      // Return full match if no capture groups
      return match[0];
    }
    
    return null;
  } catch (error) {
    // Invalid regex pattern - silently fail
    return null;
  }
}

/**
 * Generates ticket URL from template and ticket key.
 */
export function generateTicketUrl(ticketKey: string): string | null {
  const preferences = getPreferenceValues<Preferences>();
  const { ticketUrlTemplate } = preferences;

  if (!ticketUrlTemplate || ticketUrlTemplate.trim() === "" || !ticketKey) {
    return null;
  }

  return ticketUrlTemplate.replace("@key", ticketKey);
}

/**
 * Extracts ticket from commit message and generates URL if possible.
 */
export function getTicketInfoFromCommit(message: string): { ticketKey: string; ticketUrl: string } | null {
  const ticketKey = extractTicketFromMessage(message);
  
  if (!ticketKey) {
    return null;
  }

  const ticketUrl = generateTicketUrl(ticketKey);
  
  if (!ticketUrl) {
    return null;
  }

  return { ticketKey, ticketUrl };
}