const SOCIAL_BASE: Record<string, string> = {
  instagram: "https://instagram.com/",
  tiktok: "https://tiktok.com/@",
  x: "https://x.com/",
  linkedin: "https://linkedin.com/in/",
  youtube: "https://youtube.com/@",
  threads: "https://threads.net/@",
  github: "https://github.com/",
  facebook: "https://facebook.com/",
  snapchat: "https://snapchat.com/add/",
};

export function socialBase(platform: string) {
  return SOCIAL_BASE[platform] ?? "https://example.com/";
}

export function socialHref(platform: string, handle: string) {
  const trimmed = handle.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${socialBase(platform)}${trimmed.replace(/^@+/, "")}`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function renderInlineMarkdown(s: string) {
  const escaped = escapeHtml(s);
  return escaped
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, (_match, label: string, href: string) => {
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let listOpen = false;

  function closeList() {
    if (!listOpen) return;
    out.push("</ul>");
    listOpen = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1]!.length + 1;
      out.push(`<h${level}>${renderInlineMarkdown(heading[2]!)}</h${level}>`);
      continue;
    }

    const listItem = /^[-*]\s+(.+)$/.exec(line);
    if (listItem) {
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      out.push(`<li>${renderInlineMarkdown(listItem[1]!)}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeList();
  return out.join("");
}