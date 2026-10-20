(function () {
  "use strict";

  var embed = document.querySelector(".gravefindr-embed");
  var frame = embed && embed.querySelector("iframe");
  if (!embed || !frame) return;

  var allowed = {
    "https://gravefindr.co.uk": true,
    "http://localhost:3000": true,
    "http://localhost:3010": true,
    "http://127.0.0.1:3000": true,
    "http://127.0.0.1:3010": true,
  };

  function setHeight(px) {
    var height = Math.max(480, Math.ceil(px));
    embed.style.setProperty("--gravefindr-h", height + "px");
  }

  window.addEventListener("message", function (event) {
    if (!allowed[event.origin]) return;
    var data = event.data;
    if (!data || data.type !== "gravefindr:resize" || typeof data.height !== "number") return;
    setHeight(data.height);
  });

  var host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    frame.src = frame.src.replace(
      "https://gravefindr.co.uk",
      "http://localhost:3010"
    );
  }
})();
