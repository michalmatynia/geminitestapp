import { NextRequest, NextResponse } from 'next/server';

import {
  parseKangurAssignmentCreatePayload,
  parseKangurAssignmentListQuery,
} from '@/shared/validations/kangur';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

import {
  createAssignmentSnapshotForLearner,
  listAssignmentSnapshotsForLearner,
  readKangurJsonBody,
  resolveAssignmentActor,
} from './shared';

export async function getKangurAssignmentsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const actor = await resolveAssignmentActor(req);
  const query = parseKangurAssignmentListQuery({
    includeArchived: req.nextUrl.searchParams.get('includeArchived') ?? undefined,
  });

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
  _ctx: ApiHandlerContext
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

  return NextResponse.json(snapshot, { status: 201 });
}
