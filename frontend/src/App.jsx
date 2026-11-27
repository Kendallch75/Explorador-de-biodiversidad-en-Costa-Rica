import { useEffect, useState } from "react";
import {
  Bug,
  Code2,
  Compass,
  Database,
  Filter,
  Layers,
  Map as MapIcon,
  Play,
  Search,
  Table as TableIcon,
} from "lucide-react";
import { api } from "./api";
import MapView from "./components/MapView";
import FacetsPanel from "./components/FacetsPanel";
import ResultsTable from "./components/ResultsTable";

const PROVINCIAS = [
  "",
  "Guanacaste",
  "Alajuela",
  "Heredia",
  "Cartago",
  "San José",
  "Puntarenas",
  "Limón",
];

export default function App() {
  const [health, setHealth] = useState(null);
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [activeTab, setActiveTab] = useState("map");

  // Custom query builder state
  const [qText, setQText] = useState("*:*");
  const [especie, setEspecie] = useState("");
  const [speciesSuggestions, setSpeciesSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [provincia, setProvincia] = useState("");
  const [orden, setOrden] = useState("");
  const [enAsp, setEnAsp] = useState("");
  const [anioMin, setAnioMin] = useState("");
  const [anioMax, setAnioMax] = useState("");
  const [sortBy, setSortBy] = useState("anio desc");
  const [rows, setRows] = useState(150);

  // Geospatial state
  const [proxLat, setProxLat] = useState(10.95);
  const [proxLon, setProxLon] = useState(-85.55);
  const [proxRadius, setProxRadius] = useState(25);
  const [proximityPickMode, setProximityPickMode] = useState(false);
  const [activePolygon, setActivePolygon] = useState(null);
  const [activeProximity, setActiveProximity] = useState(null);

  // Results state
  const [result, setResult] = useState({ numFound: 0, qTime: 0, docs: [], facets: null, solrParams: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ django_ok: true, solr_ok: false }));
    api
      .presets()
      .then((res) => setPresets(res.presets || []))
      .catch((err) => setError(err.message));
  }, []);

  // Debounced autocomplete for species from Solr
  useEffect(() => {
    const trimmed = especie.trim();
    if (trimmed.length < 2) {
      setSpeciesSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      api
        .autocomplete(trimmed)
        .then((res) => setSpeciesSuggestions(res.suggestions || []))
        .catch(() => setSpeciesSuggestions([]));
    }, 220);
    return () => clearTimeout(timer);
  }, [especie]);

  const buildCustomFq = () => {
    const fq = [];
    if (especie.trim()) fq.push(`especie:"${especie.trim()}"`);
    if (provincia) fq.push(`provincia:"${provincia}"`);
    if (orden) fq.push(`orden:"${orden}"`);
    if (enAsp === "true") fq.push("en_asp:true");
    if (enAsp === "false") fq.push("en_asp:false");
    if (anioMin || anioMax) {
      fq.push(`anio:[${anioMin || "*"} TO ${anioMax || "*"}]`);
    }
    return fq;
  };

  const runCustomQuery = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    setActivePresetId(null);
    setActivePolygon(null);
    setActiveProximity(null);
    try {
      const data = await api.query({
        q: qText || "*:*",
        fq: buildCustomFq(),
        sort: sortBy,
        rows: Number(rows) || 150,
        include_facets: true,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runPreset = async (preset) => {
    setLoading(true);
    setError("");
    setActivePresetId(preset.id);
    const p = preset.params;
    try {
      let data;
      if (p.type === "proximity") {
        setActivePolygon(null);
        setActiveProximity({ lat: p.lat, lon: p.lon, radius_km: p.radius_km });
        data = await api.proximity(p);
        setActiveTab("map");
      } else if (p.type === "polygon") {
        setActiveProximity(null);
        setActivePolygon(p.coordinates);
        data = await api.polygon(p);
        setActiveTab("map");
      } else {
        setActivePolygon(null);
        setActiveProximity(null);
        data = await api.query(p);
        if (preset.categoria === "facets") setActiveTab("facets");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePolygonDrawn = async (coordinates) => {
    setLoading(true);
    setError("");
    setActivePresetId(null);
    setActiveProximity(null);
    setActivePolygon(coordinates);
    try {
      const data = await api.polygon({
        coordinates,
        q: qText || "*:*",
        fq: buildCustomFq(),
        sort: sortBy,
        rows: Number(rows) || 150,
        include_facets: true,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProximityRun = async (latVal = proxLat, lonVal = proxLon) => {
    setLoading(true);
    setError("");
    setActivePresetId(null);
    setActivePolygon(null);
    setProximityPickMode(false);
    setActiveProximity({ lat: latVal, lon: lonVal, radius_km: Number(proxRadius) });
    try {
      const data = await api.proximity({
        lat: Number(latVal),
        lon: Number(lonVal),
        radius_km: Number(proxRadius),
        q: qText || "*:*",
        fq: buildCustomFq(),
        rows: Number(rows) || 150,
        include_facets: true,
      });
      setResult(data);
      setActiveTab("map");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedPresets = {
    busqueda: presets.filter((p) => p.categoria === "busqueda"),
    facets: presets.filter((p) => p.categoria === "facets"),
    geoespacial: presets.filter((p) => p.categoria === "geoespacial"),
  };

  return (
    <div className="app-shell min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="app-header border-b border-slate-800 bg-slate-900/80 backdrop-blur px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">
              Insectos &amp; Áreas Protegidas (SINAC) — Costa Rica
            </h1>
            <p className="text-xs text-slate-400">
              Proyecto #2 BD-II · Django REST + React + Apache Solr Geoespacial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 border ${
              health?.solr_ok
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            {health?.solr_ok
              ? `Solr conectado (${health.total_docs?.toLocaleString("es-CR")} docs)`
              : "Solr desconectado"}
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {/* Left Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4 overflow-y-auto max-h-[calc(100vh-88px)] pr-1">
          {/* Custom Query Builder */}
          <form
            onSubmit={runCustomQuery}
            className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Filter className="h-4 w-4 text-emerald-400" />
              Consulta Libre a Solr
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Query (`q` con AND / OR / NOT)
              </label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="*:*"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-8 pr-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-[11px] text-slate-400 mb-1">
                Especie (autocompletado Solr)
              </label>
              <div className="relative">
                <input
                  value={especie}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onChange={(e) => {
                    setEspecie(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  placeholder="Ej: Morpho, Atta..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 pr-7 text-xs focus:border-emerald-500 focus:outline-none"
                />
                {especie && (
                  <button
                    type="button"
                    onClick={() => {
                      setEspecie("");
                      setSpeciesSuggestions([]);
                    }}
                    className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-200 text-xs"
                    title="Limpiar especie"
                  >
                    ✕
                  </button>
                )}
              </div>
              {showSuggestions && speciesSuggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg bg-slate-950 border border-slate-700 shadow-xl divide-y divide-slate-800">
                  {speciesSuggestions.map((item) => (
                    <li key={item.especie}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setEspecie(item.especie);
                          setShowSuggestions(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-800 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-200 truncate">{item.especie}</span>
                        <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                          {item.count.toLocaleString("es-CR")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Provincia</label>
                <select
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs"
                >
                  {PROVINCIAS.map((p) => (
                    <option key={p} value={p}>
                      {p || "Todas"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">En ASP</label>
                <select
                  value={enAsp}
                  onChange={(e) => setEnAsp(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí (En ASP)</option>
                  <option value="false">No (Fuera)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Orden (ej. Coleoptera)</label>
                <input
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                  placeholder="Todos"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs"
                >
                  <option value="anio desc">Año (recientes)</option>
                  <option value="anio asc">Año (antiguos)</option>
                  <option value="elevacion_m desc">Elevación (mayor)</option>
                  <option value="n_algoritmos_anomalia desc">Más anomalías</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Año mín.</label>
                <input
                  type="number"
                  value={anioMin}
                  onChange={(e) => setAnioMin(e.target.value)}
                  placeholder="1980"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Año máx.</label>
                <input
                  type="number"
                  value={anioMax}
                  onChange={(e) => setAnioMax(e.target.value)}
                  placeholder="2024"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Filas mapa</label>
                <input
                  type="number"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  min={10}
                  max={500}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2 text-xs font-semibold text-white transition"
            >
              <Play className="h-3.5 w-3.5" />
              {loading ? "Consultando Solr..." : "Ejecutar consulta"}
            </button>
          </form>

          {/* Proximity Controls */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Compass className="h-4 w-4 text-purple-400" />
                Filtro por Proximidad
              </span>
              <button
                type="button"
                onClick={() => {
                  setProximityPickMode((v) => !v);
                  setActiveTab("map");
                }}
                className={`text-[11px] px-2 py-0.5 rounded border ${
                  proximityPickMode
                    ? "bg-purple-500/20 border-purple-400 text-purple-300"
                    : "border-slate-700 text-slate-400 hover:text-slate-200"
                }`}
              >
                {proximityPickMode ? "Cancelar clic" : "Elegir en mapa"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <input
                type="number"
                step="0.001"
                value={proxLat}
                onChange={(e) => setProxLat(e.target.value)}
                placeholder="Lat"
                className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
              />
              <input
                type="number"
                step="0.001"
                value={proxLon}
                onChange={(e) => setProxLon(e.target.value)}
                placeholder="Lon"
                className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
              />
              <input
                type="number"
                min={1}
                value={proxRadius}
                onChange={(e) => setProxRadius(e.target.value)}
                placeholder="Km"
                className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
              />
            </div>
            <button
              type="button"
              onClick={() => handleProximityRun()}
              disabled={loading}
              className="w-full rounded-lg bg-purple-600/80 hover:bg-purple-500 py-1.5 text-xs font-semibold text-white transition"
            >
              Buscar en radio ({proxRadius} km)
            </button>
          </div>

          {/* 13 Preset Queries */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">
              Consultas del Proyecto (13)
            </h2>
            {[
              ["busqueda", "Búsqueda y Filtrado"],
              ["facets", "Facets de Apache Solr"],
              ["geoespacial", "Consultas Geoespaciales"],
            ].map(([cat, label]) => (
              <div key={cat} className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </div>
                {groupedPresets[cat].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => runPreset(preset)}
                    className={`w-full text-left rounded-lg p-2.5 border text-xs transition ${
                      activePresetId === preset.id
                        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                        : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="font-semibold">{preset.titulo}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                      {preset.descripcion}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        {/* Right Main Panel */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          <section className="workspace-intro rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
                  Explorador de biodiversidad · Costa Rica
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Insectos en el territorio</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                  Explora registros de especies, su distribución y su relación con las áreas silvestres protegidas.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="metric-chip"><span>Registros</span><strong>{result.numFound.toLocaleString("es-CR")}</strong></div>
                <div className="metric-chip"><span>Consulta</span><strong>{result.qTime} <small>ms</small></strong></div>
              </div>
            </div>
          </section>
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/40 px-4 py-3 text-sm text-red-300">
              <b>Error:</b> {error}
            </div>
          )}

          {/* Tabs */}
          <div className="tab-strip flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
            {[
              { id: "map", label: "Mapa Interactivo", icon: MapIcon },
              { id: "table", label: `Tabla (${result.docs.length})`, icon: TableIcon },
              { id: "facets", label: "Facets y Estadísticas", icon: Layers },
              { id: "inspector", label: "Query Solr", icon: Code2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  activeTab === id
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1">
            {activeTab === "map" && (
              <MapView
                docs={result.docs}
                numFound={result.numFound}
                activePolygon={activePolygon}
                activeProximity={activeProximity}
                proximityPickMode={proximityPickMode}
                onPolygonDrawn={handlePolygonDrawn}
                onClearPolygon={() => setActivePolygon(null)}
                onMapClickForProximity={(lat, lon) => {
                  setProxLat(lat);
                  setProxLon(lon);
                  handleProximityRun(lat, lon);
                }}
              />
            )}

            {activeTab === "table" && <ResultsTable docs={result.docs} />}

            {activeTab === "facets" && <FacetsPanel facets={result.facets} />}

            {activeTab === "inspector" && (
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">
                  Parámetros enviados a Apache Solr (`/select`)
                </h3>
                <pre className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-xs text-emerald-300 overflow-x-auto">
                  {JSON.stringify(result.solrParams, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
