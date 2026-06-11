import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Home, Compass, Plane, Globe, Trophy, Check } from 'lucide-react'
import { visitedCountries as visitedApi } from '../api'

const TOTAL_COUNTRIES = 195

function getLevel(count) {
  if (count >= 50) return { label: 'Citizen of the World', Icon: Trophy  }
  if (count >= 30) return { label: 'Globetrotter',         Icon: Globe   }
  if (count >= 15) return { label: 'Traveler',             Icon: Plane   }
  if (count >= 5)  return { label: 'Wanderer',             Icon: Compass }
  return                   { label: 'Homebody',            Icon: Home    }
}

export default function ScratchMapPage() {
  const [geoJson, setGeoJson]          = useState(null)
  const [visited, setVisited]          = useState([])
  const [selectedCountry, setSelected] = useState(null)
  const [noteForm, setNoteForm]        = useState({ notes: '', visited_at: '' })
  const [geoJsonKey, setGeoJsonKey]    = useState(0)
  const mapRef                         = useRef(null)

  useEffect(() => {
    visitedApi.list().then(setVisited)
    fetch('/countries.geojson').then(r => r.json()).then(setGeoJson)
  }, [])

  useEffect(() => {
    setGeoJsonKey(k => k + 1)
  }, [visited])

  const visitedByCode = Object.fromEntries(
    visited.filter(v => v.country_code).map(v => [v.country_code, v])
  )
  const visitedByName = Object.fromEntries(
    visited.map(v => [v.country_name.toLowerCase(), v])
  )

  const level = getLevel(visited.length)
  const { Icon: LevelIcon } = level

  const getEntry = (code, name) =>
    (code && visitedByCode[code]) || visitedByName[name?.toLowerCase()] || null

  const flyToCountry = useCallback((countryName, countryCode) => {
    if (!mapRef.current || !geoJson) return
    const feature = geoJson.features.find(f => {
      const code = f.properties['ISO3166-1-Alpha-2']
      const name = f.properties['name']
      return (countryCode && code === countryCode) || name?.toLowerCase() === countryName.toLowerCase()
    })
    if (!feature) return
    try {
      const bounds = L.geoJSON(feature).getBounds()
      mapRef.current.flyToBounds(bounds, { padding: [40, 40], duration: 1.2, maxZoom: 5 })
    } catch (_) {}
  }, [geoJson])

  const featureStyle = useCallback((feature) => {
    const code      = feature.properties['ISO3166-1-Alpha-2']
    const name      = feature.properties['name']
    const isVisited = !!getEntry(code, name)
    return {
      fillColor:   isVisited ? '#c9a46a' : '#3a3e2c',
      fillOpacity: isVisited ? 0.85 : 0.65,
      color:       '#5c6050',
      weight:      0.5,
      className:   isVisited ? 'country-visited' : '',
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visited])

  const onEachFeature = useCallback((feature, layer) => {
    const code = feature.properties['ISO3166-1-Alpha-2']
    const name = feature.properties['name']
    if (!name) return

    layer.on({
      click: () => {
        const existing = getEntry(code, name)
        setSelected({ code: code !== '-99' ? code : null, name, existing })
        setNoteForm({ notes: existing?.notes || '', visited_at: existing?.visited_at || '' })
      },
      mouseover: (e) => e.target.setStyle({ fillOpacity: 0.95, weight: 1, color: '#98a080' }),
      mouseout:  (e) => {
        const isVisited = !!getEntry(code, name)
        e.target.setStyle({ fillOpacity: isVisited ? 0.85 : 0.65, weight: 0.5, color: '#5c6050' })
      },
    })
    layer.bindTooltip(name, { sticky: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visited])

  const markVisited = async () => {
    if (!selectedCountry) return
    if (selectedCountry.existing) {
      const updated = await visitedApi.update(selectedCountry.existing.id, {
        notes:      noteForm.notes      || null,
        visited_at: noteForm.visited_at || null,
      })
      setVisited(visited.map(v => v.id === updated.id ? updated : v))
    } else {
      const created = await visitedApi.create({
        country_code: selectedCountry.code || null,
        country_name: selectedCountry.name,
        notes:        noteForm.notes      || null,
        visited_at:   noteForm.visited_at || null,
      })
      setVisited([...visited, created])
    }
    setSelected(null)
  }

  const unmarkVisited = async () => {
    if (!selectedCountry?.existing) return
    await visitedApi.remove(selectedCountry.existing.id)
    setVisited(visited.filter(v => v.id !== selectedCountry.existing.id))
    setSelected(null)
  }

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-4rem)] gap-4 md:gap-5">

      {/* ── Map column ── */}
      <div className="flex-1 flex flex-col min-w-0 gap-3">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-warm-50 tracking-tight">Scratch Map</h2>
            <p className="text-warm-200 text-sm mt-0.5 font-medium flex items-center gap-1.5">
              <LevelIcon size={13} strokeWidth={1.75} />
              {level.label} · {visited.length} / {TOTAL_COUNTRIES} countries
            </p>
          </div>
          <div className="bg-warm-50 border border-warm-200 rounded-xl px-3 py-2 text-sm flex-shrink-0">
            <span className="text-gold-600 font-bold">{visited.length}</span>
            <span className="text-warm-600 font-medium"> visited</span>
            <span className="text-warm-400 mx-1">·</span>
            <span className="text-warm-600 font-medium">{Math.round((visited.length / TOTAL_COUNTRIES) * 100)}%</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-1 md:min-h-0">
          <div className="rounded-xl overflow-hidden border border-warm-600 bg-warm-950
                          h-[52vw] min-h-[220px] max-h-[420px]
                          md:flex-1 md:h-auto md:max-h-none">
            {geoJson ? (
              <MapContainer
                ref={mapRef}
                center={[20, 10]}
                zoom={2}
                minZoom={2}
                maxZoom={7}
                style={{ height: '100%', width: '100%', background: '#272b1d' }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <GeoJSON
                  key={geoJsonKey}
                  data={geoJson}
                  style={featureStyle}
                  onEachFeature={onEachFeature}
                />
              </MapContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-warm-400 text-sm gap-2 font-medium">
                <div className="w-6 h-6 border-2 border-warm-600 border-t-warm-200 rounded-full animate-spin" />
                Loading map...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-3">

        {selectedCountry ? (
          <div className="bg-warm-50 border border-warm-300 rounded-xl p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-warm-900 truncate pr-2">{selectedCountry.name}</h3>
              <button onClick={() => setSelected(null)} className="text-warm-400 hover:text-warm-700 flex-shrink-0">✕</button>
            </div>
            <p className={`text-xs mb-3 font-semibold flex items-center gap-1 ${selectedCountry.existing ? 'text-gold-600' : 'text-warm-500'}`}>
              {selectedCountry.existing && <Check size={11} strokeWidth={2.5} />}
              {selectedCountry.existing ? 'Already visited' : 'Not visited yet'}
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={noteForm.visited_at}
                onChange={e => setNoteForm({ ...noteForm, visited_at: e.target.value })}
                className="w-full border border-warm-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-warm-500"
              />
              <textarea
                placeholder="Add notes..."
                value={noteForm.notes}
                onChange={e => setNoteForm({ ...noteForm, notes: e.target.value })}
                rows={3}
                className="w-full border border-warm-300 rounded-lg px-3 py-2 text-sm font-medium resize-none focus:outline-none focus:border-warm-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={markVisited}
                  className="flex-1 py-2 text-xs font-semibold text-warm-50 bg-terra-600 hover:bg-terra-500 rounded-lg transition-colors"
                >
                  {selectedCountry.existing ? 'Save' : 'Mark visited'}
                </button>
                {selectedCountry.existing && (
                  <button
                    onClick={unmarkVisited}
                    className="px-3 py-2 text-xs font-semibold text-warm-600 bg-warm-100 hover:bg-terra-100/60 hover:text-terra-600 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 flex-shrink-0 text-xs text-warm-600 font-medium">
            Click any country on the map to mark it as visited.
          </div>
        )}

        {/* Visited list */}
        <div className="bg-warm-50 border border-warm-200 rounded-xl p-4
                        md:flex-1 md:overflow-auto md:min-h-0
                        max-h-56 md:max-h-none overflow-auto">
          <h3 className="text-sm font-bold text-warm-900 mb-3">
            Visited ({visited.length})
          </h3>
          {visited.length === 0 ? (
            <p className="text-xs text-warm-500 font-medium">None yet — start scratching!</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {[...visited]
                .sort((a, b) => a.country_name.localeCompare(b.country_name))
                .map(v => (
                  <li
                    key={v.id}
                    className="flex items-center gap-2 text-xs text-warm-700 cursor-pointer hover:text-warm-900 group font-medium"
                    onClick={() => {
                      setSelected({ code: v.country_code, name: v.country_name, existing: v })
                      setNoteForm({ notes: v.notes || '', visited_at: v.visited_at || '' })
                      flyToCountry(v.country_name, v.country_code)
                    }}
                  >
                    <Check size={11} strokeWidth={2.5} className="text-gold-600 flex-shrink-0" />
                    <span className="flex-1 truncate">{v.country_name}</span>
                    {v.visited_at && (
                      <span className="text-warm-400 group-hover:text-warm-500 flex-shrink-0">{v.visited_at}</span>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
