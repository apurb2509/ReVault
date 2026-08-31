import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text('''
            SELECT executed_at FROM recovery_actions 
            WHERE event_id IN (SELECT id FROM payment_events WHERE failure_cause = 'MANDATE_AUTH_DROP')
            ORDER BY executed_at DESC LIMIT 10
        '''))
        for r in res.fetchall():
            print(r[0])

asyncio.run(main())
