import {
  mkdirSync,
} from "node:fs";

import {
  dirname,
  resolve,
} from "node:path";

const DEFAULT_DATABASE_PATH =
  "data/posga.db";

export const DATABASE_PATH =
  resolve(
    process.cwd(),
    process.env
      .POSGA_DATABASE_PATH ??
      DEFAULT_DATABASE_PATH,
  );

export function pastikanDirektoriDatabase() {
  mkdirSync(
    dirname(
      DATABASE_PATH,
    ),
    {
      recursive: true,
    },
  );
}
