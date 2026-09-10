# mcp-verify 🛡️

[![npm version](https://img.shields.io/badge/npm-v0.1.0-blue.svg)](https://www.npmjs.com/package/@pranav-nexus/mcp-verify)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](./test)

> **ESLint for AI Tools:** The automated LLM-readiness, schema contract, and safety linter for Model Context Protocol (MCP) servers.

```
╔══════════════════════════════════════════════════════════════════════╗
║                          mcp-verify v0.1.0                           ║
║           The LLM-Readiness & Contract Linter for MCP Servers        ║
╚══════════════════════════════════════════════════════════════════════╝

Server Target: my-mcp-server
Server Version: 1.0.0 | Transport: stdio | Discovered Tools: 3

 TOOL  query_db [45/100]
  ✖ SCH-005 Untyped Property [param: filters]
    Property 'filters' does not declare an explicit 'type'.
    → Specify 'type: "string" | "number" | "boolean" | "array" | "object"'.
  ⚠ LLM-005 Vague Tool Description
    Description for 'query_db' is only 10 chars: "queries db".
    → Expand description with context on what this tool does, when to call it.

 MUTATION  delete_database [65/100]
  ✖ SCH-004 Missing Required Property Definition [param: db_name]
    Field 'db_name' is listed in 'required', but is missing from 'properties'.
  ⚠ SEC-001 Unguarded Destructive Operation
    Tool appears to perform permanent mutation with no confirmation parameter.
    → Add a 'confirm: boolean' or 'dry_run: boolean' parameter.

──────────────────────────────────────────────────────────────────────
Overall LLM-Readiness Score: 67/100 [Grade: D]
Diagnostics: 2 errors | 5 warnings | 0 suggestions
✖ FAILED: Quality gate failed with 2 contract error(s).
```

---

## The Problem

AI agents don't fail in production because the LLMs are dumb. They fail because:
1. **Schema Violations:** Tools omit parameter types, declare non-existent required fields, or provide malformed JSON Schemas.
2. **LLM Discoverability Failures:** Vague 1-word tool descriptions (`"queries database"`) and ambiguous parameters (`temp`, `data`) cause models to hallucinate invalid arguments or skip invoking the tool.
3. **Unguarded Destructive Actions:** Tools like `delete_cluster` or `drop_table` lack confirmation or dry-run parameters, leading to catastrophic accidental mutations.
4. **Context Window Flooding:** Unpaginated queries (`fetch_all_logs`) dump 50,000+ tokens into the prompt context, degrading downstream reasoning.

`mcp-verify` catches all of these flaws in **under 3 seconds** before you push to production or publish your server.

---

## Quickstart

Run directly without installation via `npx`:

```bash
npx @pranav-nexus/mcp-verify run "node ./server.js"
# or for Python servers:
npx @pranav-nexus/mcp-verify run "python server.py"
```

### Options

```bash
mcp-verify run [options] <command...>

Options:
  -s, --strict       Strict mode: fail on warnings as well as errors (default: false)
  -j, --json         Output machine-readable JSON report for CI pipelines (default: false)
  -t, --timeout <ms> Handshake and discovery timeout in milliseconds (default: 10000)
  -h, --help         Display help
```

---

## The 3 Diagnostic Pillars

### 1. Schema & Contract Strictness (`SCH`)
* **`SCH-001`**: Missing `inputSchema`.
* **`SCH-002`**: Malformed JSON Schema (validated via Ajv).
* **`SCH-003`**: Top-level schema is not `type: "object"`.
* **`SCH-004`**: Field listed in `required` array but missing from `properties` definition.
* **`SCH-005`**: Property missing explicit `type` declaration.
* **`SCH-006`**: Empty `enum` definition.

### 2. LLM-Readiness & Prompt Discoverability (`LLM`)
* **`LLM-001`**: Missing tool name.
* **`LLM-002`**: Tool name contains whitespace (breaks model tokenization).
* **`LLM-003`**: Tool name excessively long (> 64 chars).
* **`LLM-004`**: Missing tool description (causes complete tool selection blindness).
* **`LLM-005`**: Vague tool description (< 20 characters).
* **`LLM-006`**: Missing parameter description.
* **`LLM-007`**: Ambiguous parameter name (`data`, `temp`, `arg`, `param`, `obj`).
* **`LLM-008`**: Date/time parameter missing ISO format hints.

### 3. Safety & Context Budgeting (`SEC`)
* **`SEC-001`**: Unguarded destructive operation (`delete_*`, `drop_*`, `purge_*`) lacking `confirm` or `dry_run` parameter.
* **`SEC-002`**: Unrestricted shell or code execution (`bash`, `exec`, `eval`).
* **`SEC-003`**: Unbounded bulk query (`fetch_all_*`, `list_all_*`) lacking pagination (`limit`, `page`).

---

## Continuous Integration (GitHub Actions)

Add `mcp-verify` to your `.github/workflows/ci.yml` as a quality gate:

```yaml
name: MCP Quality Gate

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - name: Run MCP Linter
        run: npx @pranav-nexus/mcp-verify run "node ./dist/index.js" --strict
```

---

## Programmatic API

You can also run `mcp-verify` directly inside your own Jest, Vitest, or Playwright test suites:

```typescript
import { verifyTool, runVerification, connectAndDiscover } from 'mcp-verify';

// Audit a tool object directly in memory:
const report = verifyTool({
  name: 'my_tool',
  description: 'A well-documented tool.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search term' }
    }
  }
});

console.log(report.score); // 100
console.log(report.diagnostics); // []
```

---

## Contributing

Contributions are welcome! Submit an issue or open a pull request.

```bash
git clone https://github.com/pranav-nexus/mcp-verify.git
cd mcp-verify
npm install
npm test
npm run build
```

---

## Author

**Pranav H**  
Automation Engineer (QA & AI)  
[GitHub](https://github.com/pranav-nexus) • [LinkedIn](https://linkedin.com/in/pranav-nexus)

## License

MIT © 2026 Pranav H
