import React, { useMemo, useState } from "react";
import { Card, Collapse, Tag, Input, Select, Row, Col, Empty } from "antd";
import { useQuery } from "@tanstack/react-query";
import { listAdmissions } from "../api/admissions";
import { listWards, listBeds } from "../api/lookups";

const { Panel } = Collapse;

function useActiveAdmissions() {
  // We only need ACTIVE admissions to know occupancy
  const { data, isLoading } = useQuery({
    queryKey: ["admissions", { status: "active" }],
    queryFn: () => listAdmissions({ status: "active" }),
  });
  const rows = data?.results || data || [];
  // Map: bed_id -> admission row
  const byBed = useMemo(() => {
    const m = new Map();
    for (const a of rows) {
      if (a.bed) m.set(a.bed, a);
      if (a.bed_id) m.set(a.bed_id, a); // handle projection names if present
    }
    return m;
  }, [rows]);

  return { rows, byBed, isLoading };
}

export default function BedBoard() {
  // lookups
  const { data: wardsData } = useQuery({
    queryKey: ["wards"],
    queryFn: () => listWards(),
  });
  const wards = wardsData?.results || wardsData || [];

  // query state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "", "occupied", "vacant"

  // active admissions
  const { byBed } = useActiveAdmissions();

  // helper: fetch beds for a ward (per-panel)
  const WardBeds = ({ wardId }) => {
    const { data, isLoading } = useQuery({
      queryKey: ["beds", wardId],
      queryFn: () => listBeds(wardId), // show all beds in ward
      enabled: !!wardId,
    });
    const beds = (data?.results || data || []).map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      status: b.status, // if you track this on beds table
    }));

    // filter by search + status
    const filtered = beds.filter((b) => {
      const admission = byBed.get(b.id);
      const occupied = !!admission;
      if (status === "occupied" && !occupied) return false;
      if (status === "vacant" && occupied) return false;

      if (!q.trim()) return true;

      // Search in patient name / MRN when occupied OR in bed code/id
      const t = q.trim().toLowerCase();
      if (occupied) {
        const mrn = (admission.patient_mrn || admission.mrn || "").toLowerCase();
        const name =
          (
            admission.patient_name ||
            `${admission.patient_first_name || ""} ${admission.patient_last_name || ""}`
          )
            .trim()
            .toLowerCase();
        return name.includes(t) || mrn.includes(t) || (b.code || "").toLowerCase().includes(t);
      }
      return (b.code || "").toLowerCase().includes(t);
    });

    if (!isLoading && filtered.length === 0) {
      return <Empty description="No beds match the filters" style={{ margin: "24px 0" }} />;
    }

    return (
      <Row gutter={[12, 12]}>
        {filtered.map((b) => {
          const admission = byBed.get(b.id);
          const occupied = !!admission;

          const patientName =
            admission?.patient_name ||
            `${admission?.patient_first_name || ""} ${admission?.patient_last_name || ""}`.trim() ||
            null;

          const mrn = admission?.patient_mrn || admission?.mrn || "";
          const admitDate = admission?.admit_time ? String(admission.admit_time).slice(0, 10) : "";

          return (
            <Col key={b.id} xs={24} sm={12} md={8} lg={6} xl={4}>
              <Card
                size="small"
                style={{
                  borderColor: occupied ? "#ff4d4f" : "#52c41a",
                  height: 120,
                }}
                title={
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span>{b.code || `Bed #${b.id}`}</span>
                    <Tag color={occupied ? "red" : "green"}>
                      {occupied ? "Occupied" : "Vacant"}
                    </Tag>
                  </div>
                }
              >
                {occupied ? (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {patientName || `MRN ${mrn}`}
                    </div>
                    {patientName ? (
                      <div style={{ color: "#6b7280" }}>MRN {mrn}</div>
                    ) : null}
                    <div style={{ color: "#6b7280", marginTop: 4 }}>
                      Admitted: {admitDate || "-"}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#6b7280" }}>—</div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <>
      {/* Filters row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Input
          placeholder="Search patient, MRN, or bed code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 360 }}
          allowClear
        />
        <Select
          style={{ width: 160 }}
          value={status}
          onChange={setStatus}
          options={[
            { label: "All", value: "" },
            { label: "Occupied", value: "occupied" },
            { label: "Vacant", value: "vacant" },
          ]}
        />
        <div style={{ flex: 1 }} />
      </div>

      {/* Wards accordion */}
      <Collapse defaultActiveKey={wards.map((w) => String(w.id))}>
        {(wards || []).map((w) => (
          <Panel header={w.name || `Ward #${w.id}`} key={String(w.id)}>
            <WardBeds wardId={w.id} />
          </Panel>
        ))}
      </Collapse>
    </>
  );
}
