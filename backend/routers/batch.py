"""
Batch API Router
Provides endpoints to view batch run history and trigger new batch runs.
"""
import asyncio
import subprocess
import sys
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db

router = APIRouter(prefix="/api/batch", tags=["batch"])


@router.get("/history")
async def get_batch_history(db: AsyncSession = Depends(get_db)) -> list[dict[str, Any]]:
    """Returns the last 10 batch run summaries."""
    result = await db.execute(text("""
        SELECT * FROM batch_runs ORDER BY started_at DESC LIMIT 10
    """))
    runs = result.fetchall()

    return [
        {
            "id": str(r.id),
            "started_at": r.started_at.isoformat(),
            "completed_at": r.completed_at.isoformat(),
            "total_records": r.total_records,
            "total_at_risk": r.total_at_risk or 0,
            "total_recovered": r.total_recovered or 0,
            "recovery_rate": r.recovery_rate or 0.0,
            "compliance_violations": r.compliance_violations,
            "escalations_correct": r.escalations_correct,
            "escalations_total": r.escalations_total,
        }
        for r in runs
    ]


@router.post("/trigger")
async def trigger_batch(background_tasks: BackgroundTasks) -> dict[str, str]:
    """
    Triggers a new batch run in the background.
    Returns immediately — poll /api/batch/history for results.
    """
    batch_script = Path(__file__).parent.parent / "batch" / "batch_runner.py"

    def _run_batch() -> None:
        try:
            subprocess.run(
                [sys.executable, str(batch_script)],
                cwd=str(batch_script.parent.parent),
                check=True,
                capture_output=False,
            )
        except subprocess.CalledProcessError as exc:
            import logging
            logging.getLogger(__name__).error("Batch run failed: %s", exc)

    background_tasks.add_task(_run_batch)
    return {"status": "triggered", "message": "Batch run started. Poll /api/batch/history for results."}

@router.get("/export-full")
async def export_full_database(db: AsyncSession = Depends(get_db)):
    import io
    import csv
    from fastapi.responses import StreamingResponse

    query = """
        SELECT 
            p.id as event_id,
            p.event_type,
            p.amount,
            p.failure_cause,
            p.received_at,
            r.module,
            r.action_type,
            r.outcome
        FROM payment_events p
        LEFT JOIN recovery_actions r ON p.id = r.event_id
        ORDER BY p.received_at DESC
        LIMIT 10000
    """

    result = await db.execute(text(query))
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Event Type", "Amount", "Failure Cause", 
        "Received At", "Recovery Module", "Action Type", "Outcome"
    ])
    
    for row in result:
        writer.writerow(row)
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=revault_full_database.csv"}
    )
