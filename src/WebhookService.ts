const Octokit = require("@octokit/rest");
import {ReposCompareCommitsResponse, ReposListReleasesResponseItem} from "@octokit/rest";
import {Release} from "github-webhook-event-types";
import {List} from "immutable";

export class WebhookService {
  private github;

  constructor(token: string) {
    this.github = new Octokit({
      auth: `token ${token}`,
      userAgent: "octokit/rest.js v16.17.0"
    });
  }

  public async process(hook: Release): Promise<void> {
    const owner = hook.repository.owner.login;
    const repo = hook.repository.name;
    const releaseNote = await this.genReleaseNote(hook);
    const currentRelease = await this.github.repos.getLatestRelease({owner, repo});
    await this.github.repos.updateRelease({owner, repo, release_id: currentRelease.data.id, body: releaseNote});
  }

  private async genReleaseNote(hook: Release): Promise<string> {
    const owner = hook.repository.owner.login;
    const repo = hook.repository.name;
    const res = await this.github.repos.listReleases({owner, repo});
    const releases = List<ReposListReleasesResponseItem>(res.data);
    const head = releases.get(0).tag_name;
    const base = releases.get(1).tag_name;
    const compareCommitResponse: ReposCompareCommitsResponse = await this.github.repos.compareCommits({owner, repo, base, head});
    return List(compareCommitResponse.data.commits)
      .map((commit: any) => {
        let message = commit.commit.message;
        // process commit message of squash merge
        if (message.indexOf('\n') !== -1) {
          message = message.substr(0, message.indexOf('\n'))
        }
        return `- ${message}`
      })
      .join("\n");
  }
}
