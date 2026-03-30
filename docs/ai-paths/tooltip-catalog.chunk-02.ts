export const AI_PATHS_TOOLTIP_CATALOG_CHUNK_02 = [
  {
    "id": "node_config_database",
    "title": "Database Query (Configuration)",
    "summary": "Configuration reference for Database Query.",
    "section": "Node Config",
    "aliases": [
      "database",
      "Database Query",
      "database config"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/database.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node"
    ],
    "uiTargets": [
      "node-config.database"
    ]
  },
  {
    "id": "node_config_db_schema",
    "title": "Database Schema (Configuration)",
    "summary": "Configuration reference for Database Schema.",
    "section": "Node Config",
    "aliases": [
      "db_schema",
      "Database Schema",
      "db_schema config"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/db_schema.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node"
    ],
    "uiTargets": [
      "node-config.db_schema"
    ]
  },
  {
    "id": "node_config_delay",
    "title": "Delay (Configuration)",
    "summary": "Configuration reference for Delay.",
    "section": "Node Config",
    "aliases": [
      "delay",
      "Delay",
      "delay config"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/delay.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node"
    ],
    "uiTargets": [
      "node-config.delay"
    ]
  },
  {
    "id": "node_config_fetcher",
    "title": "Fetcher: Trigger Context (Configuration)",
    "summary": "Configuration reference for Fetcher: Trigger Context.",
    "section": "Node Config",
    "aliases": [
      "fetcher",
      "Fetcher: Trigger Context",
      "fetcher config"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/fetcher.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node"
    ],
    "uiTargets": [
      "node-config.fetcher"
    ]
  },
  {
    "id": "node_config_field_agent_agent_personaid",
    "title": "Reasoning Agent: agent.personaId",
    "summary": "Persona to use from Agent Creator. Empty means runtime defaults.",
    "section": "Node Config - Reasoning Agent",
    "aliases": [
      "agent",
      "agent.personaId",
      "agent.agent.personaId"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/agent.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.agent.agent.personaId"
    ]
  },
  {
    "id": "node_config_field_agent_agent_prompttemplate",
    "title": "Reasoning Agent: agent.promptTemplate",
    "summary": "Optional template to build the agent prompt from incoming ports.",
    "section": "Node Config - Reasoning Agent",
    "aliases": [
      "agent",
      "agent.promptTemplate",
      "agent.agent.promptTemplate"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/agent.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.agent.agent.promptTemplate"
    ]
  },
  {
    "id": "node_config_field_agent_agent_waitforresult",
    "title": "Reasoning Agent: agent.waitForResult",
    "summary": "When true, waits for completion and emits result. When false, emits jobId/status.",
    "section": "Node Config - Reasoning Agent",
    "aliases": [
      "agent",
      "agent.waitForResult",
      "agent.agent.waitForResult"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/agent.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.agent.agent.waitForResult"
    ]
  },
  {
    "id": "node_config_field_agent_runtime_cache_mode",
    "title": "Reasoning Agent: runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - Reasoning Agent",
    "aliases": [
      "agent",
      "runtime.cache.mode",
      "agent.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/agent.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.agent.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_agent_runtime_cache_scope",
    "title": "Reasoning Agent: runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - Reasoning Agent",
    "aliases": [
      "agent",
      "runtime.cache.scope",
      "agent.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/agent.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.agent.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_agent_runtime_waitforinputs",
    "title": "Reasoning Agent: runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - Reasoning Agent",
    "aliases": [
      "agent",
      "runtime.waitForInputs",
      "agent.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/agent.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.agent.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_authmode",
    "title": "API Operation (Advanced): apiAdvanced.authMode",
    "summary": "none/api_key/bearer/basic/oauth2_client_credentials/connection auth strategy.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.authMode",
      "api_advanced.apiAdvanced.authMode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.authMode"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_errorroutesjson",
    "title": "API Operation (Advanced): apiAdvanced.errorRoutesJson",
    "summary": "JSON array of explicit error route matchers and target output ports.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.errorRoutesJson",
      "api_advanced.apiAdvanced.errorRoutesJson"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.errorRoutesJson"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_headersjson",
    "title": "API Operation (Advanced): apiAdvanced.headersJson",
    "summary": "JSON object for request headers.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.headersJson",
      "api_advanced.apiAdvanced.headersJson"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.headersJson"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_method",
    "title": "API Operation (Advanced): apiAdvanced.method",
    "summary": "HTTP method including advanced methods (HEAD/OPTIONS).",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.method",
      "api_advanced.apiAdvanced.method"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.method"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_outputmappingsjson",
    "title": "API Operation (Advanced): apiAdvanced.outputMappingsJson",
    "summary": "JSON object mapping output port -> JSON path in response envelope.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.outputMappingsJson",
      "api_advanced.apiAdvanced.outputMappingsJson"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.outputMappingsJson"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_paginationmode",
    "title": "API Operation (Advanced): apiAdvanced.paginationMode",
    "summary": "none/page/cursor/link pagination strategy.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.paginationMode",
      "api_advanced.apiAdvanced.paginationMode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.paginationMode"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_pathparamsjson",
    "title": "API Operation (Advanced): apiAdvanced.pathParamsJson",
    "summary": "JSON object for explicit path parameter substitution before request execution.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.pathParamsJson",
      "api_advanced.apiAdvanced.pathParamsJson"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.pathParamsJson"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_queryparamsjson",
    "title": "API Operation (Advanced): apiAdvanced.queryParamsJson",
    "summary": "JSON object for explicit query parameters. Values can include templates.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.queryParamsJson",
      "api_advanced.apiAdvanced.queryParamsJson"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.queryParamsJson"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_responsemode",
    "title": "API Operation (Advanced): apiAdvanced.responseMode",
    "summary": "How to interpret response payload: json/text/status.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.responseMode",
      "api_advanced.apiAdvanced.responseMode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.responseMode"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_responsepath",
    "title": "API Operation (Advanced): apiAdvanced.responsePath",
    "summary": "Optional JSON path selection from parsed response payload.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.responsePath",
      "api_advanced.apiAdvanced.responsePath"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.responsePath"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_retryattempts",
    "title": "API Operation (Advanced): apiAdvanced.retryAttempts",
    "summary": "Maximum attempts including first request.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.retryAttempts",
      "api_advanced.apiAdvanced.retryAttempts"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.retryAttempts"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_retryenabled",
    "title": "API Operation (Advanced): apiAdvanced.retryEnabled",
    "summary": "Enable/disable retry behavior.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.retryEnabled",
      "api_advanced.apiAdvanced.retryEnabled"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.retryEnabled"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_retryonstatusjson",
    "title": "API Operation (Advanced): apiAdvanced.retryOnStatusJson",
    "summary": "JSON array of status codes that should be retried when retries are enabled.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.retryOnStatusJson",
      "api_advanced.apiAdvanced.retryOnStatusJson"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.retryOnStatusJson"
    ]
  },
  {
    "id": "node_config_field_api_advanced_apiadvanced_url",
    "title": "API Operation (Advanced): apiAdvanced.url",
    "summary": "Request URL template.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "apiAdvanced.url",
      "api_advanced.apiAdvanced.url"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.apiAdvanced.url"
    ]
  },
  {
    "id": "node_config_field_api_advanced_runtime_cache_mode",
    "title": "API Operation (Advanced): runtime.cache.mode",
    "summary": "Node output caching. auto = reuse when safe, force = always reuse, disabled = recompute each run.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "runtime.cache.mode",
      "api_advanced.runtime.cache.mode"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.runtime.cache.mode"
    ]
  },
  {
    "id": "node_config_field_api_advanced_runtime_cache_scope",
    "title": "API Operation (Advanced): runtime.cache.scope",
    "summary": "Cache key scope. run = isolate each run, activation = isolate by trigger/entity context, session = reuse across session.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "runtime.cache.scope",
      "api_advanced.runtime.cache.scope"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.runtime.cache.scope"
    ]
  },
  {
    "id": "node_config_field_api_advanced_runtime_waitforinputs",
    "title": "API Operation (Advanced): runtime.waitForInputs",
    "summary": "If true, wait until all connected input ports have values before executing the node.",
    "section": "Node Config - API Operation (Advanced)",
    "aliases": [
      "api_advanced",
      "runtime.waitForInputs",
      "api_advanced.runtime.waitForInputs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/api_advanced.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.api_advanced.runtime.waitForInputs"
    ]
  },
  {
    "id": "node_config_field_audio_oscillator_audiooscillator_durationms",
    "title": "Audio Oscillator: audioOscillator.durationMs",
    "summary": "Playback duration in milliseconds.",
    "section": "Node Config - Audio Oscillator",
    "aliases": [
      "audio_oscillator",
      "audioOscillator.durationMs",
      "audio_oscillator.audioOscillator.durationMs"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.audio_oscillator.audioOscillator.durationMs"
    ]
  },
  {
    "id": "node_config_field_audio_oscillator_audiooscillator_frequencyhz",
    "title": "Audio Oscillator: audioOscillator.frequencyHz",
    "summary": "Signal frequency in Hz.",
    "section": "Node Config - Audio Oscillator",
    "aliases": [
      "audio_oscillator",
      "audioOscillator.frequencyHz",
      "audio_oscillator.audioOscillator.frequencyHz"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.audio_oscillator.audioOscillator.frequencyHz"
    ]
  },
  {
    "id": "node_config_field_audio_oscillator_audiooscillator_gain",
    "title": "Audio Oscillator: audioOscillator.gain",
    "summary": "Signal amplitude in 0..1 range.",
    "section": "Node Config - Audio Oscillator",
    "aliases": [
      "audio_oscillator",
      "audioOscillator.gain",
      "audio_oscillator.audioOscillator.gain"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.audio_oscillator.audioOscillator.gain"
    ]
  },
  {
    "id": "node_config_field_audio_oscillator_audiooscillator_waveform",
    "title": "Audio Oscillator: audioOscillator.waveform",
    "summary": "Wave shape for generated signal: sine/square/triangle/sawtooth.",
    "section": "Node Config - Audio Oscillator",
    "aliases": [
      "audio_oscillator",
      "audioOscillator.waveform",
      "audio_oscillator.audioOscillator.waveform"
    ],
    "docPath": "/docs/ai-paths/semantic-grammar/nodes/audio_oscillator.json",
    "tags": [
      "ai-paths",
      "nodes",
      "palette",
      "config",
      "node",
      "config-field"
    ],
    "uiTargets": [
      "node-config.audio_oscillator.audioOscillator.waveform"
    ]
  }
];

