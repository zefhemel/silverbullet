export const panelHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <base target="_top">
    <meta name='color-scheme' content='dark light'>
<script>
const pendingRequests = new Map();
let syscallReqId = 0;

self.syscall = async (name, ...args) => {
  return await new Promise((resolve, reject) => {
    syscallReqId++;
    pendingRequests.set(syscallReqId, { resolve, reject });
    window.parent.postMessage({
      type: "syscall",
      id: syscallReqId,
      name,
      args,
    }, "*");
  });
};

let oldHeight = undefined;
let heightChecks = 0;

window.addEventListener("message", (message) => {
  const data = message.data;
  switch (data.type) {
    case "html":
      document.body.innerHTML = data.html;
      if(data.theme) {
        document.getElementsByTagName("html")[0].setAttribute("data-theme", data.theme);
      }
      if (data.script) {
        try {
          eval(data.script);
        } catch (e) {
          console.error("Error evaling script", e);
        }
      }
      setTimeout(() => {
        oldHeight = undefined;
        heightChecks = 0;
        updateHeight();
      });
      break;
    case "syscall-response":
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
      }

      break;
  }
});

function api(obj) {
  window.parent.postMessage(obj, "*");
}

function updateHeight() {
  const body = document.body, html = document.documentElement;
  let height = Math.max(body.offsetHeight, html.offsetHeight);
  heightChecks++;
  if(height !== oldHeight) {
    oldHeight = height;
    api({
      type: "setHeight",
      height: height,
    });
  }
  if(heightChecks < 25) {
    setTimeout(updateHeight, 100);
  }
}

function loadJsByUrl(url,integrity=null) {
  const script = document.createElement("script");
  script.src = url;
  if(integrity){
    script.integrity=integrity;
    script.crossorigin="anonymous";
  }
  

  return new Promise((resolve) => {
    script.onload = resolve;
    document.documentElement.firstChild.appendChild(script);
  });
}
</script>
</head>
<body>

</body>
</html>`;
