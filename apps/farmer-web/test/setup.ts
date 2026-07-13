import '@testing-library/jest-dom/vitest';

const storage = new Map<string, string>();

function installLocalStorageShim() {
  const storageObject = Object.create(Storage.prototype) as Storage;
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storageObject,
  });
  Storage.prototype.clear = function clear() {
    storage.clear();
  };
  Storage.prototype.getItem = function getItem(key: string) {
    return storage.get(key) ?? null;
  };
  Storage.prototype.removeItem = function removeItem(key: string) {
    storage.delete(key);
  };
  Storage.prototype.setItem = function setItem(key: string, value: string) {
    storage.set(key, value);
  };
}

installLocalStorageShim();
