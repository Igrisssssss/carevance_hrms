import { afterEach, describe, expect, it, vi } from 'vitest';
import api, { screenshotApi } from '@/services/api';

describe('screenshotApi.upload', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends desktop screenshots as JSON data urls', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 1 } } as any);
    const imageDataUrl = 'data:image/png;base64,ZmFrZQ==';

    await screenshotApi.upload(55, imageDataUrl, 'capture.png');

    expect(postSpy).toHaveBeenCalledTimes(1);

    const [url, body, config] = postSpy.mock.calls[0] ?? [];
    expect(url).toBe('/screenshots');
    expect(body).toEqual({
      time_entry_id: 55,
      image_data_url: imageDataUrl,
      filename: 'capture.png',
    });
    expect(config).toBeUndefined();
  });
});
