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
  let tableRows: Array<{ isHeader: boolean; cells: string[] }> = [];
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
    if (inTable && tableRows.length > 0) {
      html.push('<table class="markdown-table">');

      // Extract table header and data rows
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1);

      // Generate thead
      if (headerRow && headerRow.isHeader) {
        html.push(
          `<thead><tr>${headerRow.cells
            .map((c) => `<th>${inlineFormat(c)}</th>`)
            .join("")}</tr></thead>`,
        );
      }

      // Generate tbody
      if (dataRows.length > 0) {
        html.push("<tbody>");
        for (const row of dataRows) {
          html.push(
            `<tr>${row.cells
              .map((c) => `<td>${inlineFormat(c)}</td>`)
              .join("")}</tr>`,
          );
        }
        html.push("</tbody>");
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

    // Helper function to parse a table row
    const parseTableRow = (row: string): string[] => {
      let trimmed = row.trim();
      // Remove leading/trailing |
      if (trimmed.startsWith("|")) trimmed = trimmed.substring(1);
      if (trimmed.endsWith("|")) trimmed = trimmed.substring(0, trimmed.length - 1);

      // Split by | and trim each cell
      return trimmed.split("|").map((cell) => cell.trim());
    };

    // Table detection
    // Table row format: | col1 | col2 | col3 |
    // Separator row format: | --- | --- | --- | or |:---:| ---: | :--- | etc.
    const isTableRow = (l: string): boolean => {
      const trimmed = l.trim();
      return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 1;
    };

    const isSeparatorRow = (l: string): boolean => {
      return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(l);
    };

    // Check if this is the start of a table
    if (isTableRow(line) && lines[i + 1] && isSeparatorRow(lines[i + 1])) {
      closeList();
      closeBlockquote();

      if (!inTable) {
        inTable = true;
        tableRows = [];
      }

      // Parse header row
      const headerCells = parseTableRow(line);
      tableRows.push({ isHeader: true, cells: headerCells });

      // Skip separator row
      i++;
      continue;
    }

    // Continue processing table data rows
    if (inTable && isTableRow(line)) {
      const cells = parseTableRow(line);
      tableRows.push({ isHeader: false, cells: cells });
      continue;
    }

    // Empty or unrecognized lines outside table end the table
    if (inTable && (line.trim() === "" || !isTableRow(line))) {
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
