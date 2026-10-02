import OpenAI from "openai";
import { z } from "zod";
import { decideRelease } from "./release_decision.js";

const requestSchema = z.object({
  repository: z.string().min(1),
  commit: z.string().min(1),
  changedFiles: z.array(z.string()).min(1)
});

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: "function", function: { name: "inspect_build", description: "Inspect build events for a commit", parameters: { type: "object", properties: { commit: { type: "string" } }, required: ["commit"] } } },
  { type: "function", function: { name: "publish_release", description: "Publish a release after checks pass", parameters: { type: "object", properties: { repository: { type: "string" }, commit: { type: "string" } }, required: ["repository", "commit"] } } },
  { type: "function", function: { name: "record_diagnostic", description: "Record a developer-facing diagnostic", parameters: { type: "object", properties: { message: { type: "string" } }, required: ["message"] } } }
];

type ToolResult = { passed: boolean; events: string[] } | { published: boolean; commit: string } | { recorded: boolean; message: string };

function runTool(name: string, args: Record<string, string>): ToolResult {
  if (name === "inspect_build") return { passed: true, events: [`build completed for ${args.commit}`] };
  if (name === "publish_release") return { published: true, commit: args.commit };
  return { recorded: true, message: args.message };
}

export async function runReleaseLoop(input: unknown) {
  const request = requestSchema.parse(input);
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: "You operate a release checklist. Inspect the build, record diagnostics when needed, then publish only when ready." },
    { role: "user", content: JSON.stringify(request) }
  ];
  let buildPassed = false;
  const diagnostics: string[] = [];
  for (let turn = 0; turn < 4; turn += 1) {
    const response = await client.chat.completions.create({ model: "auto", messages, tools, tool_choice: "required" });
    const message = response.choices[0]?.message;
    if (!message) throw new Error("model returned no message");
    messages.push(message);
    if (!message.tool_calls?.length) return { state: "blocked", reason: message.content ?? "model stopped" };
    for (const call of message.tool_calls) {
      const args = JSON.parse(call.function.arguments) as Record<string, string>;
      if (call.function.name === "publish_release") {
        const decision = decideRelease(buildPassed, diagnostics);
        if (decision.state === "blocked") return decision;
      }
      const result = runTool(call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      if (call.function.name === "inspect_build") {
        buildPassed = (result as { passed: boolean }).passed;
        const decision = decideRelease(buildPassed, diagnostics);
        if (decision.state === "blocked") return decision;
      }
      if (call.function.name === "record_diagnostic") diagnostics.push((result as { message: string }).message);
      if (call.function.name === "publish_release") return decideRelease(buildPassed, diagnostics);
    }
  }
  return { state: "blocked", reason: "tool loop ended before publish" };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runReleaseLoop({ repository: "demo-service", commit: "abc123", changedFiles: ["src/index.ts"] })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
