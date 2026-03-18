export const ACTIVE_TIMER_KEY = 'active_timer_snapshot';
const AUTO_START_SUPPRESSED_KEY = 'desktop_timer_auto_start_suppressed';
const AUTO_START_ARMED_KEY = 'desktop_timer_auto_start_armed';
const IDLE_AUTO_STOP_NOTICE_KEY = 'desktop_timer_idle_auto_stop_notice';
export const DESKTOP_TIMER_IDLE_STOP_EVENT = 'desktop-timer:idle-auto-stop';

export type DesktopTimerIdleStopDetail = {
  userId: number;
  message: string;
};

const getStorageScopedKey = (baseKey: string, userId?: number | null) => `${baseKey}:${userId ?? 'guest'}`;

export const getAutoStartSuppressionKey = (userId?: number | null) =>
  getStorageScopedKey(AUTO_START_SUPPRESSED_KEY, userId);

export const suppressAutoStart = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.setItem(getAutoStartSuppressionKey(userId), '1');
};

export const clearAutoStartSuppression = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.removeItem(getAutoStartSuppressionKey(userId));
};

export const isAutoStartSuppressed = (userId?: number | null) => {
  if (!userId) return false;
  return sessionStorage.getItem(getAutoStartSuppressionKey(userId)) === '1';
};

const getAutoStartArmedKey = (userId?: number | null) => getStorageScopedKey(AUTO_START_ARMED_KEY, userId);

export const armAutoStart = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.setItem(getAutoStartArmedKey(userId), '1');
};

export const clearAutoStartArm = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.removeItem(getAutoStartArmedKey(userId));
};

export const isAutoStartArmed = (userId?: number | null) => {
  if (!userId) return false;
  return sessionStorage.getItem(getAutoStartArmedKey(userId)) === '1';
};

const getIdleAutoStopNoticeKey = (userId?: number | null) => getStorageScopedKey(IDLE_AUTO_STOP_NOTICE_KEY, userId);

export const setIdleAutoStopNotice = (userId: number | null | undefined, message: string) => {
  if (!userId) return;
  sessionStorage.setItem(getIdleAutoStopNoticeKey(userId), message);
};

export const consumeIdleAutoStopNotice = (userId?: number | null) => {
  if (!userId) return '';

  const key = getIdleAutoStopNoticeKey(userId);
  const message = sessionStorage.getItem(key) || '';
  sessionStorage.removeItem(key);

  return message;
};

export const clearIdleAutoStopNotice = (userId?: number | null) => {
  if (!userId) return;
  sessionStorage.removeItem(getIdleAutoStopNoticeKey(userId));
};

export const emitDesktopTimerIdleStop = (detail: DesktopTimerIdleStopDetail) => {
  window.dispatchEvent(new CustomEvent<DesktopTimerIdleStopDetail>(DESKTOP_TIMER_IDLE_STOP_EVENT, { detail }));
};

export const clearDesktopTimerSession = () => {
  localStorage.removeItem(ACTIVE_TIMER_KEY);

  const storageKeys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
    .filter((key): key is string => Boolean(key))
    .filter((key) =>
      key === AUTO_START_SUPPRESSED_KEY
      || key.startsWith(`${AUTO_START_SUPPRESSED_KEY}:`)
      || key === AUTO_START_ARMED_KEY
      || key.startsWith(`${AUTO_START_ARMED_KEY}:`)
      || key === IDLE_AUTO_STOP_NOTICE_KEY
      || key.startsWith(`${IDLE_AUTO_STOP_NOTICE_KEY}:`)
    );

  storageKeys.forEach((key) => sessionStorage.removeItem(key));
};
