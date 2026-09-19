# Freshman Flu MVP: scoped implementation notes

## Deliberately hardcoded demo content

- Location is MIT, Boston, and Cambridge. MIT Medical is mentioned only as a routing suggestion; no phone number, live directory, or appointment system is connected.
- Nearby food spots (Clover Food Lab, Caffè Nero, Life Alive, and Saloniki), food descriptions, and symptom-to-food categories are static demo recommendations.
- The two seeded accounts are `Student / demo` (120 credits) and `Volunteer / demo` (40 credits).
- Canvas assignments and prioritization labels are illustrative. There is no Canvas connection, account, OAuth, or live deadlines.
- The initial syllabus text in the Academic Navigator is representative. The supplied MIT syllabus can be uploaded through the running app.
- Forum seed content is example content.

## MVP simplifications

- Authentication is intentionally bare-bones local name/password lookup. Passwords are plaintext because this is a local demo only.
- SQLite is local at `data/freshman-flu.db`; it is not a multi-device service or production database.
- Credits are mock in-app balances. Claiming an open food request transfers credits immediately; there are no real payments, refunds, delivery dispatch, or Fragment integration.
- Food guidance is general and categorical only. It does not diagnose illness, prescribe treatment, set dosage, or replace medical care.
- The PDF path extracts text with `pdf-parse`. If extraction fails, paste-text remains available. Scanned PDFs without embedded text may need the fallback.
- Academic analysis uses OpenAI when `OPENAI_API_KEY` is present; otherwise a transparent local rule-based fallback powers the exact same interface. It only summarizes policy language and should be reviewed against the syllabus.
- The voice screen works as browser text-to-speech without keys. `DEEPGRAM_API_KEY` marks the live provider ready, but full real-time microphone streaming is intentionally left as the next integration step.
- The optional Twilio call button makes a real outbound text-to-speech call only after explicit on-screen confirmation. It needs Twilio credentials and a public HTTPS URL (for example, ngrok). Trial accounts can call verified recipients only and play Twilio's trial disclosure.
- Check-in trends are a basic per-account history list, not a medical tracker or diagnostic chart.
- Community search filters local post text/symptom labels. It does not use Elasticsearch, recommendations, moderation, reporting, or notifications.

## API credentials

Add credentials only to `.env`, never to source control or chat:

```env
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
DEEPGRAM_AGENT_ID= # optional; not required by this MVP
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PUBLIC_URL=
```
