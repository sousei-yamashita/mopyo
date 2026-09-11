export const STORAGE_KEY = "mopyo-v01-journey";

export function isPreviewPath(pathname = "") {
  return /(^|\/)previews\/pr-\d+(\/|$)/.test(pathname);
}

function storageForPath(pathname, storages) {
  return isPreviewPath(pathname) ? storages.sessionStorage : storages.localStorage;
}

export function readStoredState(pathname, storages) {
  try {
    const saved = JSON.parse(storageForPath(pathname, storages).getItem(STORAGE_KEY));
    if (saved && saved.phase && Number.isInteger(saved.scene)) return saved;
  } catch { /* 壊れた保存データは静かに捨てる */ }
  return null;
}

export function writeStoredState(pathname, storages, state) {
  storageForPath(pathname, storages).setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearStoredState(pathname, storages) {
  storageForPath(pathname, storages).removeItem(STORAGE_KEY);
}
