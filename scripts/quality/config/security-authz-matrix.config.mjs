export const authzRoutePolicies = [
  {
    id: 'public-health',
    pattern: /^(health|prompt-runtime\/health)$/,
    methods: ['GET'],
    expectedAccess: 'public',
  },
  {
    id: 'public-products',
    pattern: /^public(\/|$)/,
    methods: ['GET'],
    expectedAccess: 'public',
  },
  {
    id: 'public-settings-lite',
    pattern: /^settings\/lite$/,
    methods: ['GET'],
    expectedAccess: 'public',
  },
  {
    id: 'telemetry-ingest',
    pattern: /^(analytics\/events|query-telemetry|client-errors)$/,
    methods: ['POST'],
    expectedAccess: 'public',
  },
  {
    id: 'auth-bootstrap',
    pattern: /^auth\/(\[\.\.\.nextauth\]|register|verify-credentials)$/,
    methods: ['GET', 'POST'],
    expectedAccess: 'public',
  },
  {
    id: 'kangur-learner-auth-public',
    pattern: /^kangur\/auth\/learner-sign(in|out)$/,
    methods: ['POST'],
    expectedAccess: 'public',
  },
  {
    id: 'portable-remediation-webhook',
    pattern: /^ai-paths\/portable-engine\/remediation-webhook$/,
    methods: ['POST'],
    expectedAccess: 'signed',
  },
  {
    id: 'kangur-actor-routes',
    pattern:
      /^kangur\/(auth\/me|progress|scores|learners|learners\/\[id\]|ai-tutor\/chat|ai-tutor\/usage|tts|tts\/status|assignments|assignments\/\[id\])$/,
    expectedAccess: 'actor',
  },
  {
    id: 'session-scoped-routes',
    pattern: /^(analytics\/summary|analytics\/insights|analytics\/events|user\/preferences)$/,
    expectedAccess: 'session',
  },
];

export const privilegedRouteWarnings = [
  {
    id: 'privileged-admin-surface',
    pattern: /^(auth\/users|settings(\/|$)|system(\/|$)|databases(\/|$))/,
  },
];
