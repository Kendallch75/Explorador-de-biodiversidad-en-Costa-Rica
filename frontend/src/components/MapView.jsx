import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

const COSTA_RICA_CENTER = [9.93, -84.09];

export default function MapView({
  docs,
  numFound,
  activePolygon,
  activeProximity,
  proximityPickMode,
  onPolygonDrawn,
  onMapClickForProximity,
  onClearPolygon,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const drawnLayerRef = useRef(null);
  const proximityLayerRef = useRef(null);
  const callbacksRef = useRef({ onPolygonDrawn, onMapClickForProximity, proximityPickMode });

  callbacksRef.current = { onPolygonDrawn, onMapClickForProximity, proximityPickMode };

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: COSTA_RICA_CENTER,
      zoom: 8,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup().addTo(map);
    const proximityLayer = new L.LayerGroup().addTo(map);
    const markersLayer = new L.LayerGroup().addTo(map);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems, edit: false, remove: true },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: "#f59e0b", weight: 2.5, fillOpacity: 0.15 },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (event) => {
      drawnItems.clearLayers();
      const layer = event.layer;
      drawnItems.addLayer(layer);
      const latlngs = layer.getLatLngs()[0] || [];
      const coords = latlngs.map((ll) => [
        Number(ll.lng.toFixed(6)),
        Number(ll.lat.toFixed(6)),
      ]);
      if (coords.length >= 3) {
        callbacksRef.current.onPolygonDrawn(coords);
      }
    });

    map.on(L.Draw.Event.DELETED, () => {
      onClearPolygon?.();
    });

    map.on("click", (e) => {
      if (callbacksRef.current.proximityPickMode) {
        callbacksRef.current.onMapClickForProximity(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5))
        );
      }
    });

    mapRef.current = map;
    markersLayerRef.current = markersLayer;
    drawnLayerRef.current = drawnItems;
    proximityLayerRef.current = proximityLayer;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers whenever docs change
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    docs.forEach((doc) => {
      const lat = Number(doc.latitud);
      const lon = Number(doc.longitud);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const isAnomaly = (doc.n_algoritmos_anomalia || 0) >= 2;
      const inAsp = Boolean(doc.en_asp);
      const color = isAnomaly ? "#ef4444" : inAsp ? "#10b981" : "#38bdf8";

      const marker = L.circleMarker([lat, lon], {
        radius: 5.5,
        color,
        fillColor: color,
        fillOpacity: 0.75,
        weight: 1.5,
      });

      marker.bindPopup(`
        <div style="min-width:210px;font-size:12px;line-height:1.45;color:#0f172a">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${doc.nombre_cientifico || "Sin nombre"}</div>
          <div><b>Orden / Familia:</b> ${doc.orden || "-"} / ${doc.familia || "-"}</div>
          <div><b>Provincia:</b> ${doc.provincia || "-"} (${doc.anio || "-"})</div>
          <div><b>Elevación:</b> ${doc.elevacion_m ?? "-"} m (${doc.piso_altitudinal || "-"})</div>
          <div><b>En ASP:</b> ${inAsp ? `Sí — ${doc.asp_nombre} (${doc.asp_sigla_categoria || ""})` : "No"}</div>
          <div><b>Anomalías:</b> ${doc.n_algoritmos_anomalia ?? 0} algoritmo(s)</div>
        </div>
      `);

      marker.addTo(layer);
    });
  }, [docs]);

  // Sync preset or active polygon
  useEffect(() => {
    const drawn = drawnLayerRef.current;
    const map = mapRef.current;
    if (!drawn || !map) return;

    drawn.clearLayers();
    if (activePolygon && activePolygon.length >= 3) {
      const latlngs = activePolygon.map(([lon, lat]) => [lat, lon]);
      const poly = L.polygon(latlngs, {
        color: "#f59e0b",
        weight: 2.5,
        fillOpacity: 0.15,
      }).addTo(drawn);
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }
  }, [activePolygon]);

  // Sync proximity circle
  useEffect(() => {
    const proxLayer = proximityLayerRef.current;
    const map = mapRef.current;
    if (!proxLayer || !map) return;

    proxLayer.clearLayers();
    if (activeProximity) {
      const { lat, lon, radius_km } = activeProximity;
      const circle = L.circle([lat, lon], {
        radius: radius_km * 1000,
        color: "#a855f7",
        weight: 2,
        fillOpacity: 0.12,
      }).addTo(proxLayer);
      L.circleMarker([lat, lon], {
        radius: 6,
        color: "#a855f7",
        fillColor: "#a855f7",
        fillOpacity: 1,
      }).addTo(proxLayer);
      map.fitBounds(circle.getBounds(), { padding: [30, 30] });
    }
  }, [activeProximity]);

  return (
    <div className="relative h-full min-h-[540px] flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            En ASP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
            Fuera de ASP
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Anomalía (≥2 alg.)
          </span>
        </div>
        <div className="text-slate-300">
          {proximityPickMode ? (
            <span className="text-purple-400 font-semibold animate-pulse">
              Haz clic en el mapa para fijar el centro de proximidad
            </span>
          ) : (
            <span>
              Usa el ícono de polígono <b className="text-amber-400">⬠</b> arriba a la izquierda para filtrar en Solr
            </span>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[500px] rounded-xl overflow-hidden border border-slate-800">
        <div ref={containerRef} className="h-full w-full" />
        <div className="absolute bottom-3 left-3 z-[400] rounded-lg bg-slate-950/90 border border-slate-700 px-3 py-1.5 text-xs shadow-lg">
          <span className="text-slate-400">Total en Solr: </span>
          <span className="font-bold text-amber-400">{numFound.toLocaleString("es-CR")}</span>
          <span className="text-slate-400"> · Mostrando en mapa: </span>
          <span className="font-semibold text-slate-100">{docs.length}</span>
        </div>
      </div>
    </div>
  );
}
