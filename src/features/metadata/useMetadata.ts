import { useEffect, useState } from 'react';

import { metadataService, type MetadataService } from '@/services/MetadataService';
import type { MetadataSnapshot } from '@/types/metadata';

export type MetadataLoadState =
  { status: 'loading' } | { status: 'ready'; snapshot: MetadataSnapshot } | { status: 'unreadable' };

interface Loaded {
  uri: string | undefined;
  state: Exclude<MetadataLoadState, { status: 'loading' }>;
}

/**
 * Loads metadata for one file URI. State is screen-local on purpose: the full
 * tag list never lives in global state, and it is dropped when the screen
 * unmounts (spec section 22).
 */
export function useMetadata(
  uri: string | undefined,
  service: MetadataService = metadataService,
): MetadataLoadState {
  // The result is tagged with the URI it belongs to, so a URI change reads as
  // "loading" without any synchronous setState inside the effect.
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      return;
    }
    service
      .inspect(uri)
      .then((snapshot) => {
        if (!cancelled) setLoaded({ uri, state: { status: 'ready', snapshot } });
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
