#!/usr/bin/env node
/**
 * TSIC AINode Skill Installer
 * Usage: npx tsic-ainode@latest
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const PKG_ROOT    = path.join(__dirname, '..');
const LOCALES_DIR = path.join(PKG_ROOT, 'locales');
const TMPL_DIR    = path.join(PKG_ROOT, 'templates');
const HOME        = os.homedir();
const CWD         = process.cwd();
const IS_WIN      = process.platform === 'win32';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
let T = {};
function loadLocale(lang) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  const fallback = path.join(LOCALES_DIR, 'en.json');
  try {
    T = JSON.parse(fs.readFileSync(fs.existsSync(file) ? file : fallback, 'utf8'));
  } catch {
    T = {};
  }
}

function t(key, fallback = key) {
  return T[key] || fallback;
}

// ---------------------------------------------------------------------------
// Detect OS locale
// ---------------------------------------------------------------------------
function detectLocale() {
  const env = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '';
  if (env.toLowerCase().includes('zh')) return 'zh-TW';
  return 'en';
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    id:      'claude',
    nameKey: 'tool_claude',
    detect:  () => fs.existsSync(path.join(HOME, '.claude')),
    install: installClaude,
  },
  {
    id:      'cursor',
    nameKey: 'tool_cursor',
    detect:  () => cmdExists('cursor') ||
                   fs.existsSync(path.join(HOME, '.cursor')) ||
                   fs.existsSync(path.join(CWD, '.cursor')),
    install: installCursor,
  },
  {
    id:      'codex',
    nameKey: 'tool_codex',
    detect:  () => cmdExists('codex'),
    install: installCodex,
  },
  {
    id:      'gemini',
    nameKey: 'tool_gemini',
    detect:  () => cmdExists('gemini') || cmdExists('gemini-cli'),
    install: installGemini,
  },
  {
    id:      'antigravity',
    nameKey: 'tool_antigravity',
    detect:  () => cmdExists('antigravity'),
    install: installAntigravity,
  },
];

function cmdExists(cmd) {
  try {
    execSync(IS_WIN ? `where ${cmd}` : `which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Install functions
// ---------------------------------------------------------------------------
function copyTemplate(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function appendToFile(src, dest) {
  const tag     = '<!-- tsic-ainode -->';
  const content = fs.readFileSync(src, 'utf8');
  if (fs.existsSync(dest)) {
    const existing = fs.readFileSync(dest, 'utf8');
    if (existing.includes(tag)) return; // already installed
    fs.appendFileSync(dest, `\n\n${tag}\n${content}`);
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

function installClaude(scope) {
  const dest = path.join(HOME, '.claude', 'skills', 'tsic-ainode', 'SKILL.md');
  copyTemplate(path.join(TMPL_DIR, 'claude-code', 'SKILL.md'), dest);
  return dest;
}

function installCursor(scope) {
  const rulesDir = scope === 'global'
    ? path.join(HOME, '.cursor', 'rules')
    : path.join(CWD, '.cursor', 'rules');
  const dest = path.join(rulesDir, 'tsic-ainode.mdc');
  copyTemplate(path.join(TMPL_DIR, 'cursor', 'tsic-ainode.mdc'), dest);
  return dest;
}

function installCodex(scope) {
  const dest = scope === 'global'
    ? path.join(HOME, '.codex', 'AGENTS.md')
    : path.join(CWD, 'AGENTS.md');
  appendToFile(path.join(TMPL_DIR, 'codex', 'AGENTS.md'), dest);
  return dest;
}

function installGemini(scope) {
  const dest = scope === 'global'
    ? path.join(HOME, '.gemini', 'GEMINI.md')
    : path.join(CWD, 'GEMINI.md');
  appendToFile(path.join(TMPL_DIR, 'gemini-cli', 'GEMINI.md'), dest);
  return dest;
}

function installAntigravity(scope) {
  const dest = scope === 'global'
    ? path.join(HOME, '.antigravity', 'AGENTS.md')
    : path.join(CWD, '.antigravity', 'AGENTS.md');
  appendToFile(path.join(TMPL_DIR, 'antigravity', 'AGENTS.md'), dest);
  return dest;
}

// ---------------------------------------------------------------------------
// Readline helpers
// ---------------------------------------------------------------------------
function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

// Single-prompt choice: shows numbered list, returns chosen item (default: first)
async function askChoice(rl, question, choices) {
  const opts = choices.map((c, i) => `  ${i + 1}. ${c}`).join('\n');
  const ans  = await ask(rl, `${question}\n${opts}\n> `);
  const idx  = parseInt(ans, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= choices.length) return choices[0];
  return choices[idx];
}

// Single-prompt checkbox: shows numbered list with detected pre-selected.
// User types space-separated numbers to select, or Enter to accept detected defaults.
async function askCheckbox(rl, question, items) {
  const defaultNums = items
    .map((item, i) => (item.detected ? String(i + 1) : null))
    .filter(Boolean);

  console.log(`\n${question}`);
  items.forEach((item, i) => {
    const mark = item.detected ? '[✓]' : '[ ]';
    console.log(`  ${i + 1}. ${mark} ${item.label}`);
  });

  const hint = defaultNums.length > 0
    ? `(Enter 確認選取 ${defaultNums.join(' ')}，或輸入編號如 "1 3")`
    : '(輸入編號如 "1 3"，多選用空白分隔)';
  console.log(`  ${hint}`);

  const ans = await ask(rl, '> ');

  if (ans === '' && defaultNums.length > 0) {
    return items.filter(item => item.detected);
  }

  const selected = ans.split(/\s+/)
    .map(n => parseInt(n, 10) - 1)
    .filter(i => i >= 0 && i < items.length)
    .map(i => items[i]);

  return selected;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Load default locale first
  let locale = detectLocale();
  loadLocale(locale);

  const rl = createRL();

  // Banner
  console.log('\n' + '─'.repeat(50));
  console.log(` ${t('welcome')}`);
  console.log(` ${t('welcome_sub')}`);
  console.log('─'.repeat(50));

  // Language selection
  const langChoice = await askChoice(rl, `\n${t('lang_prompt')}`, [
    '繁體中文 (zh-TW)',
    'English (en)',
  ]);
  locale = langChoice.startsWith('繁') ? 'zh-TW' : 'en';
  loadLocale(locale);

  // Detect tools
  const detectedIds = TOOLS.filter(tool => tool.detect()).map(tool => tool.id);
  if (detectedIds.length > 0) {
    console.log(`\n${T.detect_title}`);
    detectedIds.forEach(id => {
      const tool = TOOLS.find(tool => tool.id === id);
      console.log(`  ✓ ${T[tool.nameKey] || tool.id}`);
    });
  } else {
    console.log(`\n${T.detect_none}`);
  }

  // Choose tools
  const toolItems = TOOLS.map(tool => ({
    id:       tool.id,
    label:    T[tool.nameKey] || tool.id,
    detected: detectedIds.includes(tool.id),
    install:  tool.install,
  }));
  const chosen = await askCheckbox(rl, T.tools_prompt, toolItems);

  if (chosen.length === 0) {
    console.log('\nNo tools selected. Exiting.');
    rl.close();
    return;
  }

  // Scope
  const scopeChoice = await askChoice(rl, `\n${T.scope_prompt}`, [
    T.scope_global,
    T.scope_project,
  ]);
  const scope = scopeChoice === T.scope_global ? 'global' : 'project';

  // Install
  console.log(`\n${T.installing}`);
  for (const tool of chosen) {
    try {
      const dest = tool.install(scope);
      console.log(`  ✓ ${T.installed_ok}: ${tool.label}`);
      console.log(`    → ${dest}`);
    } catch (err) {
      console.error(`  ✗ ${T.err_write}: ${tool.label} — ${err.message}`);
    }
  }

  // Done
  console.log('\n' + '─'.repeat(50));
  console.log(` ${T.done_title}`);
  console.log('─'.repeat(50));
  console.log(`\n${T.done_usage}`);
  console.log(`  ${T.done_example_zh}`);
  console.log(`  ${T.done_example_en}`);
  console.log(`\n${T.done_docs} https://github.com/TSIC-tech/TSIC-AINode`);
  console.log();

  rl.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
