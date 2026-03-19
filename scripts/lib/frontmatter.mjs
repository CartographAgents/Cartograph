import fs from 'node:fs';

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return unquote(value);
}

function needsQuoting(value) {
  if (value.length === 0) return true;
  if (/^\s|\s$/.test(value)) return true;
  if (/[:#\[\]{}!,&*?|>'"%@`]/.test(value)) return true;
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(value)) return true;
  if (/^-?\d+(\.\d+)?$/.test(value)) return true;
  return false;
}

function formatScalar(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const stringValue = String(value);
  return needsQuoting(stringValue) ? JSON.stringify(stringValue) : stringValue;
}

export function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error('Markdown file is missing YAML frontmatter block.');
  }

  const yaml = match[1];
  const body = match[2] ?? '';
  const data = {};
  let currentArrayKey = null;

  for (const line of yaml.split(/\r?\n/)) {
    if (!line.trim()) continue;

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      if (rawValue === '') {
        data[key] = [];
        currentArrayKey = key;
      } else if (rawValue.trim() === '[]') {
        data[key] = [];
        currentArrayKey = null;
      } else {
        data[key] = parseScalar(rawValue);
        currentArrayKey = null;
      }
      continue;
    }

    const listMatch = line.match(/^\s*-\s*(.*)$/);
    if (listMatch && currentArrayKey) {
      data[currentArrayKey].push(parseScalar(listMatch[1]));
      continue;
    }
  }

  return { frontmatter: data, body };
}

export function serializeFrontmatter(frontmatter, keyOrder = []) {
  const keys = [
    ...keyOrder,
    ...Object.keys(frontmatter)
      .filter((key) => !keyOrder.includes(key))
      .sort(),
  ];

  const seen = new Set();
  const lines = [];

  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);

    if (!(key in frontmatter)) continue;
    const value = frontmatter[key];

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${formatScalar(item)}`);
        }
      }
      continue;
    }

    lines.push(`${key}: ${formatScalar(value)}`);
  }

  return lines.join('\n');
}

export function readMarkdownWithFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return parseFrontmatter(text);
}

export function writeMarkdownWithFrontmatter(filePath, frontmatter, body, keyOrder = []) {
  const yaml = serializeFrontmatter(frontmatter, keyOrder);
  const normalizedBody = body.startsWith('\n') ? body.slice(1) : body;
  const output = `---\n${yaml}\n---\n\n${normalizedBody}`;
  fs.writeFileSync(filePath, output, 'utf8');
}