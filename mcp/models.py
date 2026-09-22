"""Read-only mirror of the tables this connector reads.

This service deploys on its own (Railway root directory ``mcp/``) and therefore
cannot import the main app's ``backend/models.py``. What lives here is the same
three tables with the same column names, and no ``create_all()`` anywhere -
this service never creates or migrates a schema, it only reads the one the main
app owns.

The main app uses SQLModel, which names each table after its class in lower
case (``BucketItem`` -> ``bucketitem``). Its enum columns (type, status) are
Postgres enums; they are mirrored as strings, which is how they read back.

If a column or table is ever renamed in backend/models.py, mirror the rename
here and run ``python mcp/check_schema.py``.
"""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

ITEM_TYPES = ['country', 'region', 'city', 'activity']
ITEM_STATUSES = ['wishlist', 'done']
TRIP_STATUSES = ['idea', 'planning', 'booked', 'completed']


class BucketItem(db.Model):
    __tablename__ = 'bucketitem'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    type = db.Column(db.String, nullable=False)
    status = db.Column(db.String, nullable=False)
    description = db.Column(db.String)
    created_at = db.Column(db.DateTime, nullable=False)


class VisitedCountry(db.Model):
    __tablename__ = 'visitedcountry'
    id = db.Column(db.Integer, primary_key=True)
    country_code = db.Column(db.String)       # ISO alpha-2
    country_name = db.Column(db.String, nullable=False)
    visited_at = db.Column(db.Date)
    notes = db.Column(db.String)
    created_at = db.Column(db.DateTime, nullable=False)


class TripPlan(db.Model):
    __tablename__ = 'tripplan'
    id = db.Column(db.Integer, primary_key=True)
    destination = db.Column(db.String, nullable=False)
    travel_date = db.Column(db.Date)
    ticket_price = db.Column(db.Float)
    accommodation_price = db.Column(db.Float)
    notes = db.Column(db.String)
    status = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)
