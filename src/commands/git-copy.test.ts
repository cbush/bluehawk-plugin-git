import { gitCopy } from "./git-copy";
import * as Path from "path";
import { promises as fs } from "fs";
import simpleGit from "simple-git";
import rimraf from "rimraf";

const sourceRoot = Path.join(__dirname, "..", "..");

const tmpDir = Path.join(sourceRoot, "tmp");
const pathToTestRepo = Path.join(tmpDir, "repo");
const pathToTestClone = Path.join(tmpDir, "clone");
const pathToTestSource = Path.join(tmpDir, "source");
const pathToTestFile = Path.join(pathToTestClone, "test.txt");
const pathToTrash = Path.join(pathToTestClone, "trash.txt");
const git = simpleGit();

describe("git copy", () => {
  beforeEach(async () => {
    await fs.mkdir(pathToTestRepo, { recursive: true });
    await fs.mkdir(pathToTestSource, { recursive: true });
    await fs.writeFile(
      Path.join(pathToTestSource, "test.txt"),
      `test.txt
:state-start: start
Hello!
:state-end:
:state-start: final
Goodbye!
:state-end:
:remove-start:
Do not copy this.
:remove-end:
`,
      "utf8"
    );
    await git.cwd(pathToTestRepo).init(["--bare"]);
    await git.clone(pathToTestRepo, pathToTestClone);
    await fs.writeFile(pathToTestFile, "Hello, world!\n", "utf8");
    await fs.writeFile(pathToTrash, "Delete me\n", "utf8");
    await git
      .cwd(pathToTestClone)
      .checkoutLocalBranch("main")
      .add(".")
      .commit("First commit")
      .push(["-u", "origin", "main"]);
  });

  afterEach((done) => rimraf(tmpDir, () => done()));

  it("can commit with state", async () => {
    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "main",
      commitMessage: "It works!",
    });
    let log = await git.cwd(pathToTestClone).pull().log();
    expect(log).toMatchObject({ latest: { message: "It works!" } });
    expect(log.all.length).toBe(2);
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe("test.txt\n");

    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "main",
      commitMessage: "Final state",
      state: "final",
    });
    log = await git.cwd(pathToTestClone).pull().log();
    expect(log).toMatchObject({ latest: { message: "Final state" } });
    expect(log.all.length).toBe(3);
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe(`test.txt
Goodbye!
`);

    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "main",
      commitMessage: "Start state",
      state: "start",
    });
    log = await git.cwd(pathToTestClone).pull().log();
    expect(log).toMatchObject({ latest: { message: "Start state" } });
    expect(log.all.length).toBe(4);
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe(`test.txt
Hello!
`);
  });

  it("can make new branches", async () => {
    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "main",
      commitMessage: "It works!",
    });
    let log = await git.cwd(pathToTestClone).pull().log();
    expect(log).toMatchObject({ latest: { message: "It works!" } });
    expect(log.all.length).toBe(2);
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe("test.txt\n");

    const mainLatestHash = log.latest?.hash;
    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "final",
      commitMessage: "Final state",
      state: "final",
      startPoint: mainLatestHash,
    });
    log = await git.cwd(pathToTestClone).pull().checkout("final").pull().log();
    expect(log).toMatchObject({ latest: { message: "Final state" } });
    expect(log.total).toBe(3);
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe(`test.txt
Goodbye!
`);

    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "start",
      commitMessage: "Start state",
      state: "start",
      startPoint: mainLatestHash,
    });
    log = await git.cwd(pathToTestClone).pull().checkout("start").pull().log();
    expect(log).toMatchObject({ latest: { message: "Start state" } });
    expect(log.total).toBe(3); // Note: based off main, not final
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe(`test.txt
Hello!
`);

    // Update existing branch
    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "final",
      commitMessage: "No state",
    });
    log = await git.cwd(pathToTestClone).pull().checkout("final").pull().log();
    expect(log).toMatchObject({ latest: { message: "No state" } });
    expect(log.total).toBe(4);
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe(`test.txt
`);
  });

  it("can delete everything in destination repo before commit", async () => {
    expect(await fs.readFile(pathToTrash, "utf8")).toBe("Delete me\n");
    await gitCopy({
      "to-repo": pathToTestRepo,
      rootPath: pathToTestSource,
      branch: "main",
      commitMessage: "It works!",
      deleteEverything: true,
    });
    const log = await git.cwd(pathToTestClone).pull().log();
    expect(log).toMatchObject({ latest: { message: "It works!" } });
    expect(log.all.length).toBe(2);
    expect(() => fs.readFile(pathToTrash, "utf8")).rejects.toThrow();
    expect(await fs.readFile(pathToTestFile, "utf8")).toBe("test.txt\n");
  });
});
