/** Mirrors ClientApp maintenance.service.ts MaintenanceStatusToString */
export const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  xen_approval_requested: 'XEN Approval Requested',
  xen_maintainance_approved: 'XEN Approved',
  sldc_shutdown_code_requested: 'SLDC Shutdown Code Req.',
  sldc_shutdown_code_issued: 'SLDC Shutdown Code Issued',
  request_ptw: 'Request PTW',
  ptw_requested: 'PTW Requested',
  ptw_issued: 'PTW Issued',
  in_progress: 'In Progress',
  ptw_cancellation_requested: 'PTW Cancel Requested',
  ptw_c_r_work_completed: 'PTW Cancel Req. (Work Done)',
  ptw_c_r_work_incomplete: 'PTW Cancel Req. (Work Incomplete)',
  ptw_cancellation_issued: 'PTW Cancelled',
  backcharging_requested: 'BC Cert. Requested',
  backcharging_issued: 'BC Cert. Issued',
  backcharging_cancel_requested: 'BC Cancel Requested',
  backcharging_cancel_issued: 'BC Cancelled',
  sldc_charging_code_requested: 'SLDC Charging Code Req.',
  sldc_charging_code_issued: 'SLDC Charging Code Issued',
  parameter_submit_pending: 'Parameter Submit Pending',
  parameter_approval_pending: 'Parameter Approval Pending',
  maintenance_complete: 'Completed',
  tl_partially_complete: 'TL Partially Complete',
  maintenance_complete_work_incomplete: 'Completed (Work Incomplete)',
  maintainance_cancelled: 'Cancelled',
  mtc_mnp_wip: 'MTC + MNP WIP',
  mtc_wip: 'MTC WIP',
  mnp_wip: 'MNP WIP',
};

/** Maps status → Ionic color name for ion-badge / status chip */
export function statusColor(status: string): string {
  switch (status) {
    case 'planned': return 'primary';
    case 'maintenance_complete':
    case 'tl_partially_complete':
    case 'maintenance_complete_work_incomplete': return 'success';
    case 'maintainance_cancelled':
    case 'ptw_cancellation_issued':
    case 'ptw_cancellation_requested':
    case 'ptw_c_r_work_completed':
    case 'ptw_c_r_work_incomplete': return 'danger';
    case 'ptw_issued':
    case 'in_progress':
    case 'backcharging_issued':
    case 'sldc_shutdown_code_issued':
    case 'sldc_charging_code_issued': return 'warning';
    default: return 'medium';
  }
}

export function statusLabel(status: string, ptwWorkCompleted?: boolean): string {
  if (status === 'ptw_cancellation_requested') {
    return ptwWorkCompleted
      ? STATUS_LABELS['ptw_c_r_work_completed']
      : STATUS_LABELS['ptw_c_r_work_incomplete'];
  }
  return STATUS_LABELS[status] ?? status ?? '—';
}

/** URL-decode a path segment, return '' on undefined */
export function unesc(val: string | undefined): string {
  if (!val) return '';
  try { return decodeURIComponent(val); } catch { return val; }
}

/** Format a unix-ms timestamp as "DD Mon YYYY" */
export function fmtDate(ts: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Shared row interface used by both dashboard views */
export interface DashRow {
  _id: string;
  tabType: string;            // which tab this came from
  mnttype: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  zone: string;
  circle: string;
  division: string;
  substation?: string;
  baytype?: string;
  bay?: string;
  eqptype?: string;
  eqp?: string;
  lineName?: string;
  towerRange?: string;
  cutoff: number;
  cutoffStr: string;
  plannedDate: number;
  plannedStr: string;
  shutdownRequired: boolean;
  // Observations
  description?: string;
  observations?: string;
  lineno?: string;
  remarks?: string;
  observationType?: string;
  deviceType?: string;
  // Other PTW
  issuedTo?: string;
  permitType?: string;
  issueDateTime?: number;
  // Completed dashboard extra
  completedTime?: number;
  completedStr?: string;
}

/** Build a DashRow from a Dict entry { Item1: keypath, Item2: DashboardInfo } */
export function buildRow(mnt: any, id: string, tabType: string): DashRow {
  const info = mnt.Item2;
  const ml = info.maintenance_list ?? {};
  const p = (mnt.Item1 ?? '').split('/');
  // Mirror ClientApp: use current_status for maintenance items, fallback to status
  const st = info.current_status ?? info.status ?? '';
  const sl = statusLabel(st, info.ptw_work_completed);
  const sc = statusColor(st);

  return {
    _id: id,
    tabType,
    mnttype: ml.maintenancename ?? '—',
    status: st,
    statusLabel: sl,
    statusColor: sc,
    zone: unesc(p[1]),
    circle: unesc(p[2]),
    division: unesc(p[3]),
    substation: unesc(p[4]),
    bay: unesc(p[5]),
    baytype: ml.devicetype ?? ml.baytype,
    eqptype: ml.devicetype,
    eqp: unesc(p[6]),
    cutoff: ml.cutoff_date ?? 0,
    cutoffStr: fmtDate(ml.cutoff_date),
    plannedDate: info.plannedDate ?? 0,
    plannedStr: fmtDate(info.plannedDate),
    shutdownRequired: !!info.shutdown_required,
    completedTime: 0,
    completedStr: '',
  };
}

/** Build a row from a TL Dict entry — handles line name & tower range */
export function buildTLRow(mnt: any, id: string, tabType: string): DashRow {
  const row = buildRow(mnt, id, tabType);
  const info = mnt.Item2;
  const ml = info.maintenance_list ?? {};
  const fullPath = mnt.Item1 ?? '';
  const parts = fullPath.split('/');
  const lastSeg = parts[parts.length - 1] ?? '';
  const tr = ml.tower_range ?? '';
  row.lineName = unesc(tr ? lastSeg.split(tr)[0] : lastSeg);
  row.towerRange = tr;
  // For TL, zone/circle/division come from path without the last line segment
  row.zone = unesc(parts[1]);
  row.circle = unesc(parts[2]);
  row.division = unesc(parts[3]);
  row.substation = undefined;
  row.bay = undefined;
  return row;
}

/** Build a row from an Observation list entry */
export function buildObsRow(mnt: any, tabType: string): DashRow {
  if (!mnt?.Item2) {
    console.warn('Invalid buildRow input:', mnt);
    return {} as DashRow;
  }
  const info = mnt.Item2;
  const ml = info.maintenance_list ?? {};
  const p = (mnt.Item1 ?? '').split('/');
  // Observations use status (not current_status) — mirrors ClientApp destructureMntInfo type=='o'
  const st = info.status ?? '';
  return {
    _id: info._id ?? mnt.Item1,
    tabType,
    mnttype: ml.maintenancename ?? info.maintenance_type ?? '—',
    status: st,
    statusLabel: statusLabel(st),
    statusColor: statusColor(st),
    zone: unesc(p[1]),
    circle: unesc(p[2]),
    division: unesc(p[3]),
    substation: unesc(p[4]),
    bay: unesc(p[5]),
    cutoff: 0,
    cutoffStr: '',
    plannedDate: 0,
    plannedStr: '',
    shutdownRequired: false,
    description: info.description,
    observations: info.observations,
    lineno: info.lineno,
    remarks: info.remarks,
    observationType: info.observationtype,
    deviceType: info.device_type,
    completedTime: 0,
    completedStr: '',
  };
}

/** Process a Dict<string, Tuple<string, DashboardInfo>> into DashRow[] */
// export function dictToRows(
//   dict: Record<string, any[]> | null | undefined,
//   tabType: string,
//   builder: (mnt: any, id: string, tab: string) => DashRow = buildRow
// ): DashRow[] {
//   if (!dict) return [];
//   const rows: DashRow[] = [];
//   Object.keys(dict).forEach(id => {
//     (dict[id] as any[]).forEach(mnt => rows.push(builder(mnt, id, tabType)));
//   });
//   return rows;
// }

export function dictToRows(
  dict: Record<string, any[]> | null | undefined,
  tabType: string,
  builder: (mnt: any, id: string, tab: string) => DashRow = buildRow
): DashRow[] {
  if (!dict) return [];

  const rows: DashRow[] = [];

  Object.keys(dict).forEach(id => {
    const val = dict[id];

    const items: any[] = Array.isArray(val) ? val : Object.values(val ?? {});

    items.forEach(mnt => {
      let normalizedMnt: any;

      // ✅ Case 1: Old format (correct)
      if (mnt?.Item2) {
        normalizedMnt = mnt;
      }

      // ✅ Case 2: New backend format → convert it
      else if (mnt?.maintenance_list) {
        normalizedMnt = {
          Item1: mnt.device_name || '',
          Item2: mnt
        };
      }

      // ❌ Completely invalid
      else {
        console.warn('Skipping invalid mnt:', mnt);
        return;
      }

      rows.push(builder(normalizedMnt, id, tabType));
    });
  });

  return rows;
}

/** Process a List<Tuple<string, DashboardInfo>> into DashRow[] */
// export function listToObsRows(list: any[] | null | undefined, tabType: string): DashRow[] {
//   if (!list) return [];
//   // return list.map(mnt => buildObsRow(mnt, tabType));
//   const items: any[] = Array.isArray(list) ? list : Object.values(list ?? {});

//   return items
//     .filter(mnt => mnt?.Item2)
//     .map(mnt => buildObsRow(mnt, tabType));
// }

export function listToObsRows(list: any[] | null | undefined, tabType: string): DashRow[] {
  if (!list) return [];

  const items: any[] = Array.isArray(list) ? list : Object.values(list ?? {});

  return items
    .map(mnt => {
      if (mnt?.Item2) return mnt;

      if (mnt?.maintenance_list) {
        return {
          Item1: mnt.device_name || '',
          Item2: mnt
        };
      }

      return null;
    })
    .filter(Boolean)
    .map(mnt => buildObsRow(mnt, tabType));
}