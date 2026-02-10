import { getPreferenceValues, Icon, Image } from "@raycast/api";
import { createHash } from "crypto";
import { Preferences } from "../../types";
import { getAvatarIcon } from "@raycast/utils";

const GRAVATAR_SIZE = 48;

/**
 * Returns an Image.ImageLike for use as an avatar icon from a Gravatar email.
 *
 * @param email - The email address to resolve to a Gravatar image.
 * @returns Image.ImageLike suitable for List.Item icon or accessory.
 */
export function GravatarIcon(name: string, email: string): Image.ImageLike | undefined {
  const { userIconProvider } = getPreferenceValues<Preferences>();
  if (userIconProvider === "none") {
    return undefined;
  }

  if (userIconProvider === "initials") {
    return getAvatarIcon(name);
  }

  const hash = createHash("md5").update(email.trim()).digest("hex");
  const url = `https://www.gravatar.com/avatar/${hash}?s=${GRAVATAR_SIZE}&d=${userIconProvider}`;

  return {
    source: url,
    mask: Image.Mask.Circle,
    fallback: Icon.PersonCircle
  };
}
