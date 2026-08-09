import { Injectable } from '@angular/core';
//import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

export const ObjectStandard = {
  CURRENT: "CURRENT",
  HOTSPOT: "HOTSPOT",
  VOLTAGE: "VOLTAGE",
  CBSTATUS: "CB STATUS",
  TRIPCIRCUITHEALTY: "Trip Circuit Healthiness",
  GENERALPARAMETER: "General Parameters",
  ISO: "ISO STATUS",
  PROTECTION_ALARM: "PROTECTION ALARM",
  TEMPRATURE: "TEMPRATURE",
  OTHER_ALARM: 'OTHER ALARM',
  OTHER_ALARM_CRITICAL: 'OTHER ALARM CRITICAL',
  OTHER_ALARM_HIGH: 'OTHER ALARM HIGH',
  OTHER_ALARM_MEDIUM: 'OTHER ALARM MEDIUM',
  OTHER_ALARM_LOW: 'OTHER ALARM LOW'
};
export const IndicationsGroup = {
  INDICATION_GROUP: [
    ObjectStandard.OTHER_ALARM,
    ObjectStandard.OTHER_ALARM_CRITICAL,
    ObjectStandard.OTHER_ALARM_HIGH,
    ObjectStandard.OTHER_ALARM_MEDIUM,
    ObjectStandard.OTHER_ALARM_LOW
  ]
} as const;
export enum OSObjectType {
  None = 0x00,
  Input = 0x01,
  Output = 0x02,
  Physical = 0x04,
  Sofware = 0x08,
  System = 0x10,
  Functional = 0x20,
  Editable = 0x40,
  Counter = 0x60,
  Sequence = 0x80,

  PhysicalInput = Input | Physical,
  PhysicalOuput = Output | Physical,
  SystemInput = Input | System,
  SystemOutput = Output | System,
  SoftwareFunctional = Input | Sofware | Functional,
  SoftwareEditable = Input | Output | Sofware | Editable,
  SoftwareSequence = Sofware | Input | Output | Sequence,
  SoftwareCounter = Sofware | Input | Counter,
}

export enum OSEntryType {
  ConfigurationParameter = 0x00,
  OperationalLog = 0x01,
  EventEntry = 0x02
}

@Injectable({
  providedIn: 'root'
})
export class ObjectControlService {

  constructor(
    //private matIconRegistery: MatIconRegistry,
    private domSanitizer: DomSanitizer) { }

  typetoIcon(objectType: OSObjectType): string {
    switch (objectType) {
      case OSObjectType.PhysicalInput:
        return "rbh_object_phyinput";
      case OSObjectType.PhysicalOuput:
        return "rbh_object_phyoutput";
      case OSObjectType.SystemInput:
        return "rbh_object_sysinput";
      case OSObjectType.SystemOutput:
        return "rbh_object_sysoutput";
      case OSObjectType.SoftwareFunctional:
        return "rbh_object_softfunction";
      case OSObjectType.SoftwareSequence:
        return "rbh_object_softsequence";
      case OSObjectType.SoftwareCounter:
        return "rbh_object_softcounter";
      default:
        return "rbh_object_softedit";
    }
  }
  svgiconRegistry() {
    // this.matIconRegistery.addSvgIcon("rbh_object_phyinput", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/PhyInput.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_phyoutput", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/PhyOutput.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_sysinput", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/SysInput.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_sysoutput", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/SysOutput.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_softfunction", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/SoftFunction.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_softedit", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/SoftEdit.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_softsequence", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/SoftSequence.svg"));
    // this.matIconRegistery.addSvgIcon("rbh_object_softcounter", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/SoftCounter.svg"));
    //this.matIconRegistery.addSvgIcon("column_filter", this.domSanitizer.bypassSecurityTrustResourceUrl("../assets/images/filter.svg"));
  }
}
