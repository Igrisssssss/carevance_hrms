import { describe, expect, it } from 'vitest';
import { getAssignableRoles, hasStrictAdminAccess, isTrackedTimerUser } from '@/lib/permissions';

describe('getAssignableRoles', () => {
  it('allows admins to assign the admin role', () => {
    expect(
      getAssignableRoles(
        {
          id: 2,
          name: 'Workspace Admin',
          email: 'admin@example.com',
          role: 'admin',
          organization_id: 10,
          is_active: true,
          created_at: '',
          updated_at: '',
        },
        {
          id: 10,
          name: 'CareVance',
          slug: 'carevance',
          owner_user_id: 1,
          created_at: '',
          updated_at: '',
        }
      )
    ).toEqual(['admin', 'manager', 'employee', 'client']);
  });
});

describe('hasStrictAdminAccess', () => {
  it('only allows admins', () => {
    expect(hasStrictAdminAccess({ id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', organization_id: 1, is_active: true, created_at: '', updated_at: '' })).toBe(true);
    expect(hasStrictAdminAccess({ id: 2, name: 'Manager', email: 'manager@example.com', role: 'manager', organization_id: 1, is_active: true, created_at: '', updated_at: '' })).toBe(false);
  });
});

describe('isTrackedTimerUser', () => {
  it('allows managers and employees into the tracked timer flow', () => {
    expect(isTrackedTimerUser({ id: 1, name: 'Employee', email: 'employee@example.com', role: 'employee', organization_id: 1, is_active: true, created_at: '', updated_at: '' })).toBe(true);
    expect(isTrackedTimerUser({ id: 2, name: 'Manager', email: 'manager@example.com', role: 'manager', organization_id: 1, is_active: true, created_at: '', updated_at: '' })).toBe(true);
    expect(isTrackedTimerUser({ id: 3, name: 'Admin', email: 'admin@example.com', role: 'admin', organization_id: 1, is_active: true, created_at: '', updated_at: '' })).toBe(false);
  });
});
