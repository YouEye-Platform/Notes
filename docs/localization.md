# Interface localization

The interface follows the acting person's authenticated language, then the
instance default, then English. Use the existing profile-scoped header fetch;
never take a user ID from the browser or cache a person's locale globally.
`src/i18n/runtime.ts` resolves the request locale, `src/i18n/request.ts` loads
messages, and the root provider supplies the same locale to client components.
Changing HTML `lang` alone does not translate an interface.

Use next-intl `useTranslations` in synchronous components and `getTranslations`
in async server components. Every visible label, accessible name, placeholder,
empty/loading state and user-facing error needs a message key. Use complete
sentences with named ICU arguments and plurals. Use Intl/next-intl formatting
with the selected locale for dates, times and numbers. Product names and user
content are separate from interface messages.

Run `pnpm i18n:check`, `pnpm typecheck` and the applicable tests. The production
build runs catalogue and source checks. Every registered catalogue must contain
the English keys with matching ICU arguments and valid messages. The source
check rejects newly introduced visible literals; its checked-in baseline records
existing translation debt during conversion. Remove resolved entries. Do not
regenerate it to excuse untranslated new features. This heuristic does not
replace interface review, particularly for composed or dynamically supplied text.

To add a language, add its canonical code, native/English names and writing
direction to `src/i18n/languages.json`, and add a complete catalogue beside the
English catalogue. Keep the platform language registry and independently shipped
app registries in agreement for supported languages. Review translations in
context; copied English values are not translated coverage. Regional variants
can fall back to a shipped base language; unsupported values fall back to
English. Nested English fallback is recovery, not permission to ship incomplete
registered translations.

Test the installed authenticated app in every supported language, two accounts
with distinct preferences, clearing an override, instance fallback, navigation,
embedded views and returning to an already open app. Confirm editor state is
preserved when messages refresh. Check long text, accessibility labels, plurals,
dates and RTL layout where applicable. Direction metadata does not itself prove
RTL layout support. Profile denial/unavailability must preserve safe English
fallback, without leaking another person's language or caching private responses.

## Dynamic labels and locale changes

Status maps, success notices, helper return values, API/card fact labels and
confirmation consequences are interface text too. Resolve their translator in
the current component or authenticated request; do not freeze translated text
at module import. Keep a translator in the dependency list of callbacks and
computed labels that use it, so an open view uses the new language for its next
action without losing its draft. Use locale-aware relative times and units.

The source guard also checks `desc`, `confirmLabel`, `cancelLabel` and literal
success, notice and connection setters. This still does not discover every
composed or API-produced message. Review those paths and exercise actual rendered
responses. Prune resolved baseline entries only after the guard passes, without
adding or increasing exceptions. Product names, protocol identifiers and supplied
content retain their identity.
