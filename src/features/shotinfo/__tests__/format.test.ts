import {
  formatAperture,
  formatCameraName,
  formatDate,
  formatFocalLength,
  formatIso,
  formatMake,
  formatSettingsLine,
  formatShutter,
  frameText,
} from '../format';

describe('formatMake', () => {
  it('title-cases all-caps makes and leaves mixed case alone', () => {
    expect(formatMake('FUJIFILM')).toBe('Fujifilm');
    expect(formatMake('SONY')).toBe('Sony');
    expect(formatMake('NIKON CORPORATION')).toBe('Nikon Corporation');
    expect(formatMake('Canon')).toBe('Canon');
    expect(formatMake('Apple')).toBe('Apple');
    expect(formatMake('  OM Digital Solutions ')).toBe('OM Digital Solutions');
  });

  it('is undefined for empty input', () => {
    expect(formatMake(undefined)).toBeUndefined();
    expect(formatMake('   ')).toBeUndefined();
  });
});

describe('formatCameraName', () => {
  it('drops Apple from iPhone models', () => {
    expect(formatCameraName('Apple', 'iPhone 15 Pro')).toBe('iPhone 15 Pro');
  });

  it('does not repeat a make the model already starts with', () => {
    expect(formatCameraName('Canon', 'Canon EOS R5')).toBe('Canon EOS R5');
    expect(formatCameraName('NIKON CORPORATION', 'NIKON Z 6_2')).toBe('Nikon Corporation NIKON Z 6_2');
    expect(formatCameraName('SONY', 'SONY ILCE-7M4')).toBe('SONY ILCE-7M4');
  });

  it('prefixes a title-cased make otherwise and keeps the model as-is', () => {
    expect(formatCameraName('FUJIFILM', 'X-T5')).toBe('Fujifilm X-T5');
    expect(formatCameraName('SONY', 'ILCE-7M4')).toBe('Sony ILCE-7M4');
  });

  it('handles a missing make or model', () => {
    expect(formatCameraName(undefined, 'X-T5')).toBe('X-T5');
    expect(formatCameraName('SONY', undefined)).toBe('Sony');
    expect(formatCameraName(undefined, undefined)).toBeUndefined();
    expect(formatCameraName('', ' ')).toBeUndefined();
  });
});

describe('formatFocalLength', () => {
  it('prefers the 35mm equivalent and never shows the raw lens string', () => {
    expect(formatFocalLength({ focalLength35mm: 24, focalLength: 6.86 })).toBe('24mm');
    expect(formatFocalLength({ focalLength35mm: 13 })).toBe('13mm');
    expect(formatFocalLength({ focalLength35mm: 120 })).toBe('120mm');
  });

  it('falls back to the rounded actual focal length', () => {
    expect(formatFocalLength({ focalLength: 6.86 })).toBe('7mm');
    expect(formatFocalLength({ focalLength: 56 })).toBe('56mm');
  });

  it('is undefined without a usable value', () => {
    expect(formatFocalLength({})).toBeUndefined();
    expect(formatFocalLength({ focalLength: 0 })).toBeUndefined();
    expect(formatFocalLength({ focalLength35mm: Number.NaN })).toBeUndefined();
  });
});

describe('formatAperture', () => {
  it('rounds to one decimal and drops a trailing .0', () => {
    expect(formatAperture(1.78)).toBe('f/1.8');
    expect(formatAperture(1.8)).toBe('f/1.8');
    expect(formatAperture(2)).toBe('f/2');
    expect(formatAperture(2.0)).toBe('f/2');
    expect(formatAperture(5.6)).toBe('f/5.6');
    expect(formatAperture(1.75)).toBe('f/1.8');
    expect(formatAperture(11)).toBe('f/11');
  });

  it('is undefined for missing or invalid values', () => {
    expect(formatAperture(undefined)).toBeUndefined();
    expect(formatAperture(0)).toBeUndefined();
    expect(formatAperture(-1)).toBeUndefined();
  });
});

describe('formatShutter', () => {
  it('shows fractions below one second with a rounded denominator', () => {
    expect(formatShutter(1 / 120)).toBe('1/120s');
    expect(formatShutter(0.008333)).toBe('1/120s');
    expect(formatShutter(1 / 4000)).toBe('1/4000s');
    expect(formatShutter(0.5)).toBe('1/2s');
    expect(formatShutter(0.0166)).toBe('1/60s');
    expect(formatShutter(0.99)).toBe('1s');
  });

  it('shows seconds at one second or above', () => {
    expect(formatShutter(1)).toBe('1s');
    expect(formatShutter(2.5)).toBe('2.5s');
    expect(formatShutter(30)).toBe('30s');
    expect(formatShutter(2.04)).toBe('2s');
  });

  it('is undefined for missing or invalid values', () => {
    expect(formatShutter(undefined)).toBeUndefined();
    expect(formatShutter(0)).toBeUndefined();
    expect(formatShutter(Number.POSITIVE_INFINITY)).toBeUndefined();
  });
});

describe('formatIso', () => {
  it('prefixes ISO and rounds', () => {
    expect(formatIso(80)).toBe('ISO 80');
    expect(formatIso(3200)).toBe('ISO 3200');
    expect(formatIso(125.4)).toBe('ISO 125');
  });

  it('is undefined for missing or invalid values', () => {
    expect(formatIso(undefined)).toBeUndefined();
    expect(formatIso(0)).toBeUndefined();
  });
});

describe('formatDate', () => {
  const date = new Date(2026, 10, 1, 14, 32, 11); // 1 Nov 2026, local time

  it('is a localised short date without time or zone', () => {
    expect(formatDate(date, 'en-GB')).toBe('1 Nov 2026');
    expect(formatDate(date, 'en-US')).toBe('Nov 1, 2026');
    expect(formatDate(date, 'en-GB')).not.toMatch(/\d:\d\d|GMT|UTC|\+/);
  });

  it('is undefined for a missing or invalid date', () => {
    expect(formatDate(undefined)).toBeUndefined();
    expect(formatDate(new Date(Number.NaN))).toBeUndefined();
  });
});

describe('formatSettingsLine', () => {
  it('joins the available values with " · "', () => {
    expect(
      formatSettingsLine({ focalLength35mm: 24, aperture: 1.78, exposureTime: 1 / 120, iso: 80 }),
    ).toBe('24mm · f/1.8 · 1/120s · ISO 80');
  });

  it('omits missing values and their separators without leaving gaps', () => {
    expect(formatSettingsLine({ focalLength35mm: 24, aperture: 1.78, exposureTime: 1 / 120 })).toBe(
      '24mm · f/1.8 · 1/120s',
    );
    expect(formatSettingsLine({ aperture: 2, iso: 400 })).toBe('f/2 · ISO 400');
    expect(formatSettingsLine({ iso: 400 })).toBe('ISO 400');
    const line = formatSettingsLine({ focalLength35mm: 24, iso: 80 }) ?? '';
    expect(line).not.toMatch(/· ·|^ ·| ·$|undefined/);
  });

  it('is undefined when nothing is available', () => {
    expect(formatSettingsLine({})).toBeUndefined();
    expect(formatSettingsLine({ date: new Date() })).toBeUndefined();
  });
});

describe('frameText', () => {
  it('builds the full frame for a camera photo', () => {
    expect(
      frameText(
        {
          make: 'Apple',
          model: 'iPhone 15 Pro',
          lens: 'iPhone 15 Pro back triple camera 6.86mm f/1.78',
          focalLength35mm: 24,
          focalLength: 6.86,
          aperture: 1.78,
          exposureTime: 1 / 120,
          iso: 80,
          date: new Date(2026, 10, 1),
        },
        'en-GB',
      ),
    ).toEqual({
      title: 'Shot on iPhone 15 Pro',
      settings: '24mm · f/1.8 · 1/120s · ISO 80',
      date: '1 Nov 2026',
      hasCameraInfo: true,
    });
  });

  it('never prints the raw lens string', () => {
    const text = frameText({ make: 'Apple', model: 'iPhone 15 Pro', lens: 'back triple camera 6.86mm f/1.78' });
    expect(JSON.stringify(text)).not.toContain('triple');
  });

  it('is date-only when the camera fields are missing', () => {
    expect(frameText({ date: new Date(2026, 10, 1) }, 'en-GB')).toEqual({ date: '1 Nov 2026', hasCameraInfo: false });
  });

  it('has no lines at all for a screenshot', () => {
    expect(frameText({})).toEqual({ hasCameraInfo: false });
  });

  it('skips a partial value without leaving an empty slot', () => {
    expect(frameText({ make: 'SONY', model: 'ILCE-7M4', aperture: 2.8, exposureTime: 1 / 250 })).toEqual({
      title: 'Shot on Sony ILCE-7M4',
      settings: 'f/2.8 · 1/250s',
      hasCameraInfo: true,
    });
  });
});
