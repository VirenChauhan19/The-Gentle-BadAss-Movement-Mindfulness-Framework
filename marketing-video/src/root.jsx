import React from 'react';
import { Composition } from 'remotion';
import { Promo } from './promo.jsx';

export function RemotionRoot() {
  return (
    <Composition
      id="LaUltraPromo"
      component={Promo}
      durationInFrames={1800}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
