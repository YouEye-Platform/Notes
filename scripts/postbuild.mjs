import { cpSync, existsSync, readdirSync, lstatSync, readlinkSync, rmSync, mkdirSync, symlinkSync } from 'fs';
import { join, resolve, dirname } from 'path';

const standaloneDir = join(process.cwd(), '.next', 'standalone');

if (!existsSync(standaloneDir)) {
  console.error('Standalone directory not found. Run next build first.');
  process.exit(1);
}

// Copy .next/static to standalone
const staticSrc = join(process.cwd(), '.next', 'static');
const staticDest = join(standaloneDir, '.next', 'static');
if (existsSync(staticSrc)) {
  console.log('Copying .next/static to standalone...');
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log('Done copying static assets');
}

// Copy public/ to standalone
const publicSrc = join(process.cwd(), 'public');
const publicDest = join(standaloneDir, 'public');
if (existsSync(publicSrc)) {
  console.log('Copying public/ to standalone...');
  cpSync(publicSrc, publicDest, { recursive: true });
} else {
  console.log('No public/ folder found, skipping');
}

// Fix pnpm modules — copy real packages over symlinks
const pnpmModules = join(standaloneDir, 'node_modules', '.pnpm', 'node_modules');
if (existsSync(pnpmModules)) {
  console.log('Fixing pnpm modules...');
  const entries = readdirSync(pnpmModules);
  for (const entry of entries) {
    const entryPath = join(pnpmModules, entry);
    const stat = lstatSync(entryPath);
    if (stat.isSymbolicLink()) {
      const target = resolve(dirname(entryPath), readlinkSync(entryPath));
      if (existsSync(target)) {
        console.log(`  Copying ${entry}...`);
        rmSync(entryPath, { recursive: true, force: true });
        cpSync(target, entryPath, { recursive: true });
      }
    }
  }
  console.log('Done fixing pnpm modules');
} else {
  console.log('No .pnpm/node_modules found, skipping fix');
}

// Resolve symlinks in top-level node_modules
const topModules = join(standaloneDir, 'node_modules');
if (existsSync(topModules)) {
  console.log('Resolving symlinks in node_modules...');
  const entries = readdirSync(topModules);
  for (const entry of entries) {
    if (entry === '.pnpm' || entry.startsWith('.')) continue;
    const entryPath = join(topModules, entry);
    const stat = lstatSync(entryPath);
    if (stat.isSymbolicLink()) {
      const target = resolve(dirname(entryPath), readlinkSync(entryPath));
      if (existsSync(target)) {
        console.log(`  Resolving ${entry}...`);
        rmSync(entryPath, { recursive: true, force: true });
        cpSync(target, entryPath, { recursive: true });
      }
    }
  }
  console.log('Done resolving symlinks');
}

console.log('\nPostbuild complete!');
console.log(`App directory: ${standaloneDir}`);
