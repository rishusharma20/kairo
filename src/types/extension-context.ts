export type QuestionType = 'MCQ' | 'CODING' | 'NUMERICAL' | 'SHORT_ANSWER' | 'GENERAL' | 'UNKNOWN';

export interface PageOption {
  label?: string;
  text: string;
}

export interface SelectedLanguage {
  normalized: string;
  display: string;
}

export interface PageContext {
  pageTitle?: string;
  pageUrl?: string;
  questionType: QuestionType;
  question?: string;
  options?: PageOption[];
  selectedLanguage?: SelectedLanguage;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples?: string[];
  starterCode?: string;
  visibleContext?: string;
}
