import * as gh from '@actions/github';
import { Config } from '../../config';
import { handlePullRequestMessage } from '../pr';

const reviews = [
  { id: 1, body: 'not relevant', user: { type: 'User' } },
  {
    id: 2,
    body: `\n:tropical_drink: The **[Update (preview)](https://app.pulumi.com/org/stack/name/previews/99efd9d8-fa6f-4951-beda-4fd25a09d7af)** for stack **[org/stack/name](https://app.pulumi.com/org/stack/name)** was successful.`,
    user: { type: 'Bot' },
  },
];
const listReviews = jest.fn((_) => {
  return { data: reviews };
});
const updateReview = jest.fn();
const createComment = jest.fn();

jest.mock('@actions/github', () => ({
  context: {},
  getOctokit: jest.fn(() => ({
    rest: {
      issues: {
        createComment,
      },
      pulls: {
        listReviews,
        updateReview,
      },
    },
  })),
}));

describe('pr.ts', () => {
  beforeEach(() => {
    jest.resetModules();
    createComment.mockClear();
    listReviews.mockClear();
    updateReview.mockClear();
  });

  it('should add pull request message', async () => {
    // @ts-ignore
    gh.context = {
      payload: {
        pull_request: {
          number: 123,
        },
      },
    };

    process.env.GITHUB_REPOSITORY = 'pulumi/actions';

    await handlePullRequestMessage({ options: {} } as Config, 'test');
    expect(createComment).toHaveBeenCalled();
  });

  it('should fail if no pull request data', async () => {
    process.env.GITHUB_REPOSITORY = 'pulumi/actions';
    // @ts-ignore
    gh.context = { payload: {} };
    await expect(
      handlePullRequestMessage({ options: {} } as Config, 'test'),
    ).rejects.toThrowError('Missing pull request event data');
  });

  it('should edit the previous comment', async () => {
    process.env.GITHUB_REPOSITORY = 'pulumi/actions';

    const command = 'preview';
    const stack = 'org/stack/name';

    // @ts-ignore
    gh.context = {
      payload: {
        pull_request: {
          number: 123,
        },
      },
    };

    const newRawOutput = `
## Resource Changes
\`\`\`
diff
Name Type Operation
>- bar
>+ baz
\`\`\`
`;

    await handlePullRequestMessage(
      {
        options: { editCommentOnPr: true },
        command: command,
        stackName: stack,
      } as Config,
      newRawOutput,
    );

    expect(updateReview).toHaveBeenCalled();
  });

  it('should trim the output when the output is larger than 64k characters', async () => {
    process.env.GITHUB_REPOSITORY = 'pulumi/actions';
    // @ts-ignore
    gh.context = {
      payload: {
        pull_request: {
          number: 123,
        },
      },
    };

    await handlePullRequestMessage(
      { options: {} } as Config,
      'a'.repeat(65_000),
    );

    const call = createComment.mock.calls[0][0];
    expect(call.body.length).toBeLessThan(65_536);
    expect(call.body).toContain('The output was too long and was trimmed');
  });
});
