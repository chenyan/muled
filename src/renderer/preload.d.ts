import type { MuledAPI } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    muled: MuledAPI;
  }
}

export {};
