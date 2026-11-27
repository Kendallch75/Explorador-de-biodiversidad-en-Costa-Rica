function BarList({ title, buckets, colorClass = "bg-emerald-500" }) {
  if (!buckets || buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
      <h4 className="text-sm font-semibold text-slate-200 mb-3">{title}</h4>
      <div className="space-y-2">
        {buckets.slice(0, 10).map((b) => (
          <div key={b.value} className="text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-slate-300 truncate max-w-[70%]" title={b.value}>
                {b.value}
              </span>
              <span className="text-slate-400 font-mono">
                {b.count.toLocaleString("es-CR")}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${colorClass}`}
                style={{ width: `${Math.max((b.count / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FacetsPanel({ facets }) {
  if (!facets) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 text-sm text-slate-400">
        Esta consulta no solicitó facets. Activa &quot;Incluir facets&quot; o selecciona una consulta de facets.
      </div>
    );
  }

  const { field_facets = {}, range_facets = {}, query_facets = [], nested = [], stats = [] } = facets;

  return (
    <div className="space-y-6">
      {/* Field Facets */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
          Field Facets (Agrupación Categórica)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BarList title="Orden taxonómico" buckets={field_facets.orden} colorClass="bg-emerald-500" />
          <BarList title="Provincia" buckets={field_facets.provincia} colorClass="bg-sky-500" />
          <BarList title="Piso altitudinal" buckets={field_facets.piso_altitudinal} colorClass="bg-amber-500" />
          <BarList title="Categoría de ASP" buckets={field_facets.asp_categoria} colorClass="bg-purple-500" />
        </div>
      </section>

      {/* Range Facets & Query Facets */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarList
          title="Range Facet: Décadas (anio)"
          buckets={range_facets.anio?.buckets}
          colorClass="bg-indigo-500"
        />
        <BarList
          title="Range Facet: Elevación (m)"
          buckets={range_facets.elevacion_m?.buckets}
          colorClass="bg-teal-500"
        />
      </section>

      {query_facets.length > 0 && (
        <section className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Query Facets (Condiciones de Búsqueda)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {query_facets.map((qf) => (
              <div
                key={qf.query}
                className="rounded-lg bg-slate-950 border border-slate-800 p-3 flex flex-col justify-between"
              >
                <span className="text-xs font-mono text-sky-400 break-all">{qf.query}</span>
                <span className="text-xl font-bold text-slate-100 mt-1">
                  {qf.count.toLocaleString("es-CR")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nested Facets */}
      {nested.length > 0 && (
        <section className="rounded-xl bg-slate-900 border border-slate-800 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Facets Anidados (Provincia → Orden → En ASP)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nested.map((prov) => (
              <div key={prov.val} className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                  <span className="font-semibold text-sm text-amber-400">{prov.val}</span>
                  <span className="text-xs font-mono text-slate-400">
                    {prov.count.toLocaleString("es-CR")} reg.
                  </span>
                </div>
                <div className="space-y-1.5">
                  {(prov.ordenes?.buckets || []).map((ord) => (
                    <div key={ord.val} className="flex justify-between text-xs text-slate-300">
                      <span>{ord.val}</span>
                      <span className="font-mono text-slate-400">
                        {ord.count.toLocaleString("es-CR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Statistical Facets */}
      {stats.length > 0 && (
        <section className="rounded-xl bg-slate-900 border border-slate-800 p-4 overflow-x-auto">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Facets con Funciones Estadísticas por Área de Conservación
          </h3>
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2 pr-3">Área de Conservación</th>
                <th className="py-2 px-3 text-right">Registros</th>
                <th className="py-2 px-3 text-right">Elev. Prom (m)</th>
                <th className="py-2 px-3 text-right">Elev. Mín (m)</th>
                <th className="py-2 px-3 text-right">Elev. Máx (m)</th>
                <th className="py-2 pl-3 text-right">Suma Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {stats.map((row) => (
                <tr key={row.val} className="hover:bg-slate-800/40">
                  <td className="py-2 pr-3 font-medium text-slate-200">{row.val}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.count?.toLocaleString("es-CR")}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-400">
                    {row.elevacion_prom != null ? row.elevacion_prom.toFixed(1) : "-"}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{row.elevacion_min ?? "-"}</td>
                  <td className="py-2 px-3 text-right font-mono">{row.elevacion_max ?? "-"}</td>
                  <td className="py-2 pl-3 text-right font-mono text-amber-400">
                    {row.total_issues != null ? Math.round(row.total_issues).toLocaleString("es-CR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
