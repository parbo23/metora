/**
 * "Classic" frame layout: the untouched photo on top, a white bar below it
 * with the camera info. Every size is a fraction of the image width so the
 * result looks identical on a 12MP and a 48MP photo. Pure, unit-tested;
 * the renderer only turns these numbers into draw calls.
 */
export const FRAME_COLORS = {
  background: '#FFFFFF',
  text: '#111111',
  textSecondary: '#6B6B6B',
} as const;

/** Bar height as a fraction of the image width. */
const BAR_HEIGHT_OF_WIDTH = 0.1;
/** Minimum bar height as a fraction of the long side (keeps the bar readable on portrait photos). */
const BAR_MIN_OF_LONG_SIDE = 0.08;
/** Horizontal padding as a fraction of the image width. */
const PADDING_OF_WIDTH = 0.04;
/** Font sizes as fractions of the bar height. */
const TITLE_OF_BAR = 0.26;
const BODY_OF_BAR = 0.2;
/** Gap between the two left lines as a fraction of the bar height. */
const LINE_GAP_OF_BAR = 0.08;

export interface TextLine {
  /** Vertical centre of the line, in canvas pixels. */
  centerY: number;
  fontSize: number;
  weight: 'bold' | 'regular';
  color: string;
}

export interface ClassicFrameLayout {
  imageWidth: number;
  imageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  /** Top of the white bar (== imageHeight). */
  barTop: number;
  barHeight: number;
  paddingX: number;
  /** Left edge of the left block. */
  leftX: number;
  /** Right edge of the right-aligned date. */
  rightX: number;
  /** Lines of the left block, top to bottom; absent when there is nothing to print. */
  title?: TextLine;
  settings?: TextLine;
  /** The right-aligned date, vertically centred. */
  date?: TextLine;
}

export interface FrameLines {
  title?: string;
  settings?: string;
  date?: string;
}

/** Bar height for an image, before any text is placed. */
export function barHeightFor(imageWidth: number, imageHeight: number): number {
  const longSide = Math.max(imageWidth, imageHeight);
  return Math.round(Math.max(imageWidth * BAR_HEIGHT_OF_WIDTH, longSide * BAR_MIN_OF_LONG_SIDE));
}

/**
 * Computes the frame geometry for an image of the given pixel size and the
 * lines that exist. Lines without text are left out entirely, so a missing
 * settings line centres the title instead of leaving a gap.
 */
export function classicFrameLayout(imageWidth: number, imageHeight: number, lines: FrameLines): ClassicFrameLayout {
  if (!(imageWidth > 0) || !(imageHeight > 0)) {
    throw new RangeError('classicFrameLayout: image size must be positive');
  }
  const barHeight = barHeightFor(imageWidth, imageHeight);
  const paddingX = Math.round(imageWidth * PADDING_OF_WIDTH);
  const barTop = imageHeight;
  const barCenterY = barTop + barHeight / 2;
  const titleSize = barHeight * TITLE_OF_BAR;
  const bodySize = barHeight * BODY_OF_BAR;
  const gap = barHeight * LINE_GAP_OF_BAR;

  const layout: ClassicFrameLayout = {
    imageWidth,
    imageHeight,
    canvasWidth: imageWidth,
    canvasHeight: imageHeight + barHeight,
    barTop,
    barHeight,
    paddingX,
    leftX: paddingX,
    rightX: imageWidth - paddingX,
  };

  const hasTitle = Boolean(lines.title);
  const hasSettings = Boolean(lines.settings);

  if (hasTitle && hasSettings) {
    // Two lines, stacked around the bar's centre.
    const blockHeight = titleSize + gap + bodySize;
    const top = barCenterY - blockHeight / 2;
    layout.title = line(top + titleSize / 2, titleSize, 'bold', FRAME_COLORS.text);
    layout.settings = line(top + titleSize + gap + bodySize / 2, bodySize, 'regular', FRAME_COLORS.textSecondary);
  } else if (hasTitle) {
    layout.title = line(barCenterY, titleSize, 'bold', FRAME_COLORS.text);
  } else if (hasSettings) {
    layout.settings = line(barCenterY, bodySize, 'regular', FRAME_COLORS.textSecondary);
  }

  if (lines.date) {
    layout.date = line(barCenterY, bodySize, 'regular', FRAME_COLORS.textSecondary);
  }

  return layout;
}

function line(centerY: number, fontSize: number, weight: TextLine['weight'], color: string): TextLine {
  return { centerY, fontSize, weight, color };
}

/** Export cap: larger images are downscaled to about this many pixels before rendering. */
export const MAX_EXPORT_PIXELS = 12_000_000;

/**
 * Width to resize to so the image has at most MAX_EXPORT_PIXELS, or null when
 * it already fits. Height follows from the aspect ratio.
 */
export function exportWidthFor(width: number, height: number, maxPixels: number = MAX_EXPORT_PIXELS): number | null {
  if (!(width > 0) || !(height > 0)) return null;
  if (width * height <= maxPixels) return null;
  return Math.floor(Math.sqrt((maxPixels * width) / height));
}
