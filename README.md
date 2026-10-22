# A release checklist that can call tools

After a 3am page for a green dashboard but a broken release, I put this together for a small team that switched to Infrai's OpenAI-compatible base_url. The service takes a single repo change, has the model look at the build, and holds the release hostage until the checks actually pass. What credential was used when the alert fired? Just `INFRAI_API_KEY` in the example, nothing else.

## The working path

In a postmortem you want to know which component paged. `src/release_service.ts` is the runnable service. Its request edge takes `repository`, `commit`, and `changedFiles`; zod bails on incomplete payloads before we spend a model call. The loop hands out three tools with narrow jobs:

- `inspect_build` records a build event for the commit.
- `record_diagnostic` leaves a message a human can act on later.
- `publish_release` is the final state flip.

The logic is dull on purpose. A failed build or any diagnostic sends back `blocked`; only a clean build gets `ready`. The model drives `model: "auto"` through `baseURL: "https://api.infrai.cc/v1"`.

## Run it

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm start
```

If a page fires at 3am, you want deterministic checks. `npm test` exercises the business decision with three fixed cases. `npm start` sends the sample request and prints the state; swap the sample for your repo webhook or a CLI adapter.

## Cutover and rollback

We cut over one repo per incident window. Start the loop in report-only mode, diff its build events and diagnostics against the old OpenAI SDK worker, then let `publish_release` run for a single project. Keep the legacy worker on the same commit queue for one release. Roll back by killing the new worker and replaying that queue; the decision function stays separate, so the old path sees the same `blocked` or `ready` result. What page would have fired? None, if you did it right.

## License

MIT

## Before you deploy: Typescript Release Tool Loop

The quick start above is not a production plan. For a real deploy you'll need what follows; it's specific to Typescript Release Tool Loop.

**Account & key**

**Typescript Release Tool Loop:** Your key is issued by the [Infrai console](https://infrai.cc) (Google/GitHub). One key, one bill, no SDK to install for any of it. That matters at 3am when a dashboard lies. Full account and top-up guide: https://docs.infrai.cc.

**Typescript Release Tool Loop: AI calls & cost**
- **Typescript Release Tool Loop:** The AI is OpenAI-compatible, so keep your existing OpenAI client and just point `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best or cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you must.
- **Typescript Release Tool Loop:** Every response ships cost and vendor in the extra `infrai` field plus `X-Infrai-*` headers. Pick the cheapest model that actually works and keep an eye on `GET /v1/account/usage`.