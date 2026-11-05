#!/usr/bin/env node

/**
 * This application is server-rendered Express/EJS, so there is no separate
 * webpack/vite bundle to emit. The production build validates the backend
 * templates and the frontend assets that are deployed together by aaPanel.
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const root = path.resolve(__dirname, '..');
const viewsDir = path.join(root, 'src', 'views');
const requiredAssets = [
  path.join(root, 'public', 'css', 'style.css'),
  path.join(root, 'public', 'js', 'main.js')
];

function collectEjsFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? collectEjsFiles(entryPath) : entry.name.endsWith('.ejs') ? [entryPath] : [];
  });
}

for (const assetPath of requiredAssets) {
  if (!fs.existsSync(assetPath)) {
    throw new Error(`Missing production asset: ${path.relative(root, assetPath)}`);
  }
}

const templates = collectEjsFiles(viewsDir);
for (const templatePath of templates) {
  try {
    ejs.compile(fs.readFileSync(templatePath, 'utf8'), { filename: templatePath });
  } catch (error) {
    throw new Error(`Invalid EJS template ${path.relative(root, templatePath)}: ${error.message}`);
  }
}

console.log(`[build] validated ${templates.length} EJS templates and ${requiredAssets.length} frontend assets`);
