import logging
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
) -> bool:
    """
    Sends a transactional email via SendGrid.
    Returns True on success, False on failure (never raises — callers
    use the return value to decide whether to fall back to WhatsApp).
    """
    if not settings.feature_email_enabled:
        logger.info("Email disabled — skipping to %s", to_email)
        return False

    message = Mail(
        from_email=(settings.sendgrid_from_email, "ReVault Recovery"),
        to_emails=(to_email, to_name),
        subject=subject,
        html_content=html_content,
    )
    try:
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)
        if response.status_code not in (200, 202):
            logger.warning("SendGrid returned status %s", response.status_code)
            return False
        return True
    except Exception:
        logger.exception("Failed to send email to %s", to_email)
        return False


def build_recovery_email(
    customer_name: str,
    amount_rupees: float,
    payment_link: str,
    reason: str,
) -> str:
    """Returns a clean HTML email body for payment recovery outreach."""
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a2e;">Action Required: Complete Your Payment</h2>
      <p>Dear {customer_name},</p>
      <p>
        Your recent payment of <strong>₹{amount_rupees:,.2f}</strong> could not be processed
        due to: <em>{reason}</em>.
      </p>
      <p>
        <a href="{payment_link}"
           style="background: #3b5bdb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          Complete Payment Now
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">
        This link expires in 24 hours. If you've already completed this payment, please ignore this email.
      </p>
      <p style="color: #999; font-size: 12px;">
        To opt out of these notifications, reply with "STOP".
      </p>
    </div>
    """
