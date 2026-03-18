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

export function AgenticApprovalGateAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: approval gate przed wykonaniem komendy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .box {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .line {
          stroke: #cbd5f5;
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .dot {
          fill: #38bdf8;
          transform-box: fill-box;
          transform-origin: center;
          animation: moveDot 6s ease-in-out infinite;
        }
        .gate {
          fill: #e2e8f0;
          animation: gatePulse 6s ease-in-out infinite;
        }
        .lock {
          stroke: #64748b;
          stroke-width: 2;
          fill: none;
        }
        @keyframes moveDot {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          30% { transform: translateX(95px); opacity: 1; }
          45% { transform: translateX(95px); opacity: 1; }
          65% { transform: translateX(190px); opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(250px); opacity: 0; }
        }
        @keyframes gatePulse {
          0%, 30% { fill: #e2e8f0; }
          45%, 65% { fill: #bfdbfe; }
          100% { fill: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .gate { animation: none; }
        }
      `}</style>
      <rect className='box' height='56' rx='14' width='90' x='20' y='42' />
      <rect className='box' height='56' rx='14' width='90' x='135' y='42' />
      <rect className='box' height='56' rx='14' width='90' x='250' y='42' />
      <text className='label' x='34' y='72'>Command</text>
      <text className='label' x='150' y='72'>Approval</text>
      <text className='label' x='270' y='72'>Execute</text>
      <line className='line' x1='110' x2='135' y1='70' y2='70' />
      <line className='line' x1='225' x2='250' y1='70' y2='70' />
      <rect className='gate' height='30' rx='8' width='44' x='158' y='56' />
      <rect className='lock' height='14' rx='6' width='16' x='170' y='66' />
      <path className='lock' d='M172 66 V62 C172 58 184 58 184 62 V66' />
      <circle className='dot' cx='30' cy='70' r='5' />
    </svg>
  );
}

export function AgenticModelSelectorAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: dobór modelu między szybkością a głębokim reasoning.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .line {
          stroke: #cbd5f5;
          stroke-width: 4;
          stroke-linecap: round;
        }
        .node {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3 {
          animation: nodePulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 2s; }
        .pulse-3 { animation-delay: 4s; }
        @keyframes nodePulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          35%, 55% { fill: #ccfbf1; stroke: #14b8a6; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3 { animation: none; }
        }
      `}</style>
      <line className='line' x1='40' x2='320' y1='70' y2='70' />
      <circle className='node pulse-1' cx='80' cy='70' r='18' />
      <circle className='node pulse-2' cx='180' cy='70' r='18' />
      <circle className='node pulse-3' cx='280' cy='70' r='18' />
      <text className='label' x='60' y='102'>Fast</text>
      <text className='label' x='160' y='102'>Balanced</text>
      <text className='label' x='258' y='102'>Deep</text>
      <text className='label' x='40' y='50'>Speed</text>
      <text className='label' x='278' y='50'>Reasoning</text>
    </svg>
  );
}

export function AgenticSkillPipelineAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: pipeline skilla od promptu do wyniku.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .box {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .flow {
          stroke: #94a3b8;
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: boxPulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes boxPulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 55% { fill: #ecfdf3; stroke: #34d399; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <rect className='box pulse-1' height='40' rx='12' width='70' x='20' y='50' />
      <rect className='box pulse-2' height='40' rx='12' width='70' x='110' y='50' />
      <rect className='box pulse-3' height='40' rx='12' width='70' x='200' y='50' />
      <rect className='box pulse-4' height='40' rx='12' width='70' x='290' y='50' />
      <text className='label' x='34' y='74'>Prompt</text>
      <text className='label' x='128' y='74'>Skill</text>
      <text className='label' x='215' y='74'>Tools</text>
      <text className='label' x='304' y='74'>Output</text>
      <line className='flow' x1='90' x2='110' y1='70' y2='70' />
      <line className='flow' x1='180' x2='200' y1='70' y2='70' />
      <line className='flow' x1='270' x2='290' y1='70' y2='70' />
    </svg>
  );
}

export function AgenticMilestoneTimelineAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: milestone timeline w długich zadaniach.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .line {
          stroke: #cbd5f5;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .node {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: nodePulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes nodePulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 55% { fill: #e0f2fe; stroke: #38bdf8; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <line className='line' x1='40' x2='320' y1='70' y2='70' />
      <circle className='node pulse-1' cx='70' cy='70' r='14' />
      <circle className='node pulse-2' cx='150' cy='70' r='14' />
      <circle className='node pulse-3' cx='230' cy='70' r='14' />
      <circle className='node pulse-4' cx='310' cy='70' r='14' />
      <text className='label' x='48' y='100'>Spec</text>
      <text className='label' x='130' y='100'>Plan</text>
      <text className='label' x='208' y='100'>Build</text>
      <text className='label' x='290' y='100'>Verify</text>
    </svg>
  );
}

export function AgenticRolloutStagesAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: etapy rolloutu zespołowego.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .line {
          stroke: #cbd5f5;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .node {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: nodePulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes nodePulse {
          0%, 20% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 55% { fill: #ccfbf1; stroke: #14b8a6; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <line className='line' x1='40' x2='320' y1='70' y2='70' />
      <circle className='node pulse-1' cx='70' cy='70' r='14' />
      <circle className='node pulse-2' cx='150' cy='70' r='14' />
      <circle className='node pulse-3' cx='230' cy='70' r='14' />
      <circle className='node pulse-4' cx='310' cy='70' r='14' />
      <text className='label' x='52' y='100'>Pilot</text>
      <text className='label' x='118' y='100'>Playbook</text>
      <text className='label' x='208' y='100'>Metrics</text>
      <text className='label' x='292' y='100'>Scale</text>
    </svg>
  );
}

export function AgenticDoDontAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: do i don’t w agentic coding.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .check {
          stroke: #22c55e;
          stroke-width: 6;
          stroke-linecap: round;
          stroke-linejoin: round;
          animation: pulseCheck 4.8s ease-in-out infinite;
        }
        .cross {
          stroke: #f43f5e;
          stroke-width: 6;
          stroke-linecap: round;
          animation: pulseCross 4.8s ease-in-out infinite;
        }
        @keyframes pulseCheck {
          0%, 30% { opacity: 0.4; }
          50%, 100% { opacity: 1; }
        }
        @keyframes pulseCross {
          0%, 55% { opacity: 0.4; }
          70%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .check, .cross { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='90' rx='16' width='150' x='20' y='25' />
      <rect className='panel' height='90' rx='16' width='150' x='190' y='25' />
      <text className='label' x='70' y='48'>Do</text>
      <text className='label' x='230' y='48'>Don't</text>
      <path className='check' d='M60 80 L80 98 L120 60' />
      <line className='cross' x1='220' x2='300' y1='60' y2='100' />
      <line className='cross' x1='300' x2='220' y1='60' y2='100' />
    </svg>
  );
}

export function AgenticDocsStackAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: stos dokumentów z AGENTS.md na wierzchu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .sheet {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse {
          animation: sheetPulse 5.4s ease-in-out infinite;
        }
        @keyframes sheetPulse {
          0%, 30% { fill: #f8fafc; stroke: #e2e8f0; }
          45%, 70% { fill: #fef3c7; stroke: #f59e0b; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      <rect className='sheet' height='60' rx='12' width='200' x='80' y='32' />
      <rect className='sheet' height='60' rx='12' width='200' x='70' y='40' />
      <rect className='sheet pulse' height='60' rx='12' width='200' x='60' y='48' />
      <text className='title' x='88' y='78'>AGENTS.md</text>
      <text className='title' x='88' y='94'>Repo playbook</text>
    </svg>
  );
}

export function AgenticContextLensAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: soczewka kontekstu skanuje najważniejsze pliki.'
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
        .muted {
          font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .lens {
          fill: rgba(56, 189, 248, 0.12);
          stroke: #38bdf8;
          stroke-width: 3;
        }
        .handle {
          stroke: #38bdf8;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .scan {
          animation: scanMove 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes scanMove {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(140px); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scan { animation: none; opacity: 1; transform: translateX(120px); }
        }
      `}</style>
      <rect className='card' height='36' rx='10' width='140' x='30' y='28' />
      <rect className='card' height='36' rx='10' width='140' x='30' y='76' />
      <rect className='card' height='36' rx='10' width='140' x='190' y='28' />
      <rect className='card' height='36' rx='10' width='140' x='190' y='76' />
      <text className='label' x='46' y='50'>app/editor.tsx</text>
      <text className='muted' x='46' y='62'>UI surface</text>
      <text className='label' x='46' y='98'>shared/hooks.ts</text>
      <text className='muted' x='46' y='110'>shared logic</text>
      <text className='label' x='206' y='50'>resources.ts</text>
      <text className='muted' x='206' y='62'>data source</text>
      <text className='label' x='206' y='98'>tests/editor.spec</text>
      <text className='muted' x='206' y='110'>proof</text>
      <g className='scan'>
        <circle className='lens' cx='80' cy='70' r='24' />
        <line className='handle' x1='96' x2='120' y1='86' y2='108' />
      </g>
    </svg>
  );
}

export function AgenticAutomationScheduleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: harmonogram automations w kalendarzu.'
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
        .slot {
          fill: #f1f5f9;
          stroke: #cbd5f5;
          stroke-width: 1.5;
          animation: slotPulse 7s ease-in-out infinite;
        }
        .slot-2 { animation-delay: 1.2s; }
        .slot-3 { animation-delay: 2.4s; }
        .slot-4 { animation-delay: 3.6s; }
        .slot-5 { animation-delay: 4.8s; }
        .dot {
          fill: #6366f1;
          animation: dotMove 7s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes slotPulse {
          0%, 15% { fill: #f1f5f9; stroke: #cbd5f5; }
          30%, 55% { fill: #eef2ff; stroke: #6366f1; }
          100% { fill: #f1f5f9; stroke: #cbd5f5; }
        }
        @keyframes dotMove {
          0% { transform: translateX(0); opacity: 0; }
          20% { opacity: 1; }
          50% { transform: translateX(140px); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .slot, .dot { animation: none; }
        }
      `}</style>
      <rect className='panel' height='98' rx='16' width='300' x='30' y='26' />
      <text className='label' x='50' y='48'>Automation schedule</text>
      <rect className='slot slot-1' height='16' rx='6' width='80' x='50' y='62' />
      <rect className='slot slot-2' height='16' rx='6' width='90' x='145' y='62' />
      <rect className='slot slot-3' height='16' rx='6' width='70' x='240' y='62' />
      <rect className='slot slot-4' height='16' rx='6' width='110' x='50' y='86' />
      <rect className='slot slot-5' height='16' rx='6' width='120' x='170' y='86' />
      <circle className='dot' cx='60' cy='114' r='4' />
    </svg>
  );
}

export function AgenticEvidencePackAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: pakiet dowodów (diff, testy, podsumowanie).'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
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
        .check {
          stroke: #22c55e;
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.2;
          animation: checkPulse 6s ease-in-out infinite;
        }
        .check-2 { animation-delay: 1.5s; }
        .check-3 { animation-delay: 3s; }
        @keyframes checkPulse {
          0%, 35% { opacity: 0.2; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .check { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='70' rx='14' width='90' x='30' y='36' />
      <rect className='panel' height='70' rx='14' width='90' x='135' y='36' />
      <rect className='panel' height='70' rx='14' width='90' x='240' y='36' />
      <text className='label' x='52' y='58'>Diff</text>
      <text className='label' x='152' y='58'>Tests</text>
      <text className='label' x='252' y='58'>Summary</text>
      <path className='check' d='M50 82 L60 92 L78 72' />
      <path className='check check-2' d='M155 82 L165 92 L183 72' />
      <path className='check check-3' d='M260 82 L270 92 L288 72' />
    </svg>
  );
}

export function AgenticFitQuadrantAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: matryca fit (klarowny scope i weryfikacja).'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .cell {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .good {
          fill: #ecfdf5;
          stroke: #10b981;
        }
        .label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 8px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .pulse {
          animation: fitPulse 6s ease-in-out infinite;
        }
        @keyframes fitPulse {
          0%, 30% { opacity: 0.4; }
          50%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='cell' height='48' rx='12' width='120' x='40' y='32' />
      <rect className='cell' height='48' rx='12' width='120' x='200' y='32' />
      <rect className='cell' height='48' rx='12' width='120' x='40' y='88' />
      <rect className='cell good pulse' height='48' rx='12' width='120' x='200' y='88' />
      <text className='label' x='60' y='60'>Low scope</text>
      <text className='label' x='216' y='60'>Clear scope</text>
      <text className='label' x='60' y='116'>Weak proof</text>
      <text className='label' x='216' y='116'>Strong proof</text>
      <text className='muted' x='44' y='20'>Verification</text>
      <text className='muted' x='250' y='20'>Scope clarity</text>
    </svg>
  );
}

export function AgenticRolloutMetricsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: metryki rolloutu (adopcja i jakość).'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .grid {
          stroke: #e2e8f0;
          stroke-width: 1.5;
        }
        .bar {
          fill: #ccfbf1;
          stroke: #14b8a6;
          stroke-width: 1.5;
          transform-origin: bottom;
          animation: barGrow 6s ease-in-out infinite;
        }
        .bar-2 { animation-delay: 0.5s; }
        .bar-3 { animation-delay: 1s; }
        .bar-4 { animation-delay: 1.5s; }
        .line {
          stroke: #0ea5e9;
          stroke-width: 2.5;
          fill: none;
          stroke-linecap: round;
        }
        .dot {
          fill: #0ea5e9;
        }
        .label {
          font: 700 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        @keyframes barGrow {
          0%, 20% { transform: scaleY(0.5); }
          40%, 100% { transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar { animation: none; }
        }
      `}</style>
      <line className='grid' x1='40' x2='320' y1='100' y2='100' />
      <line className='grid' x1='40' x2='320' y1='60' y2='60' />
      <rect className='bar bar-1' height='40' rx='6' width='36' x='60' y='60' />
      <rect className='bar bar-2' height='52' rx='6' width='36' x='120' y='48' />
      <rect className='bar bar-3' height='62' rx='6' width='36' x='180' y='38' />
      <rect className='bar bar-4' height='72' rx='6' width='36' x='240' y='28' />
      <path className='line' d='M78 84 L138 70 L198 60 L258 50' />
      <circle className='dot' cx='78' cy='84' r='3.5' />
      <circle className='dot' cx='138' cy='70' r='3.5' />
      <circle className='dot' cx='198' cy='60' r='3.5' />
      <circle className='dot' cx='258' cy='50' r='3.5' />
      <text className='label' x='44' y='24'>Adoption</text>
      <text className='label' x='252' y='24'>Quality</text>
    </svg>
  );
}

export function AgenticRoutingDialAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: routing między szybkością, kosztem i głębią.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .dial {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .tick {
          stroke: #cbd5f5;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .needle {
          stroke: #14b8a6;
          stroke-width: 3;
          stroke-linecap: round;
          transform-origin: center;
          animation: needleSweep 6s ease-in-out infinite;
        }
        .needle-2 {
          stroke: #6366f1;
          animation-delay: 1.5s;
        }
        @keyframes needleSweep {
          0% { transform: rotate(-40deg); }
          40% { transform: rotate(10deg); }
          70% { transform: rotate(35deg); }
          100% { transform: rotate(-40deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .needle { animation: none; transform: rotate(10deg); }
        }
      `}</style>
      <circle className='dial' cx='110' cy='80' r='44' />
      <circle className='dial' cx='250' cy='80' r='44' />
      <line className='tick' x1='110' x2='110' y1='34' y2='46' />
      <line className='tick' x1='84' x2='92' y1='42' y2='52' />
      <line className='tick' x1='136' x2='128' y1='42' y2='52' />
      <line className='tick' x1='250' x2='250' y1='34' y2='46' />
      <line className='tick' x1='224' x2='232' y1='42' y2='52' />
      <line className='tick' x1='276' x2='268' y1='42' y2='52' />
      <line className='needle' x1='110' x2='110' y1='80' y2='48' />
      <line className='needle needle-2' x1='250' x2='250' y1='80' y2='48' />
      <text className='label' x='84' y='122'>Speed</text>
      <text className='label' x='228' y='122'>Depth</text>
    </svg>
  );
}

export function AgenticApprovalScopeMapAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: eskalacja uprawnień od read-only do network.'
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
        .label {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .line {
          stroke: #cbd5f5;
          stroke-width: 2.5;
          stroke-linecap: round;
        }
        .dot {
          fill: #f97316;
          animation: dotMove 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes dotMove {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          50% { transform: translateX(120px); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(200px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; opacity: 1; transform: translateX(120px); }
        }
      `}</style>
      <line className='line' x1='80' x2='280' y1='70' y2='70' />
      <circle className='node' cx='80' cy='70' r='22' />
      <circle className='node' cx='180' cy='70' r='22' />
      <circle className='node' cx='280' cy='70' r='22' />
      <text className='label' x='52' y='108'>Read-only</text>
      <text className='label' x='158' y='108'>Workspace</text>
      <text className='label' x='258' y='108'>Network</text>
      <circle className='dot' cx='80' cy='70' r='5' />
    </svg>
  );
}

export function AgenticSkillManifestAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: manifest skilla z wejściami, narzędziami i outputem.'
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
        .pulse-1, .pulse-2, .pulse-3, .pulse-4 {
          animation: cardPulse 6s ease-in-out infinite;
        }
        .pulse-2 { animation-delay: 1.5s; }
        .pulse-3 { animation-delay: 3s; }
        .pulse-4 { animation-delay: 4.5s; }
        @keyframes cardPulse {
          0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
          30%, 55% { fill: #ecfeff; stroke: #22d3ee; }
          100% { fill: #f8fafc; stroke: #e2e8f0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3, .pulse-4 { animation: none; }
        }
      `}</style>
      <rect className='card pulse-1' height='44' rx='12' width='140' x='20' y='26' />
      <rect className='card pulse-2' height='44' rx='12' width='140' x='200' y='26' />
      <rect className='card pulse-3' height='44' rx='12' width='140' x='20' y='78' />
      <rect className='card pulse-4' height='44' rx='12' width='140' x='200' y='78' />
      <text className='label' x='44' y='52'>Inputs</text>
      <text className='label' x='226' y='52'>Tools</text>
      <text className='label' x='44' y='104'>Outputs</text>
      <text className='label' x='226' y='104'>Safety</text>
    </svg>
  );
}

export function AgenticCliIdeFlowAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: przepływ między IDE a CLI.'
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
        .line {
          stroke: #bae6fd;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .dot {
          fill: #38bdf8;
          animation: dotFlow 5.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes dotFlow {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: 1; }
          55% { transform: translateX(150px); opacity: 1; }
          100% { transform: translateX(210px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; opacity: 1; transform: translateX(130px); }
        }
      `}</style>
      <rect className='panel' height='70' rx='14' width='120' x='30' y='40' />
      <rect className='panel' height='70' rx='14' width='120' x='210' y='40' />
      <text className='label' x='68' y='70'>IDE</text>
      <text className='label' x='248' y='70'>CLI</text>
      <line className='line' x1='150' x2='210' y1='75' y2='75' />
      <circle className='dot' cx='150' cy='75' r='5' />
    </svg>
  );
}
