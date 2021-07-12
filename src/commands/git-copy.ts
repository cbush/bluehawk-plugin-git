import { strict as assert } from "assert";
import _rimraf from "rimraf";
import { promises as fs } from "fs";
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
    startPoint,
  } = args;
  const toRepo = args["to-repo"];
  // Basename works on URLs too
  const clonePath = `temporary_${Path.basename(toRepo)}_clone`;
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
      startPoint !== undefined
        ? await git.cwd(clonePath).checkoutBranch(branch, startPoint)
        : await git.cwd(clonePath).checkoutLocalBranch(branch);
    }

    if (deleteEverything) {
      console.log("Deleting everything in clone.");
      console.log(
        `Before:\n${(await listFilesInTreeExceptGit(clonePath)).join("\n")}\n`
      );
      await rimraf(Path.join(clonePath, "*"));
      console.log(
        `After:\n${(await listFilesInTreeExceptGit(clonePath)).join("\n")}\n`
      );
    }

    console.log("Copying...");
    const errors = await copy({
      rootPath,
      ignore,
      state,
      destination: clonePath,
      waitForListeners: true,
    });
    assert(errors.length === 0);
    console.log(
      `Copy complete. Files:\n${(
        await listFilesInTreeExceptGit(clonePath)
      ).join("\n")}\n`
    );
    const message = commitMessage ?? "Update";
    console.log("Committing with message:", message);
    const commitResult = await git.cwd(clonePath).add(".").commit(message);
    console.log("Commit result:", commitResult);
    console.log("Pushing...");
    const pushResult = await git
      .cwd(clonePath)
      .push(branch ? ["-u", "origin", branch] : undefined);
    console.log("Push result:", pushResult);
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

async function listFilesInTreeExceptGit(path: string): Promise<string[]> {
  if (Path.basename(path) === ".git") {
    return [];
  }
  const stats = await fs.stat(path);
  if (!stats.isDirectory()) {
    return [path];
  }
  const paths = await fs.readdir(path);
  return (
    await Promise.all(
      paths.map((innerPath) =>
        listFilesInTreeExceptGit(Path.join(path, innerPath))
      )
    )
  ).flat();
}

export default commandModule;
