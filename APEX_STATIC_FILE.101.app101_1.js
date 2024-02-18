const apex_app_id = document.querySelector("#pFlowId").value,
      apex_page_id = document.querySelector("#pFlowStepId").value,
      apex_session = document.querySelector("#pInstance").value,
      supportsPopover = HTMLElement.prototype.hasOwnProperty("popover").toString(),
      popup = document.querySelector("dialog.popup");

/* 
 ** CALLS AJAX PROCESS RETURNING DATA
 */
const execProcess = (template, method, input) => {
    return new Promise( async (resolve,reject) => {
        try {
            const url = gRestUrl + template,
                  session = apex_app_id + "," + apex_session + "," + apex_page_id;

            let response = await fetch(url, {method: method, headers: {"Apex-Session": session}, body: JSON.stringify(input)});

            if (!response.ok) {
                const data = await response.json();
                popupOpen(data.action, data.cause);
                throw new Error("Network response was not OK");
            }

            const data = await response.json();
            if (data.success) {
                resolve(data);
            } else {
                reject(data.sqlerrm);
                popupOpen("FAILURE IN " + method + " HANDLER FOR " + template, data.sqlerrm);
            }
        } catch (e) {
            console.error("execProcess",e);
        }
    });
}

const popupOpen = (heading, text) => {
    const parser = new DOMParser();
    popup.querySelector("h2").textContent = heading;
    popup.querySelector("p").textContent = parser.parseFromString('<!doctype html><body>' + text,"text/html").body.textContent;
    popup.showModal();
}

execProcess( "client-info", "POST", {"session_id": apex_session, "timezone": Intl.DateTimeFormat().resolvedOptions().timeZone, "maxtouchpoints": navigator.maxTouchPoints, "supports_popover":supportsPopover}).then( () => {
    console.log("client info sent to database");
});