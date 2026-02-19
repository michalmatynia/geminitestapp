import type {
  AiPathDto,
  AiNodeDto,
  AiEdgeDto,
  AiPathRunDto,
  AiPathRunNodeDto,
  AiNodeTypeDto,
  AiPathRunStatusDto,
  AiPathNodeStatusDto,
  AiPathRunRecordDto,
  AiPathRunDetailDto,
  AiPathRunEventDto,
  AiPathRunEventLevelDto,
  ParserConfigDto,
  ParserSampleStateDto,
  PromptConfigDto,
  ModelConfigDto,
  AgentConfigDto,
  LearnerAgentConfigDto,
  DatabaseConfigDto,
  UpdaterSampleStateDto,
  TriggerConfigDto,
  SimulationConfigDto,
  ViewerConfigDto,
  ContextConfigDto,
  AudioOscillatorConfigDto,
  AudioWaveformDto,
  AudioSpeakerConfigDto,
  DescriptionConfigDto,
  MapperConfigDto,
  MutatorConfigDto,
  StringMutatorConfigDto,
  StringMutatorOperationDto,
  ValidatorConfigDto,
  ConstantConfigDto,
  MathConfigDto,
  TemplateConfigDto,
  RegexConfigDto,
  RegexTemplateDto,
  IteratorConfigDto,
  BundleConfigDto,
  GateConfigDto,
  CompareConfigDto,
  RouterConfigDto,
  DelayConfigDto,
  HttpConfigDto,
  DbQueryConfigDto,
  PollConfigDto,
  DbSchemaConfigDto,
  DbSchemaSnapshotDto,
  NodeCacheModeDto,
  NodeConfigDto,
  EdgeDto,
  NodeDefinitionDto,
  RuntimeHistoryLinkDto,
  RuntimeHistoryEntryDto,
  AiPathRuntimeAnalyticsSummaryDto,
  PathMetaDto,
  PathUiStateDto,
  PathConfigDto,
  PathDebugEntryDto,
  PathDebugSnapshotDto,
  ClusterPresetDto,
  DbQueryPresetDto,
  DbNodePresetDto,
  JsonPathEntryDto,
  ConnectionValidationDto,
} from '../../contracts/ai-paths';
import type { 
  AiPathRuntimeEventDto,
  AiPathRuntimeNodeStatusDto,
  AiPathRuntimeNodeStatusMapDto,
  RuntimeStateDto,
  RuntimePortValuesDto,
  PathExecutionModeDto,
  PathRunModeDto
} from '../../contracts/ai-paths-runtime';

export type { 
  AiPathDto, 
  AiNodeDto, 
  AiEdgeDto, 
  AiPathRunDto, 
  AiPathRunNodeDto,
  AiNodeTypeDto,
  AiPathRunStatusDto,
  AiPathNodeStatusDto,
  AiPathRunRecordDto,
  AiPathRunDetailDto,
  AiPathRunEventDto,
  AiPathRunEventLevelDto,
  EdgeDto,
  NodeDefinitionDto,
  RuntimeHistoryLinkDto,
  RuntimeHistoryEntryDto,
  AiPathRuntimeAnalyticsSummaryDto,
  PathMetaDto,
  PathUiStateDto,
  PathConfigDto,
  PathDebugEntryDto,
  PathDebugSnapshotDto,
  ClusterPresetDto,
  DbQueryPresetDto,
  DbNodePresetDto,
  JsonPathEntryDto,
  ConnectionValidationDto,
  AiPathRuntimeEventDto,
  AiPathRuntimeNodeStatusDto,
  AiPathRuntimeNodeStatusMapDto,
  RuntimeStateDto,
  RuntimePortValuesDto,
  PathExecutionModeDto,
  PathRunModeDto
};

export type NodeType = AiNodeTypeDto;

export type AiPathRunStatus = AiPathRunStatusDto;

export type AiPathNodeStatus = AiPathNodeStatusDto;

export type AiPathRunRecord = AiPathRunRecordDto;

export type AiPathRunNodeRecord = AiPathRunNodeDto;

export type AiPathRunDetail = AiPathRunDetailDto;

export type ParserConfig = ParserConfigDto;

export type ParserSampleState = ParserSampleStateDto;

export type PromptConfig = PromptConfigDto;

export type ModelConfig = ModelConfigDto;

export type AgentConfig = AgentConfigDto;

export type LearnerAgentConfig = LearnerAgentConfigDto;

export type DatabaseConfig = DatabaseConfigDto;
export type DatabaseOperation = DatabaseConfigDto['operation'];
export type DatabaseActionCategory = NonNullable<DatabaseConfigDto['actionCategory']>;
export type DatabaseAction = NonNullable<DatabaseConfigDto['action']>;
export type UpdaterMapping = NonNullable<DatabaseConfigDto['mappings']>[number];

export type UpdaterSampleState = UpdaterSampleStateDto;

export type TriggerConfig = TriggerConfigDto;

export type SimulationConfig = SimulationConfigDto;

export type ViewerConfig = ViewerConfigDto;

export type ContextConfig = ContextConfigDto;

export type AudioOscillatorConfig = AudioOscillatorConfigDto;
export type AudioWaveform = AudioWaveformDto;

export type AudioSpeakerConfig = AudioSpeakerConfigDto;

export type DescriptionConfig = DescriptionConfigDto;

export type MapperConfig = MapperConfigDto;

export type MutatorConfig = MutatorConfigDto;

export type StringMutatorConfig = StringMutatorConfigDto;
export type StringMutatorOperation = StringMutatorOperationDto;

export type ValidatorConfig = ValidatorConfigDto;

export type ConstantConfig = ConstantConfigDto;

export type MathConfig = MathConfigDto;

export type TemplateConfig = TemplateConfigDto;

export type RegexConfig = RegexConfigDto;
export type RegexTemplate = RegexTemplateDto;

export type IteratorConfig = IteratorConfigDto;

export type BundleConfig = BundleConfigDto;

export type GateConfig = GateConfigDto;

export type CompareConfig = CompareConfigDto;

export type RouterConfig = RouterConfigDto;

export type DelayConfig = DelayConfigDto;

export type HttpConfig = HttpConfigDto;

export type DbQueryConfig = DbQueryConfigDto;

export type PollConfig = PollConfigDto;

export type DbSchemaConfig = DbSchemaConfigDto;

export type DbSchemaSnapshot = DbSchemaSnapshotDto;
export type NodeCacheMode = NodeCacheModeDto;

export type NodeConfig = NodeConfigDto;

export type AiNode = AiNodeDto;

export type Edge = EdgeDto;

export type AiPathRunEventLevel = AiPathRunEventLevelDto;

export type AiPathRunEventRecord = AiPathRunEventDto;

export type NodeDefinition = NodeDefinitionDto;

export type RuntimeHistoryLink = RuntimeHistoryLinkDto;

export type RuntimeHistoryEntry = RuntimeHistoryEntryDto;

export type RuntimePortValues = RuntimePortValuesDto;

export type RuntimeState = RuntimeStateDto;

export type AiPathRuntimeEvent = AiPathRuntimeEventDto;

export type AiPathRuntimeNodeStatus = AiPathRuntimeNodeStatusDto;

export type AiPathRuntimeNodeStatusMap = AiPathRuntimeNodeStatusMapDto;

export type PathExecutionMode = PathExecutionModeDto;

export type PathRunMode = PathRunModeDto;

export type AiPathRuntimeAnalyticsRange = '1h' | '24h' | '7d' | '30d';

export type AiPathRuntimeAnalyticsSummary = AiPathRuntimeAnalyticsSummaryDto;

export type PathMeta = PathMetaDto;

export type PathUiState = PathUiStateDto;

export type PathFlowIntensity = 'off' | 'low' | 'medium' | 'high';

export type PathConfig = PathConfigDto;

export type PathDebugEntry = PathDebugEntryDto;

export type PathDebugSnapshot = PathDebugSnapshotDto;

export type ClusterPreset = ClusterPresetDto;

export type DbQueryPreset = DbQueryPresetDto;

export type DbNodePreset = DbNodePresetDto;

export type JsonPathEntry = JsonPathEntryDto;

export type ConnectionValidation = ConnectionValidationDto;
