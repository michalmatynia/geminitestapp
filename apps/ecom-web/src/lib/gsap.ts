'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  try {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
  } catch (error) {
    console.error('Failed to register GSAP plugins.', error);
  }
}

export { gsap, ScrollTrigger, useGSAP };
