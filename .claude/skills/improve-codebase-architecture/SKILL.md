# improve-codebase-architecture — integrations

Find deepening opportunities. Use the deletion test.

## Current candidates

action.yml inline Python:
- PR comment formatting — inline, could be a deep function
- Config resolution — inline bash, could have clearer interface

vscode/ candidates:
- BawbelScanner.ts — is it doing too much?
- DiagnosticProvider.ts — is severity mapping mixed with range calc?

## Deletion test

"If I deleted this module, would callers re-implement the logic?"
Yes → earning its keep → deepen it.
No → pass-through → simplify or delete.

## Language

module, interface, depth, seam, adapter.
NOT: component, plugin, middleware.
