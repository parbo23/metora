import { barHeightFor, classicFrameLayout, exportWidthFor, FRAME_COLORS, MAX_EXPORT_PIXELS } from '../classicFrame';

const full = { title: 'Shot on iPhone 15 Pro', settings: '24mm · f/1.8 · 1/120s · ISO 80', date: '1 Nov 2026' };

describe('barHeightFor', () => {
  it('is 10% of the width for landscape images', () => {
    expect(barHeightFor(4000, 3000)).toBe(400);
    expect(barHeightFor(6000, 4000)).toBe(600);
  });

  it('is at least 8% of the long side for portrait images', () => {
    expect(barHeightFor(3000, 4000)).toBe(320); // 10% of width = 300 < 8% of 4000
    expect(barHeightFor(2000, 2000)).toBe(200);
  });
});

describe('classicFrameLayout', () => {
  it('keeps the photo untouched on top and adds the bar below', () => {
    const layout = classicFrameLayout(4000, 3000, full);
    expect(layout).toMatchObject({
      imageWidth: 4000,
      imageHeight: 3000,
      canvasWidth: 4000,
      canvasHeight: 3400,
      barTop: 3000,
      barHeight: 400,
      paddingX: 160,
      leftX: 160,
      rightX: 3840,
    });
  });

  it('scales every size with the image width', () => {
    const small = classicFrameLayout(4000, 3000, full);
    const large = classicFrameLayout(8000, 6000, full);
    expect(large.barHeight).toBe(small.barHeight * 2);
    expect(large.paddingX).toBe(small.paddingX * 2);
    expect(large.title?.fontSize).toBeCloseTo((small.title?.fontSize ?? 0) * 2, 6);
    expect(large.settings?.fontSize).toBeCloseTo((small.settings?.fontSize ?? 0) * 2, 6);
  });

  it('stacks title (bold, dark) above settings (regular, grey) around the bar centre', () => {
    const layout = classicFrameLayout(4000, 3000, full);
    const barCenter = 3000 + 200;
    expect(layout.title).toMatchObject({ weight: 'bold', color: FRAME_COLORS.text });
    expect(layout.settings).toMatchObject({ weight: 'regular', color: FRAME_COLORS.textSecondary });
    expect(layout.title!.centerY).toBeLessThan(barCenter);
    expect(layout.settings!.centerY).toBeGreaterThan(barCenter);
    expect(layout.title!.fontSize).toBeGreaterThan(layout.settings!.fontSize);
    // Both lines stay inside the bar.
    expect(layout.title!.centerY - layout.title!.fontSize / 2).toBeGreaterThan(3000);
    expect(layout.settings!.centerY + layout.settings!.fontSize / 2).toBeLessThan(3400);
  });

  it('centres the date vertically on the right', () => {
    const layout = classicFrameLayout(4000, 3000, full);
    expect(layout.date).toMatchObject({ centerY: 3200, weight: 'regular', color: FRAME_COLORS.textSecondary });
  });

  it('centres a lone title when the settings line is missing', () => {
    const layout = classicFrameLayout(4000, 3000, { title: 'Shot on Fujifilm X-T5' });
    expect(layout.title?.centerY).toBe(3200);
    expect(layout.settings).toBeUndefined();
    expect(layout.date).toBeUndefined();
  });

  it('centres a lone settings line and omits absent lines entirely', () => {
    const layout = classicFrameLayout(4000, 3000, { settings: 'ISO 400', date: '1 Nov 2026' });
    expect(layout.title).toBeUndefined();
    expect(layout.settings?.centerY).toBe(3200);
    expect(layout.date?.centerY).toBe(3200);
  });

  it('places nothing for a photo without any info but keeps the bar', () => {
    const layout = classicFrameLayout(3000, 4000, {});
    expect(layout.title).toBeUndefined();
    expect(layout.settings).toBeUndefined();
    expect(layout.date).toBeUndefined();
    expect(layout.canvasHeight).toBe(4320);
  });

  it('rejects an empty image', () => {
    expect(() => classicFrameLayout(0, 100, full)).toThrow(RangeError);
  });
});

describe('exportWidthFor', () => {
  it('leaves images up to the cap alone', () => {
    expect(exportWidthFor(4000, 3000)).toBeNull(); // 12.0MP
    expect(exportWidthFor(3024, 3024)).toBeNull();
    expect(exportWidthFor(1920, 1080)).toBeNull();
  });

  it('only just downscales a 12.2MP iPhone photo', () => {
    const width = exportWidthFor(4032, 3024)!; // 12.19MP
    expect(width).toBeLessThan(4032);
    expect(width).toBeGreaterThan(3950);
  });

  it('downscales a 48MP photo to about 12MP keeping the aspect ratio', () => {
    const width = exportWidthFor(8064, 6048)!;
    const height = Math.round((width * 6048) / 8064);
    expect(width * height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(width * height).toBeGreaterThan(MAX_EXPORT_PIXELS * 0.98);
    expect(width / height).toBeCloseTo(8064 / 6048, 2);
  });

  it('handles portrait and invalid sizes', () => {
    expect(exportWidthFor(6048, 8064)).toBe(3000);
    expect(exportWidthFor(0, 10)).toBeNull();
  });
});
