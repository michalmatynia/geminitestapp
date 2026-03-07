
import dynamic from 'next/dynamic';

export const Viewer3D = dynamic(() => import('./components/Viewer3D').then((m) => m.Viewer3D), {
  ssr: false,
});
