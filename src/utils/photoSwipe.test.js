import test from "node:test";
import assert from "node:assert/strict";
import { photoSwipeDirection } from "./photoSwipe.js";

test("horizontal swipe moves to the next or previous photo", () => {
  assert.equal(photoSwipeDirection({ x: 220, y: 300 }, { x: 120, y: 310 }), 1);
  assert.equal(photoSwipeDirection({ x: 120, y: 300 }, { x: 220, y: 310 }), -1);
});

test("small or predominantly vertical movement is ignored", () => {
  assert.equal(photoSwipeDirection({ x: 220, y: 300 }, { x: 190, y: 302 }), 0);
  assert.equal(photoSwipeDirection({ x: 220, y: 300 }, { x: 160, y: 390 }), 0);
});
