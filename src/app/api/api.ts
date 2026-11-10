import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { API_URL } from '../data/site';
import type {
  GeneratorResponse, GeneratorSaveResponse, LinkedAccount, MeResponse, OAuthAuthorizeResponse, OAuthCallbackResponse,
  PlaylistSummary, PlaylistSync, Provider, SchedulerView, SharePublic, ShareTokenResponse, SyncFrequency, SyncMethod,
  SyncStatus, TokenResponse, Track, TransferPreview, TransferResponse, TransferStatus, TransferTrackResult,
} from './demo-db';

export type {
  GeneratorResponse, LinkedAccount, MeResponse, PlaylistSummary, PlaylistSync, Provider, SchedulerView, SharePublic,
  SyncFrequency, SyncMethod, SyncStatus, TokenResponse, Track, TransferPreview, TransferResponse, TransferStatus, TransferTrackResult,
};

export interface TransferCreate {
  source_provider: Provider; target_provider: Provider; source_playlist_id: string; source_playlist_name?: string;
  target_playlist_name: string; target_playlist_description?: string; selected_track_ids?: string[] | null; apply_watermark?: boolean;
}
export interface SyncCreate {
  source_provider: Provider; source_playlist_id: string; source_playlist_name?: string; target_provider: Provider;
  target_playlist_id: string; target_playlist_name?: string; frequency: SyncFrequency; run_hour: number; run_minute: number; method: SyncMethod;
}

const e = encodeURIComponent;

/** One method per FastAPI route the app uses (BackEnd/src/api/v1/routes). Same paths, same bodies. */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  private run = <T>(o: Observable<T>) => firstValueFrom(o);
  private get = <T>(p: string) => this.run(this.http.get<T>(API_URL + p));
  private post = <T>(p: string, body: unknown = {}) => this.run(this.http.post<T>(API_URL + p, body));

  login = (email: string, password: string) => this.post<TokenResponse>('/auth/login', { email, password });
  refresh = (refresh_token: string) => this.post<TokenResponse>('/auth/refresh', { refresh_token });
  me = () => this.get<MeResponse>('/auth/me');
  updateMe = (body: { name?: string; timezone_offset_minutes?: number }) => this.run(this.http.patch<MeResponse>(`${API_URL}/auth/me`, body));
  authorize = (p: Provider) => this.get<OAuthAuthorizeResponse>(`/auth/oauth/${p}/authorize`);
  callback = (p: Provider, code: string, state: string) => this.post<OAuthCallbackResponse>(`/auth/oauth/${p}/callback`, { code, state });

  accounts = () => this.get<LinkedAccount[]>('/accounts');
  unlink = (p: Provider) => this.run(this.http.delete<void>(`${API_URL}/accounts/${p}`));
  playlists = (p: Provider) => this.get<PlaylistSummary[]>(`/playlists/${p}`);
  tracks = (p: Provider, id: string) => this.get<Track[]>(`/playlists/${p}/${e(id)}/tracks`);

  createTransfer = (body: TransferCreate) => this.post<TransferResponse>('/transfers', body);
  /** Demo extension (not in the FastAPI): the matching, without running the job. */
  preview = (body: TransferCreate) => this.post<TransferPreview>('/transfers/preview', body);
  transfers = (limit = 50) => this.get<TransferResponse[]>(`/transfers?limit=${limit}`);
  transfer = (id: string) => this.get<TransferResponse>(`/transfers/${e(id)}`);
  alive = (id: string) => this.get<{ alive: boolean }>(`/transfers/${e(id)}/alive`);
  share = (id: string) => this.post<ShareTokenResponse>(`/transfers/${e(id)}/share`);
  shared = (token: string) => this.get<SharePublic>(`/shares/${e(token)}`);

  generate = (body: { source_provider: Provider; prompt?: string; genres: string[]; moods: string[]; count: number; exclude_track_ids?: string[] }) =>
    this.post<GeneratorResponse>('/generator/tracks', body);
  saveGenerated = (body: { target_provider: Provider; playlist_name: string; playlist_description?: string; tracks: Partial<Track>[] }) =>
    this.post<GeneratorSaveResponse>('/generator/save', body);

  syncs = () => this.get<PlaylistSync[]>('/syncs');
  createSync = (body: SyncCreate) => this.post<PlaylistSync>('/syncs', body);
  setSync = (id: string, status: SyncStatus) => this.run(this.http.patch<PlaylistSync>(`${API_URL}/syncs/${e(id)}`, { status }));
  deleteSync = (id: string) => this.run(this.http.delete<void>(`${API_URL}/syncs/${e(id)}`));
  runSync = (id: string) => this.post<{ status: string }>(`/syncs/${e(id)}/run`);
  /** Demo extension: the APScheduler job store as the demo server sees it. */
  scheduler = () => this.get<SchedulerView>('/__demo/scheduler');
}

/** Human message for a failed call: FastAPI `detail` (string or the 422 list), like the original format-error.ts. */
export function errorText(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'Não foi possível falar com a API em localhost:8000. O backend está rodando?';
  const detail = (err.error as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail))
    return detail.map((d: { loc?: unknown[]; msg?: string }) => (Array.isArray(d.loc) ? `${d.loc.slice(1).join('.')}: ${d.msg}` : String(d.msg))).join('; ');
  return fallback;
}
