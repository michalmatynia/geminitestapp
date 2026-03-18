import React from 'react';

export function AgenticBriefContractAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: brief jako kontrakt (Goal, Context, Constraints, Done).'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .caption {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: cardPulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes cardPulse {
          0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 50% { fill: #eef2ff; stroke: #6366f1; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <rect className='card pulse-1' height='44' rx='12' width='150' x='20' y='18' />
      <rect className='card pulse-2' height='44' rx='12' width='150' x='190' y='18' />
      <rect className='card pulse-3' height='44' rx='12' width='150' x='20' y='78' />
      <rect className='card pulse-4' height='44' rx='12' width='150' x='190' y='78' />
      <text className='label' x='34' y='42'>Goal</text>
      <text className='caption' x='34' y='56'>Outcome</text>
      <text className='label' x='204' y='42'>Context</text>
      <text className='caption' x='204' y='56'>Repo + logi</text>
      <text className='label' x='34' y='102'>Constraints</text>
      <text className='caption' x='34' y='116'>Guardrails</text>
      <text className='label' x='204' y='102'>Done</text>
      <text className='caption' x='204' y='116'>Proof loop</text>
    </svg>
  );
}

export function AgenticOperatingLoopAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: pętla planu, wykonania i weryfikacji.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .node {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .node-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3 {
          animation: nodePulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 2s; }
        .pulse-3 { animation-delay: 4s; }
        .arrow {
          stroke: #94a3b8;
          stroke-width: 2.5;
          fill: none;
        }
        @keyframes nodePulse {
          0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 55% { fill: #e0f2fe; stroke: #38bdf8; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3 { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='arrowhead' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <path className='arrow' d='M110 90 Q180 130 250 90' markerEnd='url(#arrowhead)' />
      <path className='arrow' d='M250 50 Q180 10 110 50' markerEnd='url(#arrowhead)' />
      <path className='arrow' d='M85 70 L85 70' />
      <circle className='node pulse-1' cx='90' cy='90' r='28' />
      <circle className='node pulse-2' cx='180' cy='40' r='28' />
      <circle className='node pulse-3' cx='270' cy='90' r='28' />
      <text className='node-label' x='72' y='94'>Plan</text>
      <text className='node-label' x='156' y='44'>Exec</text>
      <text className='node-label' x='252' y='94'>Verify</text>
    </svg>
  );
}

export function AgenticSurfacePickerAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wybór powierzchni (CLI, IDE, Cloud, API).'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: cardPulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes cardPulse {
          0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 50% { fill: #ecfdf5; stroke: #10b981; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <rect className='card pulse-1' height='64' rx='14' width='70' x='20' y='38' />
      <rect className='card pulse-2' height='64' rx='14' width='70' x='100' y='38' />
      <rect className='card pulse-3' height='64' rx='14' width='70' x='180' y='38' />
      <rect className='card pulse-4' height='64' rx='14' width='70' x='260' y='38' />
      <text className='label' x='40' y='76'>CLI</text>
      <text className='label' x='118' y='76'>IDE</text>
      <text className='label' x='195' y='76'>Cloud</text>
      <text className='label' x='282' y='76'>API</text>
    </svg>
  );
}

export function AgenticCodexCliCommandMapAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: mapa komend Codex CLI.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4, .pulse-5, .pulse-6 {
          animation: cardPulse 7s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        .pulse-4 { animation-delay: 3.6s; }
        .pulse-5 { animation-delay: 4.8s; }
        .pulse-6 { animation-delay: 6s; }
        @keyframes cardPulse {
          0%, 15% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 50% { fill: #ecfdf5; stroke: #10b981; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4, .pulse-5, .pulse-6 { animation: none; }
        }
      `}</style>
      <text className='title' x='20' y='24'>codex cli</text>
      <rect className='card pulse-1' height='44' rx='12' width='100' x='20' y='36' />
      <rect className='card pulse-2' height='44' rx='12' width='100' x='130' y='36' />
      <rect className='card pulse-3' height='44' rx='12' width='100' x='240' y='36' />
      <rect className='card pulse-4' height='44' rx='12' width='100' x='20' y='92' />
      <rect className='card pulse-5' height='44' rx='12' width='100' x='130' y='92' />
      <rect className='card pulse-6' height='44' rx='12' width='100' x='240' y='92' />
      <text className='label' x='44' y='62'>exec</text>
      <text className='label' x='150' y='62'>cloud</text>
      <text className='label' x='262' y='62'>apply</text>
      <text className='label' x='36' y='118'>resume</text>
      <text className='label' x='162' y='118'>mcp</text>
      <text className='label' x='242' y='118'>app-server</text>
    </svg>
  );
}

export function AgenticCliQueueTipAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: kolejkuj wiadomości w CLI podczas pracy zadania.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .dot {
          fill: #94a3b8;
          animation: dotBlink 1.5s ease-in-out infinite;
        }
        .dot-2 { animation-delay: 0.3s; }
        .dot-3 { animation-delay: 0.6s; }
        .queue-item {
          fill: #ecfdf5;
          stroke: #10b981;
          stroke-width: 1.5;
        }
        .key {
          fill: #f1f5f9;
          stroke: #cbd5f5;
          stroke-width: 2;
        }
        .key-label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .arrow {
          stroke: #cbd5f5;
          stroke-width: 2;
          fill: none;
        }
        .bubble {
          fill: #38bdf8;
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: bubbleMove 6s ease-in-out infinite;
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes bubbleMove {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(120px); opacity: 1; }
          70% { opacity: 0; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .bubble { animation: none; }
        }
      `}</style>
      <rect className='panel' height='72' rx='14' width='150' x='20' y='28' />
      <text className='label' x='36' y='50'>Task running</text>
      <text className='muted' x='36' y='66'>Working...</text>
      <circle className='dot' cx='44' cy='82' r='3.5' />
      <circle className='dot dot-2' cx='56' cy='82' r='3.5' />
      <circle className='dot dot-3' cx='68' cy='82' r='3.5' />

      <rect className='panel' height='90' rx='14' width='140' x='200' y='22' />
      <text className='label' x='214' y='44'>Queue</text>
      <rect className='queue-item' height='16' rx='6' width='108' x='214' y='54' />
      <rect className='queue-item' height='16' rx='6' width='86' x='214' y='74' />

      <rect className='key' height='22' rx='6' width='50' x='70' y='112' />
      <text className='key-label' x='84' y='127'>Tab</text>
      <path className='arrow' d='M120 123 L200 90' />
      <rect className='bubble' height='12' rx='5' width='34' x='78' y='96' />
    </svg>
  );
}

export function AgenticResponsesStreamAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: Responses API stream i zdarzenia.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .line {
          stroke: #cbd5f5;
          stroke-width: 2;
        }
        .node {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: streamPulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes streamPulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          35%, 55% { fill: #e0f2fe; stroke: #38bdf8; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <line className='line' x1='40' x2='320' y1='70' y2='70' />
      <circle className='node pulse-1' cx='60' cy='70' r='14' />
      <circle className='node pulse-2' cx='150' cy='70' r='14' />
      <circle className='node pulse-3' cx='240' cy='70' r='14' />
      <circle className='node pulse-4' cx='320' cy='70' r='14' />
      <text className='label' x='40' y='98'>created</text>
      <text className='label' x='132' y='98'>in_progress</text>
      <text className='label' x='218' y='98'>output_text</text>
      <text className='label' x='298' y='98'>done</text>
    </svg>
  );
}

export function AgenticToolLoopAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: pętla tool-calling (model → tool → result → response).'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 170'
    >
      <style>{`
        .node {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .arrow {
          stroke: #94a3b8;
          stroke-width: 2.5;
          fill: none;
        }
        .pulse {
          animation: loopPulse 6s ease-in-out infinite;
        }
        .delay-2 { animation-delay: 1.5s; }
        .delay-3 { animation-delay: 3s; }
        .delay-4 { animation-delay: 4.5s; }
        @keyframes loopPulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          35%, 60% { fill: #ecfdf5; stroke: #10b981; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='loop-arrow' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <path className='arrow' d='M120 40 L240 40' markerEnd='url(#loop-arrow)' />
      <path className='arrow' d='M270 65 L270 110' markerEnd='url(#loop-arrow)' />
      <path className='arrow' d='M240 135 L120 135' markerEnd='url(#loop-arrow)' />
      <path className='arrow' d='M90 110 L90 65' markerEnd='url(#loop-arrow)' />
      <circle className='node pulse' cx='90' cy='40' r='24' />
      <circle className='node pulse delay-2' cx='270' cy='40' r='24' />
      <circle className='node pulse delay-3' cx='270' cy='135' r='24' />
      <circle className='node pulse delay-4' cx='90' cy='135' r='24' />
      <text className='label' x='70' y='44'>Model</text>
      <text className='label' x='252' y='44'>Tool</text>
      <text className='label' x='244' y='140'>Result</text>
      <text className='label' x='58' y='140'>Response</text>
    </svg>
  );
}

export function AgenticStateChainAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: łańcuch odpowiedzi i previous_response_id.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .arrow {
          stroke: #94a3b8;
          stroke-width: 2.2;
          fill: none;
        }
        .pulse {
          animation: chainPulse 5.5s ease-in-out infinite;
        }
        .delay-2 { animation-delay: 2.2s; }
        @keyframes chainPulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          40%, 60% { fill: #ede9fe; stroke: #8b5cf6; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='chain-arrow' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <rect className='card pulse' height='44' rx='12' width='90' x='30' y='48' />
      <rect className='card pulse delay-2' height='44' rx='12' width='90' x='150' y='48' />
      <rect className='card' height='44' rx='12' width='90' x='270' y='48' />
      <text className='label' x='46' y='74'>resp_01</text>
      <text className='label' x='166' y='74'>resp_02</text>
      <text className='label' x='286' y='74'>resp_03</text>
      <path className='arrow' d='M120 70 L150 70' markerEnd='url(#chain-arrow)' />
      <path className='arrow' d='M240 70 L270 70' markerEnd='url(#chain-arrow)' />
    </svg>
  );
}

export function AgenticBackgroundWebhookAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: background mode i webhook callbacks.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .arrow {
          stroke: #94a3b8;
          stroke-width: 2.2;
          fill: none;
        }
        .pulse {
          animation: bgPulse 6s ease-in-out infinite;
        }
        .delay-2 { animation-delay: 2s; }
        .delay-3 { animation-delay: 4s; }
        @keyframes bgPulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          35%, 55% { fill: #e0f2fe; stroke: #38bdf8; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      <defs>
        <marker id='bg-arrow' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
          <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
        </marker>
      </defs>
      <rect className='card pulse' height='44' rx='12' width='90' x='20' y='54' />
      <rect className='card pulse delay-2' height='44' rx='12' width='120' x='130' y='54' />
      <rect className='card pulse delay-3' height='44' rx='12' width='90' x='270' y='54' />
      <text className='label' x='36' y='80'>Request</text>
      <text className='label' x='146' y='80'>Background</text>
      <text className='label' x='290' y='80'>Webhook</text>
      <path className='arrow' d='M110 76 L130 76' markerEnd='url(#bg-arrow)' />
      <path className='arrow' d='M250 76 L270 76' markerEnd='url(#bg-arrow)' />
    </svg>
  );
}

export function AgenticCacheCompactionAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: compaction i prompt caching.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .stack {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .summary {
          fill: #ecfdf5;
          stroke: #10b981;
          stroke-width: 2;
        }
        .prefix {
          fill: #e0f2fe;
          stroke: #38bdf8;
          stroke-width: 2;
        }
        .label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse {
          animation: cachePulse 6s ease-in-out infinite;
        }
        @keyframes cachePulse {
          0%, 20% { opacity: 0.5; }
          45%, 60% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      <rect className='stack' height='70' rx='14' width='120' x='30' y='40' />
      <rect className='prefix pulse' height='22' rx='10' width='110' x='35' y='45' />
      <rect className='summary' height='44' rx='12' width='90' x='220' y='53' />
      <text className='label' x='54' y='84'>Context</text>
      <text className='label' x='232' y='78'>Summary</text>
      <text className='label' x='42' y='60'>cached prefix</text>
      <path className='arrow' d='M150 76 L220 76' stroke='#94a3b8' strokeWidth='2' />
    </svg>
  );
}
