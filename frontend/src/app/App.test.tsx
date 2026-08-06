import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the reader product shell", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "ImmerseRead" })).toBeInTheDocument();
    expect(screen.getByText("上传 TXT，开始本地沉浸阅读")).toBeInTheDocument();
  });
});
