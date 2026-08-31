import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text('''
            SELECT column_name FROM information_schema.columns WHERE table_name = 'payment_events'
        '''))
        print([r[0] for r in res.fetchall()])

asyncio.run(main())
