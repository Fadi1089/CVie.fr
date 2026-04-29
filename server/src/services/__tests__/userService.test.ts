import { describe, expect, it, mock, beforeEach } from "bun:test";

const upsertMock = mock(async (_args: unknown) => ({ id: "u_1" }));
mock.module("../../lib/prisma", () => ({
  prisma: { user: { upsert: upsertMock } },
}));

import { upsertUserByAuth0Sub } from "../userService";

describe("upsertUserByAuth0Sub", () => {
  beforeEach(() => {
    upsertMock.mockClear();
  });

  it("upserts by auth0Sub with email + email_verified from claims", async () => {
    upsertMock.mockResolvedValueOnce({
      id: "u_1",
      auth0Sub: "google-oauth2|123",
      email: "jane@example.com",
      username: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as never);

    const user = await upsertUserByAuth0Sub({
      sub: "google-oauth2|123",
      email: "jane@example.com",
    });

    expect(user.id).toBe("u_1");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0]?.[0] as {
      where: { auth0Sub: string };
      create: { auth0Sub: string; email: string };
      update: { email: string };
    };
    expect(call.where.auth0Sub).toBe("google-oauth2|123");
    expect(call.create.auth0Sub).toBe("google-oauth2|123");
    expect(call.create.email).toBe("jane@example.com");
    expect(call.update.email).toBe("jane@example.com");
  });

  it("returns existing user with updated email when auth0Sub already exists", async () => {
    upsertMock.mockResolvedValueOnce({
      id: "u_existing",
      auth0Sub: "auth0|existing",
      email: "new@example.com",
      username: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as never);

    const user = await upsertUserByAuth0Sub({
      sub: "auth0|existing",
      email: "new@example.com",
    });

    expect(user.email).toBe("new@example.com");
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const call = upsertMock.mock.calls[0]?.[0] as {
      where: { auth0Sub: string };
      create: { auth0Sub: string; email: string };
      update: { email: string };
    };
    expect(call.where.auth0Sub).toBe("auth0|existing");
    expect(call.create.auth0Sub).toBe("auth0|existing");
    expect(call.create.email).toBe("new@example.com");
    expect(call.update.email).toBe("new@example.com");
  });

  it("retries once on Prisma P2002 unique-conflict race, then succeeds", async () => {
    const conflict = Object.assign(new Error("unique conflict"), {
      code: "P2002",
    });
    upsertMock.mockRejectedValueOnce(conflict);
    upsertMock.mockResolvedValueOnce({
      id: "u_1",
      auth0Sub: "auth0|abc",
      email: "x@y.com",
    } as never);

    const user = await upsertUserByAuth0Sub({
      sub: "auth0|abc",
      email: "x@y.com",
    });

    expect(user.id).toBe("u_1");
    expect(upsertMock).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-P2002 errors", async () => {
    upsertMock.mockRejectedValueOnce(new Error("connection refused"));
    await expect(
      upsertUserByAuth0Sub({ sub: "auth0|x", email: "x@y.com" }),
    ).rejects.toThrow("connection refused");
  });

  it("throws when sub is missing", async () => {
    await expect(
      upsertUserByAuth0Sub({ sub: "", email: "x@y.com" } as never),
    ).rejects.toThrow(/sub/i);
  });
});
