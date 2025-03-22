package com.projeto.ITransferMusic.repository;

import com.projeto.ITransferMusic.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;


public interface UserRepository extends MongoRepository<User, String>{
    User findByEmail(String email);
}
