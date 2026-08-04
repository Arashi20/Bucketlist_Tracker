import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import TripPlan, TripPlanCreate, TripPlanUpdate, TripPlanRead, TripStatus
from database import get_session

router = APIRouter(prefix="/trips", tags=["trips"])


@router.get("/", response_model=list[TripPlanRead])
async def get_trips(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(TripPlan))
    trip_list = result.scalars().all()

    today = datetime.date.today()
    stale = [
        trip for trip in trip_list
        if trip.travel_date and trip.travel_date < today and trip.status != TripStatus.completed
    ]
    if stale:
        for trip in stale:
            trip.status = TripStatus.completed
            session.add(trip)
        await session.commit()
        for trip in stale:
            await session.refresh(trip)

    return trip_list


@router.post("/", response_model=TripPlanRead)
async def create_trip(
    trip: TripPlanCreate, session: AsyncSession = Depends(get_session)
):
    db_trip = TripPlan.from_orm(trip)
    session.add(db_trip)
    await session.commit()
    await session.refresh(db_trip)
    return db_trip


@router.patch("/{trip_id}", response_model=TripPlanRead)
async def update_trip(
    trip_id: int, update: TripPlanUpdate, session: AsyncSession = Depends(get_session)
):
    trip = await session.get(TripPlan, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(trip, field, value)
    session.add(trip)
    await session.commit()
    await session.refresh(trip)
    return trip


@router.delete("/{trip_id}")
async def delete_trip(
    trip_id: int, session: AsyncSession = Depends(get_session)
):
    trip = await session.get(TripPlan, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    await session.delete(trip)
    await session.commit()
    return {"ok": True}
