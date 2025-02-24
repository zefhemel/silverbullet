import {
  decodePageURI,
  encodePageRef,
  encodePageURI,
  parseLocationRef,
  parsePageRef,
  validatePageName,
} from "./page_ref.ts";
import { assertEquals, AssertionError, assertThrows } from "@std/assert";

Deno.test("Page utility functions", () => {
  // Base cases
  assertEquals(parseLocationRef("foo"), { kind: "page", page: "foo" });
  assertEquals(parseLocationRef("[[foo]]"), { kind: "page", page: "foo" });
  assertEquals(parseLocationRef("foo@1"), {
    kind: "page",
    page: "foo",
    pos: 1,
  });
  assertEquals(parseLocationRef("foo@L1"), {
    kind: "page",
    page: "foo",
    pos: { line: 1, column: 1 },
  });
  assertEquals(parseLocationRef("foo@L2C3"), {
    kind: "page",
    page: "foo",
    pos: { line: 2, column: 3 },
  });
  assertEquals(parseLocationRef("foo@l2c3"), {
    kind: "page",
    page: "foo",
    pos: { line: 2, column: 3 },
  });
  assertEquals(parseLocationRef("foo$bar"), {
    kind: "page",
    page: "foo",
    anchor: "bar",
  });
  assertEquals(parseLocationRef("foo#My header"), {
    kind: "page",
    page: "foo",
    header: "My header",
  });
  assertEquals(parseLocationRef("foo$bar@1"), {
    kind: "page",
    page: "foo",
    anchor: "bar",
    pos: 1,
  });
  assertEquals(parseLocationRef("foo.pdf"), {
    kind: "document",
    page: "foo.pdf",
  });

  // Meta page
  assertEquals(parseLocationRef("^foo"), {
    kind: "page",
    page: "foo",
    meta: true,
  });

  // Edge cases
  assertEquals(parseLocationRef(""), { kind: "page", page: "" });
  assertEquals(parsePageRef("user@domain.com"), {
    kind: "page",
    page: "user@domain.com",
  });

  // Encoding
  assertEquals(encodePageRef({ kind: "page", page: "foo" }), "foo");
  assertEquals(encodePageRef({ kind: "page", page: "foo", pos: 10 }), "foo@10");
  assertEquals(
    encodePageRef({ kind: "page", page: "foo", pos: { line: 10, column: 1 } }),
    "foo@L10",
  );
  assertEquals(
    encodePageRef({ kind: "page", page: "foo", pos: { line: 10, column: 5 } }),
    "foo@L10C5",
  );
  assertEquals(
    encodePageRef({ kind: "page", page: "foo", anchor: "bar" }),
    "foo$bar",
  );
  assertEquals(
    encodePageRef({ kind: "page", page: "foo", header: "bar" }),
    "foo#bar",
  );

  // Page name validation

  try {
    validatePageName("perfectly fine page name");
    validatePageName("this is special case of a.conflicted.1234");
  } catch (error) {
    throw new AssertionError(
      `Something is very wrong with the validatePageName function: ${error}`,
    );
  }

  assertThrows(() => validatePageName(""), Error);
  assertThrows(() => validatePageName(".hidden"), Error);
  assertThrows(() => validatePageName(".."), Error);

  for (const extension of ["md", "txt", "exe", "cc", "ts"]) {
    assertThrows(
      () => validatePageName(`extensions-are-not-welcome.${extension}`),
      Error,
    );
  }

  for (const extension of ["db2", "woff2", "sqlite3", "42", "0"]) {
    assertThrows(
      () => validatePageName(`extensions-can-contain-numbers-too.${extension}`),
      Error,
    );
  }
});

Deno.test("Page URI encoding", () => {
  assertEquals(encodePageURI("foo"), "foo");
  assertEquals(encodePageURI("folder/foo"), "folder/foo");
  assertEquals(encodePageURI("hello there"), "hello%20there");
  assertEquals(encodePageURI("hello?there"), "hello%3Fthere");
  // Now ensure all these cases are reversible
  assertEquals(decodePageURI("foo"), "foo");
  assertEquals(decodePageURI("folder/foo"), "folder/foo");
  assertEquals(decodePageURI("hello%20there"), "hello there");
  assertEquals(decodePageURI("hello%3Fthere"), "hello?there");
});
