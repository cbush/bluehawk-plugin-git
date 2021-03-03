import * as Path from "path";
import { commandDir, Plugin } from "bluehawk";

const plugin: Plugin = {
  register({ yargs }) {
    commandDir(yargs, Path.join(__dirname, "commands"));
  },
};

export const register = plugin.register;
