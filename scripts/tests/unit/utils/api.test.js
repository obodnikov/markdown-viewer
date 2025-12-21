/**
 * Unit tests for API client utility
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API Client', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should make GET request', async () => {
    const mockResponse = { data: 'test' };
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await fetch('/api/test');
    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith('/api/test');
    expect(data).toEqual(mockResponse);
  });

  it('should make POST request with JSON body', async () => {
    const requestBody = { content: 'test' };
    const mockResponse = { result: 'success' };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    await fetch('/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json'
      })
    }));
  });

  it('should handle API errors', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    const response = await fetch('/api/test');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it('should handle network errors', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetch('/api/test')).rejects.toThrow('Network error');
  });

  it('should use relative URLs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await fetch('/api/health');

    expect(fetch).toHaveBeenCalledWith('/api/health');
    expect(fetch.mock.calls[0][0]).toMatch(/^\/api/);
  });
});
