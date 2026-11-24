/// <reference types="node" />
/// <reference types="jest" />
/** Navigation smoke test: every route the app links to has a screen file with a default export. */
import fs from 'fs';
import path from 'path';

const APP = path.join(__dirname, '..', 'app');

const ROUTES = [
  '_layout.tsx',
  'onboarding.tsx',
  '(tabs)/_layout.tsx',
  '(tabs)/index.tsx',
  '(tabs)/calendar.tsx',
  '(tabs)/notes.tsx',
  '(tabs)/habits.tsx',
  '(tabs)/more.tsx',
  'inbox.tsx',
  'tasks/index.tsx',
  'tasks/[id].tsx',
  'projects/index.tsx',
  'projects/[id].tsx',
  'projects/edit.tsx',
  'habits/[id].tsx',
  'habits/edit.tsx',
  'notes/[id].tsx',
  'focus/index.tsx',
  'statistics/index.tsx',
  'settings/index.tsx',
  'settings/categories.tsx',
];

describe('routes', () => {
  it.each(ROUTES)('%s exists and default-exports a screen', (route) => {
    const source = fs.readFileSync(path.join(APP, route), 'utf8');
    expect(source).toMatch(/export default function \w+/);
  });

  it('every pushed pathname resolves to a route file', () => {
    const files = fs.readdirSync(path.join(__dirname, '..'), { recursive: true }) as string[];
    const sources = files.filter((f) => /\.(tsx?)$/.test(f) && !f.includes('__tests__')).map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
    const targets = new Set<string>();
    for (const src of sources) {
      for (const m of src.matchAll(/(?:pathname: |router\.(?:push|navigate|replace)\(|href=)['"](\/[^'"]*)['"]/g)) targets.add(m[1]);
    }
    const toFile = (p: string): string[] => {
      const clean = p === '/' ? '(tabs)/index' : p.slice(1);
      return [`${clean}.tsx`, `${clean}/index.tsx`, `(tabs)/${clean}.tsx`];
    };
    for (const target of targets) {
      expect({ target, exists: toFile(target).some((f) => fs.existsSync(path.join(APP, f))) }).toEqual({ target, exists: true });
    }
    expect(targets.size).toBeGreaterThan(8);
  });
});
