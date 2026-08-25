import asyncio
import os
import sys
import uuid
import logging
import httpx
from datetime import datetime
from dotenv import load_dotenv

# Load .env BEFORE importing backend modules that rely on config
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from db.supabase_client import supabase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_scenario():
    if not supabase:
        logger.error("Supabase not configured. Cannot run scenario.")
        return
        
    logger.info("Starting live scenario trigger...")
    
    batch_id = str(uuid.uuid4())
    record = {
        "id": batch_id,
        "name": "Live Scenario Test",
        "description": "Triggering Razorpay APIs to test end-to-end recovery",
        "status": "RUNNING",
        "total_failed_amount": 250000,
        "recovered_amount": 0,
        "cost_incurred": 0
    }
    supabase.table("batch_runs").insert(record).execute()
    logger.info(f"Created batch run {batch_id}")
    
    # Simulate a failed payment webhook
    payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_{uuid.uuid4().hex[:14]}",
                    "amount": 250000,
                    "currency": "INR",
                    "status": "failed",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Insufficient funds in bank account",
                    "error_reason": "insufficient_funds",
                    "customer_id": f"cust_{uuid.uuid4().hex[:14]}",
                    "contact": "+919876543210"
                }
            }
        }
    }
    
    logger.info("Sending payment.failed webhook to Gateway...")
    async with httpx.AsyncClient() as client:
        try:
            await client.post("http://localhost:8080/webhooks/razorpay", json=payload)
            logger.info("Webhook sent successfully.")
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")
            
    logger.info("Scenario triggered successfully.")

if __name__ == "__main__":
    asyncio.run(run_scenario())
