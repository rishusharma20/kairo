import { PageContext, PageAdapter } from './types';
import { GenericAdapter } from './generic';

const adapters: PageAdapter[] = [
  // Site specific adapters will go here (e.g. LeetCodeAdapter)
  GenericAdapter // Always last as fallback
];

export function extractPageContext(): PageContext | null {
  for (const adapter of adapters) {
    if (adapter.matches()) {
      try {
        const context = adapter.extract();
        if (context) {
          return context;
        }
      } catch (e) {
        console.error(`Adapter ${adapter.name} failed to extract context:`, e);
      }
    }
  }
  return null;
}
