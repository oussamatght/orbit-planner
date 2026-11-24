export type NoteLine =
  | { kind: 'text'; text: string; index: number }
  | { kind: 'check'; text: string; checked: boolean; index: number };

const CHECK = /^\s*[-*]\s\[( |x|X)\]\s?(.*)$/;

/** Parses note content; lines like "- [ ] item" / "- [x] item" become checklist items. */
export function parseNote(content: string): NoteLine[] {
  return content.split('\n').map((line, index) => {
    const m = CHECK.exec(line);
    if (m) return { kind: 'check', checked: m[1].toLowerCase() === 'x', text: m[2], index };
    return { kind: 'text', text: line, index };
  });
}

export function toggleChecklistLine(content: string, lineIndex: number): string {
  const lines = content.split('\n');
  const line = lines[lineIndex];
  if (line === undefined) return content;
  const m = CHECK.exec(line);
  if (!m) return content;
  lines[lineIndex] = line.replace(/\[( |x|X)\]/, m[1] === ' ' ? '[x]' : '[ ]');
  return lines.join('\n');
}

export function checklistProgress(content: string): { done: number; total: number } {
  const items = parseNote(content).filter((l): l is Extract<NoteLine, { kind: 'check' }> => l.kind === 'check');
  return { done: items.filter((i) => i.checked).length, total: items.length };
}

export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

/** First non-empty line, used as a fallback title. */
export function firstLine(content: string): string {
  return content.split('\n').map((l) => l.replace(CHECK, '$2').trim()).find(Boolean) ?? '';
}
