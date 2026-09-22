---
name: figma-implement-design
description: Translates Figma designs into production-ready application code with 1:1 visual fidelity. Use when implementing UI code from Figma files, when user mentions "implement design", "generate code", "implement component", provides Figma URLs, or asks to build components matching Figma specs.
---

# Implement Design

## Overview

This skill provides a structured workflow for translating Figma designs into production-ready code with pixel-perfect accuracy. It uses the Figma Desktop MCP server, design tokens, and visual validation to achieve 1:1 parity with designs.

## Skill Boundaries

- Use this skill when the deliverable is code in the user's repository.
- If the user asks to create, edit, or delete nodes inside Figma itself, use a Figma canvas-editing skill instead.
- If the user asks to build or update a full-page screen in Figma from code or a description, use a Figma design-generation skill instead.
- If the user asks only for Code Connect mappings, use a Code Connect skill instead.
- If the user asks to author reusable agent rules, use a design-system-rules skill instead.

## Prerequisites

- The Figma desktop app must be open with its desktop MCP server enabled in Dev Mode. The server runs at `http://127.0.0.1:3845/mcp` and does not use OAuth.
- The user may provide a Figma URL in the format `https://figma.com/design/:fileKey/:fileName?node-id=1-2`.
  - `:fileKey` is the file key.
  - `1-2` is the node ID for the specific component or frame to implement.
- When no Figma URL is provided, use the current selection from the open Figma desktop file.
- Project should have an established design system or component library when possible.

## Required Workflow

Follow these steps in order. Do not skip steps.

### Step 1: Get Node ID

#### Option A: Parse from Figma URL

When the user provides a Figma URL, extract the file key and node ID to pass as arguments to MCP tools.

URL format:

```text
https://figma.com/design/:fileKey/:fileName?node-id=1-2
```

Extract:

- File key: the segment after `/design/`.
- Node ID: the value of the `node-id` query parameter.

When a Figma URL is provided, always call MCP tools with both `fileKey` and `nodeId`.

Example:

- URL: `https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15`
- File key: `kL9xQn2VwM8pYrTb4ZcHjF`
- Node ID: `42-15`

#### Option B: Use Current Selection from Figma Desktop App

When the user has not provided a URL, the Figma Desktop MCP tools may use the currently selected node from the open Figma file. If a Figma URL is available, prefer the URL workflow instead.

### Step 2: Fetch Design Context

Run `get_design_context` with the extracted file key and node ID.

```text
get_design_context(fileKey=":fileKey", nodeId="1-2")
```

This provides structured data including:

- Layout properties, Auto Layout, constraints, and sizing.
- Typography specifications.
- Color values and design tokens.
- Component structure and variants.
- Spacing and padding values.

If the response is too large or truncated:

1. Run `get_metadata(fileKey=":fileKey", nodeId="1-2")` to get the high-level node map.
2. Identify the specific child nodes needed from the metadata.
3. Fetch individual child nodes with `get_design_context(fileKey=":fileKey", nodeId=":childNodeId")`.

### Step 3: Capture Visual Reference

Run `get_screenshot` with the same file key and node ID for a visual reference.

```text
get_screenshot(fileKey=":fileKey", nodeId="1-2")
```

This screenshot is the source of truth for visual validation. Keep it accessible throughout implementation.

### Step 4: Download Required Assets

Download any assets, images, icons, or SVGs returned by the Figma MCP server.

Asset rules:

- Download assets from the localhost URLs returned by the Figma Desktop MCP server and verify that each response contains valid image or SVG content.
- Never create placeholder assets from failed localhost responses. If an asset cannot be downloaded, report the failure and ask the user to confirm that the desktop MCP server remains enabled.
- Do not import or add new icon packages if assets are provided by Figma.
- Do not use or create placeholders if an asset source is provided and reachable.

### Step 5: Translate to Project Conventions

Translate the Figma output into this project's framework, styles, and conventions.

Key principles:

- Treat Figma MCP output as a representation of design and behavior, not as final code style.
- Replace Tailwind utility classes with the project's preferred utilities or design-system tokens.
- Reuse existing components, layout primitives, typography, buttons, inputs, and icon wrappers.
- Use the project's color system, typography scale, and spacing tokens consistently.
- Respect existing routing, state management, and data-fetch patterns.

### Step 6: Achieve 1:1 Visual Parity

Strive for pixel-perfect visual parity with the Figma design.

Guidelines:

- Prioritize Figma fidelity to match designs exactly.
- Avoid hardcoded values; use design tokens from Figma where available.
- When project tokens differ from Figma specs, prefer project tokens but adjust spacing or sizes minimally to match visuals.
- Follow WCAG requirements for accessibility.
- Add component documentation when needed.

### Step 7: Validate Against Figma

Before marking complete, validate the final UI against the Figma screenshot.

Validation checklist:

- Layout matches: spacing, alignment, and sizing.
- Typography matches: font, size, weight, and line height.
- Colors match exactly or are intentionally mapped to project tokens.
- Interactive states work as designed: hover, active, disabled, focus.
- Responsive behavior follows Figma constraints.
- Assets render correctly.
- Accessibility standards are met.

## Implementation Rules

### Component Organization

- Place UI components in the project's designated design-system directory.
- Follow the project's component naming conventions.
- Avoid inline styles unless truly necessary for dynamic values.

### Design System Integration

- Always use components from the project's design system when possible.
- Map Figma design tokens to project design tokens.
- When a matching component exists, extend it instead of creating a new one.
- Document any new components added to the design system.

### Code Quality

- Avoid hardcoded values; extract constants or design tokens.
- Keep components composable and reusable.
- Add TypeScript types for component props when using TypeScript.
- Include useful documentation comments for exported components.

## Examples

### Example 1: Implementing a Button Component

User says:

```text
Implement this Figma button component: https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15
```

Actions:

1. Parse URL to extract `fileKey=kL9xQn2VwM8pYrTb4ZcHjF` and `nodeId=42-15`.
2. Run `get_design_context(fileKey="kL9xQn2VwM8pYrTb4ZcHjF", nodeId="42-15")`.
3. Run `get_screenshot(fileKey="kL9xQn2VwM8pYrTb4ZcHjF", nodeId="42-15")`.
4. Download any button icons from the assets endpoint.
5. Check whether the project has an existing button component.
6. Extend the existing component if possible; otherwise create a new component using project conventions.
7. Map Figma colors to project design tokens.
8. Validate padding, border radius, typography, and states against the screenshot.

Result: Button component matching the Figma design and integrated with the project design system.

### Example 2: Building a Dashboard Layout

User says:

```text
Build this dashboard: https://figma.com/design/pR8mNv5KqXzGwY2JtCfL4D/Dashboard?node-id=10-5
```

Actions:

1. Parse URL to extract `fileKey=pR8mNv5KqXzGwY2JtCfL4D` and `nodeId=10-5`.
2. Run `get_metadata(fileKey="pR8mNv5KqXzGwY2JtCfL4D", nodeId="10-5")` to understand the page structure.
3. Identify main sections from metadata: header, sidebar, content area, cards, and charts.
4. Run `get_design_context` for each major section.
5. Run `get_screenshot(fileKey="pR8mNv5KqXzGwY2JtCfL4D", nodeId="10-5")` for the full page.
6. Download all assets.
7. Build layout using project layout primitives.
8. Implement each section using existing components where possible.
9. Validate responsive behavior against Figma constraints.

Result: Complete dashboard matching the Figma design with responsive layout.

## Best Practices

### Always Start with Context

Never implement based on assumptions. Fetch `get_design_context` and `get_screenshot` first.

### Incremental Validation

Validate frequently during implementation, not just at the end.

### Document Deviations

If you must deviate from the Figma design for accessibility or technical constraints, document why.

### Reuse Over Recreation

Always check for existing components before creating new ones. Consistency across the codebase is more important than literal recreation.

### Design System First

When in doubt, prefer the project's design system patterns while preserving Figma visual intent.

## Common Issues and Solutions

### Issue: Figma output is truncated

Cause: The design is too complex or has too many nested layers to return in a single response.

Solution: Use `get_metadata` to get the node structure, then fetch specific nodes individually with `get_design_context`.

### Issue: Design does not match after implementation

Cause: Visual discrepancies between the implemented code and the original Figma design.

Solution: Compare side-by-side with the screenshot from Step 3. Check spacing, colors, typography values, and asset sizing in the design context data.

### Issue: Assets are not loading

Cause: The asset URL was modified, the download failed, or the Figma Desktop MCP server stopped running.

Solution: Download the returned asset bytes without modifying the URL and verify the saved file is valid image/SVG content. If the localhost URL is unreachable, ask the user to confirm that Figma Desktop is open and its MCP server is enabled instead of writing a placeholder file.

### Issue: Design token values differ from Figma

Cause: The project's design system tokens have different values than the Figma design.

Solution: Prefer project tokens for consistency, then adjust spacing or sizing minimally to maintain visual fidelity.

## Understanding Design Implementation

The Figma implementation workflow establishes a reliable process for translating designs to code.

For designers, it gives confidence that implementations will match their designs. For developers, it creates a structured approach that eliminates guesswork. For teams, it helps keep implementations consistent and high quality.

## Additional Resources

- Figma MCP Server Documentation: https://developers.figma.com/docs/figma-mcp-server/
- Figma MCP Server Tools and Prompts: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- Figma Variables and Design Tokens: https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma
