export type QuestionType = 'MCQ' | 'CODING' | 'NUMERICAL' | 'SHORT_ANSWER' | 'GENERAL' | 'UNKNOWN';

export interface PageContext {
  pageTitle?: string;
  pageUrl?: string;
  questionType: QuestionType;
  question?: string;
  options?: Array<{ label?: string; text: string }>;
  selectedLanguage?: { normalized: string; display: string };
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples?: string[];
  starterCode?: string;
  visibleContext?: string;
}

export interface PageAdapter {
  name: string;
  matches(): boolean;
  extract(): PageContext | null;
}
