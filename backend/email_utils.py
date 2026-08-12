"""
Minimal email abstraction.

By default this just prints the email to the console/log — there's no SMTP
or transactional-email provider wired up. That's fine for local development,
but before deploying anywhere real, replace send_email()'s body with a call
to an actual provider, for example:

    - Flask-Mail (SMTP)          https://flask-mail.readthedocs.io
    - SendGrid                   https://github.com/sendgrid/sendgrid-python
    - AWS SES (boto3)            https://boto3.amazonaws.com
    - Postmark / Mailgun         (both have simple REST APIs)

Every call site in app.py already has the full email body ready to go —
you only need to change what happens inside send_email().
"""
import sys


def send_email(to: str, subject: str, body: str):
    print("\n----- DEV EMAIL (not actually sent) -----", file=sys.stderr)
    print(f"To: {to}", file=sys.stderr)
    print(f"Subject: {subject}", file=sys.stderr)
    print(body, file=sys.stderr)
    print("------------------------------------------\n", file=sys.stderr)
