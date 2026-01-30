/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "@/features/auth/pages/public/RegisterPage";
import { signIn } from "next-auth/react";
import { useRegisterUser } from "@/features/auth/hooks/useAuthQueries";
import { useSettingsMap } from "@/shared/hooks/useSettings";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/features/auth/hooks/useAuthQueries", () => ({
  useRegisterUser: vi.fn(),
}));

vi.mock("@/shared/hooks/useSettings", () => ({
  useSettingsMap: vi.fn(),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([
          ["auth_user_pages", JSON.stringify({ allowSignup: true })]
      ]),
    } as any);

    vi.mocked(useRegisterUser).mockReturnValue({
      mutateAsync: vi.fn(),
    } as any);
  });

  it("renders correctly", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("handles successful registration and signs in", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: true,
      payload: { id: "u1", email: "new@example.com" },
    });
    vi.mocked(useRegisterUser).mockReturnValue({ mutateAsync } as any);

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), "new@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        name: undefined,
      });
      expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({
        email: "new@example.com",
        password: "password123",
      }));
    });
  });

  it("shows error message if signup is disabled", () => {
    vi.mocked(useSettingsMap).mockReturnValue({
      isLoading: false,
      data: new Map([
          ["auth_user_pages", JSON.stringify({ allowSignup: false })]
      ]),
    } as any);

    render(<RegisterPage />);

    expect(screen.getByText(/self-service registration is disabled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeDisabled();
  });

  it("shows error from registration failure", async () => {
    const user = userEvent.setup();
    const mutateAsync = vi.fn().mockResolvedValue({
      ok: false,
      payload: { error: "Email already taken" },
    });
    vi.mocked(useRegisterUser).mockReturnValue({ mutateAsync } as any);

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/email/i), "taken@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/email already taken/i)).toBeInTheDocument();
  });
});
