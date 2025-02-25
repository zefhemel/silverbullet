import {
  editor,
  space,
  system,
  template,
} from "@silverbulletmd/silverbullet/syscalls";
import type { PageMeta } from "../../plug-api/types.ts";
import { getObjectByRef, queryObjects } from "../index/plug_api.ts";
import type { FrontmatterConfig, TemplateObject } from "./types.ts";
import { renderTemplate } from "./api.ts";
import type { Config } from "../../type/config.ts";

export async function newPageCommand(
  _cmdDef: any,
  templateName?: string,
  askName = true,
) {
  if (!templateName) {
    const allPageTemplates = await listPageTemplates();
    // console.log("All page templates", allPageTemplates);
    const selectedTemplate = await selectPageTemplate(allPageTemplates);

    if (!selectedTemplate) {
      return;
    }
    templateName = selectedTemplate.ref;
  }
  console.log("Selected template", templateName);

  await instantiatePageTemplate(templateName!, undefined, askName);
}

function listPageTemplates() {
  return queryObjects<TemplateObject>("template", {
    // where hooks.newPage exists
    filter: ["attr", ["attr", "hooks"], "newPage"],
  });
}

// Invoked when a new page is created
export async function newPage(pageName: string) {
  console.log("Asked to setup a new page for", pageName);
  const allPageTemplatesMatchingPrefix = (await listPageTemplates()).filter(
    (templateObject) => {
      const forPrefix = templateObject.hooks?.newPage?.forPrefix;
      return forPrefix !== undefined && pageName.startsWith(forPrefix);
    },
  );
  // console.log("Matching templates", allPageTemplatesMatchingPrefix);
  if (allPageTemplatesMatchingPrefix.length === 0) {
    // No matching templates, that's ok, we'll just start with an empty page, so let's just return
    return;
  }
  if (allPageTemplatesMatchingPrefix.length === 1) {
    // Only one matching template, let's use it
    await instantiatePageTemplate(
      allPageTemplatesMatchingPrefix[0].ref,
      pageName,
      false,
    );
  } else {
    // Let's offer a choice
    const selectedTemplate = await selectPageTemplate(
      allPageTemplatesMatchingPrefix,
    );

    if (!selectedTemplate) {
      // No choice made? We'll start out empty
      return;
    }

    await instantiatePageTemplate(
      selectedTemplate.ref,
      pageName,
      false,
    );
  }
}

function selectPageTemplate(options: TemplateObject[]) {
  return editor.filterBox(
    "Page template",
    options.map((templateObj) => {
      const niceName = templateObj.ref.split("/").pop()!;
      return {
        ...templateObj,
        description: templateObj.description || templateObj.ref,
        name: templateObj.displayName || niceName,
      };
    }),
    `Select the template to create a new page from`,
  );
}

export async function instantiatePageTemplate(
  templateName: string,
  intoCurrentPage: string | undefined,
  askName: boolean,
  customData: any = undefined,
): Promise<string | void> {
  const templateText = await space.readPage(templateName!);
  const config = await system.getSpaceConfig();

  console.log(
    "Instantiating page template",
    templateName,
    intoCurrentPage,
    askName,
  );

  const tempPageMeta: PageMeta = {
    tag: "page",
    ref: "",
    name: "",
    created: "",
    lastModified: "",
    perm: "rw",
    data: customData,
  };
  // Just used to extract the frontmatter
  const { frontmatter } = await renderTemplate(
    templateText,
    tempPageMeta,
    { page: tempPageMeta, config },
  );

  const frontmatterConfig: FrontmatterConfig = frontmatter;
  const newPageConfig = frontmatterConfig.hooks!.newPage!;

  let pageName: string | undefined = intoCurrentPage ||
    await replaceTemplateVars(
      newPageConfig.suggestedName || "",
      tempPageMeta,
      config,
    );

  if (!intoCurrentPage && askName && newPageConfig.confirmName !== false) {
    pageName = await editor.prompt(
      "Name of new page",
      await replaceTemplateVars(
        newPageConfig.suggestedName || "",
        tempPageMeta,
        config,
      ),
    );
    if (!pageName) {
      return;
    }
  }
  tempPageMeta.name = pageName;

  if (!intoCurrentPage) {
    // Check if page exists, but only if we're not forcing the name (which only happens when we know that we're creating a new page already)
    try {
      // Fails if doesn't exist
      await space.getPageMeta(pageName);

      // So, page exists
      if (newPageConfig.openIfExists) {
        console.log("Page already exists, navigating there");
        await editor.navigate({ kind: "page", page: pageName, pos: 0 });
        return pageName;
      }

      // let's warn
      if (
        !await editor.confirm(
          `Page ${pageName} already exists, are you sure you want to override it?`,
        )
      ) {
        // Just navigate there without instantiating
        return editor.navigate({ kind: "page", page: pageName, pos: 0 });
      }
    } catch {
      // The preferred scenario, let's keep going
    }
  }

  const { text: pageText, renderedFrontmatter } = await renderTemplate(
    templateText,
    tempPageMeta,
    { page: tempPageMeta, config },
  );
  let fullPageText = renderedFrontmatter
    ? "---\n" + renderedFrontmatter + "---\n" + pageText
    : pageText;
  const carretPos = fullPageText.indexOf("|^|");
  fullPageText = fullPageText.replace("|^|", "");
  if (intoCurrentPage) {
    await editor.insertAtCursor(fullPageText);
    if (carretPos !== -1) {
      await editor.moveCursor(carretPos);
    }
  } else {
    await space.writePage(
      pageName,
      fullPageText,
    );
    await editor.navigate({
      kind: "page",
      page: pageName,
      pos: carretPos !== -1 ? carretPos : undefined,
    });
  }
  return pageName;
}

export async function loadPageObject(pageName?: string): Promise<PageMeta> {
  if (!pageName) {
    return {
      ref: "",
      name: "",
      tags: ["page"],
      lastModified: "",
      created: "",
    } as PageMeta;
  }
  return (await getObjectByRef<PageMeta>(
    pageName,
    "page",
    pageName,
  )) || {
    ref: pageName,
    name: pageName,
    tags: ["page"],
    lastModified: "",
    created: "",
  } as PageMeta;
}

export function replaceTemplateVars(
  s: string,
  pageMeta: PageMeta,
  config: Config,
): Promise<string> {
  return template.renderTemplate(s, {}, { page: pageMeta, config });
}
