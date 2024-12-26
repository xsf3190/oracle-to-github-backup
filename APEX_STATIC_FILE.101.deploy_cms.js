/*
** LOGIN THROUGH EMAIL. REQUESTS FOR PASSCODE AND MAGIC LINK SUPPORTED.
** ACCESS CONTROLLED USING REFRESH AND ACCESS TOKENS (JWT)
*/
//import "https://codepen.io/xsf3190/pen/ByBQrGV.js"

let access_token = sessionStorage.getItem("token");
let refresh_token = localStorage.getItem("refresh");

const bodydata = document.body.dataset;
const menulist = document.querySelector(".dropdown .menulist");
const output = document.querySelector("dialog.output");
const reportlist = output.querySelector("header > ul");
const showmore = output.querySelector(".show-more");
const message = document.querySelector("dialog.message");

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
      throw Error(`${response.status} - ${result.cause}`);
    }
    if (result.sqlcode) {
      throw Error(`${response.status} - ${result.sqlerrm}`);
    } else {
      throw Error(`${result.message}`);
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
menulist.addEventListener("click", (e) => {
    const endpoint = e.target.dataset.endpoint;
    const method = e.target.dataset.method;
  
    if (endpoint==="visits/:ID") {
        process_report(endpoint, e.target.dataset.reports.split(";")); } else 
    if (endpoint==="edit-content/:ID/:PAGE") {
        process_edit_content(endpoint); } else
    if (endpoint==="message/:ID/:PAGE") {
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
*/
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
}

/*
**  SHOW CMS EDITOR
*/
let editor, editor_status, editor_status_text, editor_endpoint, intervalId

const process_edit_content = async (endpoint) => {
    if (document.querySelector("head > link[href='https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css']")) {
        return;
    }
    editor_endpoint = endpoint;

    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', 'https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css');
    document.head.appendChild(link);

    let initialdata, last_update;

    await callAPI(editor_endpoint,'GET')
        .then((data) => {
            initialdata = data.html;
            last_update = data.last_update;
        })
        .catch((error) => {
            console.error(error);
            return;
        })
            
    const { ClassicEditor, Essentials, Alignment, Autosave, BlockQuote, Bold, ButtonView, Clipboard, Code, CodeBlock, GeneralHtmlSupport, Heading, HorizontalLine,
            Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageInsert, ImageInsertViaUrl,
            Italic, Link, List, Paragraph, Plugin, SelectAll, SourceEditing, Underline, WordCount
            } = await import("https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.js");

    class Deploy extends Plugin {
        init() {
            const editor = this.editor;
            // The button must be registered among the UI components of the editor
            // to be displayed in the toolbar.
            editor.ui.componentFactory.add( 'deploy', () => {
                // The button will be an instance of ButtonView.
                const button = new ButtonView();

                button.set( {
                    label: 'Deploy',
                    class: 'deploy-website',
                    tooltip: 'Deploy website',
                    withText: true
                } );

                return button;
            } );
        }
    }

    ClassicEditor.create( document.querySelector( '#editor' ), {
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
            return saveData( editor.getData() );
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
        .then( newEditor => {
            editor = newEditor;
            const wordCountPlugin = editor.plugins.get( 'WordCount' );
            const wordCountWrapper = document.querySelector( '.ck-editor__main' );
            wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer );
            const toolbar = document.querySelector(".ck-toolbar__items");
            toolbar.insertAdjacentHTML('afterend','<span id="editor-status"></span>');
            toolbar.querySelector(".deploy-website").addEventListener("click", () => {
                deploy_website();
            })
            editor_status = "init";
            editor_status_text = document.querySelector("#editor-status");
            editor_status_text.textContent = last_update;
            //editor.enableReadOnlyMode( 'lock-id' );
    })
        .catch( error => {
            console.error(error);
    });
}

const saveData = async ( data ) => {
    if (editor_status==="init") {
        editor_status="ok";
        return Promise.resolve();
    }

    editor_status_text.textContent = "...";

    const word_count = document.querySelector(".ck-word-count__words").textContent;

    callAPI(editor_endpoint,'PUT', {body_html: data, word_count: word_count})
        .then((data) => {
            editor_status_text.textContent = data.message;
            //editor_status_text.style.color = "green";
        })
        .catch((error) => {
            console.error(error);
            return;
        })
}

const deploy_website = async () => {
    await callAPI("deploy-website/:ID","POST").then( (data) => {
        content.replaceChildren();
        content.insertAdjacentHTML('afterbegin',data.content);
        content.showModal();
        if (data.stop) return;
        if (gIntervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(getDeploymentStatus,2000);
    });
}

const getDeploymentStatus = () => {
    callAPI("deploy-website/:ID","GET").then( (data) => {
        if (data.content) {
            content.querySelector("article").insertAdjacentHTML('beforeend',data.content);
        }
        /*
        if (data.completed) {
            clearInterval(intervalId);
            const a = websiteNav.querySelector("a"),
                  domain = a.textContent;
                  
            if (!a.hasAttribute("href")) {
                if (env==="TEST") {
                    a.href = "https://" + domain + ".netlify.app";
                } else {
                    a.href = "https://" + domain;
                }
            }
        }
        */
    });
}