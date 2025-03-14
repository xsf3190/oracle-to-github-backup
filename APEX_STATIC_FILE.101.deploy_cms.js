/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
** ACCESS CONTROLLED USING REFRESH AND ACCESS TOKENS (JWT)
*/
//import "https://codepen.io/xsf3190/pen/ByBQrGV.js"

let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

const bodydata = document.body.dataset;
const dropdown = document.querySelector(".dropdown details");
const menulist = document.querySelector(".dropdown .menulist");
const output = document.querySelector("dialog.output");
const content = output.querySelector("article");
const reportlist = output.querySelector("header > ul");
const showmore = output.querySelector(".show-more");

/* 
** CHECK IF TOKEN EXPIRED 
*/
const expiredToken = (token) => {
    if (!token) {
        return true;
    }
    const now = Math.floor(new Date().getTime() / 1000);
    const arrayToken = token.split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    return parsedToken.exp <= now;
}

/* 
** REPLACE NEW TOKENS IN STORAGE AND MEMORY. UPDATE UI
*/
const replaceTokens = (data) => {
    sessionStorage.setItem("token",data.token);
    access_token = data.token;
    localStorage.setItem("refresh",data.refresh);
    refresh_token = data.refresh;
    console.log("tokens refreshed");
}

/* 
** FORCE LOG OUT WHEN REFRESH TOKEN EXPIRED
*/
const forceLogout = () => {
    sessionStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("menulist");
    menulist.replaceChildren();
    document.querySelector(".login-btn").textContent = "Log In";
}

/* 
** COMMON ERROR HANDLER FOR API CALLS
*/
const responseok = (response, result) => {
    if (response.ok && result.success) {
        return(true);
    }
    if (result.cause) {
      throw new Error(`${response.status} - ${result.cause}`);
    }
    if (result.sqlcode) {
      throw new Error(`${response.status} - ${result.sqlerrm}`);
    } else {
      throw new Error(`${result.message}`);
    }
}

/* 
** CALL API FOR RESOURCES WITH ACCESS TOKEN
*/
const callAPI = async (endpoint, method, data) => {
    let url;

    if (!access_token) {
        access_token = localStorage.getItem("token");
    }
    if (!refresh_token) {
        refresh_token = localStorage.getItem("refresh");
    }

    if (expiredToken(access_token)) {
      if (expiredToken(refresh_token)) {
        forceLogout();
        return;
      }
      url = bodydata.resturl + "refresh-token/" + bodydata.websiteid;
      let refresh_headers = new Headers();
      refresh_headers.append("Content-Type", "application/json");
      refresh_headers.append("Authorization","Bearer " + refresh_token);
      const refresh_config = {method: "GET", headers: refresh_headers};
      const refresh_response = await fetch(url, refresh_config);
      const refresh_result = await refresh_response.json();
      if (responseok(refresh_response, refresh_result)) {
          replaceTokens(refresh_result);
      }
    }
      
    const path = endpoint.replace(":ID",bodydata.websiteid)
                         .replace(":PAGE",bodydata.articleid);
    
    url = bodydata.resturl + path;
  
    // Append any query parameters to url for GET requests
    if (method==="GET" && data) {
      url+=data;
    }
    
    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("url", window.location.hostname);
    headers.append("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
    headers.append("Authorization","Bearer " + access_token);
    
    let config = {method: method, headers: headers};
    if (method==="POST" || method==="PUT") {
        config["body"] = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    const result = await response.json();
  
    if (responseok(response, result)) {
        return(result);
    }
}

/* CLOSE ALL DIALOGS CONSISTENTLY */
document.querySelectorAll("dialog button.close").forEach((button) => {
    button.addEventListener("click", (e) => {
        e.target.closest("dialog").close();
    });
});

/*
** RUN SELECTED REPORT AND SHOW DETAILS
*/
const getReport = async (endpoint, report, offset) => {

    const article = output.querySelector("article");
    const status = output.querySelector("footer>*:first-child");

    const query = "?report=" + report + "&offset=" + offset;
    
    callAPI(endpoint, "GET", query)
    .then((data) => {
        const count = showmore.dataset.count ? showmore.dataset.count : data.count;
        if (offset===0) {
            article.replaceChildren();
            article.insertAdjacentHTML('afterbegin',data.article);
            showmore.dataset.endpoint = endpoint;
            showmore.dataset.report = report;
            showmore.dataset.count = data.count;
        } else if (data.article) {            
            article.querySelector("tbody").insertAdjacentHTML('beforeend',data.article);
        }

        const tbody = article.querySelector("tbody");
        if (tbody.childElementCount >= showmore.dataset.count) {
            showmore.classList.add("visually-hidden");
            showmore.disabled = true;
        } else {
            showmore.dataset.offset = data.offset;
        }
        status.textContent = tbody.childElementCount + " / " + count;
    })
    .catch((error) => {
        article.replaceChildren();
        article.insertAdjacentHTML('afterbegin',error);
        article.style.color = "red";
    });
}

/*
** USER CLICKS ACTION BUTTON IN MAIN DROPDOWN
*/
menulist.addEventListener("click", async (e) => {
    const endpoint = e.target.dataset.endpoint;
    const method = e.target.dataset.method;
  
    if (endpoint==="visits/:ID") {
        process_report(endpoint, e.target.dataset.reports.split(";")); } else 
    if (endpoint==="edit-content/:ID/:PAGE") {
        process_edit_content(endpoint); } else
    if (endpoint==="message/:ID/:PAGE") {
        const { process_message } = await import("./deploy_leave_message.min.js");
        process_message(endpoint, method);
    }
})

/*
** COMMON ENTRY POINT FOR HANDLING REPORTS
*/
const process_report = (endpoint,reports) => {
    let buttons="";
    for (let i = 0; i < reports.length; i++) {
        const elements = reports[i].split("|");
        buttons += `<button class="button" type="button" data-report="${elements[0]}" data-endpoint="${endpoint}" data-button-variant="small">${elements[1]}</button>`;
    }
    reportlist.replaceChildren();
    reportlist.insertAdjacentHTML('afterbegin',buttons);
    output.showModal();
    //reportlist.querySelector("button:first-of-type").click();
}

reportlist.addEventListener("click", (e) => {
    const endpoint = e.target.dataset.endpoint;
    const report = e.target.dataset.report;
    getReport(endpoint, report, 0);
})

/*
** "SHOW MORE" REPORT BUTTON. PREVENT DOUBLE CLICKS
*/
output.querySelector("button.show-more").addEventListener("click", (e) => {
    if (e.detail===1) {
        getReport(showmore.dataset.endpoint, showmore.dataset.report, showmore.dataset.offset);
    }
})

/*
**  LEAVE A MESSAGE DIALOG

const process_message = (endpoint,method) => {
    message.showModal();
  
    const messageInput = document.getElementById("messageInput");
    const messageError = document.querySelector(".messageInput-result");
    const sendmessage = message.querySelector(".send");
    const charcounter = message.querySelector(".charcounter");
    const maxchars = messageInput.getAttribute("maxlength");
  
    messageInput.addEventListener("input", (e) => {
        let numOfEnteredChars = messageInput.value.length;
        charcounter.textContent = numOfEnteredChars + "/" + maxchars;

        if (numOfEnteredChars === Number(maxchars)) {
            charcounter.style.color = "red";
        } else {
            charcounter.style.color = "initial";
        }
    });
  
    sendmessage.addEventListener("click", (event) => {
        if (messageInput.validity.valueMissing) {
            messageError.textContent = "You need to enter a message.";
            messageError.style.color = "red";
            return;
        }
        const formData = new FormData(message.querySelector("form"));
        const formObj = Object.fromEntries(formData);
        callAPI(endpoint, method, formObj)
            .then(() => {
                const sendresult = message.querySelector(".send-result");
                sendresult.textContent = "Successfully Sent";
                sendresult.style.color = "green";
                sendmessage.disabled = true;
            })
            .catch((error) => {
                messageError.textContent = error;
                messageError.style.color = "red";
            });
    });
}*/


/*
**  CONTENT WRAPPED IN EDITOR WITH WEBSITE DEPLoYMENT BUTTON.
*/

const handleError = (error) => {
    content.replaceChildren();
    content.insertAdjacentHTML('afterbegin',error);
    output.showModal();
}

let intervalId;

const process_edit_content = async (endpoint) => {
    const CK_CSS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css";
    const CK_JS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.js";

    if (document.querySelector("head > link[href='" + CK_CSS + "']")) {
        return;
    }

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', CK_CSS);
    document.head.appendChild(link);

    let initialdata, last_update;

    await callAPI(endpoint,'GET')
        .then((data) => {
            initialdata = data.html;
            last_update = data.last_update;
        })
        .catch((error) => {
            handleError(error);
            return;
        })
            
    const { ClassicEditor, Essentials, Alignment, Autosave, BlockQuote, Bold, ButtonView, Clipboard, Code, CodeBlock, GeneralHtmlSupport, Heading, HorizontalLine,
            Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageInsert, ImageInsertViaUrl,
            Italic, Link, List, Paragraph, Plugin, SelectAll, SourceEditing, Underline, WordCount
            } = await import(CK_JS)
            .catch((error) => {
                handleError(error);
                return;
            })

    class Deploy extends Plugin {
        init() {
            const editor = this.editor;
            editor.ui.componentFactory.add( 'deploy', () => {
                const button = new ButtonView();
                button.set( {
                    label: 'DEPLOY',
                    class: 'deploy-website',
                    tooltip: 'Deploy website',
                    withText: true
                } );
                return button;
            } );
        }
    }

    const editor = await ClassicEditor.create( document.querySelector( '#editor' ), {
        plugins: [ Essentials,  Alignment, Autosave, BlockQuote, Bold, Clipboard, Code, CodeBlock, Deploy, GeneralHtmlSupport, Heading, HorizontalLine, 
                    Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageInsertViaUrl, Italic, Link, List, Paragraph, 
                    SelectAll, SourceEditing, Underline, WordCount ],
        toolbar: ['heading', '|', 'undo', 'redo', 'selectAll', '|', 'horizontalLine', 'bold', 'italic', 'underline', 'code', 'alignment', 'link', 
                    'bulletedList', 'numberedList', 'blockQuote','codeBlock','insertImage', 'sourceEditing', '|', 'deploy'],
        initialData: initialdata,
        alignment: {
          options: [
            {name:'left', className: 'align-left'},
            {name:'right', className: 'align-right'},
            {name:'center', className: 'align-center'},
            {name:'justify', className: 'align-justify'}
          ]
        },
        autosave: {
          waitingTime: 2000,
          save( editor ) {
            return saveData( editor.getData(), endpoint );
          }
        },
        codeBlock: {
          languages: [
            { language: 'css', label: 'CSS' },
            { language: 'html', label: 'HTML' },
            { language: 'javascript', label: 'Javascript' },
            { language: 'sql', label: 'SQL' },
            { language: 'plsql', label: 'PL/SQL' },
            { language: 'shell', label: 'shell' }
          ]
        },
        htmlSupport: {
          allow: [
            {
              name: /.*/,
              attributes: true,
              classes: true,
              styles: false
            }
          ]
        },
        image: {
          insert: {
            type: 'auto',
            integrations: ['url']
          },
          toolbar: [
            'imageStyle:inline',
            'imageStyle:block',
            '|',
            'imageStyle:wrapText',
            '|',
            'toggleImageCaption',
            'imageTextAlternative',
          ]
        },
        list: {
          properties: {
            styles: true,
            startIndex: true,
            reversed: true
          }
        },
        placeholder: 'Enter content',
        title: {
          placeholder: 'New title'
        },
        ui: {
          viewportOffset: {
            top: 0
          }
        },
        wordCount: {
          displayCharacters: true
        },
    })
    .catch( error => {
        handleError(error);
    });

    /* Configure word count plugin and position at bottom of ediitor */
    const wordCountPlugin = editor.plugins.get( 'WordCount' );
    const wordCountWrapper = document.querySelector( '.ck-editor__main' );
    wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer );

    /* Put editor status element at end of the toolbar. Initialize with last updated */
    const toolbar = document.querySelector(".ck-toolbar__items");
    toolbar.insertAdjacentHTML('afterend','<span id="editor-status"></span>');
    document.querySelector("#editor-status").textContent = last_update;

    /* Listen for DEPLOY requests */
    toolbar.querySelector(".deploy-website").addEventListener("click", () => {
        deploy_website();
    });

    /* Hide all other elements in <main> when in Editor mode */
    document.querySelectorAll("main > *:not(.ck)").forEach ((ele) => {
        ele.style.display = "none";
    })
    
    dropdown.removeAttribute("open");
}

/*
** SAVE CHANGED DATA TO SERVER
*/
const saveData = async ( data, endpoint ) => {
    const word_count = document.querySelector(".ck-word-count__words").textContent;
    const editor_status = document.querySelector("#editor-status");

    editor_status.textContent = "...";

    callAPI(endpoint,'PUT', {body_html: data, word_count: word_count})
        .then((data) => {
            editor_status.textContent = data.message;
        })
        .catch((error) => {
            handleError(error);
        })
}

/*
** USER CLICKS DEPLOY BUTTON
*/
const deploy_website = async () => {
    callAPI("deploy-website/:ID","POST",{})
        .then( (data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.content);
            showmore.classList.add("visually-hidden");
            output.showModal();
            if (data.stop) return;
            if (intervalId) {
                clearInterval(intervalId);
            }
            intervalId = setInterval(getDeploymentStatus,2000);
        })
        .catch((error) => {
            handleError(error);
        });;
}

/*
** RETRIEVE AND SHOW DEPLOYMENT STATUS FROM SERVER
*/
const getDeploymentStatus = () => {
    callAPI("deploy-website/:ID","GET")
        .then( (data) => {
            if (data.content) {
                content.querySelector(".deploy").insertAdjacentHTML('beforeend',data.content);
            }
            if (data.completed) {
                clearInterval(intervalId);
            }
        })
        .catch((error) => {
            handleError(error);
        })
}