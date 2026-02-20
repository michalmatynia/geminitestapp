type ColorRgba = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const setPixel = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: ColorRgba
): void => {
  if (!(x >= 0 && x < width && y >= 0 && y < height)) return;
  const offset = ((y * width) + x) * 4;
  data[offset] = clampByte(color.r);
  data[offset + 1] = clampByte(color.g);
  data[offset + 2] = clampByte(color.b);
  data[offset + 3] = clampByte(color.a ?? 255);
};

export const createRgbaCanvas = (
  width: number,
  height: number,
  color: ColorRgba
): Uint8ClampedArray => {
  const data = new Uint8ClampedArray(Math.max(0, width * height * 4));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(data, width, height, x, y, color);
    }
  }
  return data;
};

export const paintRect = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  rect: Rect,
  color: ColorRgba
): void => {
  const startX = Math.max(0, rect.left);
  const startY = Math.max(0, rect.top);
  const endX = Math.min(width, rect.left + rect.width);
  const endY = Math.min(height, rect.top + rect.height);
  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      setPixel(data, width, height, x, y, color);
    }
  }
};

export const paintVerticalGradientBackground = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  topColor: ColorRgba,
  bottomColor: ColorRgba
): void => {
  if (!(width > 0 && height > 0)) return;
  const span = Math.max(1, height - 1);
  for (let y = 0; y < height; y += 1) {
    const t = y / span;
    const rowColor = {
      r: topColor.r + ((bottomColor.r - topColor.r) * t),
      g: topColor.g + ((bottomColor.g - topColor.g) * t),
      b: topColor.b + ((bottomColor.b - topColor.b) * t),
      a: topColor.a ?? bottomColor.a ?? 255,
    };
    for (let x = 0; x < width; x += 1) {
      setPixel(data, width, height, x, y, rowColor);
    }
  }
};

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

export const sprinkleBorderNoise = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    seed: number;
    count: number;
    borderThickness: number;
    minColor: number;
    maxColor: number;
  }
): void => {
  if (!(width > 0 && height > 0)) return;
  const random = createSeededRandom(options.seed);
  const borderThickness = Math.max(1, Math.floor(options.borderThickness));
  const minColor = clampByte(options.minColor);
  const maxColor = Math.max(minColor, clampByte(options.maxColor));

  const pickBorderPoint = (): { x: number; y: number } => {
    const side = Math.floor(random() * 4) % 4;
    if (side === 0) {
      return {
        x: Math.floor(random() * width),
        y: Math.floor(random() * borderThickness),
      };
    }
    if (side === 1) {
      return {
        x: width - 1 - Math.floor(random() * borderThickness),
        y: Math.floor(random() * height),
      };
    }
    if (side === 2) {
      return {
        x: Math.floor(random() * width),
        y: height - 1 - Math.floor(random() * borderThickness),
      };
    }
    return {
      x: Math.floor(random() * borderThickness),
      y: Math.floor(random() * height),
    };
  };

  for (let i = 0; i < Math.max(0, options.count); i += 1) {
    const { x, y } = pickBorderPoint();
    const color = minColor + Math.floor(random() * (maxColor - minColor + 1));
    const blueShift = Math.floor(random() * 6);
    setPixel(data, width, height, x, y, {
      r: color,
      g: Math.max(0, color - 2),
      b: Math.max(0, color - blueShift),
      a: 255,
    });
  }
};
