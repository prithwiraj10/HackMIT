# Freshman Flu live-call bridge

This isolated Python service implements the Deepgram outbound-telephony
architecture: Twilio originates a consented outbound call, streams 8 kHz
mulaw audio here, and this bridge streams it to/from the Deepgram Voice Agent.
The Next.js app proxies user actions to the bridge, so browser code never sees
provider credentials.

## One-time install

```bash
cd telephony-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Required `frontend/.env.local` values

```env
DEEPGRAM_API_KEY=...
OPENAI_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TELEPHONY_SERVICE_URL=http://127.0.0.1:8080
TELEPHONY_ENDPOINT_SECRET=replace-with-a-long-random-value
SERVER_EXTERNAL_URL=https://your-random-subdomain.trycloudflare.com
```

## Demo run order

Keep three terminals open:

1. Run the Next.js website on port 3002.
2. In this directory, activate the venv and run `python main.py`.
3. Run `npx wrangler tunnel quick-start http://localhost:8080`. Copy its HTTPS
   URL to `SERVER_EXTERNAL_URL` in `frontend/.env.local`, then restart the
   bridge. The bridge converts it to the required secure WebSocket URL for
   Twilio.

The Quick Tunnel is temporary: keep its terminal open for the call. Twilio
trial accounts can only call verified recipients and announce the trial.

## Attribution

This service began from Deepgram's MIT-licensed Outbound Telephony Agent
reference implementation and is adapted for Freshman Flu's student proxy
workflow. See `LICENSE`.
