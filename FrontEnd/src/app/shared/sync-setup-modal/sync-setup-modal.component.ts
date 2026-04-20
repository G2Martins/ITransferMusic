import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ApiService,
  Provider,
  SyncFrequency,
  SyncMethod,
} from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { formatApiError } from '../../core/utils/format-error';
import { providerIcon } from '../../core/utils/playlist-url';
import {
  localToUtc,
  pad2,
  timezoneLabel,
} from '../../core/utils/timezone';

export interface SyncSetupInput {
  name: string;
  sourceProvider: Provider;
  sourcePlaylistId: string;
  targetProvider: Provider;
  targetPlaylistId: string;
  totalTracks: number;
}

@Component({
  selector: 'app-sync-setup-modal',
  standalone: true,
  imports: [FormsModule, NgClass, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sync-setup-modal.component.html',
})
export class SyncSetupModalComponent implements OnInit, OnChanges {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  @Input() data: SyncSetupInput | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  readonly frequency = signal<SyncFrequency>('weekly');
  readonly localHour = signal<number>(13);
  readonly localMinute = signal<number>(0);
  readonly method = signal<SyncMethod>('add_only');
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly hourOptions = Array.from({ length: 24 }, (_, i) => i);
  readonly minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  readonly timezoneText = computed(() =>
    timezoneLabel(this.auth.currentUser()?.timezone_offset_minutes ?? -180),
  );

  ngOnInit(): void {
    this.reset();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) this.reset();
  }

  private reset(): void {
    this.frequency.set('weekly');
    this.localHour.set(13);
    this.localMinute.set(0);
    this.method.set('add_only');
    this.error.set(null);
    this.success.set(false);
  }

  padTime(n: number): string {
    return pad2(n);
  }

  providerIcon(p: Provider): string {
    return providerIcon(p);
  }

  close(): void {
    this.closed.emit();
  }

  confirm(): void {
    const d = this.data;
    if (!d) return;
    const offset = this.auth.currentUser()?.timezone_offset_minutes ?? -180;
    const utc = localToUtc(this.localHour(), this.localMinute(), offset);
    this.creating.set(true);
    this.error.set(null);
    this.api
      .createSync({
        source_provider: d.sourceProvider,
        source_playlist_id: d.sourcePlaylistId,
        source_playlist_name: d.name,
        target_provider: d.targetProvider,
        target_playlist_id: d.targetPlaylistId,
        target_playlist_name: d.name,
        frequency: this.frequency(),
        run_hour: utc.hour,
        run_minute: utc.minute,
        method: this.method(),
      })
      .subscribe({
        next: () => {
          this.creating.set(false);
          this.success.set(true);
          this.created.emit();
        },
        error: (err) => {
          this.creating.set(false);
          this.error.set(formatApiError(err, 'Falha ao criar sincronização'));
        },
      });
  }
}
