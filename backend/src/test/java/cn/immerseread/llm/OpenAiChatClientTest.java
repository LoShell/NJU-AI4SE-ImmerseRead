package cn.immerseread.llm;

import cn.immerseread.config.LlmProperties;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenAiChatClientTest {
    @Test
    void deepseekProviderUsesChatCompletionsShapeAndParsesChoiceMessage() throws IOException {
        CapturedRequest captured = new CapturedRequest();
        try (TestServer server = TestServer.start(captured, """
            {"choices":[{"message":{"content":"继续看这一段就好。"}}]}
            """)) {
            LlmProperties properties = new LlmProperties();
            properties.setProvider("deepseek");
            properties.setApiUrl(server.url());
            properties.setModelName("deepseek-v4-flash");
            OpenAiChatClient client = new OpenAiChatClient(properties);

            String content = client.complete("deepseek-key", "只回答已读内容");

            assertThat(content).isEqualTo("继续看这一段就好。");
            assertThat(captured.path()).isEqualTo("/chat/completions");
            assertThat(captured.authorization()).isEqualTo("Bearer deepseek-key");
            assertThat(captured.body()).contains("\"model\":\"deepseek-v4-flash\"");
            assertThat(captured.body()).contains("\"messages\"");
            assertThat(captured.body()).contains("\"role\":\"user\"");
            assertThat(captured.body()).contains("\"content\":\"只回答已读内容\"");
            assertThat(captured.body()).contains("\"stream\":false");
        }
    }

    @Test
    void openAiProviderKeepsResponsesShapeAndParsesOutputText() throws IOException {
        CapturedRequest captured = new CapturedRequest();
        try (TestServer server = TestServer.start(captured, """
            {"output_text":"I will stay spoiler-safe."}
            """)) {
            LlmProperties properties = new LlmProperties();
            properties.setProvider("openai");
            properties.setApiUrl(server.url() + "/v1/responses");
            properties.setModelName("gpt-test");
            OpenAiChatClient client = new OpenAiChatClient(properties);

            String content = client.complete("openai-key", "safe prompt");

            assertThat(content).isEqualTo("I will stay spoiler-safe.");
            assertThat(captured.path()).isEqualTo("/v1/responses");
            assertThat(captured.authorization()).isEqualTo("Bearer openai-key");
            assertThat(captured.body()).contains("\"model\":\"gpt-test\"");
            assertThat(captured.body()).contains("\"input\"");
            assertThat(captured.body()).contains("\"content\":\"safe prompt\"");
        }
    }

    private static final class CapturedRequest {
        private final AtomicReference<String> path = new AtomicReference<>("");
        private final AtomicReference<String> authorization = new AtomicReference<>("");
        private final AtomicReference<String> body = new AtomicReference<>("");

        String path() {
            return path.get();
        }

        String authorization() {
            return authorization.get();
        }

        String body() {
            return body.get();
        }
    }

    private static final class TestServer implements AutoCloseable {
        private final HttpServer server;

        private TestServer(HttpServer server) {
            this.server = server;
        }

        static TestServer start(CapturedRequest captured, String responseBody) throws IOException {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                captured.path.set(exchange.getRequestURI().getPath());
                captured.authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
                captured.body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                byte[] responseBytes = responseBody.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, responseBytes.length);
                try (OutputStream output = exchange.getResponseBody()) {
                    output.write(responseBytes);
                }
            });
            server.start();
            return new TestServer(server);
        }

        String url() {
            return "http://127.0.0.1:" + server.getAddress().getPort();
        }

        @Override
        public void close() {
            server.stop(0);
        }
    }
}
