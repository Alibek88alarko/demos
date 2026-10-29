# Lead capture in n8n: form webhook, Google Sheets, OpenAI follow-up, Gmail, Telegram

One workflow, exported as `lead-capture-followup.workflow.json`. Import it into n8n (Workflows, Import from file), connect four credentials, fill three placeholders, activate.

```
contact form (webhook POST)
  -> Normalize lead (name, email, phone, message, received_at, lead_id)
  -> Has email?
       yes -> Save to Google Sheets -> Write follow-up (OpenAI) -> Send follow-up (Gmail) -> Notify me (Telegram)
       no  -> Notify me (Telegram): lead without email, nothing sent
```

What it does

- The webhook answers the form immediately (`onReceived`), so the website never waits for OpenAI or Gmail.
- Every lead gets a `lead_id` (the form's submission id if it sends one, otherwise a timestamp) and lands in the sheet before any email goes out, so the record exists even if a later step fails.
- The follow-up is 3 to 5 plain sentences in the language of the message, refers to one concrete detail from it, promises a reply within one business day, no prices or dates invented.
- Telegram gets the full lead and whether the email was sent. Leads without a valid email are not emailed and are flagged separately.
- Failures stay visible: a red execution in n8n with the failing node and its response, nothing is retried blindly. Turn on "Save failed executions" in workflow settings.

Setup (10 minutes)

1. Credentials: Google Sheets (OAuth2), OpenAI (API key), Gmail (OAuth2), Telegram (bot token from BotFather). Select them in the four nodes.
2. Google Sheet: create a sheet named `Leads` with the header row `lead_id, name, email, phone, message, received_at, business_name`. Put the spreadsheet id in "Save to Google Sheets".
3. Placeholders: `YOUR BUSINESS NAME` in "Normalize lead", `YOUR_TELEGRAM_CHAT_ID` in both Telegram nodes (send `/start` to your bot, then read the chat id from `https://api.telegram.org/bot<TOKEN>/getUpdates`).
4. Point your website form at the webhook URL (POST, JSON). Field names accepted: `name` or `full_name`, `email`, `phone`, `message` or `comment`, optional `submission_id`.
5. Test with `sample-request.sh`, then activate the workflow and switch the form to the production URL.

Tested cases

- Normal lead: row in the sheet, email received, Telegram message with "Follow-up email: sent".
- No email: no row, no email, Telegram message "Lead WITHOUT a valid email".
- Message in another language: the follow-up comes back in that language.
- Form sends the same submission twice: two rows with the same `lead_id`, easy to spot and filter; if the form provides a stable `submission_id`, swap "append" for "append or update" with `lead_id` as the matching column and duplicates disappear.

Cost: one OpenAI call per lead with gpt-4o-mini, well under a cent each.
