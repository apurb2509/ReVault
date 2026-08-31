import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import webhooks, events
from services.degradation_monitor import DegradationMonitor
from tools.razorpay_client import RazorpayClient
from routers.events import broadcaster

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
settings = get_settings()


async def rca_trigger(segment: dict, current_payments: list[dict]) -> None:
    # Triggers RCA specifically for degradation events.
    # In a full app, this would enqueue an event to the LangGraph flow.
    logger.info("RCA trigger fired for segment: %s", segment)


async def trigger_live_test_startup():
    import asyncio
    await asyncio.sleep(10)
    logger.info("Executing automated Startup Live Test for WhatsApp...")
    
    from routers.realtime import TriggerEventRequest, process_realtime_event
    from db.database import async_session
    
    req = TriggerEventRequest(
        event_type="payment.failed",
        customer_name="Apurb",
        phone_number=settings.your_personal_phone_number,
        amount=250000,
        failure_cause="INSUFFICIENT_FUNDS"
    )
    
    try:
        async with async_session() as db:
            await process_realtime_event(req, db)
    except Exception as e:
        logger.error(f"Startup live test failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ReVault API...")
    
    # Initialize background degradation monitor
    rzp = RazorpayClient()
    monitor = DegradationMonitor(rzp, broadcaster, rca_trigger)
    monitor.start()

    import asyncio
    if settings.startup_live_test:
        asyncio.create_task(trigger_live_test_startup())

    yield
    
    logger.info("Shutting down ReVault API...")
    monitor.stop()


app = FastAPI(
    title="ReVault API",
    description="Autonomous AI Revenue Recovery Operating System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import api, webhooks, twilio_voice, events, batch, realtime

app.include_router(api.router)
app.include_router(webhooks.router)
app.include_router(twilio_voice.router)
app.include_router(events.router)
app.include_router(batch.router)
app.include_router(realtime.router)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}

