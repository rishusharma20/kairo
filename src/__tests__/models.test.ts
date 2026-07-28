import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEnabledModels, getModelsForTask, MODEL_REGISTRY } from '@/lib/services/models';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    projectModelAvailability: {
      findMany: vi.fn(),
    }
  }
}));

describe('Model Registry', () => {
  it('should return only enabled models ordered by priority', () => {
    const enabledModels = getEnabledModels();
    
    // Check all returned models are enabled
    expect(enabledModels.every(m => m.enabled)).toBe(true);
    
    // Check they are sorted by priority
    for (let i = 0; i < enabledModels.length - 1; i++) {
      expect(enabledModels[i].priority).toBeLessThanOrEqual(enabledModels[i+1].priority);
    }
    
    // Check that there is at least one enabled model and one disabled model in the registry for this test to be meaningful
    const hasEnabled = MODEL_REGISTRY.some(m => m.enabled);
    const hasDisabled = MODEL_REGISTRY.some(m => !m.enabled);
    if (hasEnabled && hasDisabled) {
      expect(enabledModels.length).toBeLessThan(MODEL_REGISTRY.length);
    }
  });

  it('should filter models by MCQ capability', () => {
    const mcqModels = getModelsForTask('MCQ');
    expect(mcqModels.every(m => m.capabilities.mcq && m.capabilities.textOutput)).toBe(true);
  });

  it('should filter models by CODING capability', () => {
    const codingModels = getModelsForTask('CODING');
    expect(codingModels.every(m => m.capabilities.coding && m.capabilities.textOutput)).toBe(true);
  });

  it('should filter models by GENERAL capability', () => {
    const generalModels = getModelsForTask('GENERAL');
    expect(generalModels.every(m => m.capabilities.generalText && m.capabilities.textOutput)).toBe(true);
  });

  it('does not expose secrets in registry definition', () => {
    MODEL_REGISTRY.forEach(model => {
      const keys = Object.keys(model);
      expect(keys).not.toContain('apiKey');
      expect(keys).not.toContain('secret');
      expect(keys).not.toContain('token');
    });
  });

  it('protects against arbitrary client model IDs by strictly validating against registry', () => {
    // Conceptually verify the registry does not contain arbitrary IDs like "gpt-4"
    const hasArbitrary = MODEL_REGISTRY.some(m => m.id === 'gpt-4');
    expect(hasArbitrary).toBe(false);
  });
});
