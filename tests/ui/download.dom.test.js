import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBytes } from '../../src/ui/download.js';

describe('downloadBytes', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('clicks a temporary link and revokes the URL after a delay', () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadBytes(new Uint8Array([1]), 'a.xlsx', 'application/octet-stream');
    expect(click).toHaveBeenCalledTimes(1);
    expect(document.querySelector('a')).toBeNull();
    vi.advanceTimersByTime(999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});
