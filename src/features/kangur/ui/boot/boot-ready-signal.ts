type BootReadyCallback = () => void;

let ready = false;
const pending: BootReadyCallback[] = [];

export const signalBootReady = (): void => {
  if (ready) return;
  ready = true;
  for (const cb of pending.splice(0)) {
    try {
      cb();
    } catch {
      // Swallow errors from boot-ready callbacks to avoid breaking the boot sequence.
    }
  }
};

export const onBootReady = (callback: BootReadyCallback): void => {
  if (ready) {
    try {
      callback();
    } catch {
      // Swallow errors to avoid breaking callers.
    }
    return;
  }
  pending.push(callback);
};
