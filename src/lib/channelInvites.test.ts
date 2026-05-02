import { describe, test, expect } from "bun:test";
import { parseChannelInviteMessageContent, createChannelInviteMessageContent } from "./channelInvites";

describe("parseChannelInviteMessageContent", () => {
  const INVITE_MESSAGE_PREFIX = "__TEAMSPACE_CHANNEL_INVITE__:";

  test("returns null if content does not start with prefix", () => {
    expect(parseChannelInviteMessageContent("invalid_content")).toBeNull();
  });

  test("returns null if payload is invalid JSON", () => {
    const content = `${INVITE_MESSAGE_PREFIX}invalid_json`;
    expect(parseChannelInviteMessageContent(content)).toBeNull();
  });

  test("returns null if payload is missing token", () => {
    const payload = { channelId: "123", channelName: "General" };
    const content = `${INVITE_MESSAGE_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
    expect(parseChannelInviteMessageContent(content)).toBeNull();
  });

  test("returns null if payload is missing channelId", () => {
    const payload = { token: "abc", channelName: "General" };
    const content = `${INVITE_MESSAGE_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
    expect(parseChannelInviteMessageContent(content)).toBeNull();
  });

  test("returns null if payload is missing channelName", () => {
    const payload = { token: "abc", channelId: "123" };
    const content = `${INVITE_MESSAGE_PREFIX}${encodeURIComponent(JSON.stringify(payload))}`;
    expect(parseChannelInviteMessageContent(content)).toBeNull();
  });

  test("returns payload if content is valid", () => {
    const payload = {
      token: "valid_token",
      channelId: "123",
      channelName: "General",
      invitedByName: "John Doe",
    };
    const content = createChannelInviteMessageContent(payload);
    expect(parseChannelInviteMessageContent(content)).toEqual(payload);
  });
});
