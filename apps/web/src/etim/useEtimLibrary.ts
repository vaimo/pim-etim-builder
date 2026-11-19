import { useEffect, useState } from 'react';
import { fetchEtimLibrary, type EtimLibrary } from './library.js';

let cached: Promise<EtimLibrary> | undefined;

/** The pre-loaded ETIM exports, fetched once per page load. `undefined` while loading. */
export function useEtimLibrary(): EtimLibrary | undefined {
  const [library, setLibrary] = useState<EtimLibrary | undefined>();
  useEffect(() => {
    let active = true;
    cached ??= fetchEtimLibrary();
    void cached.then((lib) => active && setLibrary(lib));
    return () => {
      active = false;
    };
  }, []);
  return library;
}
