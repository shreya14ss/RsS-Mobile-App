import { Component, OnInit, Input, ChangeDetectorRef, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModalController } from '@ionic/angular';
import { PlanMaintenanceDlgComponent } from './pv-plan-maintenance-dlg/pv-plan-maintenance-dlg.component';
import { BaySelectionDlgComponent } from './bay-selection-dlg/bay-selection-dlg.component';
import { Sort, MatSortModule, MatSort } from '@angular/material/sort';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs'
import { ActivatedRoute, Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatMenuTrigger } from '@angular/material/menu';
import moment from 'moment';
import { SignalRService } from 'src/app/core/services/signal-r.service';
import { AppService } from 'src/app/core/services/app.service';
import { ProjectResolverService } from 'src/app/core/services/project-resolver.service';
import { MaintenanceService } from 'src/app/core/services/maintenance.service';
import { LocaleService } from 'src/app/core/services/locale/locale.service';


@Component({
  selector: 'app-pv-plan-maintenance',
  templateUrl: './pv-plan-maintenance.component.html',
  styleUrls: ['./pv-plan-maintenance.component.scss']
})
export class PvPlanMaintenanceComponent implements OnInit {

  constructor(private signalr: SignalRService,
    private cdRef: ChangeDetectorRef,
    private appservice: AppService,
    public resolver: ProjectResolverService,
    private mntservice: MaintenanceService,
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    public locale_service: LocaleService,
    private refeshpage: ChangeDetectorRef,
    private route: ActivatedRoute,
    private modalController: ModalController,
  ) { }

  @Input() viewData: any;
  //dataSource: any = [];
  //plannedDataSource: any[] = [];
  substnFilter: string;
  group_path: string[];
  current_sel_path: string[];
  planDS = {};
  selectedTabLabel: string = "";
  subDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  tlDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  obtlDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  bayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  eqpDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  tlConnectedBayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  bayConnectedTLDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  bayConnectedBayDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  //shutdownRequestDatasource: MatTableDataSource<any> = new MatTableDataSource<any>();
  originalBayData: any[] = [];
  originalSubData: any[] = [];
  originalEqpData: any[] = [];
  originalTLData: any[] = [];
  originalObservationTLData: any[] = [];
  originalTLConnectedBayData: any[] = [];
  originalBayConnectedTLData: any[] = [];
  private update_counter = 0;
  cardDS = ["Substation Schedule", "Bay Schedule", "Equipment Schedule"];
  displayedTLColumns: string[] = ['zone', 'circle', 'division', 'line_name', 'tower_range', 'maintenancetype', 'cutoffDate', 'status', 'action'];
  displayedObservationTLColumns: string[] = ['zone', 'circle', 'division', 'substation', 'bay_path', 'line_name', 'tower_range', 'maintenancetype', 'cutoffDate', 'status', 'action'];
  displayedSubColumns: string[] = ['zone', 'circle', 'division', 'substation', 'maintenancetype', 'cutoffDate', 'status', 'action']
  displayedbayColumns: string[] = ['zone', 'circle', 'division', 'substation', 'baytype', 'bay', 'maintenancetype', 'cutoffDate', 'status', 'action'];
  displayedeqpColumns: string[] = ['zone', 'circle', 'division', 'substation',  'baytype', 'bay', 'eqptype', 'eqp', 'maintenancetype', 'cutoffDate', 'status', 'action'];
  device_master = [];
  saving: boolean;
  isBaySelected = {};

  @ViewChild('bayinput') bayFilter: ElementRef;
  @ViewChild('eqpinput') eqpFilter: ElementRef;
  @ViewChild('tlinput') tlFilter: ElementRef;
  @ViewChild('tlConnectedBayinput') tlConnectedBayFilter: ElementRef;
  @ViewChild('bayConnectedTLinput') bayConnectedTLFilter: ElementRef;
  //@ViewChild('shutdownRequestinput') shutdownRequestFilter: ElementRef;
  @ViewChildren(MatMenuTrigger) menuTriggers!: QueryList<MatMenuTrigger>;
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  @ViewChild("tl_table", { read: MatSort, static: false }) set tmatSort(ms: MatSort) {
    this.tlDatasource.sort = ms;
  }
  @ViewChild("bay_table", { read: MatSort, static: false }) set bmatSort(ms: MatSort) {
    this.bayDatasource.sort = ms;
  }
  @ViewChild("eqp_table", { read: MatSort, static: false }) set ematSort(ms: MatSort) {
    this.eqpDatasource.sort = ms;
  }
  @ViewChild("ob_tl_table", { read: MatSort, static: false }) set obtlmatSort(ms: MatSort) {
    this.eqpDatasource.sort = ms;
  }
  @ViewChild("tlConnectedBay_table", { read: MatSort, static: false }) set tlConnectedBaymatSort(ms: MatSort) {
    this.tlConnectedBayDatasource.sort = ms;
  }
  @ViewChild("bayConnectedTL_table", { read: MatSort, static: false }) set bayConnectedTLmatSort(ms: MatSort) {
    this.bayConnectedTLDatasource.sort = ms;
  }
  @ViewChild("bayConnectedBay_table", { read: MatSort, static: false }) set bayConnectedBaymatSort(ms: MatSort) {
    this.bayConnectedBayDatasource.sort = ms;
  }
  //@ViewChild("shutdwonRequest_table", { read: MatSort, static: false }) set shutdownRequestmatSort(ms: MatSort) {
  //  this.shutdownRequestDatasource.sort = ms;
  //}

  originalData: any = [];
  selectedTabIndex = 0;
  FilterCategories: any = [];
  selectedFilters: any = {};
  selected_daterange: any;

  filter_search_text: { [key: string]: string } = {};

  filter_dashboard: any = {
    Substation: {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    Bay: {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      devicetype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    Equipment: {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      baytype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      devicetype: {
        name: "Equipment Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {                    // ← ADDED
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    TL: {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {                    // ← ADDED
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Observation TL": {
      mnttype: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {                    // ← ADDED
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Connected Bays": {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      devicetype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {                    // ← ADDED
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Connected TL": {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {                    // ← ADDED
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    },
    "Shutdown Request": {
      maintenancename: {
        name: "Maintenance Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      devicetype: {
        name: "Bay Type",
        unique_opts: {},
        options: [],
        selected: {}
      },
      status: {                    // ← ADDED
        name: "Status",
        unique_opts: {},
        options: [],
        selected: {}
      }
    }
  };

  time_settings: any = {
    rangeselection: 'mnt_db', //to show time range input in case of null time
    range: {
      start: null,
      end: null
    }
  };

  //

  allLables: { label: string; index: number; dataSource?: MatTableDataSource<any>; ngIf: boolean }[] = [];

  getPlanMaintenanceTabDetails() {
    const r = this.resolver.MaintenanceAccessRights;
    return [
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.substation, index: 1, dataSource: this.subDatasource, ngIf: r.scheduled_sub_bay_eqp_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.bay, index: 2, dataSource: this.bayDatasource, ngIf: r.scheduled_sub_bay_eqp_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.eqp, index: 3, dataSource: this.eqpDatasource, ngIf: r.scheduled_sub_bay_eqp_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.transmission, index: 4, dataSource: this.tlDatasource, ngIf: r.scheduled_tl_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.transmission_observation, index: 5, dataSource: this.obtlDatasource, ngIf: r.scheduled_observation_tl_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.connected_bay, index: 6, dataSource: this.tlConnectedBayDatasource, ngIf: r.scheduled_connected_tl_for_bay_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.connected_tl, index: 7, dataSource: this.bayConnectedTLDatasource, ngIf: r.scheduled_connected_bay_for_tl_tab_view },
      { label: this.locale_service.Locale.language.project.maintenancesettings.heading.connected_bay, index: 8, dataSource: this.bayConnectedBayDatasource, ngIf: r.scheduled_connected_bay_for_substation_tab_view },
    ];
  }

  getTabCount(tab: { dataSource?: { filteredData?: unknown[]; data?: unknown[] } }): number {
    if (!tab?.dataSource) return 0;
    const ds = tab.dataSource;
    return (ds.filteredData?.length ?? ds.data?.length) ?? 0;
  }

  async ngOnInit() {

    //this.saving = true;
    // this.debounceSearch = this.resolver.debounceSearch(this.applyFilter.bind(this), 300);
    this.resolver.schedule_mnt_dashboard = this;
    this.resolver.checkMaintenanceAccess(this.route.snapshot);
    this.group_path = this.route.snapshot.root.firstChild?.firstChild?.data?.viewData?.group_path ?? [];
    this.current_sel_path = this.group_path.slice(1, 5);
    this.current_sel_path.push('');
    this.allLables = this.getPlanMaintenanceTabDetails().filter(tab => tab.ngIf);
    console.log('[PvPlan] ngOnInit — group_path:', this.group_path, '| current_sel_path:', this.current_sel_path, '| allLables:', this.allLables.map(t => t.label));
  }




  fetchData(scheduledMntlst) {
    this.saving = true;
    console.log('[PvPlan] fetchData called — raw scheduledMntlst keys:', Object.keys(scheduledMntlst ?? {}));
    console.log('[PvPlan] raw counts — smntlst:', Object.keys(scheduledMntlst?.smntlst ?? {}).length,
      '| bmntlst:', Object.keys(scheduledMntlst?.bmntlst ?? {}).length,
      '| emntlst:', Object.keys(scheduledMntlst?.emntlst ?? {}).length,
      '| tmntlst:', Object.keys(scheduledMntlst?.tmntlst ?? {}).length,
      '| tlConnectedBay:', Object.keys(scheduledMntlst?.tlConnectedBay ?? {}).length,
      '| bayConnectedTL:', Object.keys(scheduledMntlst?.bayConnectedTL ?? {}).length,
      '| BayConnectedBay:', Object.keys(scheduledMntlst?.BayConnectedBay ?? {}).length);
    console.log('[PvPlan] full scheduledMntlst:', scheduledMntlst);
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const current_date = date.getTime();

    //const getFilterOptions = (mnt_item, cur_tab) => {
    //  Object.keys(this.filter_dashboard[cur_tab]).forEach(column => {
    //    this.filter_dashboard[cur_tab][column].unique_opts[mnt_item.template[column]] = ""; // make unique keys then convert to array
    //    this.filter_dashboard[cur_tab][column].options = Object.keys(this.filter_dashboard[cur_tab][column].unique_opts)
    //  })
    //}


    const  getFilterOptions = (row: any, tabKey: string) => {
      const filters = this.filter_dashboard[tabKey];
      if (!filters) return;

      // Always prefer display row first, then fall back to template
      const template = row.mntlst?.template;

      Object.keys(filters).forEach(key => {
        let value: string | undefined;

        if (key === 'status') {
          value = row.status;
        }
        else if (key === 'mnttype') {
          // Special case: Observation TL uses 'mnttype' but value is maintenancename
          value = template?.maintenancename;
        }
        else {
          // All other fields come from template
          value = template?.[key];
        }

        if (value) {
          filters[key].unique_opts[value] = true;
        }
      });

      // Rebuild options (sorted)
      Object.keys(filters).forEach(key => {
        filters[key].options = Object.keys(filters[key].unique_opts).sort();
      });
    }

    let sdatasource = [];
    let tdatasource = [];
    let bdatasource = [];
    let edatasource = [];
    let ob_tl_datasource = [];
    let tlconnectedbaysource = [];
    let bayconnectedTLsource = [];
    let bayconnectedBaysource = [];
    let shutdownRequestdatasource = [];

    //substation data mapping

    Object.keys(scheduledMntlst.smntlst).forEach(ss => {
      scheduledMntlst.smntlst[ss].forEach(mnt => {
        //const bay = mnt.Item1.split('/')[0]; // Extract bay from path
        const mnt_item = mnt.Item2;
        const template = mnt_item.template;


        // Determine the correct path to use

        let  pathlst = mnt.Item1.split('/');


        const obj = {
          _id: ss,
          type: "Substation",
          path: mnt.Item1,
          cutoff: mnt_item.cutoff_date,
          cutoffstr: this.appservice.dateToString(mnt_item.cutoff_date, 4),
          //reqshutdown: template.reqshutdown,
          freq: mnt_item.frequency?._id,
          mnt: template._id,
          mnttype: template.maintenancename,
          mntlst: mnt_item,
          //connected_bay: template.connected_bay,
          //baytype: template.devicetype,
          zone: this.appservice.unescapedName(pathlst[1]),
          circle: this.appservice.unescapedName(pathlst[2]),
          division: this.appservice.unescapedName(pathlst[3]),
          substation: this.appservice.unescapedName(pathlst[4]),
          //bay: this.appservice.unescapedName(pathlst[5]),
          status: (current_date > mnt_item.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled"
        };

        getFilterOptions(obj, 'Substation');

        sdatasource.push(obj);

      });
    });
    console.log('[PvPlan] after smntlst — substation rows:', sdatasource.length);
    Object.keys(scheduledMntlst.tmntlst).forEach(tl => {
      scheduledMntlst.tmntlst[tl].forEach(mnt => {
        let pathlst = mnt.Item1.split('/').slice(0, -1);
        let line_name = mnt.Item1.split('/').slice(-1)[0].split(mnt.Item2.tower_range)[0];
        let mnt_item = mnt.Item2;

        let obj = {
          _id: tl,
          type: "TL",
          path: this.appservice.unescapedName(pathlst.join("/")),
          cutoff: mnt.Item2.cutoff_date,
          cutoffstr: this.appservice.dateToString(mnt.Item2.cutoff_date, 4),
          freq: mnt.Item2?.frequency?._id ?? '',
          mnt: mnt.Item2?.template?._id,
          mnttype: mnt.Item2.template.maintenancename,
          mntlst: mnt.Item2,
          zone: this.appservice.unescapedName(pathlst[1]),
          circle: this.appservice.unescapedName(pathlst[2]),
          division: this.appservice.unescapedName(pathlst[3]),
          line_name: this.appservice.unescapedName(line_name),
          tower_range: mnt.Item2.tower_range,
          status: (current_date > mnt.Item2.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled",
        }
        getFilterOptions( obj, 'TL')
        if (!mnt.Item2.template._id.startsWith('pov'))
          tdatasource.push(obj);
        else {
          obj["bay_path"] = this.appservice.unescapedName(mnt.Item2.bay_path.split("/")[5]);
          obj["line_name"] = this.appservice.unescapedName(mnt.Item2.mnt_on_line.split("/")[4]);
          ob_tl_datasource.push(obj);
        }
      });
    });

    console.log('[PvPlan] after tmntlst — TL rows:', tdatasource.length, '| ob_tl rows:', ob_tl_datasource.length);

    // Update bdatasource for removal of duplicate entries for Connected line bays and tl maintenance on bay
    const pttMntMap = new Map();
    Object.keys(scheduledMntlst.bmntlst).forEach(bay => {
      scheduledMntlst.bmntlst[bay].forEach(mnt => {
        //const bay = mnt.Item1.split('/')[0]; // Extract bay from path
        const mnt_item = mnt.Item2;
        const template = mnt_item.template;



        // Determine the correct path to use
        let pathlst;
        if (mnt_item.maintenance_on_bay) {
          pathlst = mnt_item.maintenance_on_bay.split('/');
        }
        else if (mnt.Item2.mnt_source != null)
          pathlst = mnt.Item2.mnt_source.split('/');
        else {
          pathlst = mnt.Item1.split('/');
        }

        const obj = {
          _id: bay,
          type: "Bay",
          path: mnt.Item1,
          cutoff: mnt_item.cutoff_date,
          cutoffstr: this.appservice.dateToString(mnt_item.cutoff_date, 4),
          reqshutdown: template.reqshutdown,
          freq: mnt_item.frequency?._id,
          mnt: template._id,
          mnttype: template.maintenancename,
          mntlst: mnt_item,
          connected_bay: template.connected_bay,
          baytype: this.appservice.unescapedName(template.devicetype),
          zone: this.appservice.unescapedName(pathlst[1]),
          circle: this.appservice.unescapedName(pathlst[2]),
          division: this.appservice.unescapedName(pathlst[3]),
          substation: this.appservice.unescapedName(pathlst[4]),
          bay: this.appservice.unescapedName(pathlst[5]),
          status: (current_date > mnt_item.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled",
        };

        getFilterOptions( obj, 'Bay');
        //if (mnt_item.template._id.startsWith('ptt'))
        //  getFilterOptions(obj, 'Shutdown Request');

        const mntId = template._id + pathlst.join('/') + (mnt_item.tower_range ?? "");
        const hasMntOnBay = mnt_item.maintenance_on_bay != null;
        //if (mnt_item.template._id.startsWith('ptt'))   //Handle TL shutdown bay maintenance
        //  shutdownRequestdatasource.push(obj);
        if (mnt_item.bay_maintenance_on_tl_observation && mntId.startsWith('pov'))   // Handle observation TL datasource
          ob_tl_datasource.push(obj);
        else if (template._id.startsWith('ptt')) {
          if (!pttMntMap.has(mntId) || (hasMntOnBay && !pttMntMap.get(mntId).hasMntOnBay))
            pttMntMap.set(mntId, {
              obj: obj,
              hasMntOnBay: hasMntOnBay
            });
        }
        else {
          bdatasource.push(obj);
        }
      });
    });

    //update only unique mnt
    pttMntMap.forEach(entry => {
      shutdownRequestdatasource.push(entry.obj);
    });

    console.log('[PvPlan] after bmntlst — bay rows:', bdatasource.length, '| shutdown rows:', shutdownRequestdatasource.length, '| ob_tl (bay-sourced):', ob_tl_datasource.length);
    Object.keys(scheduledMntlst.emntlst).forEach(eqp => {
      scheduledMntlst.emntlst[eqp].forEach(mnt => {
        let pathlst = mnt.Item1.split('/');
        let mnt_item = mnt.Item2;

        const obj = {
          _id: eqp,
          type: "Equipment",
          path: mnt.Item1,
          cutoff: mnt.Item2.cutoff_date,
          cutoffstr: this.appservice.dateToString(mnt.Item2.cutoff_date, 4),
          reqshutdown: mnt.Item2.template.reqshutdown,
          freq: mnt.Item2?.frequency?._id,
          mnt: mnt.Item2.template._id,
          mnttype: mnt.Item2.template.maintenancename,
          mntlst: mnt.Item2,
          connected_bay: mnt.Item2.template?.connected_bay,
          eqptype: this.appservice.unescapedName(mnt.Item2.template.devicetype),
          zone: this.appservice.unescapedName(pathlst[1]),
          circle: this.appservice.unescapedName(pathlst[2]),
          division: this.appservice.unescapedName(pathlst[3]),
          substation: this.appservice.unescapedName(pathlst[4]),
          bay: this.appservice.unescapedName(pathlst[5]),
          baytype: this.appservice.unescapedName(mnt.Item2.template.baytype),
          eqp: this.appservice.unescapedName(pathlst[6]),
          status: (current_date > mnt.Item2.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled",
        };

        edatasource.push(obj);
        getFilterOptions(obj, 'Equipment');
      });
    });


    console.log('[PvPlan] after emntlst — equipment rows:', edatasource.length);
    const tlConnectedBayMntMap = new Map();
    Object.keys(scheduledMntlst.tlConnectedBay).forEach(tlConn => {
      scheduledMntlst.tlConnectedBay[tlConn]
        .forEach(mnt => {
          //let pathlst = mnt.Item1.split('/');
          let mnt_item = mnt.Item2;
          let pathlst;
          if (mnt_item.maintenance_on_bay) {
            pathlst = mnt_item.maintenance_on_bay.split('/');
          }
          else if (mnt.Item2.mnt_source != null)
            pathlst = mnt.Item2.mnt_source.split('/');
          else {
            pathlst = mnt.Item1.split('/');
          }


          let obj = {
            _id: tlConn,
            type: "TL",
            path: mnt.Item1,
            cutoff: mnt.Item2.cutoff_date,
            cutoffstr: this.appservice.dateToString(mnt.Item2.cutoff_date, 4),
            reqshutdown: mnt.Item2.template.reqshutdown,
            freq: mnt.Item2?.frequency?._id,
            mnt: mnt.Item2.template._id,
            mnttype: mnt.Item2.template.maintenancename,
            mntlst: mnt.Item2,
            connected_bay: mnt.Item2.template?.connected_bay,
            eqptype: this.appservice.unescapedName(mnt.Item2.template.devicetype),
            zone: this.appservice.unescapedName(pathlst[1]),
            circle: this.appservice.unescapedName(pathlst[2]),
            division: this.appservice.unescapedName(pathlst[3]),
            substation: this.appservice.unescapedName(pathlst[4]),
            bay: this.appservice.unescapedName(pathlst[5]),
            baytype: this.appservice.unescapedName(mnt.Item2.template.devicetype),
            eqp: this.appservice.unescapedName(pathlst[6]),
            status: (current_date > mnt.Item2.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled",
          };
          getFilterOptions( obj, 'Connected Bays')
          const mntId = obj.mnt + pathlst.join('/');
          if (!tlConnectedBayMntMap.has(mntId)) {
            tlConnectedBayMntMap.set(mntId, {
              obj: obj
            });
          }
        });
    });
    //update only unique mnt
    tlConnectedBayMntMap.forEach(entry => {
      tlconnectedbaysource.push(entry.obj);
    });

    const bayConnectedTLMntMap = new Map();
    Object.keys(scheduledMntlst.bayConnectedTL).forEach(bayConn => {
      scheduledMntlst.bayConnectedTL[bayConn]
        .forEach(mnt => {
          //let pathlst = mnt.Item1.split('/');
          let mnt_item = mnt.Item2;
          let pathlst;
          if (mnt_item.maintenance_on_bay) {
            pathlst = mnt_item.maintenance_on_bay.split('/');
          }
          else if (mnt.Item2.mnt_source != null)
            pathlst = mnt.Item2.mnt_source.split('/');
          else {
            pathlst = mnt.Item1.split('/');
          }

          let obj = {
            _id: bayConn,
            type: "TL",
            path: this.appservice.unescapedName(pathlst.join("/")),
            cutoff: mnt.Item2.cutoff_date,
            cutoffstr: this.appservice.dateToString(mnt.Item2.cutoff_date, 4),
            freq: mnt.Item2?.frequency?._id ?? '',
            mnt: mnt.Item2?.template?._id,
            mnttype: mnt.Item2.template.maintenancename,
            mntlst: mnt.Item2,
            zone: this.appservice.unescapedName(pathlst[1]),
            circle: this.appservice.unescapedName(pathlst[2]),
            division: this.appservice.unescapedName(pathlst[3]),
            line_name: this.appservice.unescapedName(pathlst[4]),
            tower_range: mnt.Item2.tower_range,
            status: (current_date > mnt.Item2.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled",
          };
          getFilterOptions( obj, "Connected TL")

          const mntId = obj.mnt + obj._id + (obj.tower_range ?? "");
          if (!bayConnectedTLMntMap.has(mntId)) {
            bayConnectedTLMntMap.set(mntId, {
              obj: obj
            });
          }

        });
    });
    //update only unique mnt
    bayConnectedTLMntMap.forEach(entry => {
      bayconnectedTLsource.push(entry.obj);
    });

    const bayConnectedBayMntMap = new Map();
    Object.keys(scheduledMntlst.BayConnectedBay).forEach(bayConn => {
      scheduledMntlst.BayConnectedBay[bayConn]
        .forEach(mnt => {
          //let pathlst = mnt.Item1.split('/');
          let mnt_item = mnt.Item2;
          let pathlst;
          if (mnt_item.maintenance_on_bay) {
            pathlst = mnt_item.maintenance_on_bay.split('/');
          }
          else if (mnt.Item2.mnt_source != null)
            pathlst = mnt.Item2.mnt_source.split('/');
          else {
            pathlst = mnt.Item1.split('/');
          }


          let obj = {
            _id: bayConn,
            type: "Bay",
            path: mnt.Item1,
            cutoff: mnt.Item2.cutoff_date,
            cutoffstr: this.appservice.dateToString(mnt.Item2.cutoff_date, 4),
            reqshutdown: mnt.Item2.template.reqshutdown,
            freq: mnt.Item2?.frequency?._id,
            mnt: mnt.Item2.template._id,
            mnttype: mnt.Item2.template.maintenancename,
            mntlst: mnt.Item2,
            connected_bay: mnt.Item2.template?.connected_bay,
            eqptype: this.appservice.unescapedName(mnt.Item2.template.devicetype),
            zone: this.appservice.unescapedName(pathlst[1]),
            circle: this.appservice.unescapedName(pathlst[2]),
            division: this.appservice.unescapedName(pathlst[3]),
            substation: this.appservice.unescapedName(pathlst[4]),
            bay: this.appservice.unescapedName(pathlst[5]),
            baytype: this.appservice.unescapedName(mnt.Item2.template.devicetype),
            eqp: this.appservice.unescapedName(pathlst[6]),
            status: (current_date > mnt.Item2.cutoff_date) ? this.getDelayInDays(mnt_item.cutoff_date) : "Scheduled",
          };
          getFilterOptions(obj, 'Connected Bays')
          const mntId = obj.mnt + pathlst.join('/');
          if (!bayConnectedBayMntMap.has(mntId)) {
            bayConnectedBayMntMap.set(mntId, {
              obj: obj
            });
          }
        });
      //update only unique mnt
      bayConnectedBayMntMap.forEach(entry => {
        bayconnectedBaysource.push(entry.obj);
      });
    });


    console.log('[PvPlan] after tlConnectedBay/bayConnectedTL/BayConnectedBay — tlConnBay:', tlconnectedbaysource.length,
      '| bayConnTL:', bayconnectedTLsource.length, '| bayConnBay:', bayconnectedBaysource.length);
    console.log('[PvPlan] ── FINAL COUNTS ──',
      '| sub:', sdatasource.length, '| bay:', bdatasource.length, '| eqp:', edatasource.length,
      '| tl:', tdatasource.length, '| ob_tl:', ob_tl_datasource.length,
      '| tlConnBay:', tlconnectedbaysource.length, '| bayConnTL:', bayconnectedTLsource.length, '| bayConnBay:', bayconnectedBaysource.length);

    this.tlDatasource.data = this.sortDatasource(tdatasource);
    this.obtlDatasource.data = ob_tl_datasource
    this.bayDatasource.data = this.sortDatasource(bdatasource);
    this.eqpDatasource.data = this.sortDatasource(edatasource);
    this.tlConnectedBayDatasource.data = this.sortDatasource(tlconnectedbaysource);
    this.bayConnectedTLDatasource.data = this.sortDatasource(bayconnectedTLsource);
    this.bayConnectedBayDatasource.data = this.sortDatasource(bayconnectedBaysource);
    //this.shutdownRequestDatasource.data = this.sortDatasource(shutdownRequestdatasource);
    this.subDatasource.data = this.sortDatasource(sdatasource);

    this.originalSubData = [...this.subDatasource.data];
    this.originalBayData = [...this.bayDatasource.data];
    this.originalEqpData = [...this.eqpDatasource.data];
    this.originalTLData = [...this.tlDatasource.data];
    this.originalObservationTLData = [...this.obtlDatasource.data];
    this.originalTLConnectedBayData = [...this.tlConnectedBayDatasource.data];
    this.originalBayConnectedTLData = [...this.bayConnectedTLDatasource.data];
    this.originalData = {
      Substation: [...this.subDatasource.data],
      Bay: [...this.bayDatasource.data],
      Equipment: [...this.eqpDatasource.data],
      TL: [...this.tlDatasource.data],
      "Observation TL": [...this.obtlDatasource.data],
      "Connected Bays": [...this.tlConnectedBayDatasource.data],
      "Connected TL": [...this.bayConnectedTLDatasource.data],
      //"Shutdown Request": [...this.shutdownRequestDatasource.data]
    };
    console.log('[PvPlan] datasource.data lengths after assignment — sub:', this.subDatasource.data.length,
      '| bay:', this.bayDatasource.data.length, '| eqp:', this.eqpDatasource.data.length,
      '| tl:', this.tlDatasource.data.length, '| ob_tl:', this.obtlDatasource.data.length);
    if (this.subDatasource.data.length > 0)
      console.log('[PvPlan] sample substation row:', this.subDatasource.data[0]);
    if (this.bayDatasource.data.length > 0)
      console.log('[PvPlan] sample bay row:', this.bayDatasource.data[0]);
    this.applyFilters();
    console.log('[PvPlan] after applyFilters — sub filteredData:', this.subDatasource.filteredData?.length,
      '| bay filteredData:', this.bayDatasource.filteredData?.length);
    this.saving = false;
  }

  sortDatasource(datasource: any[]) {
    datasource.sort((a, b) => a.cutoff- b.cutoff);
    return datasource;
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.selectedTabIndex = event.index; // Update selected index
    this.selectedTabLabel = event.tab.textLabel;
    // Reset the shared search-bar text — the previous query is rarely
    // meaningful in a sibling tab's datasource.
    this.dashboardSearchText = '';

    if (this.tlFilter && this.tlFilter.nativeElement) {
      this.tlFilter.nativeElement.value = '';
      this.tlDatasource.filter = '';
      this.tlDatasource.data = this.tlDatasource.data.slice();
    }
    if (this.bayFilter && this.bayFilter.nativeElement) {
      this.bayFilter.nativeElement.value = '';
      this.bayDatasource.filter = '';
      this.bayDatasource.data = this.bayDatasource.data.slice();
    }
    if (this.eqpFilter && this.eqpFilter.nativeElement) {
      this.eqpFilter.nativeElement.value = '';
      this.eqpDatasource.filter = '';
      this.eqpDatasource.data = this.eqpDatasource.data.slice();
    }
    if (this.tlConnectedBayFilter && this.tlConnectedBayFilter.nativeElement) {
      this.tlConnectedBayFilter.nativeElement.value = '';
      this.tlConnectedBayDatasource.filter = '';
      this.tlConnectedBayDatasource.data = this.tlConnectedBayDatasource.data.slice();
    }
    if (this.bayConnectedTLFilter && this.bayConnectedTLFilter.nativeElement) {
      this.bayConnectedTLFilter.nativeElement.value = '';
      this.bayConnectedTLDatasource.filter = '';
      this.bayConnectedTLDatasource.data = this.bayConnectedTLDatasource.data.slice();
    }
    //if (this.shutdownRequestFilter && this.shutdownRequestFilter.nativeElement) {
    //  this.shutdownRequestFilter.nativeElement.value = '';
    //  this.shutdownRequestDatasource.filter = '';
    //  this.shutdownRequestDatasource.data = this.shutdownRequestDatasource.data.slice();
    //}

    this.refeshpage.detectChanges();
    this.clearAllFilters()
  }

  getDelayInDays(timestamp: number): string {
    if (!timestamp) return "";

    const input = new Date(timestamp);
    const today = new Date();

    // normalize both to start of day (local time)
    input.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffMs = today.getTime() - input.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let days = diffDays > 0 ? diffDays : 0;
    return "Delayed By " + days + " Day" + ((days > 1) ? "s" : "");

  }



  async openPlanDlg(element, type) {
    if (this.selectedTabLabel == this.locale_service.Locale.language.project.maintenancesettings.heading.transmission) {
      if (!this.resolver.MaintenanceAccessRights.schedule_tl_maintenance) {
        this._snackBar.open("You don't have access to Schedule " + this.selectedTabLabel + " Maintenance", null,
          {
            duration: 2000
          });
        return;
      }
    }
    else {
      if (!this.resolver.MaintenanceAccessRights.create_scheduled_maintenance) {
        this._snackBar.open("You don't have access to Schedule " + this.selectedTabLabel + " Maintenance", null,
          {
            duration: 2000
          });
        return;
      }
    }

    const modal = await this.modalController.create({
      component: PlanMaintenanceDlgComponent,
      componentProps: { dialogData: { obj: element, type } }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data != null) {
      element.time_range_type = data.time_range_type;
      element.time_range_value = data.time_range_value;
      const datasources = {
        'tl': this.tlDatasource,
        'bay': this.bayDatasource,
        'eqp': this.eqpDatasource,
        'ob_tl': this.obtlDatasource
      };
      const datasource = datasources[type];
      if (datasource) {
        this.refeshpage.detectChanges();
      }
    }
  }

  async openBaySelectionDlg(element: any) {
    const modal = await this.modalController.create({
      component: BaySelectionDlgComponent,
      backdropDismiss: false,
      componentProps: {
        dialogData: { element: element }
      }
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data != null) {
      this.isBaySelected[element.path + '/' + element._id + '|' + element.mnt + '|' + element.tower_range] = true;
      this.refeshpage.detectChanges();
    }
  }

  updateCardStatus(datasource, element, plannedDate) {
    if (element.type === "Bay" && element.mntlst.template._id.startsWith('ptt')) {
      datasource.data = datasource.data.filter(card => !(card.mntlst.template._id === element.mntlst.template._id));
      datasource.data = datasource.data.slice();
    } else {
      let rem_ind = datasource.data.findIndex(card => ((card.path === element.path) && (card.mntlst.template._id == element.mntlst.template._id)))
      datasource.data.splice(rem_ind, 1)
      datasource.data = datasource.data.slice();
    }
    this.refeshpage.detectChanges();
  }

  /**
   * Text search driven by the shared search-filter-bar. Applied to whichever
   * datasource is behind the currently-visible tab (resolved via the same
   * label→datasource map used by clearAllFilters).
   */
  dashboardSearchText = '';

  onDashboardSearch(text: string) {
    this.dashboardSearchText = text ?? '';
    const q = this.dashboardSearchText.trim().toLowerCase();
    const key = this.getDatasourceKey(this.selectedTabLabel);
    if (key && (this as any)[key]) {
      ((this as any)[key] as MatTableDataSource<any>).filter = q;
    }
  }

  applyFilter(filterType: string, event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (filterType == 'substation') {
      this.subDatasource.filter = filterValue.trim().toLowerCase();
    }
    if (filterType === 'bay') {
      this.bayDatasource.filter = filterValue.trim().toLowerCase();
    } else if (filterType === 'equipment') {
      this.eqpDatasource.filter = filterValue.trim().toLowerCase();
    } else if (filterType === 'transmission') {
      this.tlDatasource.filter = filterValue.trim().toLowerCase();
    }
    else if (filterType === 'observationTL') {
      this.obtlDatasource.filter = filterValue.trim().toLowerCase();
    }
    else if (filterType === 'tlConnectedBay') {
      this.tlConnectedBayDatasource.filter = filterValue.trim().toLowerCase();
    }
    else if (filterType === 'bayConnectedTL') {
      this.bayConnectedTLDatasource.filter = filterValue.trim().toLowerCase();
    }

  }


  ngAfterViewInit() {
    setTimeout(() => {
      this.update_counter = 0;
      this.signalr.StartSendData();
      //this.createTable();

    });

    const selectedTab = this.tabGroup._tabs.get(this.selectedTabIndex);
    if (selectedTab) {
      const tabChangeEvent: MatTabChangeEvent = { index: this.selectedTabIndex, tab: selectedTab };
      this.onTabChange(tabChangeEvent);
    }

  }


  //applyFilters() {
  //  const tabConfig = {
  //    Bay: { dataSource: this.bayDatasource, original: this.originalData.Bay, filters: ['maintenancename', 'devicetype','status'] },
  //    Equipment: { dataSource: this.eqpDatasource, original: this.originalData.Equipment, filters: ['maintenancename', 'baytype', 'devicetype'] },
  //    TL: { dataSource: this.tlDatasource, original: this.originalData.TL, filters: ['maintenancename', 'devicetype'] },
  //    "Connected Bays": { dataSource: this.tlConnectedBayDatasource, original: this.originalData["Connected Bays"], filters: ['maintenancename', 'devicetype'] },
  //    "Connected TL": { dataSource: this.bayConnectedTLDatasource, original: this.originalData["Connected TL"], filters: ['maintenancename'] },
  //    "Shutdown Request": { dataSource: this.shutdownRequestDatasource, original: this.originalData["Shutdown Request"], filters: ['maintenancename', 'devicetype'] },
  //  };

  //  const config = tabConfig[this.selectedTabLabel];
  //  if (!config) return;

  //  const selectedFilters: Record<string, string[]> = config.filters.reduce((acc, filterKey) => {
  //    acc[filterKey] = Object.keys(this.filter_dashboard[this.selectedTabLabel]?.[filterKey]?.selected || {});
  //    return acc;
  //  }, {} as Record<string, string[]>); // Explicitly typing selectedFilters as Record<string, string[]>

  //  // Reset if no filters are selected
  //  if (Object.values(selectedFilters).every((filter: string[]) => filter.length === 0)) {
  //    config.dataSource.data = [...config.original];
  //    return;
  //  }

  //  // Apply filters dynamically
  //  config.dataSource.data = config.original.filter(item =>
  //    Object.entries(selectedFilters).every(([filterKey, selectedValues]) =>
  //      selectedValues.length === 0 || selectedValues.includes(item.mntlst.template[filterKey] || item.mntlst?.template?.maintenancename)
  //    )
  //  );
  //}

  applyFilters() {
    const tabConfig = {
      Substation: { dataSource: this.subDatasource, original: this.originalData.Substation, filters: ['maintenancename', 'devicetype', 'status'] },
      Bay: { dataSource: this.bayDatasource, original: this.originalData.Bay, filters: ['maintenancename', 'devicetype', 'status'] },
      Equipment: { dataSource: this.eqpDatasource, original: this.originalData.Equipment, filters: ['maintenancename', 'baytype', 'devicetype', 'status'] },
      TL: { dataSource: this.tlDatasource, original: this.originalData.TL, filters: ['maintenancename', 'status'] },
      "Observation TL": { dataSource: this.obtlDatasource, original: this.originalData["Observation TL"], filters: ['mnttype', 'status'] },
      "Connected Bays": { dataSource: this.tlConnectedBayDatasource, original: this.originalData["Connected Bays"], filters: ['maintenancename', 'devicetype', 'status'] },
      "Connected TL": { dataSource: this.bayConnectedTLDatasource, original: this.originalData["Connected TL"], filters: ['maintenancename', 'status'] },
      //"Shutdown Request": { dataSource: this.shutdownRequestDatasource, original: this.originalData["Shutdown Request"], filters: ['maintenancename', 'devicetype', 'status'] },
    };

    const config = tabConfig[this.selectedTabLabel];
    if (!config) return;

    const selectedFilters: Record<string, string[]> = config.filters.reduce((acc, filterKey) => {
      acc[filterKey] = Object.keys(this.filter_dashboard[this.selectedTabLabel]?.[filterKey]?.selected || {});
      return acc;
    }, {} as Record<string, string[]>);

    if (Object.values(selectedFilters).every(arr => arr.length === 0)) {
      config.dataSource.data = [...config.original];
      return;
    }

    config.dataSource.data = config.original.filter(item => {
      return Object.entries(selectedFilters).every(([key, values]) => {
        if (values.length === 0) return true;

        // Special handling for 'status' — it's on the row object, not in template
        if (key === 'status') {
          return values.includes(item.status);
        }

        // For template-based fields
        if (item.mntlst?.template?.[key] !== undefined) {
          return values.includes(item.mntlst.template[key]);
        }

        // Fallback for "Observation TL" which uses mnttype instead of maintenancename
        if (key === 'mnttype' && item.mntlst?.template?.maintenancename !== undefined) {
          return values.includes(item.mntlst.template.maintenancename);
        }

        return false;
      });
    });
  }
  onCheckboxChange(option: string, selected: Record<string, any>) {
    if (!this.selectedTabLabel) return;

    if (selected[option]) {
      delete selected[option]; // Remove if already selected
    } else {
      selected[option] = "1"; // Add if not selected
    }
    this.applyFilters();
  }

  clearAllFilters() {
    const tab = this.filter_dashboard[this.selectedTabLabel];
    if (!tab) return;
    Object.values(tab).forEach((f: any) => { f.selected = {}; });
    Object.keys(tab).forEach(k => { this.filter_search_text[k] = ''; });
    const dataSourceKey = this.getDatasourceKey(this.selectedTabLabel);
    if (dataSourceKey && this.originalData[this.selectedTabLabel]) {
      this[dataSourceKey].data = [...this.originalData[this.selectedTabLabel]];
    }
    this.filter_dashboard = { ...this.filter_dashboard };
    this.cdRef.detectChanges();
  }

  filteredCategoryOptions(category_key: string, options: any[]): any[] {
    const q = (this.filter_search_text[category_key] || '').trim().toLowerCase();
    if (!q) return options || [];
    return (options || []).filter(o => (o ?? '').toString().toLowerCase().includes(q));
  }

  getDatasourceKey(tabLabel: string): string | null {
    const datasourceMapping = {
      'Substation': 'subDatasource',
      'Bay': 'bayDatasource',
      'Equipment': 'eqpDatasource',
      'TL': 'tlDatasource',
      'Observation TL': 'obtlDatasource',
      'Connected Bays': 'tlConnectedBayDatasource',
      'Connected TL': 'bayConnectedTLDatasource',
      //'Shutdown Request': 'shutdownRequestDatasource'
    };

    return datasourceMapping[tabLabel] || null;
  }


  getFilterDetails(tabName: string) {
    this.FilterCategories = [];

    if (!this.filter_dashboard[tabName]) return;

    Object.keys(this.filter_dashboard[tabName]).forEach((key) => {
      this.FilterCategories.push({
        name: this.filter_dashboard[tabName][key].name,
        key: key,
        options: this.filter_dashboard[tabName][key].options.map(option => ({
          name: option,
          selected: this.selectedFilters[tabName]?.[key]?.includes(option) || false
        }))
      });
    });

    //console.log("Filters for", tabName, this.FilterCategories);
  }

  dateTimeChanged(ev) {
    // Send 'custom' to server so it uses the explicit range.start/end values,
    // but keep the original rangeselection (e.g. 'single_date') in time_settings for display.
    const serverPayload = { ...ev, rangeselection: 'custom' };
    this.signalr.UpdateScheduleDashboardTimeSettings(serverPayload).then(data => {
      if (data == null || data !== '') {
        if (data == null)
          this._snackBar.open(this.locale_service.Locale.language.errorcode.hub, this.locale_service.Locale.language.common.failed, {
            duration: 3000
          });
        else if (data.startsWith('rp_'))
          this._snackBar.open(this.locale_service.Locale.language.project.report.errorcode[data.substring(3)], this.locale_service.Locale.language.common.failed, { duration: 3000 });
        else
          this._snackBar.open(this.locale_service.Locale.language.errorcode[data], this.locale_service.Locale.language.common.failed, {
            duration: 3000
          });
      } else {
        this.time_settings = JSON.parse(JSON.stringify(ev));
      }
    });
    /*    this.time_settings = ev;
        this.selected_daterange = ev;
        this.time_settings = JSON.parse(JSON.stringify(this.time_settings));
    
        let filteredBay = this.originalBayData.filter((data) => (data.cutoff >= this.time_settings.range.start) && (data.cutoff <= this.time_settings.range.end))
        this.bayDatasource.data = filteredBay
        let filteredEqp = this.originalEqpData.filter((data) => (data.cutoff >= this.time_settings.range.start) && (data.cutoff <= this.time_settings.range.end))
        this.eqpDatasource.data = filteredEqp;
        let filteredTL = this.originalTLData.filter((data) => (data.cutoff >= this.time_settings.range.start) && (data.cutoff <= this.time_settings.range.end))
        this.tlDatasource.data = filteredTL;*/
  }

  clearAllSelections() {
    let ret_value: any = {

      range: {
        start: 0,
        end: 0
      }
    }

    this.signalr.UpdateScheduleDashboardTimeSettings(ret_value).then(data => {
      if (data == null || data !== '') {
        if (data == null)
          this._snackBar.open(this.locale_service.Locale.language.errorcode.hub, this.locale_service.Locale.language.common.failed, {
            duration: 3000
          });
        else if (data.startsWith('rp_'))
          this._snackBar.open(this.locale_service.Locale.language.project.report.errorcode[data.substring(3)], this.locale_service.Locale.language.common.failed, { duration: 3000 });
        else
          this._snackBar.open(this.locale_service.Locale.language.errorcode[data], this.locale_service.Locale.language.common.failed, {
            duration: 3000
          });
      } else {

        this.time_settings = {
          rangeselection: 'mnt_db',
          range: {
            start: null,
            end: null
          }
        };

      }
    });
  }

  trackByMntCard(_index: number, item: any): string {
    return item._id + '|' + item.mnt + '|' + (item.tower_range ?? '') + '|' + item.path;
  }

  updateData(scheduleDataSource: any, details: any) {
    this.fetchData(details);
  };

}
