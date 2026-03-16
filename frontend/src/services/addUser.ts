import { organizationApi, projectApi, reportGroupApi } from '@/services/api';

export type InviteUserRole = 'employee' | 'manager' | 'admin' | 'client';

export interface InviteOption {
  id: number;
  name: string;
  description: string;
  isDefault?: boolean;
}

export interface InviteDefaults {
  remember: boolean;
  groupIds: number[];
  projectIds: number[];
}

export interface AdditionalInviteSettings {
  monitoringInterval: 10 | 15 | 30;
  canEditTime: boolean;
  attendanceMonitoring: boolean;
  payrollVisibility: boolean;
  taskAssignmentAccess: boolean;
}

export interface InviteSubmissionPayload {
  organizationId: number;
  emails: string[];
  role: InviteUserRole;
  groupIds: number[];
  projectIds: number[];
  settings: AdditionalInviteSettings;
}

export interface InviteSubmissionResult {
  invitedCount: number;
  failed: Array<{ email: string; message: string }>;
  deferredAssignments: string[];
}

export interface InviteLinkResult {
  url: string;
  meta: {
    role: InviteUserRole;
    groupIds: number[];
    projectIds: number[];
  };
  isMock: boolean;
}

export interface CsvParseRow {
  email: string;
  name: string;
  role: InviteUserRole;
  groupIds: number[];
  projectIds: number[];
}

export interface CsvParseResult {
  rows: CsvParseRow[];
  errors: string[];
}

const INVITE_DEFAULTS_KEY = 'carevance-add-user-defaults';

const roleAliasMap: Record<string, InviteUserRole> = {
  employee: 'employee',
  user: 'employee',
  regular: 'employee',
  regularuser: 'employee',
  'regular user': 'employee',
  manager: 'manager',
  admin: 'admin',
  administrator: 'admin',
  client: 'client',
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const deriveDisplayName = (email: string) => {
  const localPart = email.split('@')[0] || 'User';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const parseMultiValueField = (value: string) =>
  value
    .split(/[|;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const mapOptionNamesToIds = (values: string[], options: InviteOption[]) => {
  const optionMap = new Map(options.map((option) => [toSlug(option.name), option.id]));

  return values
    .map((value) => {
      const normalized = toSlug(value);
      const asNumber = Number(value);
      if (Number.isFinite(asNumber) && asNumber > 0) {
        return asNumber;
      }
      return optionMap.get(normalized) ?? null;
    })
    .filter((value): value is number => Boolean(value));
};

const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
};

export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function normalizeEmails(rawValue: string) {
  const entries = rawValue
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  const valid = Array.from(new Set(entries.filter((value) => emailPattern.test(value.toLowerCase())).map((value) => value.toLowerCase())));
  const invalid = Array.from(new Set(entries.filter((value) => !emailPattern.test(value.toLowerCase()))));

  return { valid, invalid };
}

export const addUserService = {
  async fetchGroups() {
    const response = await reportGroupApi.list();
    const groups = response.data?.data || [];

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: `${group.users.length} member${group.users.length === 1 ? '' : 's'}`,
      isDefault: group.users.length > 0,
    })) satisfies InviteOption[];
  },

  async fetchProjects() {
    const response = await projectApi.getAll();
    const projects = response.data || [];

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.status === 'active' ? 'Active project' : `Status: ${project.status.replace('_', ' ')}`,
      isDefault: project.status === 'active',
    })) satisfies InviteOption[];
  },
  
  loadDefaults(): InviteDefaults {
    if (typeof window === 'undefined') {
      return { remember: false, groupIds: [], projectIds: [] };
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(INVITE_DEFAULTS_KEY) || '{}') as Partial<InviteDefaults>;
      return {
        remember: Boolean(parsed.remember),
        groupIds: Array.isArray(parsed.groupIds) ? parsed.groupIds.filter((id) => Number.isFinite(id)) : [],
        projectIds: Array.isArray(parsed.projectIds) ? parsed.projectIds.filter((id) => Number.isFinite(id)) : [],
      };
    } catch {
      return { remember: false, groupIds: [], projectIds: [] };
    }
  },

  saveDefaults(defaults: InviteDefaults) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(INVITE_DEFAULTS_KEY, JSON.stringify(defaults));
  },

  clearDefaults() {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(INVITE_DEFAULTS_KEY);
  },

  async inviteByEmail(payload: InviteSubmissionPayload): Promise<InviteSubmissionResult> {
    const failed: Array<{ email: string; message: string }> = [];
    let invitedCount = 0;

    for (const email of payload.emails) {
      try {
        await organizationApi.inviteMember(payload.organizationId, {
          email,
          name: deriveDisplayName(email),
          role: payload.role,
          group_ids: payload.groupIds,
          settings: {
            monitoring_interval_minutes: payload.settings.monitoringInterval,
            can_edit_time: payload.settings.canEditTime,
            attendance_monitoring: payload.settings.attendanceMonitoring,
            payroll_visibility: payload.settings.payrollVisibility,
            task_assignment_access: payload.settings.taskAssignmentAccess,
          },
        });
        invitedCount += 1;
      } catch (error: any) {
        failed.push({
          email,
          message: error?.response?.data?.message || 'Unable to send invitation.',
        });
      }
    }

    const deferredAssignments = payload.projectIds.length > 0
      ? ['Project access was staged in the frontend only because the backend does not expose a user-project assignment endpoint yet.']
      : [];

    return { invitedCount, failed, deferredAssignments };
  },

  async generateInviteLink(payload: Omit<InviteSubmissionPayload, 'emails' | 'organizationId'>) {
    const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const params = new URLSearchParams({
      invite: token,
      role: payload.role,
    });

    if (payload.groupIds.length > 0) {
      params.set('groups', payload.groupIds.join(','));
    }

    if (payload.projectIds.length > 0) {
      params.set('projects', payload.projectIds.join(','));
    }

    return {
      url: `${window.location.origin}/register?${params.toString()}`,
      meta: {
        role: payload.role,
        groupIds: payload.groupIds,
        projectIds: payload.projectIds,
      },
      isMock: true,
    } satisfies InviteLinkResult;
  },

  async copyInviteLink(url: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  },

  parseCsv(content: string, groups: InviteOption[], projects: InviteOption[]): CsvParseResult {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return { rows: [], errors: ['CSV file is empty.'] };
    }

    const [headerLine, ...dataLines] = lines;
    const headers = parseCsvLine(headerLine).map((header) => toSlug(header));
    const rows: CsvParseRow[] = [];
    const errors: string[] = [];

    const emailIndex = headers.indexOf('email');
    const nameIndex = headers.indexOf('name');
    const roleIndex = headers.indexOf('role');
    const groupIndex = headers.findIndex((header) => ['groups', 'group', 'group ids'].includes(header));
    const projectIndex = headers.findIndex((header) => ['projects', 'project', 'project ids'].includes(header));

    if (emailIndex < 0) {
      return { rows: [], errors: ['CSV must include an email column.'] };
    }

    dataLines.forEach((line, index) => {
      const columns = parseCsvLine(line);
      const email = (columns[emailIndex] || '').trim().toLowerCase();
      const roleValue = toSlug(columns[roleIndex] || 'employee');
      const role = roleAliasMap[roleValue] || 'employee';

      if (!emailPattern.test(email)) {
        errors.push(`Row ${index + 2}: invalid email "${columns[emailIndex] || ''}".`);
        return;
      }

      rows.push({
        email,
        name: (columns[nameIndex] || '').trim() || deriveDisplayName(email),
        role,
        groupIds: mapOptionNamesToIds(parseMultiValueField(columns[groupIndex] || ''), groups),
        projectIds: mapOptionNamesToIds(parseMultiValueField(columns[projectIndex] || ''), projects),
      });
    });

    return { rows, errors };
  },

  async processCsvInvite(
    file: File,
    basePayload: Omit<InviteSubmissionPayload, 'emails' | 'role' | 'groupIds' | 'projectIds'>,
    groups: InviteOption[],
    projects: InviteOption[]
  ) {
    const content = await file.text();
    const parsed = this.parseCsv(content, groups, projects);

    if (parsed.rows.length === 0) {
      return {
        parsed,
        result: {
          invitedCount: 0,
          failed: parsed.errors.map((message) => ({ email: 'csv', message })),
          deferredAssignments: [],
        } satisfies InviteSubmissionResult,
      };
    }

    let invitedCount = 0;
    const failed = parsed.errors.map((message) => ({ email: 'csv', message }));
    const deferredAssignments = new Set<string>();

    for (const row of parsed.rows) {
      try {
        await organizationApi.inviteMember(basePayload.organizationId, {
          email: row.email,
          name: row.name,
          role: row.role,
          group_ids: row.groupIds,
          settings: {
            monitoring_interval_minutes: basePayload.settings.monitoringInterval,
            can_edit_time: basePayload.settings.canEditTime,
            attendance_monitoring: basePayload.settings.attendanceMonitoring,
            payroll_visibility: basePayload.settings.payrollVisibility,
            task_assignment_access: basePayload.settings.taskAssignmentAccess,
          },
        });
        invitedCount += 1;
        if (row.projectIds.length > 0) {
          deferredAssignments.add('CSV project assignments are mock-ready only until a backend user-project access endpoint exists.');
        }
      } catch (error: any) {
        failed.push({
          email: row.email,
          message: error?.response?.data?.message || 'Unable to import this row.',
        });
      }
    }
    

    return {
      parsed,
      result: {
        invitedCount,
        failed,
        deferredAssignments: Array.from(deferredAssignments),
      } satisfies InviteSubmissionResult,
    };
  },
  
  downloadCsvTemplate() {
    const template = [
      'email,name,role,groups,projects',
      'alex@example.com,Alex Johnson,employee,"Operations|Night Shift","CareVance HRMS"',
      'client@example.com,Northwind Client,client,"Client Access","Implementation"',
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'carevance-add-user-template.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
