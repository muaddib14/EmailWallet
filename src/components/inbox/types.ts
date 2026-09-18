export type Folder = "inbox" | "starred" | "sent" | "drafts" | "archive" | "trash";

export const FOLDER_LABELS: Record<Folder, string> = {
  inbox: "Inbox",
  starred: "Starred",
  sent: "Sent",
  drafts: "Drafts",
  archive: "Archive",
  trash: "Trash",
};
