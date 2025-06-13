import * as fs from "fs";
import * as path from "path";

export interface MarkdownToken {
  type: string;
  content: string;
  level?: number;
  children?: MarkdownToken[];
  attributes?: { [key: string]: string };
}

export interface ParseOptions {
  gfm?: boolean; // GitHub Flavored Markdown
  breaks?: boolean; // Convert line breaks to <br>
  sanitize?: boolean; // Sanitize HTML
  linkify?: boolean; // Auto-convert URLs to links
}

export class MarkdownParser {
  private options: ParseOptions;

  constructor(options: ParseOptions = {}) {
    this.options = {
      gfm: true,
      breaks: false,
      sanitize: true,
      linkify: true,
      ...options,
    };
  }

  public parse(markdown: string): MarkdownToken[] {
    const lines = markdown.split("\n");
    const tokens: MarkdownToken[] = [];
    let currentBlock: MarkdownToken | null = null;
    let inCodeBlock = false;
    let codeBlockLanguage = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Handle code blocks
      if (trimmedLine.startsWith("```")) {
        if (inCodeBlock) {
          // End code block
          if (currentBlock && currentBlock.type === "code") {
            tokens.push(currentBlock);
            currentBlock = null;
          }
          inCodeBlock = false;
          codeBlockLanguage = "";
        } else {
          // Start code block
          inCodeBlock = true;
          codeBlockLanguage = trimmedLine.slice(3).trim();
          currentBlock = {
            type: "code",
            content: "",
            attributes: { language: codeBlockLanguage },
          };
        }
        continue;
      }

      if (inCodeBlock) {
        if (currentBlock) {
          currentBlock.content += (currentBlock.content ? "\n" : "") + line;
        }
        continue;
      }

      // Headers
      if (trimmedLine.startsWith("#")) {
        const level = this.getHeaderLevel(trimmedLine);
        const content = trimmedLine.slice(level).trim();
        tokens.push({
          type: "header",
          content: this.parseInline(content),
          level: level,
        });
        continue;
      }

      // Horizontal rules
      if (this.isHorizontalRule(trimmedLine)) {
        tokens.push({
          type: "hr",
          content: "",
        });
        continue;
      }

      // Lists
      if (this.isListItem(trimmedLine)) {
        const listItem = this.parseListItem(trimmedLine);

        // Check if we're continuing a list
        if (currentBlock && currentBlock.type === "list") {
          currentBlock.children = currentBlock.children || [];
          currentBlock.children.push(listItem);
        } else {
          // Start new list
          if (currentBlock) {
            tokens.push(currentBlock);
          }
          currentBlock = {
            type: "list",
            content: "",
            children: [listItem],
            attributes: {
              ordered: this.isOrderedList(trimmedLine) ? "true" : "false",
            },
          };
        }
        continue;
      }

      // Blockquotes
      if (trimmedLine.startsWith(">")) {
        const content = trimmedLine.slice(1).trim();

        if (currentBlock && currentBlock.type === "blockquote") {
          currentBlock.content += "\n" + content;
        } else {
          if (currentBlock) {
            tokens.push(currentBlock);
          }
          currentBlock = {
            type: "blockquote",
            content: this.parseInline(content),
          };
        }
        continue;
      }

      // Tables (GFM)
      if (this.options.gfm && this.isTableRow(trimmedLine)) {
        const tableRow = this.parseTableRow(trimmedLine);

        if (currentBlock && currentBlock.type === "table") {
          currentBlock.children = currentBlock.children || [];
          currentBlock.children.push(tableRow);
        } else {
          if (currentBlock) {
            tokens.push(currentBlock);
          }
          currentBlock = {
            type: "table",
            content: "",
            children: [tableRow],
          };
        }
        continue;
      }

      // Empty line - end current block
      if (trimmedLine === "") {
        if (currentBlock) {
          tokens.push(currentBlock);
          currentBlock = null;
        }
        continue;
      }

      // Paragraph
      const processedLine = this.parseInline(line);

      if (currentBlock && currentBlock.type === "paragraph") {
        currentBlock.content +=
          (this.options.breaks ? "<br>\n" : "\n") + processedLine;
      } else {
        if (currentBlock) {
          tokens.push(currentBlock);
        }
        currentBlock = {
          type: "paragraph",
          content: processedLine,
        };
      }
    }

    // Add final block if exists
    if (currentBlock) {
      tokens.push(currentBlock);
    }

    return tokens;
  }

  public toHtml(tokens: MarkdownToken[]): string {
    return tokens.map((token) => this.tokenToHtml(token)).join("\n");
  }

  public parseFile(filePath: string): MarkdownToken[] {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return this.parse(content);
  }

  public parseFileToHtml(filePath: string): string {
    const tokens = this.parseFile(filePath);
    return this.toHtml(tokens);
  }

  public getTableOfContents(tokens: MarkdownToken[]): MarkdownToken[] {
    return tokens
      .filter((token) => token.type === "header")
      .map((token) => ({
        type: "toc-item",
        content: token.content,
        level: token.level || 1,
        attributes: {
          anchor: this.generateAnchor(token.content),
        },
      }));
  }

  private parseInline(text: string): string {
    let result = text;

    // Bold text (** or __)
    result = result.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    result = result.replace(/__(.*?)__/g, "<strong>$1</strong>");

    // Italic text (* or _)
    result = result.replace(/\*(.*?)\*/g, "<em>$1</em>");
    result = result.replace(/_(.*?)_/g, "<em>$1</em>");

    // Strikethrough (GFM)
    if (this.options.gfm) {
      result = result.replace(/~~(.*?)~~/g, "<del>$1</del>");
    }

    // Inline code
    result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Auto-link URLs (if linkify enabled)
    if (this.options.linkify) {
      result = result.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank">$1</a>'
      );
    }

    // Sanitize HTML if enabled
    if (this.options.sanitize) {
      result = this.escapeHtml(result);
    }

    return result;
  }

  private tokenToHtml(token: MarkdownToken): string {
    switch (token.type) {
      case "header":
        const level = token.level || 1;
        const anchor = this.generateAnchor(token.content);
        return `<h${level} id="${anchor}">${token.content}</h${level}>`;

      case "paragraph":
        return `<p>${token.content}</p>`;

      case "code":
        const language = token.attributes?.language || "";
        return `<pre><code class="language-${language}">${this.escapeHtml(token.content)}</code></pre>`;

      case "blockquote":
        return `<blockquote>${token.content}</blockquote>`;

      case "hr":
        return "<hr>";

      case "list":
        const isOrdered = token.attributes?.ordered === "true";
        const listTag = isOrdered ? "ol" : "ul";
        const listItems = token.children
          ?.map((child) => this.tokenToHtml(child))
          .join("\n");
        return `<${listTag}>\n${listItems}\n</${listTag}>`;

      case "list-item":
        return `<li>${token.content}</li>`;

      case "table":
        const tableRows = token.children
          ?.map((child) => this.tokenToHtml(child))
          .join("\n");
        return `<table>\n${tableRows}\n</table>`;

      case "table-row":
        const tableCells = token.children
          ?.map((child) => this.tokenToHtml(child))
          .join("");
        return `<tr>${tableCells}</tr>`;

      case "table-cell":
        const isHeader = token.attributes?.header === "true";
        const cellTag = isHeader ? "th" : "td";
        return `<${cellTag}>${token.content}</${cellTag}>`;

      default:
        return token.content;
    }
  }

  private getHeaderLevel(line: string): number {
    let level = 0;
    for (const char of line) {
      if (char === "#") {
        level++;
      } else {
        break;
      }
    }
    return Math.min(level, 6);
  }

  private isHorizontalRule(line: string): boolean {
    return /^-{3,}$|^\*{3,}$|^_{3,}$/.test(line);
  }

  private isListItem(line: string): boolean {
    return /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);
  }

  private isOrderedList(line: string): boolean {
    return /^\s*\d+\.\s/.test(line);
  }

  private parseListItem(line: string): MarkdownToken {
    const content = line.replace(/^\s*[-*+\d.]\s/, "").trim();
    return {
      type: "list-item",
      content: this.parseInline(content),
    };
  }

  private isTableRow(line: string): boolean {
    return line.includes("|") && line.trim().length > 1;
  }

  private parseTableRow(line: string): MarkdownToken {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    const isHeaderSeparator = cells.every((cell) => /^:?-+:?$/.test(cell));

    if (isHeaderSeparator) {
      // Skip header separator row
      return {
        type: "table-separator",
        content: "",
      };
    }

    const tableCells = cells.map((cell) => ({
      type: "table-cell",
      content: this.parseInline(cell),
      attributes: {
        header: "false", // We'll determine this based on context
      },
    }));

    return {
      type: "table-row",
      content: "",
      children: tableCells,
    };
  }

  private generateAnchor(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  }

  private escapeHtml(text: string): string {
    const htmlEntities: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };

    return text.replace(/[&<>"'\/]/g, (match) => htmlEntities[match]);
  }
}

// Command line usage
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npm run parse <input-file> [output-file] [options]");
    console.log("Options:");
    console.log("  --html        Output as HTML");
    console.log("  --toc         Generate table of contents");
    console.log("  --no-gfm      Disable GitHub Flavored Markdown");
    console.log("  --breaks      Convert line breaks to <br>");
    console.log("  --no-sanitize Don't sanitize HTML");
    return;
  }

  const inputFile = args[0];
  const outputFile = args[1];
  const isHtml = args.includes("--html");
  const generateToc = args.includes("--toc");
  const gfm = !args.includes("--no-gfm");
  const breaks = args.includes("--breaks");
  const sanitize = !args.includes("--no-sanitize");

  try {
    const parser = new MarkdownParser({
      gfm,
      breaks,
      sanitize,
      linkify: true,
    });

    const tokens = parser.parseFile(inputFile);

    if (generateToc) {
      const toc = parser.getTableOfContents(tokens);
      console.log("Table of Contents:");
      toc.forEach((item) => {
        const indent = "  ".repeat((item.level || 1) - 1);
        console.log(`${indent}- ${item.content}`);
      });
      return;
    }

    const output = isHtml ? parser.toHtml(tokens) : JSON.stringify(tokens, null, 2);

    if (outputFile) {
      fs.writeFileSync(outputFile, output);
      console.log(`Output written to ${outputFile}`);
    } else {
      console.log(output);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default MarkdownParser;