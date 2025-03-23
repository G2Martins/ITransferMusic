package com.projeto.ITransferMusic.service;

import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.projeto.ITransferMusic.dto.TrackDTO;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class YouTubeService {

    private final RestTemplate restTemplate;
    private final String API_BASE = "https://www.googleapis.com/youtube/v3";

    public YouTubeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // ================ MÉTODOS PRINCIPAIS ================ //

    public List<TrackDTO> getPlaylistTracks(String playlistId, String accessToken) {
        String url = API_BASE + "/playlistItems?part=snippet&playlistId=" + playlistId + "&maxResults=50";
        Map<String, Object> response = fetchFromAPI(url, accessToken);
        return extractTracks(response);
    }

    public String searchTrack(String query, String accessToken) {
        String encodedQuery = query.replace(" ", "%20");
        String url = API_BASE + "/search?part=snippet&q=" + encodedQuery + "&type=video&maxResults=1";
        Map<String, Object> response = fetchFromAPI(url, accessToken);
        return extractVideoId(response);
    }

    public String createPlaylist(String name, String description, List<String> videoIds, String accessToken) {
        String url = API_BASE + "/playlists?part=snippet,status";
        Map<String, Object> body = buildPlaylistBody(name, description);
        Map<String, Object> response = postToAPI(url, accessToken, body);
        String playlistId = (String) ((Map<String, Object>) response.get("id")).get("playlistId");
        
        if (playlistId != null && !videoIds.isEmpty()) {
            addVideosToPlaylist(playlistId, videoIds, accessToken);
        }
        
        return playlistId;
    }

    // ================ MÉTODOS AUXILIARES ================ //

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
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        return items.stream().map(item -> {
            Map<String, Object> snippet = (Map<String, Object>) item.get("snippet");
            Map<String, Object> resource = (Map<String, Object>) snippet.get("resourceId");
            String videoId = resource.get("videoId").toString();
            String title = snippet.get("title").toString();
            String channel = ((Map<String, Object>) snippet.get("channelTitle")).toString();

            return new TrackDTO(
                videoId,
                title,
                channel,
                "youtube:video:" + videoId
            );
        }).collect(Collectors.toList());
    }

    private String extractVideoId(Map<String, Object> response) {
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        return items.isEmpty() ? null : ((Map<String, Object>) items.get(0).get("id")).get("videoId").toString();
    }

    private Map<String, Object> buildPlaylistBody(String name, String description) {
        Map<String, Object> snippet = new HashMap<>();
        snippet.put("title", name);
        snippet.put("description", description);

        Map<String, Object> status = new HashMap<>();
        status.put("privacyStatus", "private");

        Map<String, Object> body = new HashMap<>();
        body.put("snippet", snippet);
        body.put("status", status);
        
        return body;
    }

    private void addVideosToPlaylist(String playlistId, List<String> videoIds, String accessToken) {
        String url = API_BASE + "/playlistItems?part=snippet";
        videoIds.forEach(videoId -> {
            Map<String, Object> snippet = new HashMap<>();
            snippet.put("playlistId", playlistId);
            
            Map<String, Object> resourceId = new HashMap<>();
            resourceId.put("kind", "youtube#video");
            resourceId.put("videoId", videoId);
            
            snippet.put("resourceId", resourceId);

            Map<String, Object> body = new HashMap<>();
            body.put("snippet", snippet);
            
            postToAPI(url, accessToken, body);
        });
    }
}