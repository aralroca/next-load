#!/usr/bin/env node
const { spawn } = require('child_process');
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

if (prerelease) {
  console.log('Publishing prerelease version');
  const npmPublish = spawn('npm', ['publish', '--tag', 'next'], { stdio: 'inherit' });
  npmPublish.stdout.on('data', (data) => console.log(data));
  npmPublish.on('close', (code) => {
    if (code !== 0) {
      console.log(`npm publish failed with code ${code}`);
      return;
    }
    console.log('Prerelease published successfully')
  });
  return
}

console.log('Publishing release version');
const npmPublish = spawn('npm', ['publish'], { stdio: 'inherit' });
npmPublish.stdout.on('data', (data) => console.log(data));
npmPublish.on('close', (code) => {
  if (code !== 0) {
    console.log(`npm publish failed with code ${code}`);
    return;
  }
  console.log('Release published successfully')
});
