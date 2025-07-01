window.addEventListener("load", () => {
    // window.requestIdleCallback(() => {
        const script = document.createElement("script");
        script.src = "https://es-modules.netlify.app/test/javascript/deploy_main.min.js";
        script.type = "module";
        document.head.appendChild(script);
    // });
});