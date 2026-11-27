export default function ResultsTable({ docs }) {
  if (!docs || docs.length === 0) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-8 text-center text-sm text-slate-400">
        No se encontraron registros con los criterios actuales.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
      <table className="w-full text-xs text-left">
        <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-2.5 px-3">Nombre Científico</th>
            <th className="py-2.5 px-3">Orden / Familia</th>
            <th className="py-2.5 px-3">Provincia</th>
            <th className="py-2.5 px-3 text-right">Año</th>
            <th className="py-2.5 px-3 text-right">Elev. (m)</th>
            <th className="py-2.5 px-3">ASP (SINAC)</th>
            <th className="py-2.5 px-3 text-center">Anomalías</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {docs.map((doc) => {
            const anom = doc.n_algoritmos_anomalia ?? 0;
            return (
              <tr key={doc.id} className="hover:bg-slate-800/40">
                <td className="py-2 px-3 font-medium text-slate-100 max-w-[220px] truncate" title={doc.nombre_cientifico}>
                  {doc.nombre_cientifico}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {doc.orden || "-"} <span className="text-slate-500">/ {doc.familia || "-"}</span>
                </td>
                <td className="py-2 px-3 text-slate-300">{doc.provincia || "-"}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">{doc.anio ?? "-"}</td>
                <td className="py-2 px-3 text-right font-mono text-slate-300">
                  {doc.elevacion_m != null ? Math.round(doc.elevacion_m) : "-"}
                </td>
                <td className="py-2 px-3">
                  {doc.en_asp ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/30">
                      {doc.asp_nombre || "En ASP"}
                    </span>
                  ) : (
                    <span className="text-slate-500">Fuera de ASP</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono ${
                      anom >= 2
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : anom === 1
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-slate-500"
                    }`}
                  >
                    {anom}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
