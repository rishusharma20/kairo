export type PageContext = string;

export interface PageAdapter {
  name: string;
  matches(): boolean;
  extract(): PageContext | null;
}
