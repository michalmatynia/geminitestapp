import { fixtureOpaqueWhiteCore, fixtureTransparentCore } from './segments/fixture-clean';
import {
  fixtureBorderNoise,
  fixtureOffWhiteDrift,
  fixtureShadowedProduct,
  fixtureTouchesBorder,
} from './segments/fixture-challenging';
import type { ObjectLayoutGoldenFixture } from './segments/types';

export * from './segments/types';
export * from './segments/expectations';
export * from './segments/fixture-clean';
export * from './segments/fixture-challenging';

export const OBJECT_LAYOUT_GOLDEN_FIXTURES: ObjectLayoutGoldenFixture[] = [
  fixtureTransparentCore(),
  fixtureOpaqueWhiteCore(),
  fixtureShadowedProduct(),
  fixtureOffWhiteDrift(),
  fixtureBorderNoise(),
  fixtureTouchesBorder(),
];
