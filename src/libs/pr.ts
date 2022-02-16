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

  try {
    if (editCommentOnPr) {
      console.log('editing PR');
      const { data: comments } = await octokit.rest.issues.listComments({
        ...repo,
        issue_number: payload.pull_request.number,
      });
      console.log(comments);
      const comment = comments.find((comment) => {
        return (
          comment.user.type === 'Bot' &&
          comment.body.match(`:tropical_drink:.*${command}.*${stackName}`)
        );
      });

      // If comment exists, update it.
      if (comment) {
        console.log('found', comment);
        await octokit.rest.issues.updateComment({
          ...repo,
          comment_id: comment.id,
          body,
        });
        return;
      }
    }
  } catch {
    core.warning(
      'Not able to edit comment, defaulting to creating a new comment.',
    );
  }

  await octokit.rest.issues.createComment({
    ...repo,
    issue_number: payload.pull_request.number,
    body,
  });
}
