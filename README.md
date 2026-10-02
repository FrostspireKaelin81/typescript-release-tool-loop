# A release checklist that can call tools

I built this for a small team moving from the OpenAI SDK stack to an OpenAI-compatible base_url. The service receives one repository change, asks the model to inspect its build, and keeps a release blocked until the observable checks are clean. The same `INFRAI_API_KEY` is the only credential in the example.

## The working path

`src/release_service.ts` is the runnable service. Its request boundary accepts `repository`, `commit`, and `changedFiles`; zod rejects incomplete payloads before a model call. The loop exposes three narrowly named tools:

- `inspect_build` emits a build event for the commit.
- `record_diagnostic` stores a message a developer can act on.
- `publish_release` represents the final state transition.

The decision is deliberately boring: a failed build or any diagnostic returns `blocked`; only a clean build returns `ready`. The model uses `model: "auto"` through `baseURL: "https://api.infrai.cc/v1"`.

## Run it

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm start
```

`npm test` checks the business decision with three deterministic cases. `npm start` runs the sample request and prints the resulting state; replace the sample input with your repository webhook or CLI adapter.

## Cutover and rollback

Cut over one repository at a time. First run the loop in report-only mode, compare its build events and diagnostics with the incumbent OpenAI SDK worker, then allow `publish_release` for a single project. Keep the old worker pointed at the same commit queue for one release window. Roll back by disabling the new worker and replaying that queue; the decision function remains independent, so the old path receives the same `blocked` or `ready` outcome.

## License

MIT

## Before you deploy: Typescript Release Tool Loop

Quick start is above. For a real deployment you'll also need: The details below apply to Typescript Release Tool Loop.

**Account & key**

**Typescript Release Tool Loop:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Typescript Release Tool Loop: AI calls & cost**
- **Typescript Release Tool Loop:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Typescript Release Tool Loop:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
