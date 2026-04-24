import type { KangurDuelStatus, KangurDuelPlayerStatus } from '@kangur/contracts/kangur-duels';
import type { KangurMobileTone as Tone } from '../../shared/KangurMobileUi';

export function isWaitingSessionStatus(status: KangurDuelStatus): boolean {
  return status === 'waiting' || status === 'ready' || status === 'created';
}

export function getLessonMasteryTone(masteryPercent: number): Tone {
  if (masteryPercent >= 90) return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' };
  if (masteryPercent >= 70) return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
}

export function getStatusTone(status: KangurDuelStatus): Tone {
  if (status === 'completed') return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' };
  if (status === 'aborted') return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
  if (status === 'in_progress' || status === 'ready') return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1d4ed8' };
}

export function getPlayerStatusTone(status: KangurDuelPlayerStatus): Tone {
  if (status === 'completed') return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' };
  if (status === 'left') return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
  if (status === 'playing') return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1d4ed8' };
}
