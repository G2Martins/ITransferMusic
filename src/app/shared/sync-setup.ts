import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { Api, PlaylistSync, SyncFrequency, SyncMethod, TransferResponse, errorText } from '../api/api';
import { I18n } from '../i18n/i18n';
import { Session } from '../state';
import { fmtOffset, localToUtc, pad2 } from './format';
import { Icon, ProviderBadge } from './icon';

/**
 * "Sincronizar" on a finished transfer (the original sync-setup-modal): frequency, time in the user's time zone
 * (stored in UTC, like the original), method. POST /syncs between the source playlist and the copy it created.
 */
@Component({
  selector: 'app-sync-setup',
  imports: [Icon, ProviderBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dlg class="sheet" aria-labelledby="sync-title" (close)="transfer.set(null)">
      @if (transfer(); as tr) {
        <form class="p-6" (submit)="confirm($event, tr)">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="eyebrow">{{ t('setup.eyebrow') }}</p>
              <h2 id="sync-title" class="mt-2 text-[20px] font-medium tracking-[-0.02em]">{{ tr.target_playlist_name }}</h2>
              <p class="mt-1 flex items-center gap-1.5 text-[13px] text-dim"><app-provider [provider]="tr.source_provider" [size]="16" [labeled]="true" /> <app-icon name="sync" [size]="12" /> <app-provider [provider]="tr.target_provider" [size]="16" [labeled]="true" /> {{ t('setup.desc') }}</p>
            </div>
            <button type="button" class="icon-btn" [attr.aria-label]="t('common.close')" (click)="dlg.close()"><app-icon name="x" /></button>
          </div>

          <fieldset class="mt-6">
            <legend class="label">{{ t('setup.frequency') }}</legend>
            <div class="seg">
              @for (f of freqs; track f) { <button type="button" [attr.aria-pressed]="frequency() === f" (click)="frequency.set(f)">{{ t('setup.' + f) }}</button> }
            </div>
          </fieldset>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label class="label" for="sync-h">{{ t('setup.hour') }}</label>
              <select id="sync-h" class="field" [value]="hour()" (change)="hour.set(+$any($event.target).value)">
                @for (h of hours; track h) { <option [value]="h" [selected]="h === hour()">{{ pad(h) }}</option> }
              </select>
            </div>
            <div>
              <label class="label" for="sync-m">{{ t('setup.minute') }}</label>
              <select id="sync-m" class="field" [value]="minute()" (change)="minute.set(+$any($event.target).value)">
                @for (m of minutes; track m) { <option [value]="m" [selected]="m === minute()">{{ pad(m) }}</option> }
              </select>
            </div>
          </div>
          <p class="mt-2 text-[12.5px] text-dim">{{ t('setup.tz', { tz: tz(), utc: utcLabel() }) }}</p>

          <fieldset class="mt-5 space-y-2">
            <legend class="label">{{ t('setup.method') }}</legend>
            @for (m of methods; track m) {
              <label class="flex cursor-pointer gap-3 rounded-xl border p-3" [class]="method() === m ? 'border-accent bg-accent-soft/40' : 'border-line'">
                <input type="radio" name="method" class="mt-1" [checked]="method() === m" (change)="method.set(m)" />
                <span><span class="block text-[14px] font-medium">{{ t('setup.' + m) }}</span><span class="text-[13px] text-ink-2">{{ t('setup.' + m + 'Desc') }}</span></span>
              </label>
            }
          </fieldset>

          <p class="mt-3 min-h-5 text-[13px] text-danger" role="alert">{{ error() }}</p>
          <div class="mt-2 flex justify-end gap-2">
            <button type="button" class="btn btn-line" (click)="dlg.close()">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ t('setup.confirm') }}</button>
          </div>
        </form>
      }
    </dialog>
  `,
})
export class SyncSetup {
  protected t = inject(I18n).t;
  private api = inject(Api);
  private session = inject(Session);
  readonly created = output<PlaylistSync>();
  protected dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  protected transfer = signal<TransferResponse | null>(null);
  protected frequency = signal<SyncFrequency>('weekly');
  protected method = signal<SyncMethod>('add_only');
  protected hour = signal(13);
  protected minute = signal(0);
  protected busy = signal(false);
  protected error = signal('');
  protected readonly freqs: SyncFrequency[] = ['daily', 'weekly'];
  protected readonly methods: SyncMethod[] = ['add_only', 'mirror'];
  protected readonly hours = Array.from({ length: 24 }, (_, i) => i);
  protected readonly minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  protected readonly pad = pad2;
  private offset = computed(() => this.session.me()?.timezone_offset_minutes ?? -180);
  protected tz = computed(() => fmtOffset(this.offset()));
  protected utcLabel = computed(() => { const u = localToUtc(this.hour(), this.minute(), this.offset()); return `${pad2(u.hour)}:${pad2(u.minute)} UTC`; });

  open(t: TransferResponse) {
    this.transfer.set(t);
    this.frequency.set('weekly');
    this.method.set('add_only');
    this.hour.set(13);
    this.minute.set(0);
    this.error.set('');
    this.dlg().nativeElement.showModal();
  }

  async confirm(ev: Event, tr: TransferResponse) {
    ev.preventDefault();
    this.busy.set(true);
    const utc = localToUtc(this.hour(), this.minute(), this.offset());
    try {
      const s = await this.api.createSync({
        source_provider: tr.source_provider, source_playlist_id: tr.source_playlist_id, source_playlist_name: tr.source_playlist_name ?? undefined,
        target_provider: tr.target_provider, target_playlist_id: tr.target_playlist_id!, target_playlist_name: tr.target_playlist_name,
        frequency: this.frequency(), run_hour: utc.hour, run_minute: utc.minute, method: this.method(),
      });
      this.dlg().nativeElement.close();
      this.created.emit(s);
    } catch (e) {
      this.error.set(errorText(e, this.t('setup.failed')));
    }
    this.busy.set(false);
  }
}
