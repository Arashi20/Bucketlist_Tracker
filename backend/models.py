from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
import datetime


class ItemType(str, Enum):
    country = "country"
    region = "region"
    city = "city"
    activity = "activity"


class ItemStatus(str, Enum):
    wishlist = "wishlist"
    done = "done"


class BucketItemBase(SQLModel):
    name: str
    type: ItemType
    status: ItemStatus = ItemStatus.wishlist
    description: Optional[str] = None


class BucketItem(BucketItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


class BucketItemCreate(BucketItemBase):
    pass


class BucketItemUpdate(SQLModel):
    name: Optional[str] = None
    type: Optional[ItemType] = None
    status: Optional[ItemStatus] = None
    description: Optional[str] = None


class BucketItemRead(BucketItemBase):
    id: int
    created_at: datetime.datetime


# --- Visited Countries (Scratch Map) ---

class VisitedCountryBase(SQLModel):
    country_code: Optional[str] = None  # ISO alpha-2
    country_name: str
    visited_at: Optional[datetime.date] = None
    notes: Optional[str] = None


class VisitedCountry(VisitedCountryBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


class VisitedCountryCreate(VisitedCountryBase):
    pass


class VisitedCountryUpdate(SQLModel):
    visited_at: Optional[datetime.date] = None
    notes: Optional[str] = None


class VisitedCountryRead(VisitedCountryBase):
    id: int
    created_at: datetime.datetime


# --- Trip Plans ---

class TripStatus(str, Enum):
    idea = "idea"
    planning = "planning"
    booked = "booked"
    completed = "completed"


class TripPlanBase(SQLModel):
    destination: str
    travel_date: Optional[datetime.date] = None
    ticket_price: Optional[float] = None
    accommodation_price: Optional[float] = None
    notes: Optional[str] = None
    status: TripStatus = TripStatus.idea


class TripPlan(TripPlanBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)


class TripPlanCreate(TripPlanBase):
    pass


class TripPlanUpdate(SQLModel):
    destination: Optional[str] = None
    travel_date: Optional[datetime.date] = None
    ticket_price: Optional[float] = None
    accommodation_price: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[TripStatus] = None


class TripPlanRead(TripPlanBase):
    id: int
    created_at: datetime.datetime
