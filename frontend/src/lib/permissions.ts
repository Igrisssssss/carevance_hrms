import type { Organization, User } from '@/types';

export const hasAdminAccess = (user: User | null | undefined): boolean =>
  Boolean(user && (user.role === 'admin' || user.role === 'manager'));

export const isEmployeeUser = (user: User | null | undefined): boolean =>
  user?.role === 'employee';

export const getAssignableRoles = (
  user: User | null | undefined,
  organization: Organization | null | undefined
): Array<User['role']> => {
  if (!user || !organization) {
    return [];
  }

  const isOwner = organization.owner_user_id === user.id;

  if (isOwner) {
    return ['admin', 'manager', 'employee', 'client'];
  }

  if (user.role === 'admin') {
    return ['admin', 'manager', 'employee', 'client'];
  }

  if (user.role === 'manager') {
    return ['employee'];
  }

  return [];
};
