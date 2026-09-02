import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import async_session
from sqlalchemy import text

async def main():
    seed_file = os.path.join(os.path.dirname(__file__), "seed.sql")
    if not os.path.exists(seed_file):
        print(f"Seed file not found at {seed_file}")
        return
        
    with open(seed_file, "r") as f:
        sql = f.read()
        
    async with async_session() as session:
        # PostgreSQL syntax to run multiple statements at once or we can split
        # but sqlalchemy handles it or asyncpg handles it directly via execute
        try:
            await session.execute(text(sql))
            await session.commit()
            print("Successfully seeded the database with B2B invoices.")
        except Exception as e:
            print(f"Error seeding database: {e}")
            await session.rollback()

if __name__ == "__main__":
    asyncio.run(main())
