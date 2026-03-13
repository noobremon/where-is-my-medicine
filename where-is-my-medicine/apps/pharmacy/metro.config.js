const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// On Windows, Node's __dirname / path.resolve may return lowercase drive letters
// (e.g. 'c:\') while getDefaultConfig and the OS/watchman use uppercase ('C:\').
// Metro's RootPathUtils.absoluteToNormal does case-sensitive prefix matching,
// so any mismatch causes path doubling ('C:\c:\...') → ENOENT in the file-map
// worker. Normalise everything to UPPERCASE drive letters (the OS canonical form)
// so Metro, watchman, and our config all agree on the same root strings.
const normDrive =
  process.platform === 'win32'
    ? p => (typeof p === 'string' ? p.replace(/^[a-z]:/, m => m.toUpperCase()) : p)
    : p => p;

const projectRoot = normDrive(__dirname);
const workspaceRoot = normDrive(path.resolve(__dirname, '../..'));

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = config.watchFolders.map(normDrive);

config.resolver.nodeModulesPaths = [
  normDrive(path.resolve(__dirname, 'node_modules')),
  normDrive(path.resolve(__dirname, '../..', 'node_modules')),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
