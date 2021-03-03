import { strict as assert } from "assert";
import _rimraf from "rimraf";
import * as Path from "path";
import { copy, MainArgs, withIgnoreOption, withStateOption } from "bluehawk";
import simpleGit from "simple-git";
import { CommandModule } from "yargs";

const commandModule: CommandModule<
  MainArgs & { rootPath: string },
  GitCopyArgs
> = {
  command: "copy <rootPath>",
  describe:
    "copy source project to a git repo with Bluehawk commands processed, commit, and push",
  builder(yargs) {
    yargs.parserConfiguration({ "duplicate-arguments-array": false });
    return withIgnoreOption(withStateOption(yargs))
      .option("to-repo", {
        string: true,
        describe: "the destination repository path or URL",
        required: true,
      })
      .option("branch", {
        string: true,
        describe: "the branch of the destination repository if not default",
      })
      .option("commit-message", {
        string: true,
        describe: "the message to use in the commit after copy",
      })
      .option("delete-everything", {
        boolean: true,
        describe:
          "if set, delete everything in the cloned destination repo before copying",
      });
  },
  handler: gitCopy,
  aliases: [],
};

export interface GitCopyArgs extends MainArgs {
  rootPath: string;
  state?: string;
  ignore?: string | string[];
  "to-repo": string;
  branch?: string;
  startPoint?: string;
  deleteEverything?: boolean;
  commitMessage?: string;
}

/**
  Copy a source project to a git repo with Bluehawk commands processed, then
  commit and push.
 */
export async function gitCopy(args: GitCopyArgs): Promise<void> {
  const {
    rootPath,
    ignore,
    state,
    branch,
    deleteEverything,
    commitMessage,
  } = args;
  const toRepo = args["to-repo"];
  const clonePath = "___temp_clone___";
  const branchExists = await remoteBranchExists(toRepo, branch);
  if (branch !== undefined) {
    console.log(`Branch ${branch} exists: ${branchExists}`);
  }

  const cloneOptions: Record<string, string | number> = {
    "--depth": 1,
  };

  if (branchExists) {
    assert(branch !== undefined);
    cloneOptions["--branch"] = branch;
  }

  console.log("Cloning...");
  const git = simpleGit();
  await git.clone(toRepo, clonePath, cloneOptions);
  try {
    if (branch !== undefined && !branchExists) {
      await git.cwd(clonePath).checkoutLocalBranch(branch);
    }

    if (deleteEverything) {
      console.log("Deleting everything in clone.");
      await rimraf(Path.join(clonePath, "*"));
    }

    console.log("Copying...");
    await copy({
      rootPath,
      ignore,
      state,
      destination: clonePath,
      waitForListeners: true,
    });
    console.log("Copy complete.");

    const message = commitMessage ?? "Update";
    console.log("Committing with message:", message);
    const result = await git
      .cwd(clonePath)
      .add(".")
      .commit(message)
      .push(branch ? ["-u", "origin", branch] : undefined);
    console.log("Push result:", result);
  } finally {
    await rimraf(clonePath);
  }
}

async function remoteBranchExists(repo: string, branch: string | undefined) {
  if (branch === undefined) {
    return false;
  }
  const git = simpleGit();
  const result = await git.listRemote(["--heads", repo, branch]);
  return result !== "";
}

// Make rimraf async
function rimraf(path: string, options?: _rimraf.Options) {
  return new Promise<void>((resolve, reject) =>
    _rimraf(path, options ?? {}, (error) => (error ? reject(error) : resolve()))
  );
}

export default commandModule;
