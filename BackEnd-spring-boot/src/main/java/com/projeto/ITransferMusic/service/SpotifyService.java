package com.projeto.ITransferMusic.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.projeto.ITransferMusic.dto.TrackDTO;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SpotifyService {

    private final RestTemplate restTemplate;
    private final String API_BASE = "https://api.spotify.com/v1";

    public SpotifyService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<TrackDTO> getPlaylistTracks(String playlistId, String accessToken) {
        String url = API_BASE + "/playlists/" + playlistId + "/tracks";
        Map<String, Object> response = fetchFromAPI(url, accessToken);
        return extractTracks(response);
    }

    public String searchTrack(String query, String accessToken) {
        String encodedQuery = query.replace(" ", "%20");
        String url = API_BASE + "/search?q=" + encodedQuery + "&type=track&limit=1";
        Map<String, Object> response = fetchFromAPI(url, accessToken);
        return extractTrackId(response);
    }

    public String createPlaylist(String userId, String name, String description, List<String> trackUris,
            String accessToken) {
        String url = API_BASE + "/users/" + userId + "/playlists";
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("description", description);
        body.put("public", false);

        Map<String, Object> response = postToAPI(url, accessToken, body);
        String playlistId = (String) response.get("id");

        if (playlistId != null && !trackUris.isEmpty()) {
            addTracksToPlaylist(playlistId, trackUris, accessToken);
        }

        return playlistId;
    }

    // Métodos auxiliares
    private Map<String, Object> fetchFromAPI(String url, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class).getBody();
    }

    private Map<String, Object> postToAPI(String url, String accessToken, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class).getBody();
    }

    private List<TrackDTO> extractTracks(Map<String, Object> response) {
        List<TrackDTO> tracks = new ArrayList<>();
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");

        for (Map<String, Object> item : items) {
            Map<String, Object> track = (Map<String, Object>) item.get("track");
            String artist = ((Map<String, Object>) ((List<?>) track.get("artists")).get(0)).get("name").toString();
            String trackId = track.get("id").toString();

            tracks.add(new TrackDTO(
                    trackId,
                    track.get("name").toString(),
                    artist,
                    "spotify:track:" + trackId // Adiciona a URI do Spotify
            ));
        }
        return tracks;
    }

    private String extractTrackId(Map<String, Object> response) {
        Map<String, Object> tracks = (Map<String, Object>) response.get("tracks");
        List<Map<String, Object>> items = (List<Map<String, Object>>) tracks.get("items");
        return items.isEmpty() ? null : items.get(0).get("id").toString();
    }

    private void addTracksToPlaylist(String playlistId, List<String> trackUris, String accessToken) {
        String url = API_BASE + "/playlists/" + playlistId + "/tracks";
        Map<String, Object> body = new HashMap<>();
        body.put("uris", trackUris.stream()
                .map(uri -> "spotify:track:" + uri) // Formato correto para o Spotify
                .collect(Collectors.toList()));
        postToAPI(url, accessToken, body);
    }
}
