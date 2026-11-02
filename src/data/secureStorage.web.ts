// Web persistent storage (localStorage). Same API as secureStorage.ts.
// Note: localStorage is readable by any script on the page (XSS exposure).
export const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { window.localStorage.setItem(key, value); } catch {}
  },
  deleteItem: async (key: string): Promise<void> => {
    try { window.localStorage.removeItem(key); } catch {}
  },
};
