import { describe, expect, it } from 'vitest';
import { getAssignableRoles } from '@/lib/permissions';

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
