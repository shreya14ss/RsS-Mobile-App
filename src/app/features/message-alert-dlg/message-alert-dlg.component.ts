import { Component, OnInit, OnDestroy, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { formatDate } from '@angular/common';
import { AppService, Notice } from 'src/app/core/services/app.service';
import { MaintenanceService } from 'src/app/core/services/maintenance.service';
import { NoticeActionService } from 'src/app/core/services/notice-action.service';
import { SignalRService } from 'src/app/core/services/signal-r.service';

interface UserInfo {
  id: string;
  name: string;
}


@Component({
  selector: 'app-message-alert-dlg',
  templateUrl: './message-alert-dlg.component.html',
  styleUrls: ['./message-alert-dlg.component.scss']
})
export class MessageAlertDlgComponent implements OnInit, OnDestroy, OnChanges {
  @Input() set newNotice(value: Notice) {
    if (value) {
      const exists = this.allUrgentNotices.some(n => n._id === value._id);
      if (!exists) {
        this.allUrgentNotices.unshift(value);
        this.appservice.addCachedNotice(value);
      }
      this.groupedNoticesByDate();
    }
  }

  allUrgentNotices: Notice[] = [];
  private userId: string;
  private group_path: string;

  groupedNotices: { label: string, notices: any[] }[] = [];
  isLoading = false;

  private project_Id: string;
  private myParentPath: string;
  private messageReadSub: Subscription;
  private noticesRemovedSub: Subscription;
  @Input() selectedType: 'all' | 'actionable' | 'non-actionable' = 'non-actionable';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedType) {
      this.groupedNoticesByDate();
    }
  }

  constructor(
    public appservice: AppService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private mntservice: MaintenanceService,
    private noticeAction: NoticeActionService,
    private signalR: SignalRService
  ) { }

  ngOnInit(): void {
    this.userId = this.route.snapshot.data.viewData.user_id;
    const groupPathArray: string[] = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path;
    this.group_path = groupPathArray.join('/');

    const cached = this.appservice.cachedNotices;
    if (cached.length > 0) {
      this.allUrgentNotices = [...cached];
      this.isLoading = false;
      this.groupedNoticesByDate();
    }

    const pending = this.appservice.getPendingTapNotice();
    if (pending) {
      this.newNotice = pending;
      this.appservice.clearPendingTapNotice();
    }

    this.loadUnreadMessages();

    this.messageReadSub = this.signalR.GetMessageRead().subscribe((payload) => {
      this.removeNoticeById(payload.noticeId);
    });

    this.noticesRemovedSub = this.signalR.GetNoticesRemoved().subscribe((payload) => {
      this.removeNoticesByMaintenanceId(payload.maintenanceId, payload.deletedCount);
    });
  }

  ngOnDestroy(): void {
    this.messageReadSub?.unsubscribe();
    this.noticesRemovedSub?.unsubscribe();
  }

  private removeNoticeById(noticeId: string): void {
    const removed = this.allUrgentNotices.find((n) => n._id === noticeId);
    if (!removed) return;
    this.allUrgentNotices = this.allUrgentNotices.filter((n) => n._id !== noticeId);
    this.appservice.removeCachedNotice(noticeId);
    if (removed.isActionable) {
      this.appservice.decrementActionableUnreadCount();
    } else {
      this.appservice.decrementUnreadCount();
    }
    this.groupedNoticesByDate();
  }

  private removeNoticesByMaintenanceId(maintenanceId: string, _deletedCount: number): void {
    const matches = this.allUrgentNotices.filter(
      (n) => n.actionMetadata?.maintenance_id === maintenanceId
    );
    if (matches.length === 0) return;

    const actionableRemoved = matches.filter((n) => n.isActionable).length;
    const nonActionableRemoved = matches.length - actionableRemoved;

    this.allUrgentNotices = this.allUrgentNotices.filter(
      (n) => n.actionMetadata?.maintenance_id !== maintenanceId
    );
    this.appservice.removeCachedNoticesByMaintenanceId(maintenanceId);

    if (actionableRemoved > 0) {
      this.appservice.decrementActionableUnreadCountBy(actionableRemoved);
    }
    if (nonActionableRemoved > 0) {
      this.appservice.decrementUnreadCountBy(nonActionableRemoved);
    }
    this.groupedNoticesByDate();
  }
  // navigate the user to the maintenance dashboard when the user clicks on the notification message
  navigateToMaintenanceTab($event, i, index) {
    if (i.isNotification) {
      let project_id = this.route.snapshot.root.firstChild.firstChild.paramMap.get('id');
      let path = this.route.snapshot.root.firstChild.firstChild.data.viewData.group_path.join('/');
      this.closeNotice($event, i, index)
      this.HideUrgentDlg();

      this.mntservice.NavigateToMaintenanceTab(project_id, path, "Maintenance Dashboard", "Bay");
    }
  }

  async loadUnreadMessages() {
    if (this.allUrgentNotices.length === 0) {
      this.isLoading = true;
    }
    await this.appservice.GetAllUnreadNotices(this.group_path).then((data: any) => {

      if (data?.views) {
        const newMessages = data.views
          .filter(message => !message.readBy?.includes(this.userId))
          .filter(message => message.receivingUsers?.some(user => user.id === this.userId) || message.receivingGroups?.includes(this.group_path))      // added filter so that only same path's users can see the message
          .filter(message => !message.actionMetadata?.status || message.actionMetadata.status !== "resolved")
          .map(message => ({
            _id: message._id,
            _rev: message._rev,
            sender: message.sender,
            receivingUsers: message.receivingUsers,
            receivingGroups: message.receivingGroups,
            messageText: message.messageText,
            uniqueCode: message.uniqueCode,
            timestamp: message.timestamp,
            isUrgent: message.isUrgent,
            readBy: message.readBy,
            isNotification: message.isNotification,
            isActionable: message.isActionable,
            actionType: message.actionType,
            actionMetadata: message.actionMetadata,
            actionButtonText: message.actionButtonText
          }));

        this.allUrgentNotices = newMessages;
        this.appservice.setCachedNotices(newMessages);

        //this.appservice.setUnreadCount(this.allUrgentNotices.length);

        if (this.allUrgentNotices != null) this.groupedNoticesByDate();

      } else {
        // Backend returns { code: "db" } when there are 0 unread notices — treat
        // that as an empty result and clear local state, so notices removed via
        // SignalR while the panel was closed disappear in real time on next open
        // instead of persisting from stale cache until logout.
        this.allUrgentNotices = [];
        this.appservice.setCachedNotices([]);
        this.groupedNoticesByDate();
      }
    }).catch(error => {
      console.log(error);
    }).finally(() => {
      this.isLoading = false;
    });
  }

  groupedNoticesByDate() {

    const grouped = new Map<string, any[]>();

    for (const notice of this.allUrgentNotices) {

      if (this.selectedType === 'actionable' && !notice.isActionable) continue;
      if (this.selectedType === 'non-actionable' && notice.isActionable) continue;

      const noticeDate = new Date(notice.timestamp);
      const key = formatDate(noticeDate, 'yyyy-MM-dd', 'en-US');

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      notice.messageText = this.displayText(notice);
      grouped.get(key)!.push(notice);
    }

    const result: { label: string, notices: any[] }[] = [];

    Array.from(grouped.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .forEach(([key, notices]) => {

        const label = formatDate(key, 'dd MMM yyyy', 'en-US');

        result.push({ label, notices });
      });

    this.groupedNotices = [...result];
  }

  closeNotice($event, notice, index) {
    if (!notice.readBy) notice.readBy = [];

    if (!notice.readBy.includes(this.userId)) {
      notice.readBy.push(this.userId);
    }


    this.appservice.UpdateReadMessages(notice)
      .then((data: any) => {
      })
      .catch(error => {
        console.error(error);
      });

    this.appservice.removeCachedNotice(notice._id);
    this.updateDataSourceOnUpdate(notice, index);
    if (notice.isActionable) {
      this.appservice.decrementActionableUnreadCount();
    }
    else
      this.appservice.decrementUnreadCount();

  }

  updateDataSourceOnUpdate(notice: any, index) {
    this.allUrgentNotices = this.allUrgentNotices.filter(n => n._id !== notice._id);


    const date = new Date(notice.timestamp);
    const format = (date: Date) => formatDate(date, 'dd MMM yyyy', 'en-US');
    let edate = format(date);

    for (let i = 0; i < this.groupedNotices.length; i++) {
      if (this.groupedNotices[i].label == edate) {
        this.groupedNotices[i].notices.splice(index, 1);

        if (this.groupedNotices[i].notices.length == 0)
          this.groupedNotices.splice(i, 1);
      }
    }
  }

  gettimekeys(items: any) {
    const arr = [];
    if (items != null) {
      for (let item of Object.keys(items)) {
        arr.push({ key: item, value: items[item] });
      }
    }

    return arr;
  }

  changeDateString(day, ind) {
    let today = new Date();
    let yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const chng_today = this.DateConverter(today.toLocaleDateString('en-US'));
    const chng_yesterday = this.DateConverter(yesterday.toLocaleDateString('en-US'));
    if (day == chng_today)
      return "Today";

    else if (day == chng_yesterday)
      return "Yesterday"
    return day;
  }

  HideUrgentDlg() {
    this.appservice.urgentDlgHide();
  }

  DateConverter(notice) {
    const date = new Date(notice);
    const format = (date: Date) => formatDate(date, 'dd MMM yyyy', 'en-US');
    let edate = format(date);
    return edate;
  }

  canNavigate(notice: any): boolean {
    return this.noticeAction.canNavigate(notice);
  }

  async handleActionableEvent(notice: Notice, index) {
    if (!this.noticeAction.canNavigate(notice)) return;
    await this.noticeAction.executeAction(notice);
    this.HideUrgentDlg();
    this.updateDataSourceOnUpdate(notice, index);
  }

  private async removeCompletedActionableNotification(notice: Notice): Promise<void> {
    const index = this.allUrgentNotices.findIndex(n => n._id === notice._id);
    if (index !== -1) {
      if (!notice.readBy) {
        notice.readBy = [];
      }
      if (!notice.readBy.includes(this.userId)) {
        notice.readBy.push(this.userId);
      }

      await this.appservice.UpdateReadMessages(notice).catch(err => {
        console.error('Error updating read status:', err);
      });

      this.allUrgentNotices = this.allUrgentNotices.filter(n => n._id !== notice._id);
      this.groupedNoticesByDate();
    }
  }

  get noticeCount(): number {
    return this.allUrgentNotices.length;
  }

  displayText(msg) {
    if (msg?.actionMetadata?.PathForRosterNotification && msg?.actionMetadata?.PathForRosterNotification != this.group_path) {
      return msg.messageText + ", Path: " + msg.actionMetadata.PathForRosterNotification;
    }
    return msg.messageText;
  }

  touchStartX = 0;
  touchEndX = 0;

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchEndX = this.touchStartX;
  }

  onTouchMove(event: TouchEvent, notice, index) {
    this.touchEndX = event.changedTouches[0].screenX;

    const diff = this.touchStartX - this.touchEndX;
    const container = (event.currentTarget as HTMLElement);
    const card = container.querySelector('.notification-card') as HTMLElement;

    if (diff > 0) {

      container.classList.add('swiping');

      let translateX = diff;

      // Elastic resistance
      if (diff > 60) {
        translateX = 60 + (diff - 60) * 0.3;
      }

      card.style.transform = `translateX(-${Math.min(translateX, 140)}px)`;
    }
  }

  //------------ Slide to close Notification ------------//
  onTouchEnd(event: TouchEvent, notice, index) {
    this.touchEndX = event.changedTouches[0].screenX;
    const diff = this.touchStartX - this.touchEndX;
    const container = (event.currentTarget as HTMLElement);
    const card = container.querySelector('.notification-card') as HTMLElement;

    container.classList.remove('swiping');

    if (diff > 80) {
      card.style.transition = 'transform 0.2s ease-out, opacity 0.2s';
      card.style.transform = 'translateX(-100%)';
      card.style.opacity = '0';

      setTimeout(() => {
        this.closeNotice(event, notice, index);
      }, 200);
    } else {
      card.style.transition = 'transform 0.2s ease';
      card.style.transform = 'translateX(0)';
    }
  }
}
