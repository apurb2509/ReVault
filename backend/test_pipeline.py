import asyncio
import urllib.request
import json
from datetime import datetime
from db.database import engine
from sqlalchemy import text

async def main():
    print("1. Sending HTTP Request...")
    req = urllib.request.Request(
        'http://localhost:8000/api/realtime/trigger',
        data=json.dumps({
            'event_type': 'payment.failed',
            'customer_name': 'Kavya Nair',
            'phone_number': '+919999999999',
            'amount': 299900,
            'failure_cause': 'MANDATE_AUTH_DROP'
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        res = urllib.request.urlopen(req)
        print("HTTP SUCCESS:", res.read().decode())
    except Exception as e:
        print("HTTP ERROR:", getattr(e, 'read', lambda: str(e))())
        return

    await asyncio.sleep(1) # wait for db

    print("2. Checking Database...")
    async with engine.begin() as conn:
        res = await conn.execute(text('''
            SELECT id, module, action_type, outcome, agent_reasoning, executed_at 
            FROM recovery_actions 
            WHERE event_id IN (
                SELECT id FROM payment_events WHERE failure_cause = 'MANDATE_AUTH_DROP'
            )
            ORDER BY executed_at DESC LIMIT 1
        '''))
        row = res.fetchone()
        if row:
            print("DB ROW FOUND:")
            print(f"id: {row[0]}")
            print(f"module: {row[1]}")
            print(f"action: {row[2]}")
            print(f"outcome: {row[3]}")
            print(f"reasoning: {row[4]}")
            print(f"executed_at: {row[5]}")
        else:
            print("DB ROW NOT FOUND!")

asyncio.run(main())
