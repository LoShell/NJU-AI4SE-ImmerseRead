package cn.immerseread.config;

import java.util.Optional;

public interface CredentialStore {
    Optional<String> resolveApiKey();

    CredentialStatus status();

    void set(char[] key);

    void clear();
}
