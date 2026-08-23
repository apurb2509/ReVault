import asyncio
import logging
from sqlalchemy import text
from db.database import engine

logging.basicConfig(level=logging.INFO)

async def enable_realtime():
    async with engine.begin() as conn:
        try:
            # Check if publication exists (Supabase creates it by default)
            await conn.execute(text("ALTER PUBLICATION supabase_realtime ADD TABLE payment_events, recovery_actions;"))
            logging.info("Successfully added tables to supabase_realtime publication.")
        except Exception as e:
            logging.error(f"Could not alter publication: {e}")
            # If publication doesn't exist, create it
            try:
                await conn.execute(text("CREATE PUBLICATION supabase_realtime FOR TABLE payment_events, recovery_actions;"))
                logging.info("Created supabase_realtime publication and added tables.")
            except Exception as e2:
                logging.error(f"Could not create publication: {e2}")

if __name__ == "__main__":
    asyncio.run(enable_realtime())
