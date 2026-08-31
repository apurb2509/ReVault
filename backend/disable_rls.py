import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE recovery_actions DISABLE ROW LEVEL SECURITY;'))
        await conn.execute(text('ALTER TABLE payment_events DISABLE ROW LEVEL SECURITY;'))
        print('RLS disabled.')

asyncio.run(main())
