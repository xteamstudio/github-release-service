const Octokit = require("@octokit/rest");
import {IssuesGetResponse, ReposCompareCommitsResponse, ReposListReleasesResponseItem} from "@octokit/rest";
import {Release} from "github-webhook-event-types";
import {IssuesLabel} from "github-webhook-event-types/source/Issues";
import {List, Set} from "immutable";
import issueRegex from "issue-regex";

export const prefixRegExp = (prefix: string): RegExp => new RegExp(`${prefix}[1-9]\\d*\\b`, "g");

export class WebhookService {
  private github;
  private readonly prefix;

  constructor(token: string, prefix: string) {
    this.github = new Octokit({
      auth: `token ${token}`,
      userAgent: "octokit/rest.js v16.17.0"
    });

    this.prefix = prefix;
  }

  public async process(hook: Release): Promise<void> {
    if (hook.action !== "published") {
      return;
    }

    const owner = hook.repository.owner.login;
    const repo = hook.repository.name;
    const releaseNote = await this.genReleaseNote(hook);
    const currentRelease = await this.github.repos.getLatestRelease({owner, repo});
    await this.github.repos.updateRelease({owner, repo, release_id: currentRelease.data.id, body: releaseNote});
  }

  private async genReleaseNote(hook: Release): Promise<string> {
    const isCustomPrefix = this.prefix !== "";
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
        return message.indexOf("Merge pull request") === -1 && List(message.match(issueRegex())).size > 0;
      })
      .map((message) => {
        return isCustomPrefix ?
            List<string>(message.match(prefixRegExp(this.prefix))) :
            List<string>(message.match(issueRegex())).map((i) => i.replace("#", ""));
      })
      .flatten()
      .toArray());

    if (isCustomPrefix) {
      return `### Resolves\n${issues.map((issue: string) => `- ${issue}`).join("\n")}`
    } else {
      const issueList = List().asMutable();
      for (const issueNo of issues.toArray()) {
        const res = await this.github.issues.get({owner, repo, number: issueNo});
        const issueItem: IssuesGetResponse = res.data;
        !issueItem.pull_request && issueList.push(issueItem);
      }

      return WebhookService.groupByIssueLabelType(issueList);
    }
  }

  private static groupByIssueLabelType(issueList: List<IssuesGetResponse>): string {
    return issueList.groupBy((issue) => WebhookService.getLabelType(issue.labels))
      .map((issues: List<IssuesGetResponse>, issueLabelType) => {
        const groupTitle = `### ${issueLabelType}\n`;
        const rows = issues.map((issue) => `- [#${issue.number}] ${issue.title}`);
        return groupTitle + rows.join("\n")
      }).join("\n");
  }

  private static getLabelType(labels: IssuesLabel[]): "Fixes" | "Features" | "widgets" | "Improvement" | "Development" | "Others" {
    const labelList = List<IssuesLabel>(labels);
    if (labelList.find((label) => label.name.toLocaleLowerCase().includes("bug"))) {
      return "Fixes";
    } else if (labelList.find((label) => label.name.toLocaleLowerCase().includes("task"))) {
      return "Features";
    } else if (labelList.find((label) => label.name.toLocaleLowerCase().includes("widget"))) {
      return "widgets";
    } else if (labelList.find((label) => label.name.toLocaleLowerCase().includes("Improvement"))) {
      return "Improvement";
    } else if (labelList.find((label) => label.name.toLocaleLowerCase().includes("development"))) {
      return "Development";
    } else {
      return "Others"
    }
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
