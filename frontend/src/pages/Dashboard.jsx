import { useEffect, useState } from "react";
import { api, money } from "../api.js";

const PERIODOS = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];

function Kpi({ label, value, hint, tone }) {
  return (
    <div className={`kpi${tone ? " " + tone : ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint-sm">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [periodo, setPeriodo] = useState("2026-10");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = async (p) => {
    setErr("");
    setLoading(true);
    try {
      setData(await api(`/api/dashboard?periodo=${p}`));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { cargar(periodo); }, [periodo]);

  const selector = (
    <div className="field">
      <label htmlFor="periodo">Periodo</label>
      <select id="periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value)} disabled={loading}>
        {PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );

  const header = (
    <div className="topbar">
      <div>
        <h2>Dashboard</h2>
        <div className="who">Resumen administrativo y financiero</div>
      </div>
      {selector}
    </div>
  );

  if (err) return <div className="dash">{header}<div className="panel err">{err}</div></div>;
  if (!data) {
    return (
      <div className="dash">
        {header}
        <div className="cards">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="kpi skeleton" />)}
        </div>
      </div>
    );
  }

  // Los valores llegan como texto desde la API (NUMERIC de Postgres): convertir antes de sumar.
  const conceptos = data.ingresos_por_concepto.map((c) => ({ ...c, valor: parseFloat(c.valor) || 0 }));
  const totalIngresos = conceptos.reduce((acc, c) => acc + c.valor, 0);
  const pct = data.porcentaje_recuperacion;
  const pctNum = pct == null ? 0 : Math.max(0, Math.min(100, Number(pct)));

  return (
    <div className={loading ? "dash loading" : "dash"}>
      {header}

      <h4 className="section-title">Copropiedad</h4>
      <div className="cards">
        <Kpi label="Inmuebles" value={data.total_inmuebles} />
        <Kpi label="Propietarios" value={data.total_propietarios} />
        <Kpi label="Residentes" value={data.total_residentes} />
        <Kpi label="Cartera total" value={money(data.cartera_total)} tone={Number(data.cartera_total) > 0 ? "alert" : ""} />
      </div>

      <h4 className="section-title">Periodo {data.periodo}</h4>
      <div className="cards">
        <Kpi label="Facturación periodo" value={money(data.facturacion_periodo)} />
        <Kpi label="Recaudo periodo" value={money(data.recaudo_periodo)} tone="good" />
        <Kpi label="Total ingresos del periodo" value={money(totalIngresos)} hint={`${conceptos.length} concepto(s)`} />
        <div className="kpi">
          <div className="label">% recuperación cartera</div>
          <div className="value">{pct == null ? "—" : `${pct}%`}</div>
          <div className="progress" role="progressbar" aria-valuenow={pctNum} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${pctNum}%` }} />
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Ingresos facturados por concepto — {data.periodo}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Concepto</th><th className="right">Valor</th><th className="right col-share">Participación</th></tr>
            </thead>
            <tbody>
              {conceptos.map((c, i) => {
                const share = totalIngresos ? (c.valor / totalIngresos) * 100 : 0;
                return (
                  <tr key={i}>
                    <td>{c.concepto}</td>
                    <td className="right nowrap">{money(c.valor)}</td>
                    <td className="right col-share">
                      <div className="share">
                        <div className="progress"><span style={{ width: `${share}%` }} /></div>
                        <span>{share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {conceptos.length === 0 && (
                <tr><td colSpan={3} className="empty">Sin facturación en este periodo.</td></tr>
              )}
            </tbody>
            {conceptos.length > 0 && (
              <tfoot>
                <tr><th>Total</th><th className="right nowrap">{money(totalIngresos)}</th><th className="col-share" /></tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
