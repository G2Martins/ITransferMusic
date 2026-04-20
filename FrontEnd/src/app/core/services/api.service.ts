import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

export type Provider = 'spotify' | 'youtube' | 'apple_music' | 'amazon_music' | 'deezer';

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  track_count: number | null;
  provider: Provider;
}

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string | null;
  image_url: string | null;
  uri: string;
  provider: Provider;
}

export interface TransferTrackResult {
  source_track_id: string;
  source_name: string;
  source_artist: string;
  source_album: string | null;
  image_url: string | null;
  matched_target_id: string | null;
  matched: boolean;
}

export interface LinkedAccount {
  provider: Provider;
  provider_display_name: string | null;
  provider_user_id: string | null;
}

export interface OAuthAuthorizeResponse {
  authorize_url: string;
  state: string;
}

export interface TransferResponse {
  id: string;
  source_provider: Provider;
  source_playlist_name: string | null;
  source_playlist_image_url: string | null;
  target_provider: Provider;
  source_playlist_id: string;
  target_playlist_id: string | null;
  target_playlist_name: string;
  target_playlist_description: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  total_tracks: number;
  matched_tracks: number;
  results: TransferTrackResult[];
  error_message: string | null;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface SharePublic {
  token: string;
  owner_name: string;
  owner_id: string;
  playlist_name: string;
  playlist_description: string | null;
  playlist_image_url: string | null;
  source_provider: Provider;
  source_playlist_id: string;
  target_provider: Provider;
  target_playlist_id: string | null;
  total_tracks: number;
  matched_tracks: number;
  tracks: TransferTrackResult[];
}

export interface ShareTokenResponse {
  token: string;
  share_url: string;
}

export interface TransferCreatePayload {
  source_provider: Provider;
  target_provider: Provider;
  source_playlist_id: string;
  source_playlist_name?: string;
  target_playlist_name: string;
  target_playlist_description?: string;
  selected_track_ids?: string[] | null;
  apply_watermark?: boolean;
}

export const SPOTIFY_VIRTUAL = {
  LIKED: '__liked_songs__',
  ALBUMS: '__saved_albums__',
  ARTISTS: '__followed_artists__',
} as const;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listLinkedAccounts() {
    return this.http.get<LinkedAccount[]>(`${this.base}/accounts`);
  }

  unlinkAccount(provider: Provider) {
    return this.http.delete<void>(`${this.base}/accounts/${provider}`);
  }

  oauthAuthorize(provider: Provider) {
    return this.http.get<OAuthAuthorizeResponse>(
      `${this.base}/auth/oauth/${provider}/authorize`,
    );
  }

  oauthCallback(provider: Provider, code: string, state: string) {
    return this.http.post<{ status: string; provider: string }>(
      `${this.base}/auth/oauth/${provider}/callback`,
      { code, state },
    );
  }

  listPlaylists(provider: Provider) {
    return this.http.get<PlaylistSummary[]>(`${this.base}/playlists/${provider}`);
  }

  getPlaylistTracks(provider: Provider, playlistId: string) {
    return this.http.get<Track[]>(
      `${this.base}/playlists/${provider}/${playlistId}/tracks`,
    );
  }

  createTransfer(payload: TransferCreatePayload) {
    return this.http.post<TransferResponse>(`${this.base}/transfers`, payload);
  }

  getTransfer(id: string) {
    return this.http.get<TransferResponse>(`${this.base}/transfers/${id}`);
  }

  listTransfers() {
    return this.http.get<TransferResponse[]>(`${this.base}/transfers`);
  }

  // --- Syncs ---
  listSyncs() {
    return this.http.get<PlaylistSync[]>(`${this.base}/syncs`);
  }

  createSync(payload: SyncCreatePayload) {
    return this.http.post<PlaylistSync>(`${this.base}/syncs`, payload);
  }

  toggleSync(id: string, status: SyncStatus) {
    return this.http.patch<PlaylistSync>(`${this.base}/syncs/${id}`, { status });
  }

  deleteSync(id: string) {
    return this.http.delete<void>(`${this.base}/syncs/${id}`);
  }

  runSyncNow(id: string) {
    return this.http.post<{ status: string }>(`${this.base}/syncs/${id}/run`, {});
  }

  checkTransferAlive(transferId: string) {
    return this.http.get<{ alive: boolean }>(
      `${this.base}/transfers/${transferId}/alive`,
    );
  }

  // --- Share ---
  createShare(transferId: string) {
    return this.http.post<ShareTokenResponse>(
      `${this.base}/transfers/${transferId}/share`,
      {},
    );
  }

  getShare(token: string) {
    return this.http.get<SharePublic>(`${this.base}/shares/${token}`);
  }

  updateShare(token: string, body: { playlist_name?: string; playlist_description?: string }) {
    return this.http.patch<SharePublic>(`${this.base}/shares/${token}`, body);
  }

  // --- Reviews ---
  listReviews() {
    return this.http.get<Review[]>(`${this.base}/reviews`);
  }

  reviewStats() {
    return this.http.get<ReviewStats>(`${this.base}/reviews/stats`);
  }

  myReview() {
    return this.http.get<Review | null>(`${this.base}/reviews/mine`);
  }

  submitReview(payload: { rating: number; comment?: string }) {
    return this.http.post<Review>(`${this.base}/reviews`, payload);
  }

  // --- Generator ---
  generateTracks(payload: GeneratorRequest) {
    return this.http.post<GeneratorResponse>(
      `${this.base}/generator/tracks`,
      payload,
    );
  }

  saveGenerated(payload: GeneratorSavePayload) {
    return this.http.post<GeneratorSaveResponse>(
      `${this.base}/generator/save`,
      payload,
    );
  }
}

export interface GeneratorRequest {
  source_provider: Provider;
  prompt?: string;
  genres: string[];
  moods: string[];
  count: number;
  exclude_track_ids?: string[];
}

export interface GeneratorResponse {
  tracks: Track[];
  used_queries: string[];
}

export interface GeneratorSavePayload {
  target_provider: Provider;
  playlist_name: string;
  playlist_description?: string;
  tracks: { name: string; artist: string }[];
}

export interface GeneratorSaveResponse {
  playlist_id: string;
  matched_count: number;
  total_count: number;
}

export interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ReviewStats {
  total: number;
  average: number;
  distribution: Record<number, number>;
}

export type SyncStatus = 'active' | 'paused' | 'error';
export type SyncFrequency = 'daily' | 'weekly';
export type SyncMethod = 'add_only' | 'mirror';

export interface PlaylistSync {
  id: string;
  source_provider: Provider;
  source_playlist_id: string;
  source_playlist_name: string | null;
  target_provider: Provider;
  target_playlist_id: string;
  target_playlist_name: string | null;
  frequency: SyncFrequency;
  run_hour: number;
  run_minute: number;
  method: SyncMethod;
  status: SyncStatus;
  last_synced_at: string | null;
  last_error: string | null;
  tracks_added_last_run: number;
  created_at: string;
  updated_at: string;
}

export interface SyncCreatePayload {
  source_provider: Provider;
  source_playlist_id: string;
  source_playlist_name?: string;
  target_provider: Provider;
  target_playlist_id: string;
  target_playlist_name?: string;
  frequency?: SyncFrequency;
  run_hour?: number;
  run_minute?: number;
  method?: SyncMethod;
}
