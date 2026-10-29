#!/usr/bin/env bash
# Test the workflow: replace the URL with your n8n webhook URL (Test URL while building, Production URL after activation).
curl -sS -X POST "https://YOUR-N8N-HOST/webhook/contact-form" \
  -H "Content-Type: application/json" \
  -d '{"submission_id":"form-1001","name":"Dana Smith","email":"dana@example.com","phone":"+1 555 0100","message":"Hi, we need a quote for a kitchen remodel in March, about 20 sqm. Do you work with IKEA cabinets?"}'
echo
# Edge cases worth sending once: no email (goes to the no-email branch), empty message, a message in another language.
curl -sS -X POST "https://YOUR-N8N-HOST/webhook/contact-form" -H "Content-Type: application/json" \
  -d '{"submission_id":"form-1002","name":"No Email Person","phone":"+1 555 0101","message":"Call me please"}'
echo
