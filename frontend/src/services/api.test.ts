import { afterEach, describe, expect, it, vi } from 'vitest';
import api, { screenshotApi } from '@/services/api';

describe('screenshotApi.upload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets axios set the multipart boundary automatically', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 1 } } as any);
    const file = new File(['fake-image'], 'capture.png', { type: 'image/png' });

    await screenshotApi.upload(55, file);

    expect(postSpy).toHaveBeenCalledTimes(1);

    const [url, body, config] = postSpy.mock.calls[0] ?? [];
    expect(url).toBe('/screenshots');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('image')).toBe(file);
    expect((body as FormData).get('time_entry_id')).toBe('55');
    expect(config).toBeUndefined();
  });
});
