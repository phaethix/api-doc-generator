import type { DocNode } from "../types/doc_node.ts";
import { OutputFormat } from "../types/api_spec.ts";

export function render(doc: DocNode, format: OutputFormat): string {
  switch (format) {
    case OutputFormat.Markdown:
      return renderMarkdown(doc);
    case OutputFormat.HTML:
      return renderHTML(doc);
    case OutputFormat.JSON:
      return JSON.stringify(doc, null, 2);
  }
}

function renderMarkdown(doc: DocNode): string {
  const lines: string[] = [];

  lines.push(`# ${doc.api.title}`);
  lines.push("");
  lines.push(`> Version: ${doc.api.version}`);
  if (doc.api.description) {
    lines.push(`> ${doc.api.description}`);
  }
  lines.push("");

  for (const ep of doc.endpoints) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${ep.method} ${ep.path}`);
    lines.push("");
    lines.push(`**${ep.summary}**`);
    if (ep.description) {
      lines.push("");
      lines.push(ep.description);
    }

    if (ep.parameters.length > 0) {
      lines.push("");
      lines.push("### Parameters");
      lines.push("");
      lines.push("| Name | In | Type | Required | Description |");
      lines.push("|------|----|------|----------|-------------|");
      for (const p of ep.parameters) {
        lines.push(
          `| ${p.name} | ${p.location} | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description ?? "-"} |`,
        );
      }
    }

    if (ep.requestBody) {
      lines.push("");
      lines.push("### Request Body");
      lines.push("");
      lines.push(`- **Content-Type**: ${ep.requestBody.contentType}`);
      lines.push(`- **Type**: ${ep.requestBody.type}`);
      lines.push(`- **Required**: ${ep.requestBody.required ? "Yes" : "No"}`);
      if (ep.requestBody.description) {
        lines.push(`- **Description**: ${ep.requestBody.description}`);
      }
    }

    lines.push("");
    lines.push("### Responses");
    lines.push("");
    lines.push("| Status | Description | Content-Type |");
    lines.push("|--------|-------------|--------------|");
    for (const r of ep.responses) {
      lines.push(`| ${r.status} | ${r.description} | ${r.contentType ?? "-"} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderHTML(doc: DocNode): string {
  const css = `
    :root { --bg: #fff; --text: #1a1a1a; --border: #e0e0e0; --code-bg: #f5f5f5;
            --tag-bg: #e8f0fe; --method-get: #008000; --method-post: #e36209;
            --method-put: #005cc5; --method-delete: #d73a49; --method-patch: #6f42c1; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           max-width: 960px; margin: 0 auto; padding: 2rem; color: var(--text);
           background: var(--bg); line-height: 1.6; }
    h1 { border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    h2 { margin-top: 2.5rem; }
    .method {
      display: inline-block; font-weight: 700; font-size: 0.85rem; padding: 2px 8px;
      border-radius: 4px; margin-right: 0.5rem; min-width: 3.5rem; text-align: center;
    }
    .method.get    { color: var(--method-get);    background: #e6f4ea; }
    .method.post   { color: var(--method-post);   background: #fce8e0; }
    .method.put    { color: var(--method-put);    background: #e8f0fe; }
    .method.delete { color: var(--method-delete); background: #fce8e8; }
    .method.patch  { color: var(--method-patch);  background: #f3e8fc; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border: 1px solid var(--border); }
    th { background: var(--code-bg); font-weight: 600; }
    code { background: var(--code-bg); padding: 1px 5px; border-radius: 3px;
           font-size: 0.9em; }
    .tag { display: inline-block; background: var(--tag-bg); padding: 2px 10px;
           border-radius: 12px; font-size: 0.8rem; margin-right: 4px; }
    .endpoint-section { border: 1px solid var(--border); border-radius: 8px;
                        padding: 1.5rem; margin: 1.5rem 0; }
  `;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(doc.api.title)} — API Reference</title>
<style>${css}</style>
</head>
<body>
`;

  html += `<h1>${escapeHtml(doc.api.title)}</h1>\n`;
  html += `<p><em>Version: ${escapeHtml(doc.api.version)}</em></p>\n`;
  if (doc.api.description) {
    html += `<p>${escapeHtml(doc.api.description)}</p>\n`;
  }

  for (const ep of doc.endpoints) {
    html += `<div class="endpoint-section">\n`;
    html += `<h2><span class="method ${ep.method.toLowerCase()}">${ep.method}</span> <code>${escapeHtml(ep.path)}</code></h2>\n`;
    html += `<p><strong>${escapeHtml(ep.summary)}</strong></p>\n`;
    if (ep.description) {
      html += `<p>${escapeHtml(ep.description)}</p>\n`;
    }
    if (ep.tags.length > 0) {
      html += `<p>${ep.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</p>\n`;
    }

    if (ep.parameters.length > 0) {
      html += `<h3>Parameters</h3>\n<table>\n<tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr>\n`;
      for (const p of ep.parameters) {
        html += `<tr><td><code>${escapeHtml(p.name)}</code></td><td>${p.location}</td><td><code>${escapeHtml(p.type)}</code></td><td>${p.required ? "Yes" : "No"}</td><td>${escapeHtml(p.description ?? "-")}</td></tr>\n`;
      }
      html += `</table>\n`;
    }

    if (ep.requestBody) {
      html += `<h3>Request Body</h3>\n<ul>\n`;
      html += `<li><strong>Content-Type:</strong> <code>${escapeHtml(ep.requestBody.contentType)}</code></li>\n`;
      html += `<li><strong>Type:</strong> <code>${escapeHtml(ep.requestBody.type)}</code></li>\n`;
      html += `<li><strong>Required:</strong> ${ep.requestBody.required ? "Yes" : "No"}</li>\n`;
      if (ep.requestBody.description) {
        html += `<li><strong>Description:</strong> ${escapeHtml(ep.requestBody.description)}</li>\n`;
      }
      html += `</ul>\n`;
    }

    html += `<h3>Responses</h3>\n<table>\n<tr><th>Status</th><th>Description</th><th>Content-Type</th></tr>\n`;
    for (const r of ep.responses) {
      html += `<tr><td><strong>${escapeHtml(r.status)}</strong></td><td>${escapeHtml(r.description)}</td><td><code>${r.contentType ?? "-"}</code></td></tr>\n`;
    }
    html += `</table>\n`;
    html += `</div>\n`;
  }

  html += `</body>\n</html>`;
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
