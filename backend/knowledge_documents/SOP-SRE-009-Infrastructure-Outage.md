# Suspected IT Infrastructure Outage
Category: Cloud Infrastructure
Approval: Assessment sample procedure; replace with the organization's approved incident-response runbook before production use.

## Steps
1. Capture the affected service, error text, start time, business impact and number of affected users.
2. Check only approved status dashboards and monitoring sources. Do not infer an outage from one employee report alone.
3. If multiple critical services are unavailable or monitoring confirms a major incident, notify the on-call infrastructure/SRE team using the approved escalation route.
4. Preserve relevant timestamps and diagnostic evidence while avoiding secrets, tokens and personal data in logs.
5. Do not restart production services, change database capacity, alter network settings or run destructive commands unless an authorized runbook and responsible operator approve the action.
6. Keep the incident open until the responsible team verifies recovery.
