/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignInPage from "@/features/auth/pages/public/SignInPage";
import { signIn } from "next-auth/react";
import { useVerifyCredentials } from "@/features/auth/hooks/useAuthQueries";
import { useSettingsMap } from "@/shared/hooks/useSettings";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => ({
    get: vi.fn().mockReturnValue(null),
  })),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuthQueries", () => ({
  useVerifyCredentials: vi.fn(),
}));

vi.mock("@/shared/hooks/useSettings", () => ({
  useSettingsMap: vi.fn(),
}));

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks for successful initial load
    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([
          ["auth_user_pages", JSON.stringify({ allowSocialLogin: true })]
      ]),
    } as any);

    vi.mocked(useVerifyCredentials).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
  });

  it("renders correctly", () => {
    render(<SignInPage />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("handles successful sign in", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { ok: true, mfaRequired: false, challengeId: "ch1" },
    });
    vi.mocked(useVerifyCredentials).mockReturnValue({ mutateAsync } as any);

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
        email: "test@example.com",
        password: "password123",
        challengeId: "ch1",
      }));
    });
  });

  it("shows error message on verification failure", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { ok: false, message: "Invalid credentials" },
    });
    vi.mocked(useVerifyCredentials).mockReturnValue({ mutateAsync } as any);

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), "wrong@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows MFA fields if required", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { ok: true, mfaRequired: true, challengeId: "ch-mfa" },
    });
    vi.mocked(useVerifyCredentials).mockReturnValue({ mutateAsync } as any);

    render(<SignInPage />);

    await user.type(screen.getByLabelText(/email/i), "mfa@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByLabelText(/one-time code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recovery code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify & sign in/i })).toBeInTheDocument();
  });

  it("calls social sign in", async () => {
    const user = userEvent.setup();
    render(<SignInPage />);

    const googleBtn = screen.getByRole("button", { name: /continue with google/i });
    await user.click(googleBtn);

    expect(signIn).toHaveBeenCalledWith("google", expect.anything());
  });
});
