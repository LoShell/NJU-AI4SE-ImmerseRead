package cn.immerseread.llm;

@FunctionalInterface
public interface ChatClient {
    String complete(String apiKey, String prompt);
}
