import { prefixRegExp } from "../src/WebhookService";

describe("prefixRegExp spec", () => {
  it("should prefixRegExp proper", () => {
    const commitMessage = "Resolve M-1111 #5555 #6666 M-2222 and M-3333";
    expect(commitMessage.match(prefixRegExp("M-"))).toMatchSnapshot();
  });
});
