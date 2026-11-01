# Timeline collection

All activity producers must use `api.postTimelineEntry`, which delegates to the
shared local `postAdmittedTimeline` helper. The helper captures the event time
before reading the signed-in account’s fresh collection preference. Off, missing,
unknown, denied or pre-interval state sends no payload. Enabled events carry the
exact `collection_revision` returned by the platform.

Do not cache consent, persist pending Timeline payloads, or retry rejected events
after re-enable. Preserve original event times. App-owned records are separate
from optional Timeline collection. The platform independently enforces permission,
account admission and collection at commit; a producer precheck is not authority.

Capture the action timestamp before any asynchronous locale lookup or other
enrichment. Every emitter accepts an optional final ISO timestamp argument for
callers that already know an earlier action time; otherwise it captures the time
on entry. Carry that timestamp unchanged to the admission helper. Translating
an old action after collection is enabled must never make it a new action.
Request handlers capture this time before their first await and pass it through
database work to the note creation or edit emitter.

`tests/timeline-consent.spec.mjs` covers denied/off/unknown/old-interval behavior
and exact-revision submission without retry. `tests/timeline-emitter-consent.spec.mjs`
pauses authentication and locale lookup in the real routes and emitters, changes
consent before resuming, and checks the real admission helper's decision and
original request timestamp. Installed
journeys and update or recovery compatibility require separate runtime acceptance.
