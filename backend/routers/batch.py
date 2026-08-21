from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any

from db.database import get_db

router = APIRouter(prefix="/api/batch", tags=["batch"])

@router.get("/history")
async def get_batch_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("""
        SELECT * FROM batch_runs ORDER BY started_at DESC LIMIT 10
    """))
    runs = result.fetchall()
    
    out = []
    for r in runs:
        out.append({
            "id": str(r.id),
            "started_at": r.started_at.isoformat(),
            "completed_at": r.completed_at.isoformat(),
            "total_records": r.total_records,
            "total_at_risk": r.total_at_risk,
            "total_recovered": r.total_recovered,
            "recovery_rate": r.recovery_rate,
            "classifier_accuracy": r.classifier_accuracy,
            "compliance_violations": r.compliance_violations,
            "escalations_correct": r.escalations_correct,
            "escalations_total": r.escalations_total
        })
    return out
