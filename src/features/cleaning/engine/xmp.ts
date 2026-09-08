import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

import { utf8Bytes, utf8Of } from './bytes';

import { categorizeTag } from '@/features/metadata/categorize';
import type { MetadataCategory } from '@/types/metadata';

export class XmpParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XmpParseError';
  }
}

const RDF_NS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

/** An XMP packet with nothing in it, used when a container needs a placeholder. */
export const EMPTY_XMP_PACKET =
  '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
  '<rdf:Description rdf:about=""/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';

/**
 * Removes XMP properties belonging to the given categories. Properties may be
 * attributes or child elements of rdf:Description; both forms are handled.
 * Namespace declarations, rdf:about and unrelated properties are untouched.
 */
export function cleanXmp(
  xml: string,
  remove: ReadonlySet<MetadataCategory>,
): { xml: string; removed: number } {
  let doc: Document;
  try {
    const parser = new DOMParser({
      onError: (level: string, message: string) => {
        if (level === 'fatalError' || level === 'error') throw new XmpParseError(message);
      },
    });
    doc = parser.parseFromString(xml, 'text/xml') as unknown as Document;
  } catch (error) {
    throw error instanceof XmpParseError ? error : new XmpParseError('invalid XML');
  }
  if (!doc.documentElement) throw new XmpParseError('empty document');

  let removed = 0;
  const descriptions = Array.from(doc.getElementsByTagNameNS(RDF_NS, 'Description'));
  for (const description of descriptions) {
    // Attributes (shorthand properties).
    for (const attr of Array.from(description.attributes)) {
      if (attr.namespaceURI === RDF_NS || attr.prefix === 'xmlns' || attr.name === 'xmlns') continue;
      const category = categorizeTag('xmp', attr.localName ?? attr.name);
      if (category !== null && remove.has(category)) {
        description.removeAttributeNode(attr);
        removed += 1;
      }
    }
    // Child elements (structured properties).
    for (const child of Array.from(description.childNodes)) {
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      const category = categorizeTag('xmp', element.localName ?? element.nodeName);
      if (category !== null && remove.has(category)) {
        description.removeChild(element);
        removed += 1;
      }
    }
  }

  const serialized = new XMLSerializer().serializeToString(doc as never);
  return { xml: serialized, removed };
}

export function cleanXmpBytes(
  bytes: Uint8Array,
  remove: ReadonlySet<MetadataCategory>,
): { bytes: Uint8Array; removed: number } {
  const result = cleanXmp(utf8Of(bytes), remove);
  return { bytes: utf8Bytes(result.xml), removed: result.removed };
}

/**
 * Pads an XMP packet with spaces so it occupies exactly `length` bytes. XMP
 * defines trailing whitespace as padding, so readers ignore it. Returns null
 * when the packet does not fit.
 */
export function padXmpTo(bytes: Uint8Array, length: number): Uint8Array | null {
  if (bytes.length > length) return null;
  const out = new Uint8Array(length);
  out.fill(0x20);
  out.set(bytes);
  return out;
}
