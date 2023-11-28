const apex_app_id = document.querySelector("#pFlowId").value,
      apex_page_id = document.querySelector("#pFlowStepId").value,
      apex_session = document.querySelector("#pInstance").value,
      vitalsQueue = new Set(),
      popup = document.querySelector("dialog"),
      privacy = document.querySelector("[data-id]");

/*
**  CLOSE DIALOGS
*/
document.querySelectorAll("button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

const addToVitalsQueue = (metric) => {
    console.log(metric.name,metric.value);
    vitalsQueue.add(metric);
}

const flushQueues = () => {
    if (vitalsQueue.size > 0) {    
        const body =JSON.stringify( {session_id:apex_session, page_id: apex_page_id, cwv: [...vitalsQueue] });
        let url = gRestUrl + "web-vitals";
        (navigator.sendBeacon && navigator.sendBeacon(url, body)) || fetch(url, {body, method: 'POST', keepalive: true});
        vitalsQueue.clear();
    }
}

window.addEventListener("DOMContentLoaded", (event) => {
    console.log("apex_app_id",apex_app_id);
    console.log("apex_page_id",apex_page_id);
    console.log("apex_session",apex_session);

    const supportsPopover = HTMLElement.prototype.hasOwnProperty("popover").toString();
    console.log("supportsPopover",supportsPopover);

    execProcess( "client-info", "POST", {"session_id": apex_session, "timezone": Intl.DateTimeFormat().resolvedOptions().timeZone, "maxtouchpoints": navigator.maxTouchPoints, "supports_popover":supportsPopover}).then( () => {
        console.log("client info sent to server");
    });
    
    addEventListener('visibilitychange', () => {
        if (document.visibilityState === "hidden") {
            flushQueues();
        }
    }, { capture: true} );
    
    if ('onpagehide' in self) {
        addEventListener('pagehide', () => {
            flushQueues();
        }, { capture: true} );
    }
});

/* 
 ** CALLS AJAX PROCESS RETURNING DATA
 */
const execProcess = (template, method, input) => {
    return new Promise( async (resolve,reject) => {
        try {
            const url = gRestUrl + template,
                  session = apex_app_id + "," + apex_session + "," + apex_page_id;

            let response;
            
            if (method==="GET") {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}});
            } else {
                response = await fetch(url, {method: method, headers: {"Apex-Session": session}, body: JSON.stringify(input)});
            }

            if (!response.ok) {
                throw new Error("Network response was not OK");
            }

            const data = await response.json();
            if (data.success) {
                resolve(data);
            } else {
                reject(data.sqlerrm);
                console.error("ERROR execProcess",data.sqlerrm);
            }
        } catch (e) {
            console.error("execProcess",e);
        }
    });
}

/*
 ** MISERABLE PRIVACY POLICY
 */
privacy.addEventListener("click", (e) => {
    execProcess( "article/"+e.currentTarget.dataset.id,"GET").then( (data) => {
        popup.querySelector(".content").innerHTML = data.content;
        popup.showModal();
    });
});