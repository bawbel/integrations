"use strict";
/**
 * extension.ts — Bawbel Scanner VS Code Extension v1.1.0
 *
 * This file is the ONLY entry point. It is intentionally thin:
 *   - Wires modules together
 *   - Registers commands, events, providers
 *   - Delegates all work to feature modules
 *
 * CONTRIBUTING:
 *   - Adding a new command? Register it here, implement it in features/.
 *   - Adding a new UI element? Implement it in ui/, import here.
 *   - NEVER add business logic directly in this file.
 *   - Keep this file under 250 lines. If it grows, extract a module.
 *
 * Module map:
 *   core/types.ts        — shared types and constants
 *   core/cli.ts          — binary discovery, process execution
 *   core/parser.ts       — CLI output normalisation
 *   core/suppressions.ts — .bawbel-suppress.json read/write
 *   core/remediation.ts  — inline "How to fix" hints per rule
 *   features/scanner.ts  — scan orchestration (auto / full / watch)
 *   features/diagnostics.ts — VS Code diagnostic rendering
 *   features/codeActions.ts — right-click quick-fix actions
 *   ui/statusBar.ts      — status bar item
 *   ui/reportPanel.ts    — bawbel report webview
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const cli_1 = require("./core/cli");
const suppressions_1 = require("./core/suppressions");
const types_1 = require("./core/types");
const scanner_1 = require("./features/scanner");
const diagnostics_1 = require("./features/diagnostics");
const codeActions_1 = require("./features/codeActions");
const statusBar_1 = require("./ui/statusBar");
const reportPanel_1 = require("./ui/reportPanel");
// ── Extension-level state ─────────────────────────────────────────────────────
let log;
let statusBar;
let diagnostics;
let scanner = null;
let bawbelPath = null;
// ── Activation ────────────────────────────────────────────────────────────────
async function activate(context) {
    log = vscode.window.createOutputChannel(types_1.OUTPUT_CHANNEL);
    statusBar = new statusBar_1.StatusBarManager();
    diagnostics = new diagnostics_1.DiagnosticsManager(vscode.languages.createDiagnosticCollection("bawbel"));
    (0, cli_1.setLog)(log);
    log.appendLine("Bawbel Scanner v1.1.0 activating...");
    const codeActionProvider = vscode.languages.registerCodeActionsProvider([
        { scheme: "file", language: "markdown" },
        { scheme: "file", language: "yaml" },
        { scheme: "file", language: "json" },
        { scheme: "file", pattern: "**/*.{md,yaml,yml,json,txt}" },
    ], new codeActions_1.BawbelCodeActionProvider(diagnostics), { providedCodeActionKinds: codeActions_1.BawbelCodeActionProvider.PROVIDED_KINDS });
    context.subscriptions.push(vscode.commands.registerCommand("bawbel.scanFile", cmdScanFile), vscode.commands.registerCommand("bawbel.scanWorkspace", cmdScanWorkspace), vscode.commands.registerCommand("bawbel.scanFolder", cmdScanFolder), vscode.commands.registerCommand("bawbel.startWatch", cmdStartWatch), vscode.commands.registerCommand("bawbel.stopWatch", cmdStopWatch), vscode.commands.registerCommand("bawbel.showReport", cmdShowReport), vscode.commands.registerCommand("bawbel.suppressFinding", cmdSuppressFinding), vscode.commands.registerCommand("bawbel.unsuppressFinding", cmdUnsuppressFinding), vscode.commands.registerCommand("bawbel.showSuppressions", cmdShowSuppressions), vscode.commands.registerCommand("bawbel.installCLI", cmdInstallCLI), vscode.commands.registerCommand("bawbel.openPiranhaDB", cmdOpenPiranhaDB), vscode.commands.registerCommand("bawbel.clearAndRescan", cmdClearAndRescan), vscode.workspace.onDidSaveTextDocument(onDidSave), vscode.window.onDidChangeActiveTextEditor(onEditorChange), codeActionProvider, { dispose: () => scanner?.stopWatch() });
    bawbelPath = await ensureCLI();
    if (!bawbelPath) {
        return;
    }
    scanner = new scanner_1.Scanner(bawbelPath, log);
    const version = await (0, cli_1.getBawbelVersion)(bawbelPath);
    log.appendLine(`Bawbel Scanner v1.1.0 ready — CLI: ${version ?? "unknown"}`);
    log.appendLine(`Suppressions: ${(0, suppressions_1.getSuppressFilePath)() ?? "(no workspace)"}`);
    const config = vscode.workspace.getConfiguration("bawbel");
    if (config.get("watchMode", false)) {
        await cmdStartWatch();
    }
}
function deactivate() {
    scanner?.stopWatch();
}
// ── CLI setup ─────────────────────────────────────────────────────────────────
async function ensureCLI() {
    const found = await (0, cli_1.findBawbel)();
    if (found) {
        return found;
    }
    const choice = await vscode.window.showInformationMessage("Bawbel Scanner: CLI not found. Install bawbel-scanner now?", "Install", "Not now");
    if (choice !== "Install") {
        return null;
    }
    statusBar.update("installing");
    const ok = await (0, cli_1.installBawbel)(log);
    statusBar.update("idle");
    if (!ok) {
        vscode.window.showErrorMessage("Bawbel: install failed. See Output panel.");
        return null;
    }
    vscode.window.showInformationMessage("Bawbel Scanner installed ✓");
    return (0, cli_1.findBawbel)();
}
// ── Commands ──────────────────────────────────────────────────────────────────
async function cmdScanFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("Bawbel: no active file to scan.");
        return;
    }
    await runScan((0, scanner_1.autoScanRequest)(editor.document.fileName));
}
async function cmdScanWorkspace() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        vscode.window.showInformationMessage("Bawbel: no workspace folder open.");
        return;
    }
    log.show(true);
    await runScan((0, scanner_1.fullWorkspaceScanRequest)(folder.uri.fsPath));
}
async function cmdScanFolder() {
    const result = await vscode.window.showOpenDialog({
        canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
        openLabel: "Scan this folder",
        defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
    });
    if (!result || result.length === 0) {
        return;
    }
    log.show(true);
    await runScan((0, scanner_1.fullFolderScanRequest)(result[0].fsPath));
}
async function cmdStartWatch() {
    if (!scanner) {
        return;
    }
    if (scanner.isWatching) {
        vscode.window.showInformationMessage("Bawbel: watch mode already active.");
        return;
    }
    const config = vscode.workspace.getConfiguration("bawbel");
    const scope = config.get("watchScope", "workspace");
    let target = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
    if (scope === "file") {
        target = vscode.window.activeTextEditor?.document.fileName ?? target;
    }
    else if (scope === "folder") {
        const pick = await vscode.window.showOpenDialog({
            canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
            openLabel: "Watch this folder",
        });
        if (!pick || pick.length === 0) {
            return;
        }
        target = pick[0].fsPath;
    }
    if (!target) {
        return;
    }
    scanner.startWatch(scope, target, results => { diagnostics.applyResults(results); refreshStatusBar(); }, status => {
        if (status === "started") {
            statusBar.update("watching");
            vscode.window.showInformationMessage(`Bawbel: watch mode started (${scope})`);
        }
        else if (status === "error") {
            statusBar.update("error");
        }
        else {
            refreshStatusBar();
        }
    });
}
function cmdStopWatch() {
    scanner?.stopWatch();
    refreshStatusBar();
    vscode.window.showInformationMessage("Bawbel: watch mode stopped.");
}
async function cmdShowReport() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("Bawbel: open a file to view its report.");
        return;
    }
    if (!bawbelPath) {
        return;
    }
    await reportPanel_1.ReportPanel.show(bawbelPath, editor.document.fileName, log);
}
async function cmdSuppressFinding(filePath, finding) {
    const reason = await vscode.window.showInputBox({
        prompt: `Suppress ${finding.rule_id} on line ${finding.line} — why is this a false positive?`,
        placeHolder: "e.g. documentation example, test fixture, intentional pattern",
        value: "false positive",
    });
    if (reason === undefined) {
        return;
    }
    await (0, suppressions_1.addSuppression)(filePath, finding, reason);
    diagnostics.reRender(filePath);
    refreshStatusBar();
    vscode.window.showInformationMessage(`Suppressed ${finding.rule_id}:${finding.line} — saved to ${types_1.SUPPRESS_FILE}`);
    log.appendLine(`[suppress] ${finding.rule_id} in ${filePath}:${finding.line} — "${reason}"`);
}
function cmdUnsuppressFinding(filePath, finding) {
    (0, suppressions_1.removeSuppression)(filePath, finding);
    diagnostics.reRender(filePath);
    refreshStatusBar();
    vscode.window.showInformationMessage(`Suppression removed for ${finding.rule_id}:${finding.line}`);
    log.appendLine(`[suppress] removed ${finding.rule_id} in ${filePath}:${finding.line}`);
}
function cmdShowSuppressions() {
    const suppressions = (0, suppressions_1.loadSuppressions)();
    if (suppressions.length === 0) {
        vscode.window.showInformationMessage("Bawbel: no active suppressions.");
        return;
    }
    log.show(true);
    log.appendLine(`\n=== Active Suppressions (${types_1.SUPPRESS_FILE}) ===`);
    for (const s of suppressions) {
        log.appendLine(`  ${s.file}:${s.line}  [${s.rule_id}]  reason: "${s.reason}"  (${s.suppressed_at.slice(0, 10)})`);
    }
    log.appendLine(`Total: ${suppressions.length}`);
}
async function cmdInstallCLI() {
    statusBar.update("installing");
    const ok = await (0, cli_1.installBawbel)(log);
    if (ok) {
        bawbelPath = await (0, cli_1.findBawbel)();
        if (bawbelPath) {
            scanner = new scanner_1.Scanner(bawbelPath, log);
        }
        vscode.window.showInformationMessage("Bawbel Scanner CLI installed ✓");
    }
    else {
        vscode.window.showErrorMessage("Bawbel: install failed. See Output panel.");
    }
    refreshStatusBar();
}
function cmdOpenPiranhaDB() {
    vscode.env.openExternal(vscode.Uri.parse(types_1.PIRANHA_BASE));
}
// ── Event handlers ────────────────────────────────────────────────────────────
async function cmdClearAndRescan(filePath) {
    // Called after inline bawbel-ignore comment is inserted.
    // Clears the stale diagnostic immediately, then re-scans so the
    // CLI can confirm the suppression (once CLI supports ignore comments).
    diagnostics.clearFile(filePath);
    refreshStatusBar();
    // Small delay to let the WorkspaceEdit settle before re-scanning
    await new Promise(resolve => setTimeout(resolve, 300));
    await runScan((0, scanner_1.autoScanRequest)(filePath));
}
async function onDidSave(document) {
    if (scanner?.isWatching) {
        return;
    }
    const config = vscode.workspace.getConfiguration("bawbel");
    if (!config.get("scanOnSave", true)) {
        return;
    }
    const exts = config.get("scanExtensions", types_1.SCAN_EXTENSIONS_DEFAULT);
    if (!exts.includes(path.extname(document.fileName).toLowerCase())) {
        return;
    }
    await runScan((0, scanner_1.autoScanRequest)(document.fileName));
}
function onEditorChange(_editor) {
    refreshStatusBar();
}
// ── Shared helpers ────────────────────────────────────────────────────────────
async function runScan(request) {
    if (!scanner) {
        bawbelPath = await ensureCLI();
        if (!bawbelPath) {
            return;
        }
        scanner = new scanner_1.Scanner(bawbelPath, log);
    }
    statusBar.update("scanning");
    await scanner.scan(request, results => {
        diagnostics.applyResults(results);
        refreshStatusBar();
    });
}
function refreshStatusBar() {
    const count = diagnostics.countActiveFindings();
    if (count > 0) {
        statusBar.update("findings", count);
    }
    else if (scanner?.isWatching) {
        statusBar.update("watching");
    }
    else {
        statusBar.update("idle");
    }
}
//# sourceMappingURL=extension.js.map