import { useEffect, useState } from 'react';

import { shotInfoFromTags, type ShotInfo } from './shotInfo';

import { metadataService, type MetadataService } from '@/services/MetadataService';

export type ShotInfoState = { status: 'loading' } | { status: 'ready'; info: ShotInfo } | { status: 'unreadable' };

interface Loaded {
  uri: string | undefined;
  state: Exclude<ShotInfoState, { status: 'loading' }>;
}

/**
 * Reads the camera info for one working-copy URI from its original bytes.
 * Must run on the untouched copy: anything re-encoded (resize, orientation
 * fix) has lost the tags. State is screen-local and dropped on unmount.
 */
export function useShotInfo(uri: string | undefined, service: MetadataService = metadataService): ShotInfoState {
  // The result is tagged with the URI it belongs to, so a URI change reads as
  // "loading" without any synchronous setState inside the effect.
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!uri) return;
    service
      .readTags(uri)
      .then((tags) => {
        if (!cancelled) setLoaded({ uri, state: { status: 'ready', info: shotInfoFromTags(tags) } });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ uri, state: { status: 'unreadable' } });
      });
    return () => {
      cancelled = true;
    };
  }, [uri, service]);

  if (!uri) return { status: 'unreadable' };
  if (loaded && loaded.uri === uri) return loaded.state;
  return { status: 'loading' };
}
