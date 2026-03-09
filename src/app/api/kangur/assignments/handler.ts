import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logKangurServerEvent } from '@/features/kangur/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';
import {
  parseKangurAssignmentCreatePayload,
} from '@/shared/validations/kangur';


import {
  createAssignmentSnapshotForLearner,
  listAssignmentSnapshotsForLearner,
  readKangurJsonBody,
  resolveAssignmentActor,
} from './shared';

export const querySchema = z.object({
  includeArchived: optionalBooleanQuerySchema().default(false),
});

export async function getKangurAssignmentsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveAssignmentActor(req);
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;

  const snapshots = await listAssignmentSnapshotsForLearner({
    learnerKey: actor.learnerKey,
    learnerName: actor.learnerName,
    learnerEmail: actor.learnerEmail,
    legacyLearnerKey: actor.legacyLearnerKey,
    includeArchived: query.includeArchived,
  });

  return NextResponse.json(snapshots);
}

export async function postKangurAssignmentsHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveAssignmentActor(req);
  const payload = parseKangurAssignmentCreatePayload(await readKangurJsonBody(req, 'assignment'));
  const snapshot = await createAssignmentSnapshotForLearner({
    learnerKey: actor.learnerKey,
    learnerName: actor.learnerName,
    learnerEmail: actor.learnerEmail,
    legacyLearnerKey: actor.legacyLearnerKey,
    payload,
  });

  void logKangurServerEvent({
    source: 'kangur.assignments.create',
    message: 'Kangur assignment created',
    request: req,
    requestContext: ctx,
    statusCode: 201,
    context: {
      learnerId: actor.learnerKey,
      targetType: snapshot.target.type,
      assignmentId: snapshot.id,
      priority: snapshot.priority,
      status: snapshot.progress.status,
    },
  });
  return NextResponse.json(snapshot, { status: 201 });
}
