export type TriggerCategory = 'Work' | 'Family' | 'Health' | 'Finance' | 'None';

export const TRIGGER_CATEGORIES: TriggerCategory[] = ['Work', 'Family', 'Health', 'Finance', 'None'];

export type AnalyzeResponse = {
  coefficients: {
    sleep: number;
    stress: number;
    intercept: number;
  };
  rSquared: number;
  worstTrigger: string;
  data: Array<{
    date: string;
    mood: number;
    sleep: number;
    stress: number;
  }>;
};

export type AiResponse = {
  prescription: string;
  grounding: string;
  reframed: string;
  insight: string;
};
