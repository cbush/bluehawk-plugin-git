import * as Path from "path";
import { commandDir, Plugin } from "bluehawk";

const plugin: Plugin = {
  register({ yargs }) {
    yargs.command("git", "git functionality", (args) =>
      commandDir(args.demandCommand(), Path.join(__dirname, "commands"))
    ),
      () => yargs.showHelp();
  },
};

export const register = plugin.register;
