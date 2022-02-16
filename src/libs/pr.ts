import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import * as dedent from 'dedent';
import { Config } from '../config';
import { invariant } from './utils';

export async function handlePullRequestMessage(
  config: Config,
  output: string,
): Promise<void> {
  const {
    githubToken,
    command,
    stackName,
    options: { editCommentOnPr },
  } = config;

  const heading = `#### :tropical_drink: \`${command}\` on ${stackName}`;
  const rawBody = output.substring(0, 64_000);
  const body = dedent`
    ${heading}
    \`\`\`
    ${rawBody}
    \`\`\`
    ${
      rawBody.length === 64_000
        ? '**Warn**: The output was too long and was trimmed.'
        : ''
    }
  `;

  const { payload, repo } = context;
  invariant(payload.pull_request, 'Missing pull request event data.');

  const octokit = getOctokit(githubToken);

  if (editCommentOnPr) {
    core.warning(`Attempting to edit comment`);
    const { data: reviews } = await octokit.rest.pulls.listReviews({
      ...repo,
      pull_number: payload.pull_request.number,
    });
    core.warning(`Found these reviews`);
    const review = reviews.find((review) => {
      return (
        review.user.type === 'Bot' &&
        review.body.search(`:tropical_drink:.*${command}.*${stackName}`)
      );
    });
    core.warning(`Narrowed down to this one`);

    // If comment exists, update it.
    if (review) {
      core.warning(`Updating the review`);
      await octokit.rest.pulls.updateReview({
        ...repo,
        review_id: review.id,
        pull_number: payload.pull_request.number,
        body,
      });
      core.warning(`Done!`);
      return;
    }
  } else {
    core.warning(`Falling back - create review`);
    await octokit.rest.pulls.createReview({
      ...repo,
      pull_number: payload.pull_request.number,
      body,
    });
  }
}
