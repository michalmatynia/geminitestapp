import type {
  AiPathsSemanticSpecVersionDto,
  CanvasSemanticDocumentDto,
  SemanticBoundaryDto,
  SemanticDocumentDto,
  SemanticEdgeDto,
  SemanticExecutionDescriptorDto,
  SemanticNodeConnectionsDto,
  SemanticNodeDto,
  SemanticPathDescriptorDto,
  SemanticPortBindingDto,
  SemanticProvenanceDto,
  SubgraphSemanticDocumentDto,
} from '../../contracts/ai-paths-semantic-grammar';

export type AiPathsSemanticSpecVersion = AiPathsSemanticSpecVersionDto;
export type SemanticPortBinding = SemanticPortBindingDto;
export type SemanticNodeConnections = SemanticNodeConnectionsDto;
export type SemanticNode = SemanticNodeDto;
export type SemanticEdge = SemanticEdgeDto;
export type SemanticPathDescriptor = SemanticPathDescriptorDto;
export type SemanticExecutionDescriptor = SemanticExecutionDescriptorDto;
export type SemanticProvenance = SemanticProvenanceDto;
export type SemanticBoundary = SemanticBoundaryDto;
export type CanvasSemanticDocument = CanvasSemanticDocumentDto;
export type SubgraphSemanticDocument = SubgraphSemanticDocumentDto;
export type SemanticDocument = SemanticDocumentDto;
