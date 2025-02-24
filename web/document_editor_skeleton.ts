export const html = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <base target="_top">
  <meta name='color-scheme' content='dark light'>
  <script>
    const pendingRequests = new Map();
    let syscallReqId = 0;

    globalThis.addEventListener("message", (message) => {
      const data = message.data;

      // Passthrough non internal events
      if (!data.type.startsWith("internal-")) {
        globalThis.silverbullet.dispatchEvent(new CustomEvent(data.type, { detail: data }))
      }

      switch (data.type) {
        // { type: "init", html: string, script: string, theme: string }
        case "internal-init": {
          document.body.innerHTML = data.html;
          if (data.theme) {
            document.getElementsByTagName("html")[0].setAttribute("data-theme", data.theme);
          }

          try {
            eval(data.script);
          } catch (e) {
            console.error("Error evaling script", e);
          }
        } break;
        case "internal-syscall-response":
          {
            const syscallId = data.id;
            const lookup = pendingRequests.get(syscallId);
            if (!lookup) {
              console.log(
                "Current outstanding requests",
                pendingRequests,
                "looking up",
                syscallId,
              );
              throw Error("Invalid request id");
            }
            pendingRequests.delete(syscallId);
            if (data.error) {
              lookup.reject(new Error(data.error));
            } else {
              lookup.resolve(data.result);
            }
          } break;
      }
    });

    globalThis.addEventListener("keydown", (event) => {
      // This is really hacky... open to other solutions
      const keyEvent = new KeyboardEvent("keydown", event);

      Object.defineProperty(keyEvent, "target", {
        value: window.parent.document.body,
      });

      globalThis.parent.document.dispatchEvent(keyEvent);

      if (keyEvent.defaultPrevented) {
        event.preventDefault();
      }
    });

    globalThis.silverbullet = document.createDocumentFragment();

    globalThis.silverbullet.syscall = async (name, ...args) => {
      return await new Promise((resolve, reject) => {
        syscallReqId++;
        pendingRequests.set(syscallReqId, { resolve, reject });
        window.parent.postMessage({
          type: "internal-syscall",
          id: syscallReqId,
          name,
          args,
        }, "*");
      });
    };

    globalThis.silverbullet.sendMessage = (type, obj) => {
      window.parent.postMessage({ type, ...obj }, "*");
    }
  </script>
</head>

<body>
</body>

</html>`;
