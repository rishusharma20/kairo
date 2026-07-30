import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericAdapter } from '../../extension/src/context/generic';
import { buildExtensionInferencePrompt } from '../lib/services/prompts';
import { JSDOM } from 'jsdom';

describe('Extension Context Intelligence', () => {
  let dom: JSDOM;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');
    // @ts-ignore
    global.window = dom.window;
    // @ts-ignore
    global.document = dom.window.document;
    // @ts-ignore
    global.Node = dom.window.Node;
    // @ts-ignore
    global.HTMLElement = dom.window.HTMLElement;
    
    // Mock getSelection
    global.window.getSelection = vi.fn().mockReturnValue({
      toString: () => ''
    });

    // Mock getComputedStyle
    global.window.getComputedStyle = vi.fn().mockReturnValue({
      display: 'block',
      visibility: 'visible',
      opacity: '1'
    });

    // Mock getBoundingClientRect
    // @ts-ignore
    global.HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 100,
      height: 100
    });
  });

  it('Extracts generic page context successfully', () => {
    document.title = 'Test Title';
    document.body.innerHTML = `
      <div>
        <p>What is binary search complexity?</p>
        <label><input type="radio" name="q1" value="A"> A O(n)</label>
        <label><input type="radio" name="q1" value="B"> B O(log n)</label>
      </div>
    `;

    const ctx = GenericAdapter.extract();
    expect(ctx).toBeDefined();
    expect(typeof ctx).toBe('string');
    expect(ctx).toContain('PAGE TITLE:\nTest Title');
    expect(ctx).toContain('What is binary search complexity?');
  });

  it('Returns null when no visible text', () => {
    document.body.innerHTML = `<div style="display:none">Hidden text</div>`;
    // Update mock to return 0 dimensions for the hidden div
    // @ts-ignore
    global.HTMLElement.prototype.getBoundingClientRect = vi.fn().mockReturnValue({ width: 0, height: 0 });
    
    const ctx = GenericAdapter.extract();
    expect(ctx).toBeNull();
  });

  it('Builds minimal extension prompt correctly with format constraints', () => {
    const payload: any = {
      feature: 'ask',
      query: 'solve this',
      context: 'Some extracted context'
    };
    
    const prompt = buildExtensionInferencePrompt(payload);
    
    // Core structure
    expect(prompt).toContain('You are Kairo.');
    expect(prompt).toContain('Respond to the user\'s request using the provided webpage context when relevant.');
    expect(prompt).toContain('USER REQUEST:\nsolve this');
    expect(prompt).toContain('PAGE CONTEXT:\nSome extracted context');
    
    // Coding instruction constraints
    expect(prompt).toContain('shortest correct working solution in the appropriate language');
    expect(prompt).toContain('no comments, explanation, markdown fences, headings, complexity analysis');
    expect(prompt).toContain('Preserve required platform signatures.');
    expect(prompt).toContain('Correctness is more\nimportant than minimizing code length.');
    
    // MCQ constraints
    expect(prompt).toContain('return only the correct option followed by exactly one concise line explaining');
    
    // Other request constraints
    expect(prompt).toContain('answer directly and concisely.');
  });

  it('Builds minimal extension prompt with empty context', () => {
    const payload: any = {
      feature: 'ask',
      query: 'solve this',
      context: ''
    };
    
    const prompt = buildExtensionInferencePrompt(payload);
    expect(prompt).toContain('PAGE CONTEXT:\nNone provided');
  });
});
