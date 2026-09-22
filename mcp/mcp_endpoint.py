"""Model Context Protocol endpoint.

Speaks the Streamable HTTP transport at ``POST /mcp`` in stateless mode: each
JSON-RPC request gets a plain JSON response, so there is no session held in
memory and the service can restart without breaking a connected client.

Every tool is a read. There is no tool that writes, and the collectors in
``data.py`` only issue SELECTs, so a connected chatbot cannot modify the data.
"""

import json

from flask import Blueprint, current_app, jsonify, request

import config
from auth import authenticate
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

mcp_bp = Blueprint('mcp', __name__)

SERVER_NAME = 'bucketlist'
SERVER_VERSION = '1.0.0'

# Protocol revisions this server can speak, newest first.
SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
DEFAULT_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]

PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602

READ_ONLY_HINTS = {'readOnlyHint': True, 'destructiveHint': False, 'openWorldHint': False}

TOOLS = [
    {
        'name': 'get_travel_overview',
        'title': 'Travel overview',
        'description': (
            'One-call summary of the whole app: bucketlist progress, how many '
            'countries are scratched off the map and the latest visit, trip '
            'counts and the next three upcoming trips, plus cross-checks between '
            'the pages (bucketlist countries already visited, still to visit, or '
            'marked done but missing from the scratch map). Start here for broad '
            'questions ("where am I going next", "how is my bucketlist going").'
        ),
        'inputSchema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
        'annotations': READ_ONLY_HINTS,
    },
    {
        'name': 'get_bucketlist',
        'title': 'Bucketlist items',
        'description': (
            'Read the bucketlist page: every item with its name, type (country, '
            'region, city or activity), status (wishlist or done), description and '
            'when it was added, newest first, plus overall and per-type progress. '
            'Filter by status, type or a search term.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'status': {
                    'type': 'string', 'enum': ['wishlist', 'done'],
                    'description': 'Optional: only items with this status.',
                },
                'type': {
                    'type': 'string', 'enum': ['country', 'region', 'city', 'activity'],
                    'description': 'Optional: only items of this type.',
                },
                'search': {
                    'type': 'string',
                    'description': 'Optional case-insensitive substring matched against name and description, e.g. "japan".',
                },
                'limit': {
                    'type': 'integer',
                    'description': f'Maximum items to return (1-500, default {DEFAULT_ITEM_LIMIT}).',
                    'minimum': 1, 'maximum': 500,
                },
            },
            'additionalProperties': False,
        },
        'annotations': READ_ONLY_HINTS,
    },
    {
        'name': 'get_visited_countries',
        'title': 'Scratch map',
        'description': (
            'Read the scratch map: the countries marked as visited, with ISO code, '
            'visit date and notes, newest visit first, plus the total, the share of '
            'the world (out of 195) and how many new countries were visited per '
            'year. Filter by a search term or a year.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'search': {
                    'type': 'string',
                    'description': 'Optional case-insensitive substring of the country name or notes, or an exact ISO code, e.g. "PT".',
                },
                'year': {
                    'type': 'integer',
                    'description': 'Optional: only countries whose visit date falls in this year.',
                    'minimum': 1900, 'maximum': 2100,
                },
                'limit': {
                    'type': 'integer',
                    'description': f'Maximum countries to return (1-500, default {DEFAULT_COUNTRY_LIMIT}).',
                    'minimum': 1, 'maximum': 500,
                },
            },
            'additionalProperties': False,
        },
        'annotations': READ_ONLY_HINTS,
    },
    {
        'name': 'get_trips',
        'title': 'Trip planner',
        'description': (
            'Read the trip planner: each trip with destination, travel date, days '
            'until departure, status (idea, planning, booked, completed), ticket '
            'and accommodation prices, total cost and notes, soonest first; plus '
            'the next dated trip, counts per status and budget totals. Trips whose '
            'date has passed are reported as completed, as the app shows them. '
            'Use when="upcoming" or when="past" to narrow it.'
        ),
        'inputSchema': {
            'type': 'object',
            'properties': {
                'when': {
                    'type': 'string', 'enum': ['upcoming', 'past'],
                    'description': 'Optional: "upcoming" (not yet completed, soonest first) or "past" (completed, most recent first).',
                },
                'status': {
                    'type': 'string', 'enum': ['idea', 'planning', 'booked', 'completed'],
                    'description': 'Optional: only trips with this status.',
                },
                'search': {
                    'type': 'string',
                    'description': 'Optional case-insensitive substring matched against destination and notes.',
                },
                'limit': {
                    'type': 'integer',
                    'description': f'Maximum trips to return (1-500, default {DEFAULT_TRIP_LIMIT}).',
                    'minimum': 1, 'maximum': 500,
                },
            },
            'additionalProperties': False,
        },
        'annotations': READ_ONLY_HINTS,
    },
]


def run_tool(name, arguments, user):
    """Dispatch a tool call to its read-only collector."""
    arguments = arguments or {}

    if name == 'get_travel_overview':
        return collect_overview()
    if name == 'get_bucketlist':
        return collect_bucketlist(
            status=arguments.get('status'),
            item_type=arguments.get('type'),
            search=arguments.get('search'),
            limit=clamp_int(arguments.get('limit'), DEFAULT_ITEM_LIMIT))
    if name == 'get_visited_countries':
        year = arguments.get('year')
        return collect_visited_countries(
            search=arguments.get('search'),
            year=clamp_int(year, None, minimum=1900, maximum=2100) if year is not None else None,
            limit=clamp_int(arguments.get('limit'), DEFAULT_COUNTRY_LIMIT))
    if name == 'get_trips':
        return collect_trips(
            status=arguments.get('status'),
            when=arguments.get('when'),
            search=arguments.get('search'),
            limit=clamp_int(arguments.get('limit'), DEFAULT_TRIP_LIMIT))

    raise KeyError(name)


def _result(request_id, result):
    return {'jsonrpc': '2.0', 'id': request_id, 'result': result}


def _error(request_id, code, message):
    return {'jsonrpc': '2.0', 'id': request_id, 'error': {'code': code, 'message': message}}


def handle_message(message, user):
    """Handle one JSON-RPC message; returns None for notifications."""
    if not isinstance(message, dict):
        return _error(None, INVALID_REQUEST, 'Request must be a JSON-RPC object')

    method = message.get('method')
    request_id = message.get('id')
    params = message.get('params') or {}

    if method == 'initialize':
        requested = params.get('protocolVersion')
        version = requested if requested in SUPPORTED_PROTOCOL_VERSIONS else DEFAULT_PROTOCOL_VERSION
        return _result(request_id, {
            'protocolVersion': version,
            'capabilities': {'tools': {'listChanged': False}},
            'serverInfo': {'name': SERVER_NAME, 'version': SERVER_VERSION},
            'instructions': (
                'Read-only access to a personal bucketlist and travel planner. '
                'get_travel_overview summarizes everything; get_bucketlist is the '
                'list of places and activities (wishlist or done); '
                'get_visited_countries is the scratch map of countries already '
                'visited; get_trips is planned and past trips with dates and '
                'prices. Nothing here can change the data.'
            ),
        })

    if method in ('notifications/initialized', 'notifications/cancelled'):
        return None

    if method == 'ping':
        return _result(request_id, {})

    if method == 'tools/list':
        return _result(request_id, {'tools': TOOLS})

    if method == 'tools/call':
        name = params.get('name')
        try:
            payload = run_tool(name, params.get('arguments'), user)
        except KeyError:
            return _error(request_id, INVALID_PARAMS, f'Unknown tool: {name}')
        except Exception:
            current_app.logger.exception('MCP tool %s failed', name)
            # Tool failures are reported in-band so the model can react to them.
            return _result(request_id, {
                'content': [{'type': 'text', 'text': f'Failed to read {name}.'}],
                'isError': True,
            })
        return _result(request_id, {
            'content': [{'type': 'text', 'text': json.dumps(payload, indent=2, default=str)}],
            'structuredContent': payload,
            'isError': False,
        })

    if method in ('resources/list', 'prompts/list'):
        # Not declared in capabilities, but some clients probe anyway.
        return _error(request_id, METHOD_NOT_FOUND, f'{method} is not supported')

    if 'id' not in message:
        return None
    return _error(request_id, METHOD_NOT_FOUND, f'Unknown method: {method}')


@mcp_bp.route('/mcp', methods=['POST'])
def mcp_endpoint():
    if not config.mcp_enabled():
        return jsonify({'error': 'disabled',
                        'message': 'Set MCP_ENABLED=1 to enable this endpoint'}), 404

    user, error = authenticate()
    if error is not None:
        return error

    message = request.get_json(silent=True)
    if message is None:
        return jsonify(_error(None, PARSE_ERROR, 'Request body must be JSON')), 400

    if isinstance(message, list):
        # Batches were dropped in the 2025-06-18 revision, but older clients
        # may still send one.
        responses = [r for r in (handle_message(m, user) for m in message) if r is not None]
        return jsonify(responses) if responses else ('', 202)

    response = handle_message(message, user)
    return jsonify(response) if response is not None else ('', 202)


@mcp_bp.route('/mcp', methods=['GET', 'DELETE'])
def mcp_no_stream():
    """No server-initiated stream, and no session state to delete."""
    if not config.mcp_enabled():
        return jsonify({'error': 'disabled'}), 404
    user, error = authenticate()
    if error is not None:
        return error
    if request.method == 'DELETE':
        return '', 204
    return jsonify(_error(None, METHOD_NOT_FOUND,
                          'This server is stateless; SSE streams are not offered')), 405
