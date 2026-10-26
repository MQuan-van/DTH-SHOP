/** Prevent Vite from watching generated binary assets and their atomic .tmp files.
 * Files are still served normally. Refresh manually after replacing the same URL.
 * Only Vite's dev watcher is affected; this does not hide backend process errors.
 */
export const GENERATED_ASSET21 = /(?:^|[\\/])public[\\/](?:models|previews)[\\/]ai-products(?:[\\/]|$)/i;
export function ignoreGeneratedAssets21() {
  return {
    name: 'dth-generated-asset-watch-21', apply: 'serve',
    config(config) {
      config.server ??= {};
      if (config.server.watch === null) return;
      config.server.watch ??= {};
      const old = config.server.watch.ignored;
      const entries = old === undefined ? [] : Array.isArray(old) ? old.slice() : [old];
      if (!entries.some(value => value instanceof RegExp && value.source === GENERATED_ASSET21.source)) entries.push(GENERATED_ASSET21);
      config.server.watch.ignored = entries;
    },
  };
}
