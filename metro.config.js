// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// exifreader's UMD bundle contains guarded `require("https" | "http" | "fs")`
// calls for Node.js usage. They never execute in the app (we pass bytes, not
// URLs or paths), but Metro resolves requires statically, so point them at an
// empty module. Applies to every platform; the browser build never needs them either.
const NODE_ONLY_MODULES = new Set(['https', 'http', 'fs']);
const EXIFREADER_SEGMENT = `${path.sep}exifreader${path.sep}`;
const emptyModule = path.resolve(__dirname, 'src/shims/empty.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (NODE_ONLY_MODULES.has(moduleName) && context.originModulePath.includes(EXIFREADER_SEGMENT)) {
    return { type: 'sourceFile', filePath: emptyModule };
  }
  if (defaultResolveRequest) return defaultResolveRequest(context, moduleName, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
