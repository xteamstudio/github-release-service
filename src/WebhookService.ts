const Octokit = require("@octokit/rest");
import {IssuesGetResponse, ReposCompareCommitsResponse, ReposListReleasesResponseItem} from "@octokit/rest";
import {Release} from "github-webhook-event-types";
import {List, Set} from "immutable";
import issueRegex from "issue-regex";

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

    const commits = releases.size < 2 ?
      await this.getFirstReleaseCommits(hook) :
      await this.getDiffCommits(hook, releases);

    const issues = Set(commits
      .map((commit: any) => commit.commit.message)
      .filter((message) => {
        return message.indexOf("Merge pull request")  === -1 && List(message.match(issueRegex())).size > 0;
      })
      .map((message) => {
        const issueNo = List<string>(message.match(issueRegex())).get(0);
        return issueNo.replace("#", "");
      })
      .toArray());

    const issueList = List().asMutable();
    for (const issueNo of issues.toArray()) {
      const res = await this.github.issues.get({owner, repo, number: issueNo});
      const issueItem: IssuesGetResponse = res.data;
      issueList.push(`- ${issueItem.title}`);
    }

    return issueList.join("\n");
  }

  private async getFirstReleaseCommits(hook: Release) {
    const owner = hook.repository.owner.login;
    const repo = hook.repository.name;
    const res = await this.github.repos.listCommits({owner, repo});
    return List(res.data);
  }

  private async getDiffCommits(hook: Release, releases: List<ReposListReleasesResponseItem>) {
    const owner = hook.repository.owner.login;
    const repo = hook.repository.name;
    const head = releases.get(0).tag_name;
    const base = releases.get(1).tag_name;
    const compareCommitResponse: ReposCompareCommitsResponse = await this.github.repos.compareCommits({owner, repo, base, head});
    return List(compareCommitResponse.data.commits);
  }
}
