"""The read queries behind every tool and endpoint.

Nothing in this module writes: it issues SELECTs and shapes the rows into JSON.
Both the MCP tools and the REST endpoints call these functions, so the two
surfaces can never drift apart.
"""

from collections import Counter

from config import TIMEZONE_NAME, today_local
from models import (
    ITEM_STATUSES,
    ITEM_TYPES,
    TRIP_STATUSES,
    BucketItem,
    TripPlan,
    VisitedCountry,
)

DEFAULT_ITEM_LIMIT = 200
DEFAULT_COUNTRY_LIMIT = 300
DEFAULT_TRIP_LIMIT = 100
MAX_LIMIT = 500


def iso(value):
    """Serialize a stored date or (naive UTC) datetime."""
    return value.isoformat() if value is not None else None


def clamp_int(raw, default, minimum=1, maximum=MAX_LIMIT):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, value))


def clean_str(raw):
    """A usable filter string, or None."""
    if not isinstance(raw, str):
        return None
    raw = raw.strip()
    return raw or None


def pick(raw, allowed):
    """A filter value if it is one the app knows, otherwise None (no filter)."""
    raw = clean_str(raw)
    return raw.lower() if raw and raw.lower() in allowed else None


def _norm(name):
    return (name or '').strip().casefold()


# --------------------------------------------------------------------------
# Bucketlist
# --------------------------------------------------------------------------

def serialize_item(item):
    return {
        'id': item.id,
        'name': item.name,
        'type': item.type,
        'status': item.status,
        'description': item.description,
        'created_at': iso(item.created_at),
    }


def collect_bucketlist(status=None, item_type=None, search=None, limit=DEFAULT_ITEM_LIMIT):
    """Bucketlist items plus progress, optionally filtered."""
    all_items = BucketItem.query.order_by(BucketItem.created_at.desc(), BucketItem.id.desc()).all()

    status, item_type, search = pick(status, ITEM_STATUSES), pick(item_type, ITEM_TYPES), clean_str(search)
    items = all_items
    if status:
        items = [i for i in items if i.status == status]
    if item_type:
        items = [i for i in items if i.type == item_type]
    if search:
        needle = search.casefold()
        items = [i for i in items
                 if needle in _norm(i.name) or needle in _norm(i.description)]

    done = sum(1 for i in all_items if i.status == 'done')
    by_type = {
        t: {
            'total': sum(1 for i in all_items if i.type == t),
            'done': sum(1 for i in all_items if i.type == t and i.status == 'done'),
        }
        for t in ITEM_TYPES
    }
    return {
        'filters': {'status': status, 'type': item_type, 'search': search},
        'progress': {
            'total': len(all_items),
            'done': done,
            'wishlist': len(all_items) - done,
            'percent_done': round(100 * done / len(all_items), 1) if all_items else None,
            'by_type': by_type,
        },
        'matching': len(items),
        'items': [serialize_item(i) for i in items[:limit]],
    }


# --------------------------------------------------------------------------
# Scratch map
# --------------------------------------------------------------------------

def serialize_country(country):
    return {
        'id': country.id,
        'country_name': country.country_name,
        'country_code': country.country_code,
        'visited_at': iso(country.visited_at),
        'notes': country.notes,
        'added_at': iso(country.created_at),
    }


def collect_visited_countries(search=None, year=None, limit=DEFAULT_COUNTRY_LIMIT):
    """Countries scratched off the map, newest visit first."""
    countries = VisitedCountry.query.all()
    # Newest visit first; countries without a visit date go last, by name.
    countries.sort(key=lambda c: (c.visited_at is None,
                                  -(c.visited_at.toordinal() if c.visited_at else 0),
                                  _norm(c.country_name)))

    per_year = Counter(c.visited_at.year for c in countries if c.visited_at)
    total = len(countries)

    search = clean_str(search)
    if search:
        needle = search.casefold()
        countries = [c for c in countries
                     if needle in _norm(c.country_name)
                     or needle == _norm(c.country_code)
                     or needle in _norm(c.notes)]
    if year is not None:
        countries = [c for c in countries if c.visited_at and c.visited_at.year == year]

    return {
        'filters': {'search': search, 'year': year},
        'total_countries_visited': total,
        # ~195 sovereign states is the usual yardstick for "how much of the world".
        'percent_of_world': round(100 * total / 195, 1),
        'first_visits_per_year': {str(y): n for y, n in sorted(per_year.items(), reverse=True)},
        'matching': len(countries),
        'countries': [serialize_country(c) for c in countries[:limit]],
    }


# --------------------------------------------------------------------------
# Trip planner
# --------------------------------------------------------------------------

def effective_trip_status(trip, today):
    """The status the app shows.

    The app flips a past trip to "completed" the next time the trip list is
    opened. This service never writes, so it applies the same rule on the fly
    instead of waiting for that.
    """
    if trip.travel_date and trip.travel_date < today and trip.status != 'completed':
        return 'completed'
    return trip.status


def trip_cost(trip):
    if trip.ticket_price is None and trip.accommodation_price is None:
        return None
    return round((trip.ticket_price or 0) + (trip.accommodation_price or 0), 2)


def serialize_trip(trip, today):
    days_until = (trip.travel_date - today).days if trip.travel_date else None
    return {
        'id': trip.id,
        'destination': trip.destination,
        'travel_date': iso(trip.travel_date),
        'days_until': days_until,
        'status': effective_trip_status(trip, today),
        'ticket_price': trip.ticket_price,
        'accommodation_price': trip.accommodation_price,
        'total_cost': trip_cost(trip),
        'notes': trip.notes,
        'created_at': iso(trip.created_at),
    }


def _money(values):
    return round(sum(v for v in values if v is not None), 2)


def collect_trips(status=None, when=None, search=None, limit=DEFAULT_TRIP_LIMIT):
    """Planned and past trips with costs.

    ``when`` is "upcoming" (dated today or later, or not dated yet and not
    completed), "past" (completed), or None for everything.
    """
    today = today_local()
    trips = [serialize_trip(t, today) for t in TripPlan.query.all()]
    # Soonest first; undated ideas after the dated trips.
    trips.sort(key=lambda t: (t['travel_date'] is None, t['travel_date'] or '', t['id']))

    upcoming = [t for t in trips if t['status'] != 'completed']
    past = [t for t in trips if t['status'] == 'completed']
    next_trip = next((t for t in upcoming if t['travel_date']), None)

    status, search = pick(status, TRIP_STATUSES), clean_str(search)
    when = pick(when, ('upcoming', 'past'))
    selected = {'upcoming': upcoming, 'past': list(reversed(past))}.get(when, trips)
    if status:
        selected = [t for t in selected if t['status'] == status]
    if search:
        needle = search.casefold()
        selected = [t for t in selected
                    if needle in _norm(t['destination']) or needle in _norm(t['notes'])]

    return {
        'today': today.isoformat(),
        'timezone': TIMEZONE_NAME,
        'filters': {'status': status, 'when': when, 'search': search},
        'counts': {s: sum(1 for t in trips if t['status'] == s) for s in TRIP_STATUSES},
        'next_trip': next_trip,
        'budget': {
            'note': 'Prices as entered in the app; the app does not record a currency.',
            'upcoming_total': _money(t['total_cost'] for t in upcoming),
            'upcoming_booked_total': _money(t['total_cost'] for t in upcoming if t['status'] == 'booked'),
            'completed_total': _money(t['total_cost'] for t in past),
        },
        'matching': len(selected),
        'trips': selected[:limit],
    }


# --------------------------------------------------------------------------
# Overview
# --------------------------------------------------------------------------

def collect_overview():
    """One call that summarizes all three pages and how they relate."""
    today = today_local()
    items = BucketItem.query.all()
    countries = VisitedCountry.query.all()
    trips = [serialize_trip(t, today) for t in TripPlan.query.all()]

    visited = {_norm(c.country_name) for c in countries}
    country_items = [i for i in items if i.type == 'country']
    upcoming = sorted((t for t in trips if t['status'] != 'completed' and t['travel_date']),
                      key=lambda t: t['travel_date'])
    done = sum(1 for i in items if i.status == 'done')
    latest_visit = max((c for c in countries if c.visited_at),
                       key=lambda c: c.visited_at, default=None)

    return {
        'today': today.isoformat(),
        'bucketlist': {
            'total': len(items),
            'done': done,
            'wishlist': len(items) - done,
            'percent_done': round(100 * done / len(items), 1) if items else None,
        },
        'scratch_map': {
            'countries_visited': len(countries),
            'most_recent_visit': serialize_country(latest_visit) if latest_visit else None,
        },
        'trips': {
            'upcoming': len([t for t in trips if t['status'] != 'completed']),
            'booked': sum(1 for t in trips if t['status'] == 'booked'),
            'completed': sum(1 for t in trips if t['status'] == 'completed'),
            'next_three': upcoming[:3],
        },
        # Matched by name, case-insensitively - the app does not link these
        # records, so this is a best-effort hint rather than a hard fact.
        'cross_checks': {
            'wishlist_countries_already_on_scratch_map': sorted(
                i.name for i in country_items
                if i.status == 'wishlist' and _norm(i.name) in visited),
            'wishlist_countries_not_yet_visited': sorted(
                i.name for i in country_items
                if i.status == 'wishlist' and _norm(i.name) not in visited),
            'done_countries_missing_from_scratch_map': sorted(
                i.name for i in country_items
                if i.status == 'done' and _norm(i.name) not in visited),
        },
    }
