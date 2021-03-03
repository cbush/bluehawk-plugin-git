import {
  MainArgs,
  withDestinationOption,
  withIgnoreOption,
  withStateOption,
} from "bluehawk";
import { CommandModule } from "yargs";

export interface GitCopyArgs extends MainArgs {
  rootPath: string;
  destination: string;
  state?: string;
  ignore?: string | string[];
}

export const gitCopy = async (args: GitCopyArgs): Promise<void> => {
  // TODO
  console.log("It works!");
};

const commandModule: CommandModule<
  MainArgs & { rootPath: string },
  GitCopyArgs
> = {
  command: "git-copy <rootPath>",
  builder(yargs) {
    return withIgnoreOption(withStateOption(withDestinationOption(yargs)));
  },
  async handler(args) {
    await gitCopy(args);
  },
  aliases: [],
  describe: "clone source project to git repo with Bluehawk commands processed",
};

export default commandModule;
