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

// ── Firebase auth RN fix ────────────────────────────────────
// The `firebase/auth` wrapper package.json has NO `react-native` field,
// so Metro resolves to the browser bundle which doesn't register the auth
// component for React Native. Fix: redirect to `@firebase/auth` which has
// a proper `react-native` field pointing to `dist/rn/index.js`.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase/auth') {
    return context.resolveRequest(context, '@firebase/auth', platform);
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Configure source extensions including cjs files for Firebase dependencies
config.resolver.sourceExts = [
  'js', 'jsx', 'ts', 'tsx', 'json', 'cjs',
];

module.exports = config;

