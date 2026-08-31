import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text('''
            SELECT relname, relrowsecurity FROM pg_class 
            WHERE relname IN ('b2b_invoices', 'ptp_records')
        '''))
        print(res.fetchall())

asyncio.run(main())
