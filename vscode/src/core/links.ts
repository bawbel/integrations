/**
 * core/links.ts: Bawbel VS Code Extension
 *
 * The one place that turns settings into AVE links. Call sites never build a records
 * URL by hand.
 */

import * as vscode from "vscode";
import { aveRecordUrl, resolveAveApiUrl } from "./urls";

/** The AVE API base URL: the bawbel.aveApiUrl setting, validated, or the default. */
export function aveApiUrl(): string {
  return resolveAveApiUrl(vscode.workspace.getConfiguration("bawbel").get("aveApiUrl"));
}

/** The link to one AVE record. */
export function aveRecordLink(aveId: string): string {
  return aveRecordUrl(aveApiUrl(), aveId);
}

/** The link to the AVE records list. */
export function aveRecordsIndexLink(): string {
  return `${aveApiUrl()}/records`;
}
