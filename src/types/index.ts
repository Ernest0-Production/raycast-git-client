// Export all types from modules
export * from "./repository";
export * from "./git";
export * from "./ui";

/**
 * User preferences for the Git Client extension.
 */
export interface Preferences {
    /** Default editor for opening files. */
    defaultEditor: string;
    /** Maximum number of files to display in status view. */
    maxFilesToShow: string;
    /** Maximum number of branches to display. */
    maxBranchesToShow: string;
    /** Maximum number of commits to load in history. */
    maxCommitsToLoad: string;
    /** Regular expression pattern to extract ticket numbers from commit messages. */
    ticketRegex: string;
    /** URL template for ticket links. Use @key as placeholder for the extracted ticket number. */
    ticketUrlTemplate: string;
}
