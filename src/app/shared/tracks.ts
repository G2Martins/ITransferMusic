import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Provider, TransferResponse, TransferTrackResult } from '../api/api';
import { PROVIDER_META } from '../data/site';
import { I18n } from '../i18n/i18n';
import { tone } from './format';
import { Cover, Icon, ProviderBadge } from './icon';

/** Status chip for transfers and syncs (pending, running, completed, partial, failed, active, paused, error). */
@Component({
  selector: 'app-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `<span [class]="'tag ' + tone(status())">@if (status() === 'running') {<span class="eq live"><i></i><i></i><i></i></span>}{{ t('status.' + status()) }}</span>`,
})
export class StatusTag {
  status = input.required<string>();
  protected t = inject(I18n).t;
  protected tone = tone;
}

/** Match confidence: high (>= 90%), medium (>= 75%), low; or "not found". */
@Component({
  selector: 'app-confidence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (!r().matched) { <span class="tag tag-bad">{{ t('match.none') }}</span> }
    @else if (r().confidence == null) { <span class="tag tag-ok">{{ t('match.found') }}</span> }
    @else { <span [class]="'tag ' + cls()" [attr.title]="t('match.title')">{{ t(level()) }} {{ pct() }}%</span> }
  `,
})
export class Confidence {
  r = input.required<TransferTrackResult>();
  protected t = inject(I18n).t;
  protected pct = computed(() => Math.round((this.r().confidence ?? 0) * 100));
  protected level = computed(() => (this.pct() >= 90 ? 'match.high' : this.pct() >= 75 ? 'match.medium' : 'match.low'));
  protected cls = computed(() => (this.pct() >= 90 ? 'tag-ok' : this.pct() >= 75 ? 'tag-warn' : 'tag-bad'));
}

/** One numbered line of a transfer result: source track, then what was found in the destination. */
@Component({
  selector: 'app-track-row',
  imports: [Confidence],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3 px-3 py-2.5" [class.bg-danger-soft]="!r().matched">
      <span class="tracknum">{{ n().toString().padStart(2, '0') }}</span>
      <div class="min-w-0 flex-1">
        <p class="clamp-1 text-[14px] font-medium">{{ r().source_name }}</p>
        <p class="clamp-1 text-[12.5px] text-dim">
          {{ r().source_artist }}@if (r().source_album) { · {{ r().source_album }} }
          @if (r().matched && r().matched_name && r().matched_name !== r().source_name) { <span class="text-ink-2"> · {{ t('match.as') }} "{{ r().matched_name }}"</span> }
          @if (!r().matched) { <span class="text-danger"> · {{ t('match.missingIn', { service: label() }) }}</span> }
        </p>
      </div>
      <app-confidence [r]="r()" />
    </div>
  `,
})
export class TrackRow {
  r = input.required<TransferTrackResult>();
  n = input.required<number>();
  target = input.required<Provider>();
  protected t = inject(I18n).t;
  protected label = computed(() => PROVIDER_META[this.target()].label);
}

/** A transfer job: route, names, live progress (meter scales on X). Links to its detail. */
@Component({
  selector: 'app-job',
  imports: [RouterLink, Cover, Icon, ProviderBadge, StatusTag],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/transferencias" [queryParams]="{ id: j().id }" class="panel flex flex-col gap-3 p-4 transition-colors hover:border-line-2 sm:flex-row sm:items-center">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <app-cover [name]="j().source_playlist_name ?? j().target_playlist_name" [size]="44" />
        <div class="min-w-0">
          <p class="clamp-1 text-[14.5px] font-medium">{{ j().target_playlist_name }}</p>
          <p class="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-dim">
            <app-provider [provider]="j().source_provider" [size]="16" [labeled]="true" /> <app-icon name="arrow-right" [size]="12" /> <app-provider [provider]="j().target_provider" [size]="16" [labeled]="true" />
            <span class="clamp-1">{{ j().source_playlist_name }}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3 sm:w-[300px]">
        <div class="meter flex-1" [class.ok]="j().status === 'completed'" [class.bad]="j().status === 'failed'" [style.--p]="progress()"
             role="progressbar" [attr.aria-valuenow]="j().results.length" aria-valuemin="0" [attr.aria-valuemax]="j().total_tracks || null" [attr.aria-label]="t('jobs.progress')"><i></i></div>
        <span class="mono w-14 text-right text-[11.5px] text-ink-2">{{ count() }}</span>
        <app-status [status]="j().status" />
      </div>
    </a>
  `,
})
export class Job {
  j = input.required<TransferResponse>();
  protected t = inject(I18n).t;
  private live = computed(() => this.j().status === 'pending' || this.j().status === 'running');
  /** Running: processed / total. Finished: matched / total (what ended up in the destination). */
  protected progress = computed(() => {
    const j = this.j();
    if (j.status === 'pending') return 0.02;
    if (!j.total_tracks) return j.status === 'failed' ? 1 : 0;
    return (this.live() ? j.results.length : j.matched_tracks) / j.total_tracks;
  });
  protected count = computed(() => {
    const j = this.j();
    if (j.status === 'pending') return '...';
    return j.total_tracks ? `${this.live() ? j.results.length : j.matched_tracks}/${j.total_tracks}` : '-';
  });
}
