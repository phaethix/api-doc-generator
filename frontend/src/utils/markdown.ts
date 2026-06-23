/**
 * Lightweight Markdown to HTML converter
 * Supports: headings, paragraphs, bold, italic, code, code blocks,
 * links, lists, tables, blockquotes, horizontal rules
 */
export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inList = false;
  let inOrderedList = false;
  let inTable = false;
  let tableRows: string[] = [];
  let inBlockquote = false;
  let blockquoteBuffer: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    if (inOrderedList) {
      html.push("</ol>");
      inOrderedList = false;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html.push("<table>");
      for (const row of tableRows) {
        html.push(row);
      }
      html.push("</table>");
      inTable = false;
      tableRows = [];
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      const content = blockquoteBuffer.join("\n");
      html.push(`<blockquote>${inlineFormat(content)}</blockquote>`);
      inBlockquote = false;
      blockquoteBuffer = [];
    }
  };

  const escapeHtml = (s: string): string => {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const inlineFormat = (text: string): string => {
    let result = escapeHtml(text);

    // Bold (**text**)
    result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic (*text*)
    result = result.replace(/(?<!\*)\*([^\*]+?)\*(?!\*)/g, "<em>$1</em>");
    // Inline code (`code`)
    result = result.replace(/`([^`]+?)`/g, "<code>$1</code>");
    // Links [text](url)
    result = result.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );

    return result;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        closeList();
        closeTable();
        closeBlockquote();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      closeList();
      closeTable();
      closeBlockquote();
      html.push("<hr/>");
      continue;
    }

    // Headings
    if (/^#{1,6}\s/.test(line)) {
      closeList();
      closeTable();
      closeBlockquote();
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const content = inlineFormat(match[2]);
        html.push(`<h${level}>${content}</h${level}>`);
      }
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      closeList();
      closeTable();
      inBlockquote = true;
      blockquoteBuffer.push(line.substring(1).trim());
      continue;
    } else if (inBlockquote && line.trim() === "") {
      // empty line ends blockquote
      closeBlockquote();
    } else if (inBlockquote) {
      blockquoteBuffer.push(line.trim());
      continue;
    }

    // Table (simple detection)
    if (line.includes("|") && lines[i + 1] && /^\s*\|?[\s\-:|]+\|?\s*$/.test(lines[i + 1])) {
      closeList();
      closeBlockquote();

      if (!inTable) {
        inTable = true;
        tableRows = [];
      }

      const cells = line.split("|").map((c) => c.trim()).filter((c, idx, arr) => {
        if (arr.length > 2 && (idx === 0 || idx === arr.length - 1)) {
          return c !== "";
        }
        return true;
      });

      const isHeader = tableRows.length === 0;
      const rowHtml = `<tr>${
        cells.map((c) => isHeader ? `<th>${inlineFormat(c)}</th>` : `<td>${inlineFormat(c)}</td>`).join("")
      }</tr>`;
      tableRows.push(rowHtml);

      // Skip the separator line
      if (isHeader) {
        i++; // skip separator
      }
      continue;
    } else if (inTable && line.trim() === "") {
      closeTable();
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      closeTable();
      closeBlockquote();
      if (!inList) {
        if (inOrderedList) {
          closeList();
        }
        html.push("<ul>");
        inList = true;
      }
      const content = line.replace(/^\s*[-*]\s+/, "");
      html.push(`<li>${inlineFormat(content)}</li>`);
      continue;
    } else if (inList && line.trim() === "") {
      closeList();
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      closeTable();
      closeBlockquote();
      if (!inOrderedList) {
        if (inList) {
          closeList();
        }
        html.push("<ol>");
        inOrderedList = true;
      }
      const content = line.replace(/^\s*\d+\.\s+/, "");
      html.push(`<li>${inlineFormat(content)}</li>`);
      continue;
    } else if (inOrderedList && line.trim() === "") {
      closeList();
    }

    // Empty line
    if (line.trim() === "") {
      closeList();
      closeTable();
      closeBlockquote();
      continue;
    }

    // Paragraph
    closeList();
    closeTable();
    closeBlockquote();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  // Close any open blocks
  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }
  closeList();
  closeTable();
  closeBlockquote();

  return html.join("\n");
}
