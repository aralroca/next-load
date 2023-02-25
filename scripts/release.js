#!/usr/bin/env node
const { execSync } = require('child_process');
const packageJson = require('../package.json');
const packageJsonNextLoad = require('../packages/next-load/package.json');
const packageJsonNextLoadplugin = require('../packages/next-load-plugin/package.json');

const prerelease = process.argv[2] === 'prerelease';

if (packageJson.version !== packageJsonNextLoad.version || packageJson.version !== packageJsonNextLoadplugin.version) {
  console.error('ERROR: package.json versions do not match');
  console.log(`Current version: ${packageJson.version}`);
  console.log(`Next-load version: ${packageJsonNextLoad.version}`);
  console.log(`Next-load-plugin version: ${packageJsonNextLoadplugin.version}`);
  return
}

console.log(`Current version: ${packageJson.version}`);

execSync('npm adduser', { stdio: 'inherit' });

if (prerelease) {
  console.log('Publishing prerelease version');
  execSync('npm publish --tag next', { stdio: 'inherit' });
  return
}

console.log('Publishing release version');
execSync('npm publish', { stdio: 'inherit' });
