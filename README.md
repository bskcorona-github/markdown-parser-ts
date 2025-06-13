# Markdown Parser TypeScript

A comprehensive markdown parser written in TypeScript that converts markdown to HTML and provides an AST (Abstract Syntax Tree) representation.

## Features

- **Complete markdown parsing** including headers, lists, tables, code blocks, and more
- **GitHub Flavored Markdown (GFM)** support with strikethrough and tables
- **HTML output generation** with proper semantic markup
- **Table of contents generation** with anchor links
- **Inline formatting** (bold, italic, links, images, code)
- **Syntax highlighting support** for code blocks
- **Customizable parsing options** (sanitization, line breaks, etc.)
- **Command-line interface** for file processing
- **AST token representation** for advanced processing

## Installation

```bash
npm install
```

## Usage

### Command Line Interface

```bash
# Parse markdown to HTML
npm run parse document.md output.html -- --html

# Generate table of contents
npm run parse document.md -- --toc

# Parse with custom options
npm run parse document.md -- --html --breaks --no-sanitize

# Output AST tokens as JSON
npm run parse document.md tokens.json
```

### Programmatic Usage

```typescript
import { MarkdownParser } from "./src/index";

const parser = new MarkdownParser({
  gfm: true, // GitHub Flavored Markdown
  breaks: false, // Convert line breaks to <br>
  sanitize: true, // Sanitize HTML
  linkify: true, // Auto-convert URLs to links
});

// Parse markdown string
const markdown = `# Hello World\n\nThis is **bold** text.`;
const tokens = parser.parse(markdown);

// Convert to HTML
const html = parser.toHtml(tokens);
console.log(html);

// Parse from file
const fileTokens = parser.parseFile("document.md");
const fileHtml = parser.parseFileToHtml("document.md");
```

## Supported Markdown Elements

### Headers

```markdown
# H1 Header

## H2 Header

### H3 Header

#### H4 Header

##### H5 Header

###### H6 Header
```

### Text Formatting

```markdown
**Bold text** or **Bold text**
_Italic text_ or _Italic text_
~~Strikethrough~~ (GFM)
`Inline code`
```

### Links and Images

```markdown
[Link text](https://example.com)
![Image alt text](image.jpg)
https://auto-linked-url.com (if linkify enabled)
```

### Lists

```markdown
- Unordered list item
* Another item
- Another format

1. Ordered list item
2. Second item
3. Third item
```

### Code Blocks

````markdown
```javascript
console.log("Hello World");
```

```python
print("Hello World")
```
````

### Tables (GFM)

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

### Blockquotes

```markdown
> This is a blockquote
> It can span multiple lines
```

### Horizontal Rules

```markdown
---
***
___
```

## API Reference

### MarkdownParser Class

#### Constructor Options

```typescript
interface ParseOptions {
  gfm?: boolean; // GitHub Flavored Markdown (default: true)
  breaks?: boolean; // Convert line breaks to <br> (default: false)
  sanitize?: boolean; // Sanitize HTML (default: true)
  linkify?: boolean; // Auto-convert URLs to links (default: true)
}
```

#### Methods

- `parse(markdown: string): MarkdownToken[]` - Parse markdown string to tokens
- `toHtml(tokens: MarkdownToken[]): string` - Convert tokens to HTML
- `parseFile(filePath: string): MarkdownToken[]` - Parse markdown file
- `parseFileToHtml(filePath: string): string` - Parse file directly to HTML
- `getTableOfContents(tokens: MarkdownToken[]): MarkdownToken[]` - Extract headers for TOC

### Token Interface

```typescript
interface MarkdownToken {
  type: string; // Token type (header, paragraph, etc.)
  content: string; // Token content
  level?: number; // Header level (for headers)
  children?: MarkdownToken[]; // Child tokens (for lists, tables)
  attributes?: { [key: string]: string }; // Additional attributes
}
```

## Command Line Options

- `--html` - Output as HTML instead of JSON tokens
- `--toc` - Generate table of contents
- `--no-gfm` - Disable GitHub Flavored Markdown
- `--breaks` - Convert line breaks to `<br>` tags
- `--no-sanitize` - Don't sanitize HTML content

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Examples

### Basic Usage

```typescript
import { MarkdownParser } from "./src/index";

const parser = new MarkdownParser();
const html = parser.parseFileToHtml("README.md");
console.log(html);
```

### Custom Parsing

```typescript
const parser = new MarkdownParser({
  gfm: true,
  breaks: true,
  sanitize: false,
});

const markdown = `
# My Document

This has **bold** and *italic* text.

## Code Example

\`\`\`javascript
const hello = "world";
\`\`\`

| Feature | Status |
| ------- | ------ |
| Tables  | ✅     |
| Lists   | ✅     |
`;

const tokens = parser.parse(markdown);
const html = parser.toHtml(tokens);
```

### Table of Contents

```typescript
const tokens = parser.parseFile("document.md");
const toc = parser.getTableOfContents(tokens);

toc.forEach(item => {
  console.log(`${"  ".repeat((item.level || 1) - 1)}- ${item.content}`);
});
```

## Supported Token Types

- `header` - Headings (H1-H6)
- `paragraph` - Regular paragraphs
- `code` - Code blocks
- `blockquote` - Blockquotes
- `hr` - Horizontal rules
- `list` - Ordered/unordered lists
- `list-item` - List items
- `table` - Tables (GFM)
- `table-row` - Table rows
- `table-cell` - Table cells

## License

MIT License