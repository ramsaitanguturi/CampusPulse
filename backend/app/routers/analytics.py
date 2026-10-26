from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.schemas import QueryExecutionResult
from ..services.campus_service import CampusService

router = APIRouter(prefix="/analytics", tags=["DBMS Analytics & Viva Showcase"])

@router.get("/queries")
def list_available_queries():
    """
    Returns catalogue of SQL demonstration queries for DBMS viva.
    """
    return [
        {
            "id": "multi_table_join",
            "title": "Multi-Table 4-Way Join",
            "category": "JOINS",
            "concept": "INNER JOIN across Bookings, Rooms, Buildings, Users with filtering and ORDER BY"
        },
        {
            "id": "aggregation_groupby",
            "title": "Building Room Capacity & Active Tickets Summary",
            "category": "AGGREGATION",
            "concept": "COUNT, SUM, AVG functions with non-inflating pre-aggregated subqueries"
        },
        {
            "id": "not_exists_availability",
            "title": "Subquery with NOT EXISTS",
            "concept": "Correlated NOT EXISTS subquery checking for zero overlapping bookings",
            "category": "SUBQUERIES"
        },
        {
            "id": "correlated_subquery",
            "title": "Correlated Capacity Subquery",
            "concept": "Subquery comparing each room to the average room capacity of its specific building",
            "category": "SUBQUERIES"
        },
        {
            "id": "view_query",
            "title": "SQL View Query (v_dashboard_summary)",
            "concept": "Querying normalized database view created during schema DDL initialization",
            "category": "VIEWS"
        }
    ]

@router.post("/execute/{query_id}", response_model=QueryExecutionResult)
def execute_query(query_id: str, db: Session = Depends(get_db)):
    """
    Executes a DBMS demonstration query in real time, calculating execution speed and returning tabular records.
    Returns 404 for unknown query IDs instead of fallback.
    """
    try:
        return CampusService.execute_analytics_query(db, query_id)
    except KeyError as ke:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ke).strip("'\"")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database query execution failed. Please verify query parameters."
        )
