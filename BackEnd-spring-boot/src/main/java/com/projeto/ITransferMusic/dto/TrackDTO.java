package com.projeto.ITransferMusic.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

//DTO (Data Transfer Object) é um padrão de projeto usado para transferir dados entre camadas de um sistema
@Data
@AllArgsConstructor
public class TrackDTO {
    private String id;       // ID da música no serviço de origem
    private String name;     // Nome da música
    private String artist;   // Artista principal
    private String uri;      // URI específica do serviço (ex: "spotify:track:123" ou "youtube:video:456")
}