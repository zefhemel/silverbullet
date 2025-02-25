import {
  editor,
  events,
  space,
  system,
} from "@silverbulletmd/silverbullet/syscalls";
import { readYamlPage } from "@silverbulletmd/silverbullet/lib/yaml_page";
import { builtinPlugNames } from "../builtin_plugs.ts";
import { findNodeMatching } from "@silverbulletmd/silverbullet/lib/tree";
import { parseMarkdown } from "$common/markdown_parser/parser.ts";
import { addParentPointers } from "@silverbulletmd/silverbullet/lib/tree";
import { findNodeOfType } from "@silverbulletmd/silverbullet/lib/tree";
import { assert } from "@std/assert/assert";
import { builtinLanguages } from "$common/languages.ts";

const plugsPage = "PLUGS";
const plugsPrelude =
  "#meta\n\nThis file lists all plugs added with the {[Plugs: Add]} command. Run the {[Plugs: Update]} command to update all Plugs defined anywhere using Space Config.\n\n";

export async function updatePlugsCommand() {
  await editor.save();
  await editor.flashNotification("Updating plugs...");
  await system.reloadConfig();
  try {
    const plugList: string[] = [];
    const configPlugs: any[] = await system.getSpaceConfig("plugs", []);
    if (!Array.isArray(configPlugs)) {
      throw new Error("Expected 'plugs' in Space Config to be an array");
    }
    const stringPlugs = configPlugs.filter((plug) => typeof plug === "string");
    if (stringPlugs.length !== configPlugs.length) {
      throw new Error(
        `${
          configPlugs.length - stringPlugs.length
        } plugs in Space Config aren't set as strings`,
      );
    }
    plugList.push(...stringPlugs);
    if (await space.fileExists("PLUGS.md")) {
      // This is not primary mode of managing plugs anymore, only here for backwards compatibility.
      try {
        const pagePlugs: any[] = await readYamlPage("PLUGS");
        if (Array.isArray(pagePlugs)) {
          // It's possible that the user is using it for something else, but if it has yaml with an array, assume it's plugs
          const pageStringPlugs = pagePlugs.filter((plug) =>
            typeof plug === "string"
          );
          if (pageStringPlugs.length !== pagePlugs.length) {
            throw new Error(
              `${
                pagePlugs.length - pageStringPlugs.length
              } plugs from PLUG page were not in a yaml list format`,
            );
          }
          plugList.push(...pageStringPlugs);
          if (pageStringPlugs.length > 0) {
            editor.flashNotification(
              `${pageStringPlugs.length} plugs in PLUGS page can be moved to Space Config for better editor support`,
            );
          }
        }
      } catch (e: any) {
        editor.flashNotification(
          `Error processing PLUGS page: ${e.message}`,
          "error",
        );
        return;
      }
    }

    // De-duplicate URIs, this is safe because by definition they point to the same plug
    plugList.forEach((uri, index) => {
      if (plugList.indexOf(uri) !== index) {
        plugList.splice(index, 1);
      }
    });

    console.log("Found Plug URIs:", plugList);
    const allCustomPlugNames: string[] = [];
    for (const plugUri of plugList) {
      const [protocol, ...rest] = plugUri.split(":");

      let plugName: string;
      if (protocol == "ghr") {
        // For GitHub Release, the plug is expected to be named same as repository
        plugName = rest[0].split("/")[1]; // skip repo owner
        // Strip "silverbullet-foo" into "foo" (multiple plugs follow this convention)
        if (plugName.startsWith("silverbullet-")) {
          plugName = plugName.slice("silverbullet-".length);
        }
      } else {
        // Other URIs are expected to contain the file .plug.js at the end
        const plugNameMatch = /\/([^\/]+)\.plug\.js$/.exec(plugUri);
        if (!plugNameMatch) {
          console.error(
            "Could not extract plug name from ",
            plugUri,
            "ignoring...",
          );
          continue;
        }

        plugName = plugNameMatch[1];
      }

      // Validate the extracted name
      if (builtinPlugNames.includes(plugName)) {
        throw new Error(
          `Plug name '${plugName}' is conflicting with a built-in plug`,
        );
      }
      if (allCustomPlugNames.includes(plugName)) {
        throw new Error(
          `Plug name '${plugName}' defined by more than one URI`,
        );
      }

      const manifests = await events.dispatchEvent(
        `get-plug:${protocol}`,
        rest.join(":"),
      );
      if (manifests.length === 0) {
        console.error("Could not resolve plug", plugUri);
      }
      // console.log("Got manifests", plugUri, protocol, manifests);
      const workerCode = manifests[0] as string;
      allCustomPlugNames.push(plugName);
      // console.log("Writing", `_plug/${plugName}.plug.js`, workerCode);
      await space.writeDocument(
        `_plug/${plugName}.plug.js`,
        new TextEncoder().encode(workerCode),
      );
    }

    const allPlugNames = [...builtinPlugNames, ...allCustomPlugNames];
    // And delete extra ones
    for (const { name: existingPlug } of await space.listPlugs()) {
      const plugName = existingPlug.substring(
        "_plug/".length,
        existingPlug.length - ".plug.js".length,
      );
      if (!allPlugNames.includes(plugName)) {
        await space.deleteDocument(existingPlug);
      }
    }
    await editor.flashNotification("And... done!");
  } catch (e: any) {
    editor.flashNotification("Error updating plugs: " + e.message, "error");
  }
}

export async function addPlugCommand(_cmdDef: any, uriSuggestion: string = "") {
  let uri = await editor.prompt("Plug URI:", uriSuggestion);
  if (!uri) {
    return;
  }
  // Support people copy & pasting the YAML version
  if (uri.startsWith("-")) {
    uri = uri.replace(/^\-\s*/, "");
  }

  let plugPageContent = plugsPrelude;
  if (await space.fileExists(plugsPage + ".md")) {
    plugPageContent = await space.readPage(plugsPage);
  } else {
    space.writePage(plugsPage, plugPageContent);
  }
  await editor.navigate({ kind: "page", page: plugsPage });
  // Here we are on the PLUGS page, if it didn't exist before it's filled with prelude
  const changeList = insertIntoPlugPage(uri, plugPageContent);
  for (const { from, to, text } of changeList) {
    editor.replaceRange(from, to, text);
  }
  await editor.flashNotification("Plug added!");
  system.reloadPlugs();
}

/** Add the plug to the end of the plugs list in Space Config inside the PLUGS page content
 * Returns an array for `editor.replaceRange` syscalls.
 *
 * Rewrites the `yaml` block to `space-config` if present
 * Appends the `space-config` block if needed.
 * Appends the `plugs` key on root level if needed.
 *
 * It's exported only to allow testing.
 * There are a bunch of asserts to please the type checker that will fail with a malformed page.
 */
export function insertIntoPlugPage(
  uri: string,
  pageContent: string,
): Array<{ from: number; to: number; text: string }> {
  const edits: Array<{ from: number; to: number; text: string }> = [];

  const tree = parseMarkdown(pageContent);
  addParentPointers(tree);

  const yamlInfo = findNodeMatching(tree, (n) => {
    return n.type === "CodeInfo" &&
      n.children !== undefined &&
      n.children.length === 1 &&
      n.children[0].text === "yaml";
  });
  const configInfo = findNodeMatching(tree, (n) => {
    return n.type === "CodeInfo" &&
      n.children !== undefined &&
      n.children.length === 1 &&
      n.children[0].text === "space-config";
  });

  if (yamlInfo) {
    // replace YAML with Space Config, add plugs: line at the start, and the new URI at the end
    assert(yamlInfo.from && yamlInfo.to);
    edits.push({ from: yamlInfo.from, to: yamlInfo.to, text: "space-config" });

    assert(yamlInfo.parent);
    const yamlText = findNodeOfType(yamlInfo.parent, "CodeText");
    assert(yamlText && yamlText.from && yamlText.to);
    edits.push({ from: yamlText.from, to: yamlText.from, text: "plugs:\n" });
    edits.push({ from: yamlText.to, to: yamlText.to, text: `\n- ${uri}` });
  } else if (configInfo) {
    // Append the required parts into the Space Config block, using lezer's (upstream) parser
    assert(configInfo.parent);
    const configText = findNodeOfType(configInfo.parent, "CodeText");
    assert(configText && configText.from && configText.to);
    assert(configText.children?.length === 1 && configText.children[0].text);

    const config = configText.children[0].text;
    const configTree = builtinLanguages["yaml"].parser.parse(config);
    configTree.iterate({
      enter: (n) => {
        if (
          n.name === "Document" &&
          config.substring(n.from, n.to).startsWith("plugs:")
        ) {
          assert(configText.from);
          if (
            n.node.lastChild &&
            config.substring(n.node.lastChild.from, n.node.lastChild.to) === "]"
          ) {
            // This is a list with square brackets
            edits.push({
              from: configText.from + n.node.lastChild.from,
              to: configText.from + n.node.lastChild.from,
              text: `, "${uri}" `,
            });
          } else {
            edits.push({
              from: configText.from + n.to,
              to: configText.from + n.to,
              text: `\n- ${uri}`,
            });
          }
          return false; // Found the right node, no need to traverse any more
        } else {
          return true;
        }
      },
    });
    if (edits.length === 0) {
      // No plugs in this block
      edits.push({
        from: configText.to,
        to: configText.to,
        text: `\nplugs:\n- ${uri}`,
      });
    }
  } else {
    // Just add the whole block if there's nothing
    const configBlock = `\`\`\`space-config
plugs:
- ${uri}
\`\`\``;
    edits.push({
      from: pageContent.length,
      to: pageContent.length,
      // Start on an empty line
      text: (pageContent.endsWith("\n") || pageContent === "")
        ? configBlock
        : ("\n" + configBlock),
    });
  }

  // Sort edits from end to start, so they don't affect each other's positions
  edits.sort((a, b) => b.from - a.from);
  return edits;
}

export async function getPlugHTTPS(url: string): Promise<string> {
  const fullUrl = `https:${url}`;
  console.log("Now fetching plug code from", fullUrl);
  const req = await fetch(fullUrl);
  if (req.status !== 200) {
    throw new Error(`Could not fetch plug code from ${fullUrl}`);
  }
  return req.text();
}

export function getPlugGithub(identifier: string): Promise<string> {
  const [owner, repo, path] = identifier.split("/");
  let [repoClean, branch] = repo.split("@");
  if (!branch) {
    branch = "main"; // or "master"?
  }
  return getPlugHTTPS(
    `//raw.githubusercontent.com/${owner}/${repoClean}/${branch}/${path}`,
  );
}

export async function getPlugGithubRelease(
  identifier: string,
): Promise<string> {
  let [owner, repo, version] = identifier.split("/");
  let releaseInfo: any = {};
  let req: Response;
  if (!version || version === "latest") {
    console.log(`Fetching release manifest of latest version for ${repo}`);
    req = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
    );
  } else {
    console.log(`Fetching release manifest of version ${version} for ${repo}`);
    req = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/tags/${version}`,
    );
  }
  if (req.status !== 200) {
    throw new Error(
      `Could not fetch release manifest from ${identifier}`,
    );
  }
  releaseInfo = await req.json();
  version = releaseInfo.tag_name;

  let assetName: string | undefined;
  const shortName = repo.startsWith("silverbullet-")
    ? repo.slice("silverbullet-".length)
    : undefined;
  for (const asset of releaseInfo.assets ?? []) {
    if (asset.name === `${repo}.plug.js`) {
      assetName = asset.name;
      break;
    }
    // Support plug like foo.plug.js are in repo silverbullet-foo
    if (shortName && asset.name === `${shortName}.plug.js`) {
      assetName = asset.name;
      break;
    }
  }
  if (!assetName) {
    throw new Error(
      `Could not find "${repo}.plug.js"` +
        (shortName ? ` or "${shortName}.plug.js"` : "") +
        ` in release ${version}`,
    );
  }

  const finalUrl =
    `//github.com/${owner}/${repo}/releases/download/${version}/${assetName}`;
  return getPlugHTTPS(finalUrl);
}
