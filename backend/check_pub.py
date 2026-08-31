import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text('''
            SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
        '''))
        print([r[0] for r in res.fetchall()])

asyncio.run(main())
