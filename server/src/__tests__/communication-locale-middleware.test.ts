import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { captureLocalCommunicationLocale, getExplicitCommunicationLocale, getLocalCommunicationLocale } from "../middleware/communication-locale.js";
import { errorHandler } from "../middleware/error-handler.js";

function app(actor: Express.Request["actor"]) {
  const instance = express();
  instance.use((req, _res, next) => { req.actor = actor; next(); });
  instance.use(captureLocalCommunicationLocale);
  instance.post("/interaction", async (req, res) => {
    await Promise.resolve();
    res.json({ actor: req.actor, locale: getLocalCommunicationLocale(req.actor.userId), explicit: getExplicitCommunicationLocale(req.actor.userId), other: getLocalCommunicationLocale("another-user") });
  });
  instance.use(errorHandler);
  return instance;
}

describe("local communication locale request isolation", () => {
  it("captures a canonical local hint without changing actor authority", async () => {
    const actor: Express.Request["actor"] = { type: "board", source: "local_implicit", userId: "local-board", isInstanceAdmin: true };
    const result = await request(app(actor)).post("/interaction").set("X-Paperclip-Communication-Locale", "en");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ actor, locale: "en", explicit: null, other: null });
  });
  it("rejects invalid local values before handler side effects", async () => {
    const actor: Express.Request["actor"] = { type: "board", source: "local_implicit", userId: "local-board" };
    for (const value of ["es", "pt-br", "en-US", "<script>"]) {
      expect((await request(app(actor)).post("/interaction").set("X-Paperclip-Communication-Locale", value)).status).toBe(400);
    }
  });
  it("does not let an authenticated account or agent impersonate a local preference", async () => {
    for (const actor of [{ type: "board", source: "session", userId: "alice" }, { type: "agent", source: "agent_key", agentId: "agent" }] as Express.Request["actor"][]) {
      const result = await request(app(actor)).post("/interaction").set("X-Paperclip-Communication-Locale", "en");
      expect(result.status).toBe(200); expect(result.body.locale).toBeNull(); expect(result.body.actor).toEqual(actor);
    }
  });
  it("accepts a separately explicit board override and rejects malformed values", async () => {
    const actor: Express.Request["actor"] = { type: "board", source: "session", userId: "alice" };
    const result = await request(app(actor)).post("/interaction").set("X-Paperclip-Communication-Locale-Override", "en");
    expect(result.body).toEqual({ actor, locale: null, explicit: "en", other: null });
    expect((await request(app(actor)).post("/interaction").set("X-Paperclip-Communication-Locale-Override", "es")).status).toBe(400);
    const agent = await request(app({ type: "agent", source: "agent_key", agentId: "agent" })).post("/interaction").set("X-Paperclip-Communication-Locale-Override", "en");
    expect(agent.body.explicit).toBeNull();
  });
  it("does not mix two concurrent local requests", async () => {
    const actor: Express.Request["actor"] = { type: "board", source: "local_implicit", userId: "local-board" };
    const server = app(actor);
    const [pt, en] = await Promise.all([
      request(server).post("/interaction").set("X-Paperclip-Communication-Locale", "pt-BR"),
      request(server).post("/interaction").set("X-Paperclip-Communication-Locale", "en"),
    ]);
    expect(pt.body.locale).toBe("pt-BR"); expect(en.body.locale).toBe("en");
  });
});
