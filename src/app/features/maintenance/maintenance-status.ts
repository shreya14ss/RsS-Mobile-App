// Re-export the canonical status → label map so the maintenance page and the
// maintenance dashboard cannot drift. Previously this file held its own copy,
// which fell out of sync with core/services/maintenance.service.ts (e.g. it
// was missing ptw_c_r_work_completed) and caused label mismatches vs the web.
export { MaintenanceStatusToString } from '../../core/services/maintenance.service';
