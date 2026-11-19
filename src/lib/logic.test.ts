import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessRoute,
  canModifyAdmin,
  hasPermission,
  ROLE_PERMISSION_MATRIX,
} from './rbac';
import {
  formatUsd,
  generateIdempotencyKey,
  isImageUrl,
  isRejectedTelegramEmail,
  StructuredApiError,
  unwrapAdminApiResponse,
  validateBalanceAdjustment,
  validateRejectReason,
} from './formatters';

test('RBAC: super_admin has all permissions including manage_admins', () => {
  assert.equal(hasPermission('super_admin', 'manage_admins'), true);
  assert.equal(hasPermission('super_admin', 'manage_withdrawals'), true);
  assert.equal(hasPermission('admin', 'manage_admins'), false);
  assert.equal(hasPermission('admin', 'manage_settings'), true);
});

test('RBAC: finance_admin and moderator permissions match specification', () => {
  assert.equal(hasPermission('finance_admin', 'manage_withdrawals'), true);
  assert.equal(hasPermission('finance_admin', 'manage_balances'), true);
  assert.equal(hasPermission('finance_admin', 'manage_tasks'), false);
  assert.equal(hasPermission('moderator', 'review_submissions'), true);
  assert.equal(hasPermission('moderator', 'manage_withdrawals'), false);
  assert.equal(hasPermission('support', 'manage_users'), true);
  assert.equal(hasPermission('support', 'manage_balances'), false);
  assert.ok(ROLE_PERMISSION_MATRIX.finance.includes('view_audit_logs'));
});

test('RBAC: route guards block unauthorized roles', () => {
  assert.equal(canAccessRoute('super_admin', '/admins'), true);
  assert.equal(canAccessRoute('admin', '/admins'), false);
  assert.equal(canAccessRoute('finance', '/withdrawals'), true);
  assert.equal(canAccessRoute('finance', '/tasks'), false);
  assert.equal(canAccessRoute('moderator', '/security'), false);
});

test('RBAC: prevents self-demotion and self-suspension for super_admin', () => {
  const me = { id: 'adm-1', email: 'root@payvora.io', role: 'super_admin' as const };
  assert.equal(
    canModifyAdmin(me, { id: 'adm-1', email: 'root@payvora.io' }, 'admin', 'active').allowed,
    false,
  );
  assert.equal(
    canModifyAdmin(me, { id: 'adm-1', email: 'root@payvora.io' }, 'super_admin', 'suspended')
      .allowed,
    false,
  );
  assert.equal(
    canModifyAdmin(me, { id: 'adm-2', email: 'ops@payvora.io' }, 'admin', 'active').allowed,
    true,
  );
});

test('API envelope unwrapping returns data on success and throws StructuredApiError on failure', () => {
  const ok = unwrapAdminApiResponse({
    success: true,
    data: { totalUsers: 42 },
    timestamp: '2026-11-19T00:00:00Z',
  });
  assert.deepEqual(ok, { totalUsers: 42 });

  assert.throws(
    () =>
      unwrapAdminApiResponse(
        {
          success: false,
          error: 'Not an active administrator',
          code: 'FORBIDDEN_INACTIVE_ADMIN',
          timestamp: '2026-11-19T00:00:00Z',
        },
        403,
      ),
    (err: unknown) => {
      assert.ok(err instanceof StructuredApiError);
      assert.equal(err.code, 'FORBIDDEN_INACTIVE_ADMIN');
      assert.equal(err.status, 403);
      assert.equal(err.message, 'Not an active administrator');
      return true;
    },
  );
});

test('Validation: rejects @telegram.local emails and validates reject reasons & balances', () => {
  assert.equal(isRejectedTelegramEmail('123456@telegram.local'), true);
  assert.equal(isRejectedTelegramEmail('USER@TELEGRAM.LOCAL '), true);
  assert.equal(isRejectedTelegramEmail('admin@payvora.io'), false);

  assert.equal(validateRejectReason('ab').valid, false);
  assert.equal(validateRejectReason('Invalid TRC20 wallet').valid, true);

  assert.equal(validateBalanceAdjustment('0', 'Bonus').valid, false);
  assert.equal(validateBalanceAdjustment('-5', 'Bonus').valid, false);
  assert.equal(validateBalanceAdjustment('12.50', 'ok').valid, false);
  assert.deepEqual(validateBalanceAdjustment('12.50', 'Manual dispute credit'), {
    valid: true,
    amount: 12.5,
  });
});

test('Idempotency key and image detection behave deterministically', () => {
  const key = generateIdempotencyKey('bal');
  assert.ok(key.length >= 8);
  assert.ok(key.startsWith('bal-'));

  assert.equal(isImageUrl('https://cdn.example.com/proof.png?token=abc'), true);
  assert.equal(
    isImageUrl('https://ovrjbuwfmfjcrhwmrrba.supabase.co/storage/v1/object/sign/proofs/abc?token=xyz'),
    true,
  );
  assert.equal(isImageUrl('javascript:alert(1)'), false);
  assert.equal(isImageUrl('https://example.com/task-link'), false);

  assert.equal(formatUsd(1250.5), '$1,250.50');
});
