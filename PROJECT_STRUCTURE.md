# Project Structure — bawbel/integrations

```
bawbel-integrations/
│
├── ── Root governance ──────────────────────────────────────────────
├── CLAUDE.md                AI governance — read first every session
├── LANGUAGE.md              Domain vocabulary
├── ARCHITECTURE.md          Component map, flow diagrams, CLI contract
├── CONTRIBUTING.md          Contributor guide
├── PRODUCT.md               Vision, roadmap (links to bawbel/scanner)
├── PROJECT_STRUCTURE.md     This file
├── README.md                Public-facing docs
├── CHANGELOG.md             Version history
├── LICENSE                  Apache 2.0
│
├── ── GitHub Action ────────────────────────────────────────────────
├── action.yml               GitHub Action definition
│                            inputs: path, recursive, fail-on-severity,
│                              format, no-ignore, comment-on-pr,
│                              github-token, version, extras
│                            outputs: sarif-file, findings-count,
│                              toxic-flows-count, risk-score, result
│                            steps:
│                              1. Install Bawbel Scanner
│                              2. Load bawbel.yml config
│                              3. Run Bawbel scan
│                              4. Post PR comment
│                              5. Check severity threshold
│
├── ── Pre-commit hooks ─────────────────────────────────────────────
├── .pre-commit-hooks.yaml   Hook definitions
│                            id: bawbel-scan      (pattern engine, ~15ms)
│                            id: bawbel-scan-all  (all engines)
│
├── bawbel_hooks/
│   ├── bawbel_pre_commit.py HookRunner — receives files from pre-commit
│   │                        # What: runs bawbel scan on pre-commit file list
│   │                        # Why:  pre-commit passes files as args, not paths
│   │                        # How:  calls bawbel scan, exits 0/1 on threshold
│   ├── pre_commit_init.py   HookInit — first-run setup
│   │                        # What: checks bawbel is installed on first run
│   │                        # Why:  gives clear error before hook fails
│   │                        # How:  shutil.which("bawbel"), offers pip install
│   └── pyproject.toml       Build config for bawbel_hooks package
│
├── ── VS Code Extension ────────────────────────────────────────────
├── vscode/
│   ├── package.json         Extension manifest
│   │                        publisher: bawbel
│   │                        name: bawbel-scanner
│   │                        activationEvents: onLanguage:markdown, yaml, json
│   │                        contributes: commands, configuration, languages
│   ├── tsconfig.json        TypeScript config
│   ├── .eslintrc.json       Lint config
│   │
│   ├── src/
│   │   ├── extension.ts     Entry point — activate() / deactivate()
│   │   │                    // What: registers all commands and providers
│   │   │                    // Why:  VS Code requires a single activate() entry
│   │   │                    // How:  subscribes to file events, registers commands
│   │   │
│   │   ├── scanner/
│   │   │   ├── BawbelScanner.ts    Runs bawbel CLI as subprocess
│   │   │   │   // What: executes bawbel scan --format json on a file path
│   │   │   │   // Why:  all scan logic lives in the CLI, extension just invokes
│   │   │   │   // How:  child_process.exec, parses stdout JSON, handles errors
│   │   │   └── ResultParser.ts    Parses JSON output → BawbelFinding[]
│   │   │       // What: converts raw bawbel JSON into typed BawbelFinding objects
│   │   │       // Why:  centralises JSON parsing and validation in one place
│   │   │       // How:  JSON.parse, validates required fields, returns typed array
│   │   │
│   │   ├── providers/
│   │   │   ├── DiagnosticProvider.ts   Finding → Diagnostic conversion
│   │   │   │   // What: converts BawbelFindings to VS Code Diagnostics
│   │   │   │   // Why:  VS Code requires DiagnosticSeverity not CRITICAL/HIGH
│   │   │   │   // How:  maps severity strings, builds range from line number
│   │   │   └── HoverProvider.ts        Hover tooltip for squiggles
│   │   │       // What: returns markdown hover content for a finding at position
│   │   │       // Why:  shows AVE ID, AIVSS, fix guidance without leaving editor
│   │   │       // How:  matches cursor position against active DiagnosticCollection
│   │   │
│   │   ├── panels/
│   │   │   └── AIVSSPanel.ts           AIVSS sidebar webview
│   │   │       // What: renders AIVSS score, evidence_stage, owasp_mcp in webview
│   │   │       // Why:  gives richer detail than the hover tooltip alone
│   │   │       // How:  VS Code WebviewPanel, fetches piranha_url for full record
│   │   │
│   │   ├── commands/
│   │   │   ├── acceptFinding.ts        bawbel accept command
│   │   │   │   // What: runs bawbel accept on the finding at cursor position
│   │   │   │   // Why:  lets engineers suppress findings from inside the editor
│   │   │   │   // How:  reads active finding, prompts for reason, calls bawbel CLI
│   │   │   ├── scanWorkspace.ts        bawbel scan workspace command
│   │   │   └── scanFile.ts             bawbel scan current file command
│   │   │
│   │   ├── statusBar/
│   │   │   └── StatusBarItem.ts        Status bar manager
│   │   │       // What: updates status bar text to reflect current scan state
│   │   │       // Why:  gives ambient awareness without requiring panel focus
│   │   │       // How:  subscribes to scan events, sets text + tooltip + color
│   │   │
│   │   └── types/
│   │       └── BawbelFinding.ts        TypeScript type for bawbel JSON output
│   │           // What: defines the TypeScript interface matching bawbel JSON
│   │           // Why:  single source of type truth; changes here = contract change
│   │           // How:  interface with all fields from bawbel scan --format json
│   │
│   └── src/test/
│       ├── scanner/
│       │   └── BawbelScanner.test.ts
│       ├── providers/
│       │   └── DiagnosticProvider.test.ts
│       ├── panels/
│       │   └── AIVSSPanel.test.ts
│       └── commands/
│           └── acceptFinding.test.ts
│
├── ── Examples ─────────────────────────────────────────────────────
├── examples/
│   ├── github-actions.yml    Minimal GitHub Actions workflow
│   ├── gitlab-ci.yml         GitLab CI SAST upload example
│   ├── jenkins/Jenkinsfile   Jenkins pipeline
│   ├── circleci.yml          CircleCI config
│   ├── azure-devops.yml      Azure Pipelines
│   └── bitbucket-pipelines.yml
│
├── ── Tests ────────────────────────────────────────────────────────
├── tests/
│   ├── action/
│   │   ├── test_config_loading.sh    bawbel.yml config priority tests
│   │   ├── test_pr_comment.py        PR comment formatting tests
│   │   └── test_sarif_output.sh      SARIF file shape tests
│   └── hooks/
│       └── test_pre_commit.py        HookRunner tests
│
├── ── CI/CD ────────────────────────────────────────────────────────
└── .github/
    └── workflows/
        ├── ci.yml              Run all tests
        ├── publish-vscode.yml  Publish to VS Code Marketplace
        └── bawbel-scan.yml     Self-scan using bawbel/integrations@v2
```

---

## Where does new code go?

| What you are building | Where |
|---|---|
| GitHub Action step (shell/Python) | `action.yml` |
| Action config parsing | `action.yml` Load bawbel.yml step |
| PR comment formatting | `action.yml` Post PR comment step |
| VS Code command | `vscode/src/commands/` |
| VS Code UI provider | `vscode/src/providers/` |
| VS Code panel/webview | `vscode/src/panels/` |
| VS Code types (JSON contract) | `vscode/src/types/BawbelFinding.ts` |
| Pre-commit runner logic | `bawbel_hooks/bawbel_pre_commit.py` |
| CI platform example | `examples/` |
| Action integration test | `tests/action/` |
| Pre-commit test | `tests/hooks/` |

---

## Test placement

| Test type | Language | Where |
|---|---|---|
| Action shell tests | bash | `tests/action/*.sh` |
| PR comment format | Python | `tests/action/test_pr_comment.py` |
| Extension unit | TypeScript | `vscode/src/test/**/*.test.ts` |
| Pre-commit runner | Python | `tests/hooks/test_pre_commit.py` |
