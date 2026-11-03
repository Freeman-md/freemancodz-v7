import { expect, test } from "@playwright/test";
import { advanceReply, openAssistant } from "./assistant.fixture";

test("follow bottom, retain older reading through chunks/reopen/resize, then resume", async ({
  page,
}) => {
  const dialog = await openAssistant(page, "long");
  const transcript = dialog.getByRole("region", { name: "Conversation" });
  const bottomGap = () =>
    transcript.evaluate(
      (element) =>
        element.scrollHeight - element.clientHeight - element.scrollTop,
    );
  await expect.poll(bottomGap).toBeLessThan(3);
  await dialog.getByRole("textbox").fill("Tell me more");
  await dialog.getByRole("button", { name: "Send message" }).click();
  await advanceReply(page);
  await expect.poll(bottomGap).toBeLessThan(3);
  await transcript.hover();
  await page.mouse.wheel(0, -500);
  await advanceReply(page, 100);
  await expect(
    dialog.getByRole("button", { name: "Latest message" }),
  ).toBeVisible();
  const position = await transcript.evaluate((element) => element.scrollTop);
  await advanceReply(page);
  await expect
    .poll(() => transcript.evaluate((element) => element.scrollTop))
    .toBeCloseTo(position, 0);
  await dialog.getByRole("button", { name: "Close assistant" }).click();
  await advanceReply(page, 500);
  await page.getByRole("button", { name: "Open fixture assistant" }).click();
  await advanceReply(page, 500);
  await expect
    .poll(() => transcript.evaluate((element) => element.scrollTop))
    .toBeCloseTo(position, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole("button", { name: "Latest message" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Latest message" }).click();
  await expect.poll(bottomGap).toBeLessThan(3);
  await expect(
    dialog.getByRole("button", { name: "Latest message" }),
  ).toHaveCount(0);
});

test("long draft scrolls internally without shifting stationary controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const dialog = await openAssistant(page, "long-draft");
  const field = dialog.getByRole("textbox");
  expect(
    await field.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  const close = await dialog
    .getByRole("button", { name: "Close assistant" })
    .boundingBox();
  const send = await dialog
    .getByRole("button", { name: "Send message" })
    .boundingBox();
  await field.fill(Array(40).fill("A much longer question").join("\n"));
  await expect
    .poll(() =>
      dialog.getByRole("button", { name: "Close assistant" }).boundingBox(),
    )
    .toEqual(close);
  await expect
    .poll(() =>
      dialog.getByRole("button", { name: "Send message" }).boundingBox(),
    )
    .toEqual(send);
});
