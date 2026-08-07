package cn.immerseread.config;

import java.util.Optional;

public class SystemCredentialStore implements CredentialStore {
    @Override
    public Optional<String> resolveApiKey() {
        return Optional.empty();
    }

    @Override
    public CredentialStatus status() {
        return new CredentialStatus(false, "system", "未配置：此构建尚未启用系统凭据管理器集成");
    }

    @Override
    public void set(char[] key) {
        throw new UnsupportedOperationException("OS credential manager integration is unsupported in this build.");
    }

    @Override
    public void clear() {
        throw new UnsupportedOperationException("OS credential manager integration is unsupported in this build.");
    }
}
