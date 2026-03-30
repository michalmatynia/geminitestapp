import { CheckCircle, Clock, Loader2, XCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { getStatusIcon } from '@/shared/lib/icons/job-icons';

describe('job-icons', () => {
  it('uses the clock icon for queued and unknown states', () => {
    expect(getStatusIcon('pending').type).toBe(Clock);
    expect(getStatusIcon('queued').type).toBe(Clock);
    expect(getStatusIcon('queued_relist').type).toBe(Clock);
    expect(getStatusIcon('unexpected-state').type).toBe(Clock);
  });

  it('uses success, failure, and running icons for grouped statuses', () => {
    expect(getStatusIcon('completed').type).toBe(CheckCircle);
    expect(getStatusIcon('success').type).toBe(CheckCircle);
    expect(getStatusIcon('listed').type).toBe(CheckCircle);

    expect(getStatusIcon('deleted').type).toBe(XCircle);
    expect(getStatusIcon('removed').type).toBe(XCircle);
    expect(getStatusIcon('failed').type).toBe(XCircle);
    expect(getStatusIcon('needs_login').type).toBe(XCircle);
    expect(getStatusIcon('auth_required').type).toBe(XCircle);
    expect(getStatusIcon('error').type).toBe(XCircle);

    const runningIcon = getStatusIcon('running');
    expect(runningIcon.type).toBe(Loader2);
    expect(runningIcon.props.className).toContain('animate-spin');
    expect(getStatusIcon('processing').type).toBe(Loader2);
    expect(getStatusIcon('in_progress').type).toBe(Loader2);
  });
});
