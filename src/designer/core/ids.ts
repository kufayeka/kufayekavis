import type { ElementId } from "./types";

import { nanoid } from "nanoid";

export function createId(prefix: string = "el"): ElementId {
  return `${prefix}_${nanoid(10)}`;
}
