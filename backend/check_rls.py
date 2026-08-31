import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text('''
            SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'recovery_actions'
        '''))
        print('RLS status:', res.fetchall())

asyncio.run(main())
