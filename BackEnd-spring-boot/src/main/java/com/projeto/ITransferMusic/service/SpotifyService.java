package com.projeto.ITransferMusic.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.projeto.ITransferMusic.dto.TrackDTO;
import com.projeto.ITransferMusic.utils.CastUtils;

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
    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchFromAPI(String url, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class).getBody();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postToAPI(String url, String accessToken, Map<String, Object> body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class).getBody();
    }

    @SuppressWarnings("unchecked")
    private List<TrackDTO> extractTracks(Map<String, Object> response) {
        // Cast explícito para List<Map<String, Object>>
        
        List<Map<String, Object>> items = CastUtils.<Map<String, Object>>safeCastToList(
                response.get("items"), 
                (Class<Map<String, Object>>) (Class<?>) Map.class
        );
    
        List<TrackDTO> tracks = new ArrayList<>();
        for (Map<String, Object> item : items) {
            Map<String, Object> track = CastUtils.safeCast(item.get("track"), Map.class);
            
            
            List<Map<String, Object>> artists = CastUtils.<Map<String, Object>>safeCastToList(
                    track.get("artists"), 
                    (Class<Map<String, Object>>) (Class<?>) Map.class
            );
            
            String artist = artists.isEmpty() ? "Desconhecido" : (String) artists.get(0).get("name");
            String trackId = (String) track.get("id");
    
            tracks.add(new TrackDTO(
                trackId,
                (String) track.get("name"),
                artist,
                "spotify:track:" + trackId
            ));
        }
        return tracks;
    }
    
    @SuppressWarnings("unchecked")
    private String extractTrackId(Map<String, Object> response) {
        Map<String, Object> tracks = CastUtils.safeCast(response.get("tracks"), Map.class);
        List<Map<String, Object>> items = CastUtils.<Map<String, Object>>safeCastToList(
                tracks.get("items"), 
                (Class<Map<String, Object>>) (Class<?>) Map.class
        );
        return items.isEmpty() ? null : (String) items.get(0).get("id");
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
