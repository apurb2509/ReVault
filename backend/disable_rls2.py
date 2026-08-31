import asyncio
from db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE b2b_invoices DISABLE ROW LEVEL SECURITY"))
        await conn.execute(text("ALTER TABLE ptp_records DISABLE ROW LEVEL SECURITY"))
        print("Disabled RLS on b2b_invoices and ptp_records")

asyncio.run(main())
