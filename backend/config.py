from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Razorpay
    razorpay_key_id: str
    razorpay_key_secret: str
    razorpay_webhook_secret: str

    # LLM Providers
    gemini_api_key: str
    openai_api_key: str = ""
    groq_api_key: str = ""

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Kafka
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_sasl_username: str = ""
    kafka_sasl_password: str = ""
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

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Twilio Integration
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = ""
    twilio_voice_number: str = ""
    your_personal_phone_number: str = ""
    ngrok_public_url: str = ""
    startup_live_test: bool = False

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
