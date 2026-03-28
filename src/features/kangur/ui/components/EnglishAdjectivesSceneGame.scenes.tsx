'use client';

import React, { useId } from 'react';
import {
  ADJECTIVE_TOKEN_META,
  getObjectLabel,
  getTokenLabel,
} from './EnglishAdjectivesSceneGame.utils';
import type {
  EnglishAdjectivePhraseId,
  EnglishAdjectiveSceneObjectId,
  EnglishAdjectivesSceneRound,
} from './EnglishAdjectivesSceneGame.data';
import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';

function ObjectSceneBadge({
  label,
  value,
  x,
  y,
}: {
  label: string;
  value: string | null;
  x: number;
  y: number;
}): React.JSX.Element {
  const width = Math.min(
    156,
    Math.max(106, Math.round(Math.max(label.length * 5.9, (value?.length ?? 0) * 5.3) + 24))
  );
  const height = value ? 38 : 24;
  const safeX = Math.min(Math.max(x, 28), 420 - width - 10);
  const safeY = Math.min(Math.max(y, 24), 240 - height - 6);
  const badgeGradientId = useId().replace(/:/g, '-');

  return (
    <g transform={`translate(${safeX},${safeY})`}>
      <defs>
        <linearGradient id={badgeGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.98)' />
          <stop offset='100%' stopColor='rgba(226,232,240,0.92)' />
        </linearGradient>
      </defs>
      <rect x='2' y='3' width={width} height={height} rx='12' fill='rgba(15,23,42,0.12)' />
      <rect
        x='0'
        y='0'
        width={width}
        height={height}
        rx='12'
        fill={`url(#${badgeGradientId})`}
        stroke='#cbd5e1'
      />
      <rect x='0' y='0' width={width} height={16} rx='12' fill='rgba(241,245,249,0.98)' />
      <text
        x='10'
        y='12'
        fontSize='9.5'
        fontWeight='700'
        fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
        fill='#475569'
      >
        {label}
      </text>
      {value ? (
        <text
          x='10'
          y='28'
          fontSize='10'
          fontWeight='700'
          fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif'
          fill='#1e293b'
        >
          {value}
        </text>
      ) : null}
    </g>
  );
}

export function renderAdjectiveStudioScene({
  round,
  slots,
  translate,
}: {
  round: EnglishAdjectivesSceneRound;
  slots: Record<string, { adjective: EnglishAdjectivePhraseId } | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const assignedByObject = Object.fromEntries(
    round.objects.map((object) => [object.objectId, slots[object.id]?.adjective ?? null])
  ) as Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;

  switch (round.id) {
    case 'bedroom':
      return renderRoomScene({ assignedByObject, translate });
    case 'study_corner':
      return renderStudyScene({ assignedByObject, translate });
    case 'portrait':
      return renderPortraitScene({ assignedByObject, translate });
    case 'playground':
      return renderPlaygroundScene({ assignedByObject, translate });
    default:
      return <></>;
  }
}

function renderRoomScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const cupboard = assignedByObject['cupboard'];
  const curtains = assignedByObject['curtains'];
  const rug = assignedByObject['rug'];
  const cupboardMeta = cupboard
    ? ADJECTIVE_TOKEN_META[cupboard]
    : null;
  const curtainsMeta = curtains
    ? ADJECTIVE_TOKEN_META[curtains]
    : null;
  const rugMeta = rug ? ADJECTIVE_TOKEN_META[rug] : null;

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.room')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='room-scene-clip'>
          <rect
            data-testid='english-adjectives-scene-room-clip'
            x='20'
            y='18'
            width='400'
            height='222'
            rx='24'
          />
        </clipPath>
        <linearGradient id='room-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f1f5f9' />
        </linearGradient>
        <filter id='room-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.12' />
        </filter>
      </defs>
      <g clipPath='url(#room-scene-clip)'>
        <rect
          className='wall'
          x='20'
          y='18'
          width='400'
          height='180'
          rx='24'
          fill='url(#room-wall-gradient)'
          stroke='#cbd5e1'
          strokeWidth='2'
        />
        <rect className='floor' x='20' y='170' width='400' height='58' rx='20' fill='#e2e8f0' />

        <g data-testid='english-adjectives-scene-room-cupboard-art' transform='translate(60,60)'>
          <rect
            x='0'
            y='0'
            width='100'
            height='120'
            rx='12'
            fill={cupboardMeta?.fill ?? '#94a3b8'}
            filter='url(#room-shadow)'
          />
          <rect x='10' y='10' width='35' height='100' rx='4' fill='rgba(255,255,255,0.1)' />
          <rect x='55' y='10' width='35' height='100' rx='4' fill='rgba(255,255,255,0.1)' />
          <circle cx='40' cy='60' r='4' fill='#475569' />
          <circle cx='60' cy='60' r='4' fill='#475569' />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'cupboard')}
          value={cupboard ? getTokenLabel(translate, cupboard) : null}
          x={60}
          y={30}
        />

        <g data-testid='english-adjectives-scene-room-curtains-art' transform='translate(200,40)'>
          <rect
            x='0'
            y='0'
            width='120'
            height='100'
            rx='8'
            fill={curtainsMeta?.fill ?? '#cbd5e1'}
            filter='url(#room-shadow)'
          />
          <rect x='10' y='0' width='20' height='100' fill='rgba(0,0,0,0.05)' />
          <rect x='90' y='0' width='20' height='100' fill='rgba(0,0,0,0.05)' />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'curtains')}
          value={curtains ? getTokenLabel(translate, curtains) : null}
          x={200}
          y={20}
        />

        <g data-testid='english-adjectives-scene-room-rug-art' transform='translate(150,180)'>
          <ellipse
            cx='70'
            cy='30'
            rx='100'
            ry='40'
            fill={rugMeta?.fill ?? '#cbd5e1'}
            filter='url(#room-shadow)'
          />
          <ellipse cx='70' cy='30' rx='80' ry='30' fill='rgba(255,255,255,0.1)' />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'rug')}
          value={rug ? getTokenLabel(translate, rug) : null}
          x={150}
          y={210}
        />
      </g>
    </svg>
  );
}

function renderStudyScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const desk = assignedByObject['desk'];
  const lamp = assignedByObject['lamp'];
  const book = assignedByObject['book'];
  const deskMeta = desk ? ADJECTIVE_TOKEN_META[desk] : null;
  const lampMeta = lamp ? ADJECTIVE_TOKEN_META[lamp] : null;
  const bookMeta = book ? ADJECTIVE_TOKEN_META[book] : null;
  const lampScale = (lampMeta?.scale ?? 1) * 0.92;

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.study')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='study-scene-clip'>
          <rect
            data-testid='english-adjectives-scene-study-clip'
            x='20'
            y='18'
            width='400'
            height='222'
            rx='24'
          />
        </clipPath>
        <linearGradient id='study-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#f1f5f9' />
          <stop offset='100%' stopColor='#e2e8f0' />
        </linearGradient>
        <linearGradient id='study-desk-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.42)' />
          <stop offset='100%' stopColor='rgba(124,58,237,0.18)' />
        </linearGradient>
        <linearGradient id='study-lamp-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.48)' />
          <stop offset='100%' stopColor='rgba(251,113,133,0.22)' />
        </linearGradient>
        <linearGradient id='study-book-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.46)' />
          <stop offset='100%' stopColor='rgba(21,128,61,0.18)' />
        </linearGradient>
        <filter id='study-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.15' />
        </filter>
      </defs>
      <g clipPath='url(#study-scene-clip)'>
        <rect
          className='wall'
          x='20'
          y='18'
          width='400'
          height='180'
          rx='24'
          fill='url(#study-wall-gradient)'
          stroke='#cbd5e1'
          strokeWidth='2'
        />
        <rect className='floor' x='20' y='170' width='400' height='58' rx='20' fill='#e2e8f0' />

        <g data-testid='english-adjectives-scene-study-desk-art' transform='translate(70,100)'>
          <rect
            x='0'
            y='28'
            width='164'
            height='24'
            rx='12'
            fill={deskMeta?.fill ?? '#c4b5fd'}
            stroke='#7c3aed'
            strokeWidth='2'
            filter='url(#study-shadow)'
          />
          <rect
            x='0'
            y='28'
            width='164'
            height='24'
            rx='12'
            fill='url(#study-desk-gradient)'
            opacity='0.76'
          />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'desk')}
          value={desk ? getTokenLabel(translate, desk) : null}
          x={68}
          y={36}
        />

        <g data-testid='english-adjectives-scene-study-lamp-art' transform='translate(132,90)'>
          <g transform={`scale(${lampScale})`}>
            <ellipse
              cx='56'
              cy='18'
              rx='44'
              ry='20'
              fill={lampMeta?.fill ?? '#fecaca'}
              filter='url(#study-shadow)'
            />
            <ellipse cx='56' cy='18' rx='44' ry='20' fill='url(#study-lamp-gradient)' opacity='0.8' />
          </g>
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'lamp')}
          value={lamp ? getTokenLabel(translate, lamp) : null}
          x={178}
          y={34}
        />

        <g data-testid='english-adjectives-scene-study-book-art' transform='translate(300,102) rotate(-8)'>
          <rect
            x='0'
            y='0'
            width='70'
            height='86'
            rx='10'
            fill={bookMeta?.fill ?? '#86efac'}
            stroke='#15803d'
            strokeWidth='3'
            filter='url(#study-shadow)'
          />
          <rect
            x='0'
            y='0'
            width='70'
            height='86'
            rx='10'
            fill='url(#study-book-gradient)'
            opacity='0.76'
          />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'book')}
          value={book ? getTokenLabel(translate, book) : null}
          x={296}
          y={34}
        />
      </g>
    </svg>
  );
}

function renderPortraitScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const eyes = assignedByObject['eyes'];
  const hair = assignedByObject['hair'];
  const picture = assignedByObject['picture'];
  const eyesMeta = eyes ? ADJECTIVE_TOKEN_META[eyes] : null;
  const hairMeta = hair ? ADJECTIVE_TOKEN_META[hair] : null;
  const pictureMeta = picture
    ? ADJECTIVE_TOKEN_META[picture]
    : null;
  const hairLength = 64 * (hairMeta?.stretchY ?? 1);

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.portrait')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='portrait-scene-clip'>
          <rect
            data-testid='english-adjectives-scene-portrait-clip'
            x='20'
            y='18'
            width='400'
            height='222'
            rx='24'
          />
        </clipPath>
        <linearGradient id='portrait-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#fdf2f8' />
          <stop offset='100%' stopColor='#eef2ff' />
        </linearGradient>
        <filter id='portrait-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.16' />
        </filter>
      </defs>
      <g clipPath='url(#portrait-scene-clip)'>
        <rect
          className='wall'
          x='20'
          y='18'
          width='400'
          height='200'
          rx='24'
          fill='url(#portrait-wall-gradient)'
          stroke='#cbd5e1'
          strokeWidth='2'
        />

        <g data-testid='english-adjectives-scene-portrait-figure' transform='translate(118,42)'>
          <ellipse cx='86' cy='88' rx='56' ry='68' fill='#fde68a' filter='url(#portrait-shadow)' />
          <path
            d={`M42 42 Q86 -8 130 42 V ${40 + hairLength} H 42 Z`}
            fill={hairMeta?.fill ?? '#a16207'}
          />
          <circle cx='68' cy='92' r='5' fill={eyesMeta?.fill ?? '#0f172a'} />
          <circle cx='104' cy='92' r='5' fill={eyesMeta?.fill ?? '#0f172a'} />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'eyes')}
          value={eyes ? getTokenLabel(translate, eyes) : null}
          x={136}
          y={34}
        />
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'hair')}
          value={hair ? getTokenLabel(translate, hair) : null}
          x={246}
          y={34}
        />

        <g data-testid='english-adjectives-scene-portrait-picture-art' transform='translate(312,62)'>
          <rect
            x='0'
            y='0'
            width='74'
            height='96'
            rx='16'
            fill={pictureMeta?.fill ?? '#e9d5ff'}
            stroke='#8b5cf6'
            strokeWidth='3'
            filter='url(#portrait-shadow)'
          />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'picture')}
          value={picture ? getTokenLabel(translate, picture) : null}
          x={308}
          y={176}
        />
      </g>
    </svg>
  );
}

function renderPlaygroundScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const slide = assignedByObject['slide'];
  const kite = assignedByObject['kite'];
  const bench = assignedByObject['bench'];
  const slideMeta = slide ? ADJECTIVE_TOKEN_META[slide] : null;
  const kiteMeta = kite ? ADJECTIVE_TOKEN_META[kite] : null;
  const benchMeta = bench ? ADJECTIVE_TOKEN_META[bench] : null;
  const slideScale = slideMeta?.scale ?? 1;
  const kiteStretch = kiteMeta?.stretchY ?? 1;

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.playground')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='playground-scene-clip'>
          <rect
            data-testid='english-adjectives-scene-playground-clip'
            x='20'
            y='18'
            width='400'
            height='222'
            rx='24'
          />
        </clipPath>
        <linearGradient id='playground-sky-gradient' x1='0%' x2='0%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#bfdbfe' />
          <stop offset='100%' stopColor='#e0f2fe' />
        </linearGradient>
        <filter id='playground-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.14' />
        </filter>
      </defs>
      <g clipPath='url(#playground-scene-clip)'>
        <rect
          className='sky'
          x='20'
          y='18'
          width='400'
          height='170'
          rx='24'
          fill='url(#playground-sky-gradient)'
          stroke='#93c5fd'
          strokeWidth='2'
        />
        <rect className='ground' x='20' y='160' width='400' height='68' rx='20' fill='#dcfce7' />

        <g data-testid='english-adjectives-scene-playground-slide-art' transform='translate(64,70)'>
          <g transform={`scale(${slideScale})`}>
            <path
              d='M0 126 H 54 L 98 28 H 146'
              fill='none'
              stroke={slideMeta?.fill ?? '#facc15'}
              strokeWidth='14'
              strokeLinecap='round'
              strokeLinejoin='round'
              filter='url(#playground-shadow)'
            />
          </g>
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'slide')}
          value={slide ? getTokenLabel(translate, slide) : null}
          x={52}
          y={34}
        />

        <g
          data-testid='english-adjectives-scene-playground-kite-art'
          transform={`translate(256,44) scale(1,${kiteStretch})`}
        >
          <path
            d='M42 0 L 82 34 L 42 68 L 2 34 Z'
            fill={kiteMeta?.fill ?? '#60a5fa'}
            stroke='#1d4ed8'
            strokeWidth='3'
            filter='url(#playground-shadow)'
          />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'kite')}
          value={kite ? getTokenLabel(translate, kite) : null}
          x={250}
          y={34}
        />

        <g data-testid='english-adjectives-scene-playground-bench-art' transform='translate(286,148)'>
          <rect
            x='0'
            y='0'
            width='96'
            height='16'
            rx='8'
            fill={benchMeta?.fill ?? '#a8a29e'}
            filter='url(#playground-shadow)'
          />
        </g>
        <ObjectSceneBadge
          label={getObjectLabel(translate, 'bench')}
          value={bench ? getTokenLabel(translate, bench) : null}
          x={292}
          y={188}
        />
      </g>
    </svg>
  );
}
