export interface Notice {
  _id: string;
  _rev: string;
  sender: UserInfo;
  receivingUsers: UserInfo[];
  receivingGroups: string[];
  messageText: string;
  timestamp: number;
  isUrgent: boolean;
  readBy: string[];
  isNotification: boolean;
  isActionable?: boolean;
  actionType?: string;
  actionMetadata?: {
    maintenance_id?: string;
    target_view?: string;
    target_tab?: string;
    route_params?: any;
    expectedCompletionStatus?: string | string[];
    currentStatus?: string;
    [key: string]: any;
  };
  actionButtonText?: string;
}

export interface UserInfo {
  id: string;
  name: string;
}
