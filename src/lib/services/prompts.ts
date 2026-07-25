export type QueryFeature = "ask" | "page" | "text";
export type ResponseFormat = "MCQ" | "Coding" | "Interview" | "General";

interface PromptPayload {
  feature: QueryFeature;
  query: string;
  context?: string; // Selected text or Page context
  format: ResponseFormat;
}

export function buildPrompt(payload: PromptPayload): string {
  let baseContext = "";

  // 1. Feature specific context injection
  switch (payload.feature) {
    case "ask":
      baseContext = `User Query: ${payload.query}`;
      break;
    case "page":
      if (!payload.context) throw new Error("Page analysis requires context");
      baseContext = `Context (Page Content): ${payload.context}\nUser Query: ${payload.query}`;
      break;
    case "text":
      if (!payload.context) throw new Error("Selected text analysis requires context");
      baseContext = `Context (Selected Text): ${payload.context}\nUser Query: ${payload.query}`;
      break;
  }

  // 2. Format specific strict directives
  let formatDirective = "";
  switch (payload.format) {
    case "MCQ":
      formatDirective = "Format requirements: Return ONLY the Correct Option followed by a one-line explanation.";
      break;
    case "Coding":
      formatDirective = "Format requirements: Return ONLY the Code, followed by the Time Complexity and Space Complexity on separate lines.";
      break;
    case "Interview":
      formatDirective = "Format requirements: Return a Short Answer followed by 2-3 Key Points as bullet points.";
      break;
    case "General":
      formatDirective = "Format requirements: Return a Direct Answer.";
      break;
  }

  return `System Instruction: You are an intelligent assistant. ${formatDirective}\n\n${baseContext}`;
}
