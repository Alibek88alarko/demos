# Offline run: 20 sample enquiries (sample data)

Hand-labeled extractions stand in for the model. Everything after the model call is the real code.
The CRM stand-in fails the first two calls with 503 to exercise retries.

| # | Source | Tag | Score | Needs review | Why flagged | CRM | Duplicate |
|---|---|---|---|---|---|---|---|
| 1 | form | Hot | 100 | no |  | c1 | no |
| 2 | form | Cold | 25 | no |  | c2 | no |
| 3 | email | Medium | 45 | no |  | c3 | no |
| 4 | form | Hot | 70 | no |  | c4 | no |
| 5 | form | Cold | 0 | no |  | c5 | no |
| 6 | email | Hot | 85 | no |  | c6 | no |
| 7 | form | Cold | 20 | yes | phone: value not found in the enquiry, removed | c7 | no |
| 8 | form | Warm | 65 | no |  | c8 | no |
| 9 | form | Cold | 0 | yes | model confidence 0.30 below 0.6; no email or phone survived the checks | needs_review | no |
| 10 | email | Hot | 80 | no |  | c9 | no |
| 11 | form | Warm | 50 | yes | no email for CRM upsert | needs_review | no |
| 12 | form | Medium | 30 | yes | budget_usd: value not found in the enquiry, removed | c10 | no |
| 13 | form | Hot | 90 | no |  | c11 | no |
| 14 | email | Hot | 75 | no |  | c12 | no |
| 15 | form | Hot | 100 | no |  | c1 | yes |
| 16 | form | Hot | 80 | no |  | c13 | no |
| 17 | form | Cold | 0 | no |  | c14 | no |
| 18 | form | Warm | 65 | yes | no email for CRM upsert | needs_review | no |
| 19 | email | Warm | 55 | no |  | c15 | no |
| 20 | email | Warm | 55 | no |  | c15 | yes |

Model calls: 18 for 20 submissions (duplicates skip the model).
CRM calls: 17, contacts in CRM: 15.
Tags: Cold 5, Hot 7, Medium 2, Warm 4
