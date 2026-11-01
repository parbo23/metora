import {
  ImageFormat,
  listFontFamilies,
  matchFont,
  Skia,
  type SkCanvas,
  type SkFont,
  type SkImage,
} from '@shopify/react-native-skia';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { classicFrameLayout, exportWidthFor, FRAME_COLORS, type FrameLines, type TextLine } from './classicFrame';

import type { WorkSession } from '@/types/workflow';
import { devLog } from '@/utils/devLog';

export interface RenderInput {
  /** Working copy of the original photo. Its camera info must already have been read. */
  sourceUri: string;
  lines: FrameLines;
  session: WorkSession;
  /** Output file name inside the session directory, e.g. "IMG_0421-framed.jpg". */
  fileName: string;
}

export interface RenderedFrame {
  uri: string;
  width: number;
  height: number;
  format: 'jpeg';
}

export type RenderOutcome = { kind: 'rendered'; frame: RenderedFrame } | { kind: 'failed' } | { kind: 'unavailable' };

/** JPEG quality for the exported frame. */
const JPEG_QUALITY = 92;

/**
 * Renders the "Classic" frame at full pixel resolution, never as a screenshot
 * of a view.
 *
 * 1. expo-image-manipulator decodes the original (HEIC included), applies the
 *    EXIF orientation so the pixels are "up", and downscales anything above
 *    ~12MP. It writes a fresh JPEG without any metadata, which is why the
 *    camera info has to be read from the original bytes before this runs.
 * 2. Skia draws that image and the white info bar on an offscreen surface of
 *    the final size and encodes it as JPEG.
 */
export async function renderClassicFrame(input: RenderInput): Promise<RenderOutcome> {
  let normalized: { uri: string; width: number; height: number } | null = null;
  try {
    normalized = await normalizeSource(input.sourceUri);
    const frame = await drawFrame(normalized, input);
    return { kind: 'rendered', frame };
  } catch (error) {
    devLog('render: failed', error instanceof Error ? error.name : 'unknown');
    return { kind: 'failed' };
  } finally {
    if (normalized && normalized.uri !== input.sourceUri) {
      try {
        const temp = new File(normalized.uri);
        if (temp.exists) temp.delete();
      } catch {
        // The cache sweep removes it later.
      }
    }
  }
}

/** Orientation-normalised, size-capped JPEG of the source, in the manipulator's cache. */
async function normalizeSource(sourceUri: string): Promise<{ uri: string; width: number; height: number }> {
  const context = ImageManipulator.manipulate(sourceUri);
  try {
    // Pass 1 only learns the oriented pixel size; the resize needs it.
    const probe = await context.renderAsync();
    const targetWidth = exportWidthFor(probe.width, probe.height);
    probe.release();
    if (targetWidth !== null) context.resize({ width: targetWidth, height: null });
    const image = await context.renderAsync();
    try {
      // Highest JPEG quality here: this is an intermediate, Skia re-encodes at the export quality.
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
      return { uri: result.uri, width: result.width, height: result.height };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

async function drawFrame(
  source: { uri: string; width: number; height: number },
  input: RenderInput,
): Promise<RenderedFrame> {
  const data = await Skia.Data.fromURI(source.uri);
  let image: SkImage | null = null;
  try {
    image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) throw new Error('decode failed');

    const layout = classicFrameLayout(image.width(), image.height(), input.lines);
    const surface =
      Skia.Surface.MakeOffscreen(layout.canvasWidth, layout.canvasHeight) ??
      Skia.Surface.Make(layout.canvasWidth, layout.canvasHeight);
    if (!surface) throw new Error('surface failed');

    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color(FRAME_COLORS.background));

    const photoPaint = Skia.Paint();
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(0, 0, image.width(), image.height()),
      Skia.XYWHRect(0, 0, layout.imageWidth, layout.imageHeight),
      photoPaint,
    );

    const family = systemFontFamily();
    if (layout.title && input.lines.title) {
      drawLine(canvas, input.lines.title, layout.title, layout.leftX, 'left', family);
    }
    if (layout.settings && input.lines.settings) {
      drawLine(canvas, input.lines.settings, layout.settings, layout.leftX, 'left', family);
    }
    if (layout.date && input.lines.date) {
      drawLine(canvas, input.lines.date, layout.date, layout.rightX, 'right', family);
    }

    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    try {
      const bytes = snapshot.encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
      const output = new File(input.session.directoryUri, input.fileName);
      if (output.exists) output.delete();
      output.write(bytes);
      return { uri: output.uri, width: layout.canvasWidth, height: layout.canvasHeight, format: 'jpeg' };
    } finally {
      snapshot.dispose();
      surface.dispose();
    }
  } finally {
    image?.dispose();
    data.dispose();
  }
}

function drawLine(
  canvas: SkCanvas,
  text: string,
  line: TextLine,
  anchorX: number,
  align: 'left' | 'right',
  family: string | undefined,
) {
  const font = fontFor(line, family);
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color(line.color));
  const metrics = font.getMetrics();
  // ascent is negative (above the baseline); centre the glyph box on the line's centre.
  const baseline = line.centerY - (metrics.ascent + metrics.descent) / 2;
  const width = font.measureText(text).width;
  const x = align === 'left' ? anchorX : anchorX - width;
  canvas.drawText(text, x, baseline, paint, font);
}

function fontFor(line: TextLine, family: string | undefined): SkFont {
  return matchFont({
    fontFamily: family,
    fontSize: line.fontSize,
    fontWeight: line.weight === 'bold' ? '600' : '400',
    fontStyle: 'normal',
  });
}

/** Candidate system families, best first; the first one the font manager knows wins. */
const FAMILY_CANDIDATES: Record<string, string[]> = {
  ios: ['SF Pro Text', 'SF Pro Display', 'SF Pro', '.AppleSystemUIFont', 'Helvetica Neue', 'Helvetica'],
  android: ['Roboto', 'sans-serif'],
};

let cachedFamily: string | undefined | null = null;

function systemFontFamily(): string | undefined {
  if (cachedFamily !== null) return cachedFamily;
  try {
    const available = new Set(listFontFamilies());
    const candidates = FAMILY_CANDIDATES[Platform.OS] ?? [];
    cachedFamily = candidates.find((name) => available.has(name));
  } catch {
    cachedFamily = undefined;
  }
  devLog('render: font family', cachedFamily ?? 'default');
  return cachedFamily;
}
