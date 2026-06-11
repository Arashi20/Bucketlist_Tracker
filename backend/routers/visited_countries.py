from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import VisitedCountry, VisitedCountryCreate, VisitedCountryUpdate, VisitedCountryRead
from database import get_session

router = APIRouter(prefix="/visited-countries", tags=["visited-countries"])


@router.get("/", response_model=list[VisitedCountryRead])
async def get_visited_countries(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(VisitedCountry))
    return result.scalars().all()


@router.post("/", response_model=VisitedCountryRead)
async def create_visited_country(
    country: VisitedCountryCreate, session: AsyncSession = Depends(get_session)
):
    db_country = VisitedCountry.from_orm(country)
    session.add(db_country)
    await session.commit()
    await session.refresh(db_country)
    return db_country


@router.patch("/{country_id}", response_model=VisitedCountryRead)
async def update_visited_country(
    country_id: int,
    update: VisitedCountryUpdate,
    session: AsyncSession = Depends(get_session),
):
    country = await session.get(VisitedCountry, country_id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(country, field, value)
    session.add(country)
    await session.commit()
    await session.refresh(country)
    return country


@router.delete("/{country_id}")
async def delete_visited_country(
    country_id: int, session: AsyncSession = Depends(get_session)
):
    country = await session.get(VisitedCountry, country_id)
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    await session.delete(country)
    await session.commit()
    return {"ok": True}
