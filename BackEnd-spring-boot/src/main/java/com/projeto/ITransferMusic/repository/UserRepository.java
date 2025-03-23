package com.projeto.ITransferMusic.repository;

import com.projeto.ITransferMusic.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;


public interface UserRepository extends MongoRepository<User, String>{
    Optional<User> findByEmail(String email);
}
