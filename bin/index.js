#!/usr/bin/env node
/**
 * TSIC AINode Skill Installer
 * Usage: npx tsic-ainode@latest
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { execSync } = require('child_process');
const clack = require('@clack/prompts');

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const PKG_ROOT    = path.join(__dirname, '..');
const LOCALES_DIR = path.join(PKG_ROOT, 'locales');
const TMPL_DIR    = path.join(PKG_ROOT, 'templates');
const HOME        = os.homedir();
const IS_WIN      = process.platform === 'win32';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
let T = {};
function loadLocale(lang) {
  const file     = path.join(LOCALES_DIR, `${lang}.json`);
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

function detectLocale() {
  const env = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE || '';
  if (env.toLowerCase().includes('zh')) return 'zh-TW';
  return 'en';
}

// ---------------------------------------------------------------------------
// Tool detection
// ---------------------------------------------------------------------------
function cmdExists(cmd) {
  try {
    execSync(IS_WIN ? `where ${cmd}` : `which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

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
                   fs.existsSync(path.join(HOME, '.cursor')),
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
    if (existing.includes(tag)) return;
    fs.appendFileSync(dest, `\n\n${tag}\n${content}`);
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

function installClaude(scope, projectPath) {
  const dest = path.join(HOME, '.claude', 'skills', 'tsic-ainode', 'SKILL.md');
  copyTemplate(path.join(TMPL_DIR, 'claude-code', 'SKILL.md'), dest);
  return dest;
}

function installCursor(scope, projectPath) {
  const rulesDir = scope === 'global'
    ? path.join(HOME, '.cursor', 'rules')
    : path.join(projectPath, '.cursor', 'rules');
  const dest = path.join(rulesDir, 'tsic-ainode.mdc');
  copyTemplate(path.join(TMPL_DIR, 'cursor', 'tsic-ainode.mdc'), dest);
  return dest;
}

function installCodex(scope, projectPath) {
  const dest = scope === 'global'
    ? path.join(HOME, '.codex', 'AGENTS.md')
    : path.join(projectPath, 'AGENTS.md');
  appendToFile(path.join(TMPL_DIR, 'codex', 'AGENTS.md'), dest);
  return dest;
}

function installGemini(scope, projectPath) {
  const dest = scope === 'global'
    ? path.join(HOME, '.gemini', 'GEMINI.md')
    : path.join(projectPath, 'GEMINI.md');
  appendToFile(path.join(TMPL_DIR, 'gemini-cli', 'GEMINI.md'), dest);
  return dest;
}

function installAntigravity(scope, projectPath) {
  const dest = scope === 'global'
    ? path.join(HOME, '.antigravity', 'AGENTS.md')
    : path.join(projectPath, '.antigravity', 'AGENTS.md');
  appendToFile(path.join(TMPL_DIR, 'antigravity', 'AGENTS.md'), dest);
  return dest;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Load default locale
  loadLocale(detectLocale());

  clack.intro(` ${t('welcome')} `);

  // Language
  const langVal = await clack.select({
    message: t('lang_prompt', 'Language'),
    options: [
      { value: 'zh-TW', label: '繁體中文' },
      { value: 'en',    label: 'English'  },
    ],
  });
  if (clack.isCancel(langVal)) { clack.cancel('Cancelled.'); process.exit(0); }
  loadLocale(langVal);

  // Detect tools
  const detectedIds = TOOLS.filter(tool => tool.detect()).map(tool => tool.id);

  // Tool selection — arrow keys + space to toggle, Enter to confirm
  const selectedIds = await clack.multiselect({
    message: T.tools_prompt || 'Select tools to install',
    options: TOOLS.map(tool => ({
      value: tool.id,
      label: T[tool.nameKey] || tool.id,
      hint:  detectedIds.includes(tool.id)
               ? (langVal === 'zh-TW' ? '已偵測' : 'detected')
               : undefined,
    })),
    initialValues: detectedIds,
    required: false,
  });

  if (clack.isCancel(selectedIds) || selectedIds.length === 0) {
    clack.cancel(langVal === 'zh-TW' ? '未選擇任何工具。' : 'No tools selected.');
    process.exit(0);
  }

  // Scope
  const scope = await clack.select({
    message: T.scope_prompt || 'Installation scope',
    options: [
      { value: 'global',  label: T.scope_global  || 'Global'  },
      { value: 'project', label: T.scope_project || 'Project' },
    ],
  });
  if (clack.isCancel(scope)) { clack.cancel('Cancelled.'); process.exit(0); }

  // Project path (only when scope = project)
  let projectPath = process.cwd();
  if (scope === 'project') {
    const inputPath = await clack.text({
      message:      T.project_path_prompt || 'Target project directory',
      placeholder:  process.cwd(),
      defaultValue: process.cwd(),
      validate(v) {
        const p = (v || '').trim() || process.cwd();
        if (!fs.existsSync(p)) return `Directory does not exist: ${p}`;
      },
    });
    if (clack.isCancel(inputPath)) { clack.cancel('Cancelled.'); process.exit(0); }
    if (inputPath && inputPath.trim()) projectPath = inputPath.trim();
  }

  // Install
  const spinner = clack.spinner();
  spinner.start(T.installing || 'Installing...');

  const results = [];
  for (const toolId of selectedIds) {
    const tool = TOOLS.find(tool => tool.id === toolId);
    try {
      const dest = tool.install(scope, projectPath);
      results.push({ label: T[tool.nameKey] || tool.id, dest, ok: true });
    } catch (err) {
      results.push({ label: T[tool.nameKey] || tool.id, err: err.message, ok: false });
    }
  }

  spinner.stop(T.done_title || 'Done!');

  for (const r of results) {
    if (r.ok) {
      clack.log.success(`${r.label}\n  → ${r.dest}`);
    } else {
      clack.log.error(`${r.label}: ${r.err}`);
    }
  }

  clack.note(
    `${T.done_example_zh || ''}\n${T.done_example_en || ''}`,
    T.done_usage || 'Usage'
  );

  clack.outro(`${T.done_docs || 'Docs'}: https://github.com/TSIC-tech/TSIC-AINode`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
