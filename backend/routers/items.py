from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from models import BucketItem, BucketItemCreate, BucketItemUpdate, BucketItemRead
from database import get_session

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=list[BucketItemRead])
async def get_items(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(BucketItem))
    return result.scalars().all()


@router.post("/", response_model=BucketItemRead)
async def create_item(item: BucketItemCreate, session: AsyncSession = Depends(get_session)):
    db_item = BucketItem.from_orm(item)
    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)
    return db_item


@router.patch("/{item_id}", response_model=BucketItemRead)
async def update_item(item_id: int, update: BucketItemUpdate, session: AsyncSession = Depends(get_session)):
    item = await session.get(BucketItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for field, value in update.dict(exclude_unset=True).items():
        setattr(item, field, value)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/{item_id}")
async def delete_item(item_id: int, session: AsyncSession = Depends(get_session)):
    item = await session.get(BucketItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await session.delete(item)
    await session.commit()
    return {"ok": True}
