from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Razorpay
    razorpay_key_id: str
    razorpay_key_secret: str
    razorpay_webhook_secret: str

    # Gemini
    gemini_api_key: str

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_topic_payment_events: str = "payment-events"
    kafka_topic_recovery_actions: str = "recovery-actions"

    # WhatsApp
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""

    # SendGrid
    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@revault.app"

    # ElevenLabs (blank = use gTTS fallback)
    elevenlabs_api_key: str = ""

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    websocket_secret: str = "change_me"

    # Feature flags
    feature_whatsapp_enabled: bool = True
    feature_voice_enabled: bool = True
    feature_email_enabled: bool = True

    # Compliance hard limits (can be overridden per merchant in DB)
    max_recovery_attempts: int = 3
    cooling_period_hours: int = 24
    contact_start_hour: int = 9    # 9 AM
    contact_end_hour: int = 21     # 9 PM

    # Twilio Integration
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""
    twilio_voice_number: str = ""
    your_personal_phone_number: str = ""
    ngrok_public_url: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
