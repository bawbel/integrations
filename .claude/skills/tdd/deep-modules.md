# Deep modules — integrations context

VS Code modules that should be deep:
- BawbelScanner: one call → findings[]
  Hides: subprocess, timeout, error handling, JSON parsing
- DiagnosticProvider: one call → DiagnosticCollection updated
  Hides: range calc, severity mapping, collection management

Deletion test:
If you deleted BawbelScanner, the subprocess complexity would
reappear in every caller. It earns its keep — keep it deep.
