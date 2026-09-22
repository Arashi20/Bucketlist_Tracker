"""Plain REST view of the same data, for curl and scripts.

GET only - there is no route here that writes.
"""

from flask import Blueprint, jsonify, request

from auth import token_required
from config import TIMEZONE_NAME, today_local
from data import (
    DEFAULT_COUNTRY_LIMIT,
    DEFAULT_ITEM_LIMIT,
    DEFAULT_TRIP_LIMIT,
    clamp_int,
    collect_bucketlist,
    collect_overview,
    collect_trips,
    collect_visited_countries,
)

rest_api = Blueprint('rest_api', __name__, url_prefix='/api/v1')


@rest_api.route('/overview', methods=['GET'])
@token_required
def overview_endpoint(user):
    return jsonify(collect_overview())


@rest_api.route('/bucketlist', methods=['GET'])
@token_required
def bucketlist_endpoint(user):
    return jsonify(collect_bucketlist(
        status=request.args.get('status'),
        item_type=request.args.get('type'),
        search=request.args.get('search'),
        limit=clamp_int(request.args.get('limit'), DEFAULT_ITEM_LIMIT)))


@rest_api.route('/countries', methods=['GET'])
@token_required
def countries_endpoint(user):
    year = request.args.get('year')
    return jsonify(collect_visited_countries(
        search=request.args.get('search'),
        year=clamp_int(year, None, minimum=1900, maximum=2100) if year is not None else None,
        limit=clamp_int(request.args.get('limit'), DEFAULT_COUNTRY_LIMIT)))


@rest_api.route('/trips', methods=['GET'])
@token_required
def trips_endpoint(user):
    return jsonify(collect_trips(
        status=request.args.get('status'),
        when=request.args.get('when'),
        search=request.args.get('search'),
        limit=clamp_int(request.args.get('limit'), DEFAULT_TRIP_LIMIT)))


@rest_api.route('/ping', methods=['GET'])
@token_required
def ping_endpoint(user):
    """Cheap authenticated check that a token works."""
    return jsonify({
        'ok': True,
        'user': user,
        'scope': 'read',
        'today': today_local().isoformat(),
        'timezone': TIMEZONE_NAME,
    })
