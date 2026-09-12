/* Storage. Everything lives in IndexedDB on this device.
   Nothing is sent anywhere — there is no server in this app. */

const DB = (function () {
  const NAME = "healthfile";
  const STORE = "kv";
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      const req = indexedDB.open(NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function tx(mode) {
    return open().then(function (db) {
      return db.transaction(STORE, mode).objectStore(STORE);
    });
  }

  return {
    get: function (key) {
      return tx("readonly").then(function (store) {
        return new Promise(function (resolve, reject) {
          const r = store.get(key);
          r.onsuccess = function () { resolve(r.result); };
          r.onerror = function () { reject(r.error); };
        });
      });
    },
    set: function (key, value) {
      return tx("readwrite").then(function (store) {
        return new Promise(function (resolve, reject) {
          const r = store.put(value, key);
          r.onsuccess = function () { resolve(true); };
          r.onerror = function () { reject(r.error); };
        });
      });
    },
    clear: function () {
      return tx("readwrite").then(function (store) {
        return new Promise(function (resolve, reject) {
          const r = store.clear();
          r.onsuccess = function () { resolve(true); };
          r.onerror = function () { reject(r.error); };
        });
      });
    },
    estimate: function () {
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate();
      }
      return Promise.resolve(null);
    },
    persist: function () {
      if (navigator.storage && navigator.storage.persist) {
        return navigator.storage.persist().catch(function () { return false; });
      }
      return Promise.resolve(false);
    }
  };
})();

/* Shrink photos before saving. A phone camera photo is 4-8 MB;
   1400px at quality 0.72 is still readable on a doctor's screen
   and lands around 200-400 KB. */
function readImage(file, maxSide, quality) {
  maxSide = maxSide || 1400;
  quality = quality || 0.72;

  return new Promise(function (resolve, reject) {
    if (!file.type || file.type.indexOf("image") !== 0) {
      // Not an image (a PDF, say) — keep the name only.
      resolve({ name: file.name, url: null });
      return;
    }
    const reader = new FileReader();
    reader.onerror = function () { reject(new Error("Could not read that file")); };
    reader.onload = function () {
      const img = new Image();
      img.onerror = function () { reject(new Error("That image could not be opened")); };
      img.onload = function () {
        let w = img.width, h = img.height;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        resolve({ name: file.name, url: canvas.toDataURL("image/jpeg", quality) });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
