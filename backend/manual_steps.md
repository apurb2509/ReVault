# Manual Twilio Webhook Setup

Since your `.env` is already configured with your Twilio API credentials and Ngrok, there is only **ONE** manual step you need to do to complete the real-time setup:

## Configure the Twilio Webhook URL
When a user replies to the AI's WhatsApp message, Twilio needs to forward that reply to ReVault.

1. Go to your **Twilio Console**.
2. Navigate to **Messaging > Senders > WhatsApp Senders**.
3. Click on your WhatsApp Number.
4. Scroll down to the **"Webhook"** section under *When a message comes in*.
5. Paste your exact Ngrok URL followed by `/api/twilio/whatsapp`.
   *(Example: `https://abcd-123.ngrok-free.app/api/twilio/whatsapp`)*
6. Ensure the method is set to **HTTP POST**.
7. Click Save!

That's it! Everything else is automated.
