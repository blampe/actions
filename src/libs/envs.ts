import * as envalid from 'envalid';

export const environmentVariables = envalid.cleanEnv(process.env, {
  GITHUB_WORKSPACE: envalid.str(),
  PULUMI_API: envalid.str({default: "https://api.pulumi.io"}),
  PULUMI_ACCESS_TOKEN: envalid.str({
    default: '',
  }),
});

export type EnvironmentVariables = typeof environmentVariables;
