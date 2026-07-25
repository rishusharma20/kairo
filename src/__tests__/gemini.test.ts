import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processGeminiQuery } from '@/lib/services/gemini';
import { getHealthyKeyForUser, markKeyCooldown, NoHealthyKeyError } from '@/lib/services/keys';
import { buildPrompt } from '@/lib/services/prompts';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock dependencies
vi.mock('@/lib/services/keys', () => ({
  getHealthyKeyForUser: vi.fn(),
  markKeyCooldown: vi.fn(),
  NoHealthyKeyError: class NoHealthyKeyError extends Error {}
}));

const mocks = vi.hoisted(() => {
  return {
    generateContentMock: vi.fn(),
  };
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return {
        generateContent: mocks.generateContentMock
      };
    }
  }
}));

describe('Prompt Builder', () => {
  it('correctly formats an MCQ Ask Anything prompt', () => {
    const prompt = buildPrompt({ feature: 'ask', query: 'What is 2+2?', format: 'MCQ' });
    expect(prompt).toContain('Format requirements: Return ONLY the Correct Option followed by a one-line explanation.');
    expect(prompt).toContain('User Query: What is 2+2?');
  });

  it('correctly injects context for Page Analysis', () => {
    const prompt = buildPrompt({ feature: 'page', query: 'Summarize', context: '<body>Hello</body>', format: 'General' });
    expect(prompt).toContain('Context (Page Content): <body>Hello</body>');
    expect(prompt).toContain('User Query: Summarize');
  });

  it('throws error if page analysis lacks context', () => {
    expect(() => buildPrompt({ feature: 'page', query: 'Summarize', format: 'General' })).toThrow();
  });
});

describe('Gemini Failover Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws immediately if no healthy keys are available', async () => {
    vi.mocked(getHealthyKeyForUser).mockRejectedValueOnce(new NoHealthyKeyError());
    await expect(processGeminiQuery('user-1', 'ask', 'Hello', 'General')).rejects.toThrow('No healthy Gemini key available.');
  });

  it('succeeds on first try if API is healthy', async () => {
    vi.mocked(getHealthyKeyForUser).mockResolvedValueOnce({ id: 'key-1', encrypted_api_key: 'abc' } as any);
    mocks.generateContentMock.mockResolvedValueOnce({
      response: { text: () => 'Mock API Response' }
    });

    const result = await processGeminiQuery('user-1', 'ask', 'Hello', 'General');
    expect(result).toBe('Mock API Response');
    expect(markKeyCooldown).not.toHaveBeenCalled();
  });

  it('fails over to second key if first key hits rate limit (429)', async () => {
    // 1st call returns key-1, 2nd call returns key-2
    vi.mocked(getHealthyKeyForUser)
      .mockResolvedValueOnce({ id: 'key-1', encrypted_api_key: 'abc' } as any)
      .mockResolvedValueOnce({ id: 'key-2', encrypted_api_key: 'def' } as any);

    // 1st API call fails with 429
    mocks.generateContentMock.mockRejectedValueOnce({ status: 429, message: 'Too Many Requests' });
    // 2nd API call succeeds
    mocks.generateContentMock.mockResolvedValueOnce({
      response: { text: () => 'Success on Key 2' }
    });

    const result = await processGeminiQuery('user-1', 'ask', 'Hello', 'General');
    
    expect(result).toBe('Success on Key 2');
    expect(markKeyCooldown).toHaveBeenCalledWith('key-1');
    expect(markKeyCooldown).toHaveBeenCalledTimes(1);
    expect(mocks.generateContentMock).toHaveBeenCalledTimes(2);
  });

  it('exhausts all keys and throws error if they all fail', async () => {
    vi.mocked(getHealthyKeyForUser).mockResolvedValue({ id: 'key-X', encrypted_api_key: 'xxx' } as any);
    mocks.generateContentMock.mockRejectedValue({ status: 503, message: 'Service Unavailable' });

    await expect(processGeminiQuery('user-1', 'ask', 'Hello', 'General')).rejects.toThrow('No healthy Gemini key available.');
    
    // Engine is hardcoded to loop up to 3 times
    expect(markKeyCooldown).toHaveBeenCalledTimes(3);
  });
});
