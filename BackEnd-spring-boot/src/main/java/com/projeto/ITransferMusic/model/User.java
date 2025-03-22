package com.projeto.ITransferMusic.model;

import java.time.LocalDateTime;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.Data;

@Data //  (Lombok): Gera getters, setters, toString(), etc.
@Document(collection = "users")
public class User {
    
    @Id // Define o campo como a chave primária.
    private String id;
    private String name;
    private String email;
    private String spotifyId;
    private String youtubeId;
    private LocalDateTime createdDate;
    private LocalDateTime lastModifiedDate;


}
