import { describe, it, expect } from 'vitest';
import { buildRelationMasterTree } from '../relation-builder-service';
import type { NodeFileDocumentSearchRow } from '@/features/case-resolver/components/CaseResolverNodeFileUtils';

describe('RelationBuilderService', () => {
  it('should organize search rows into a hierarchical master tree', () => {
    const rows: NodeFileDocumentSearchRow[] = [
      {
        signatureLabel: 'Case A',
        file: { id: 'f1', name: 'File 1', fileType: 'document', parentCaseId: 'c1', folder: 'docs' } as any,
        folderPath: 'docs',
        folderSegments: ['docs'],
      },
    ];

    const result = buildRelationMasterTree(rows);
    
    // Check if nodes are created correctly
    expect(result.nodes.length).toBeGreaterThan(0);
    const caseNode = result.nodes.find(n => n.metadata?.relationNodeType === 'case');
    expect(caseNode).toBeDefined();
    expect(caseNode?.name).toBe('Case A');
  });
});
