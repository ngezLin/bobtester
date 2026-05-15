import dotenv from "dotenv";
dotenv.config();

export interface GeneratedStep {
  action: "goto" | "fill" | "click" | "verify";
  selector?: string;
  value?: string;
}

export class AiService {
  private static baseUrl = process.env.AI_BASE_URL || "http://localhost:11434";
  private static model = process.env.AI_MODEL || "llama3";
  private static apiKey = process.env.AI_API_KEY || "";

  static async generateTestSteps(url: string, goal: string, elementContext?: string): Promise<{ name: string; steps: GeneratedStep[] }> {
    const systemPrompt = `You are a QA security testing automation agent. Your job is to generate browser automation steps to test a web application.

Given a target URL and a testing goal, return a JSON object with a test case name and steps.

STRICT RULES:
- Return ONLY a valid JSON object. No explanation, no markdown fences, no extra text whatsoever.
- The object must have two fields: "name" (a short, descriptive test case name) and "steps" (an array of step objects).
- Each step must be exactly one of these four formats:
  { "action": "goto", "value": "<full URL>" }
  { "action": "fill", "selector": "<CSS selector>", "value": "<text to type>" }
  { "action": "click", "selector": "<selector>" }
  { "action": "verify", "selector": "text: <content>" }
  { "action": "verify", "selector": "url: <part of url>" }
  { "action": "verify", "selector": "<selector>" }
- Always start with a "goto" step to the target URL.
- Use Playwright Role-based selectors when possible to match the platform's recording style.
- Format: role=<role>[name="<name>"] (e.g., role=textbox[name="Username"], role=button[name="Submit"]).
- If a role-based selector isn't clear, use IDs (#id) or names ([name="..."]).
- Generate between 4 and 12 steps total.

${elementContext ? `AVAILABLE ELEMENTS ON THE PAGE:\n${elementContext}\n` : ""}

FOR SECURITY TESTING GOALS:
- SQL Injection payloads: ' OR 1=1--, admin'--, ' OR '1'='1, 1' AND SLEEP(5)--
- XSS payloads: <script>alert('BOB_XSS')</script>, <img src=x onerror=alert('BOB_XSS')>
- Always inject into all visible input fields one by one before clicking submit.`;

    const userPrompt = `Target URL: ${url}
Goal: ${goal}

Return the JSON array of steps now:`;

    console.log(`🤖 [AI] Calling Ollama (${this.model}) at ${this.baseUrl}...`);

    const headers: any = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1, // Low temp = consistent, structured output
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";

    console.log(`🤖 [AI] Raw response:\n${content}`);

    // Extract JSON object — handles cases where LLM wraps it in ```json ... ```
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(
        `AI did not return a valid JSON object. Got: "${content.slice(0, 300)}"`
      );
    }

    let result: { name: string; steps: GeneratedStep[] };
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error(`Failed to parse AI-generated content as JSON: ${jsonMatch[0]}`);
    }

    if (!result.steps || !Array.isArray(result.steps) || result.steps.length === 0) {
      throw new Error("AI returned an empty or invalid steps array.");
    }

    console.log(`🤖 [AI] Generated ${result.steps.length} steps successfully.`);
    return result;
  }

  static async healSelector(action: string, oldSelector: string, domContext: string): Promise<string | null> {
    const systemPrompt = `You are Bob AI, an expert QA automation agent with self-healing capabilities.
A Playwright test step failed because a selector was not found on the page.

Action attempted: ${action}
Old (broken) selector: ${oldSelector}

Your job is to look at the provided DOM context and find the NEW valid Playwright string selector (e.g., role=button[name="Submit"]).
RETURN ONLY THE NEW SELECTOR STRING. No explanations, no markdown, no JSON, just the raw string. If you cannot find a replacement, return exactly the word: null`;

    const userPrompt = `DOM CONTEXT:\n${domContext}\n\nNew selector:`;

    console.log(`🤖 [AI] Calling Ollama (${this.model}) for self-healing...`);

    const headers: any = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          stream: false,
        }),
      });

      const data = await response.json();
      const newSelector = data.choices[0].message.content.trim();
      return newSelector === "null" ? null : newSelector;
    } catch (error) {
      console.error("AI Healing Error:", error);
      return null;
    }
  }
}
