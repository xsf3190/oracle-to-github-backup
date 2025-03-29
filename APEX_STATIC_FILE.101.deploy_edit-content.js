/*
** EDIT CONTENT - WRAP CONTENT OF <main> IN CKEDITOR
** INCLUDE DEPLOY BUTTON IN CKEDITOR TOOLBAR
*/

import { dropdown_details } from "./deploy_elements.min.js";
import { callAPI, handleError } from "./deploy_callAPI.min.js";

const CK_CSS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css";
const CK_JS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.js";

const info_dialog = document.querySelector("dialog.info");

let endpoint, intervalId;

export const init = async (element) => {
    if (document.querySelector("head > link[href='" + CK_CSS + "']")) {
        return;
    }

    if (!document.querySelector("head > link[href='/website_edit.min.css']")) {
        const link_edit = document.createElement('link');
        link_edit.setAttribute('rel', 'stylesheet');
        link_edit.setAttribute('href', '/website_edit.css');
        document.head.appendChild(link_edit);
    }
    
    endpoint = element.dataset.endpoint;
    
    /* Get user role (owner or admin) */
    const arrayToken = localStorage.getItem("refresh").split(".");
    const parsedToken = JSON.parse(atob(arrayToken[1]));
    const aud = parsedToken.aud;
    
    /* Add CKEDITOR CSS to document <head> */
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', CK_CSS);
    document.head.appendChild(link);

    /* Get html and last updated date for <main> section of current page */
    let initialdata, last_update;
    await callAPI(endpoint,'GET')
        .then((data) => {
            if (data.html.startsWith('<article class="flow">')) {
                initialdata = data.html;
            } else {
                initialdata = "<article class='flow'>" + data.html + "</article>";
            }
            last_update = data.last_update;
        })
        .catch((error) => {
            handleError(error);
            return;
        });
    
    /* Get apprpriate set of plugins from CKEDITOR CDN */
    const { ClassicEditor, Essentials, Alignment, Autosave, BlockQuote, Bold, ButtonView, Clipboard, Code, CodeBlock, FontColor, GeneralHtmlSupport, Heading, HorizontalLine,
            Image, ImageCaption, ImageResize, ImageStyle, ImageToolbar, ImageInsert, ImageInsertViaUrl,
            Italic, Link, List, Paragraph, Plugin, SelectAll, SourceEditing, Underline, WordCount
            } = await import(CK_JS)
            .catch((error) => {
                handleError(error);
                return;
            })
    
    /* Add PUBLISH button to CKEDITOR toolbar */
    class Deploy extends Plugin {
        init() {
            const editor = this.editor;
            editor.ui.componentFactory.add( 'deploy', () => {
                const button = new ButtonView();
                button.set( {
                    label: 'PUBLISH',
                    class: 'deploy-website',
                    tooltip: 'Deploy website',
                    withText: true
                } );
                return button;
            } );
        }
    }

    /* Add MEDIA button to CKEDITOR toolbar */
    class Media extends Plugin {
        init() {
            const editor = this.editor;
            editor.ui.componentFactory.add( 'media', () => {
                const button = new ButtonView();
                button.set( {
                    label: 'MEDIA',
                    class: 'show-media',
                    tooltip: 'Show Uploaded Media',
                    withText: true
                } );
                return button;
            } );
        }
    }
    
    /* Configure CKEDITOR */
    let editor;
    switch (aud) {
        case 'admin':
            editor = await ClassicEditor.create( document.querySelector( '#editor' ), {
                plugins: [ Essentials,  Alignment, Autosave, BlockQuote, Bold, Clipboard, Code, CodeBlock,  
                           Deploy, FontColor, GeneralHtmlSupport, Heading, HorizontalLine, 
                           Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageInsertViaUrl, 
                           Italic, Link, List, Media, Paragraph, 
                           SelectAll, SourceEditing, Underline, WordCount ],
                toolbar: [ 'heading', '|', 'undo', 'redo', 'selectAll', '|', 'horizontalLine', 'bold', 'italic', 'fontColor',
                           'underline', 'code', 'alignment', 'link', 
                            'bulletedList', 'numberedList', 'blockQuote','codeBlock','insertImage', 'sourceEditing', '|', 'media'],
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
            
            break;
            
        case 'owner':
            editor = await ClassicEditor.create( document.querySelector( '#editor' ), {
                plugins: [ Essentials, Alignment, Autosave, BlockQuote, Bold, Clipboard,
                           Deploy, GeneralHtmlSupport, Heading, HorizontalLine,
                           Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageInsertViaUrl,  
                           Italic, Link, List, Media, Paragraph, 
                           SelectAll, Underline, WordCount ],
                toolbar: [ 'heading', '|', 'undo', 'redo', 'selectAll', '|', 'horizontalLine', 'bold', 'italic',
                           'underline', 'alignment', 'link', 
                           'bulletedList', 'numberedList', 'blockQuote', 'insertImage', '|', 'media'],
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
                list: {
                  properties: {
                    styles: true,
                    startIndex: true,
                    reversed: true
                  }
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
            
            break;
    }

    /* Configure word count plugin and position at bottom of ediitor */
    const wordCountPlugin = editor.plugins.get( 'WordCount' );
    const wordCountWrapper = document.querySelector( '.ck-editor__main' );
    wordCountWrapper.appendChild(wordCountPlugin.wordCountContainer );

    /* Put editor status element at end of the toolbar */
    const toolbar_items = document.querySelector(".ck-toolbar__items");
    toolbar_items.insertAdjacentHTML('afterend','<button type="button" class="button deploy-website">PUBLISH</button><span id="editor-status"></span>');
    
    /* Put Last Update date in editor status element */
    document.querySelector("#editor-status").textContent = last_update;

    /* Listen for request to show MEDIA  */
    toolbar_items.querySelector(".show-media").addEventListener("click", () => {
        show_media();
    });

    /* Listen for DEPLOY requests */
    const toolbar = document.querySelector(".ck-toolbar");
    toolbar.querySelector(".deploy-website").addEventListener("click", () => {
        deploy_website();
    });

    /* Hide all other elements in <main> when in Editor mode */
    document.querySelectorAll("main > *:not(.ck)").forEach ((ele) => {
        ele.style.display = "none";
    })
    
    dropdown_details.removeAttribute("open");
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
** USER CLICKS MEDIA BUTTON. SHOW LIST OF MEDIA. ALLOW USER T COPY URL AND DELETE.
*/
const show_media = async () => {
    callAPI("cloudinary/:ID/:PAGE","GET","?request=list")
        .then( (data) => {
            const header = info_dialog.querySelector("header>h4");
            header.textContent = data.heading;

            const media = info_dialog.querySelector("article");
            media.replaceChildren();
            media.insertAdjacentHTML('afterbegin',data.thumbnails);
            info_dialog.showModal();
            /*
            const dialog = info_dialog.getBoundingClientRect();
            const aside = document.querySelector("aside").getBoundingClientRect();

            console.log("dialog.height:",dialog.height);
            console.log("aside.bottom:",aside.bottom);
            console.log("window.innerHeight:",window.innerHeight);

            const top = (window.innerHeight - dialog.height - aside.bottom)*-1;
            console.log("top",top);
            
            info_dialog.style.top = `${top}`+"px";
            */

            media.querySelectorAll(".copy-url").forEach( (button) => {
                button.addEventListener("click", async (e) => {
                    const src = e.target.closest("li").querySelector("img").src;
                    try {
                        await navigator.clipboard.writeText(src);
                        media.querySelectorAll(".copied").forEach((copied) => {
                          copied.textContent = "COPY";
                          copied.classList.toggle("copied");
                        });
                        if (e.target.textContent = "COPY") {
                          e.target.textContent = "copied";
                          e.target.classList.toggle("copied");
                        }
                    } catch (error) {
                        handleError(error);
                    }
                });
            });
            media.querySelectorAll(".delete-media").forEach( (button) => {
                button.addEventListener("click", async (e) => {
                    const asset = e.target.closest("li");
                    callAPI("cloudinary/:ID/:PAGE","DELETE",{asset_id:asset.dataset.id})
                    .then( () => {
                        asset.remove();
                    })
                    .catch((error) => {
                        handleError(error);
                    });
                });
            });
        })
        .catch((error) => {
            handleError(error);
        });
}

/*
** USER CLICKS DEPLOY BUTTON
*/
export const deploy_website = async () => {
    if (info_dialog.open) {
        info_dialog.close();
    }
    const content = info_dialog.querySelector("article");
    callAPI("publish-website/:ID","POST",{})
        .then( (data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.content);
            info_dialog.showModal();
            if (data.stop) return;
            if (intervalId) {
                clearInterval(intervalId);
            }
            info_dialog.addEventListener("close", () => {
                window.location.reload();
            })
            intervalId = setInterval(getDeploymentStatus,2000);
        })
        .catch((error) => {
            handleError(error);
        });;
}

/*
** SHOW NETLIFY DEPLOYMENT PROGRESS
*/
const getDeploymentStatus = () => {
    callAPI("publish-website/:ID","GET")
        .then( (data) => {
            if (data.content) {
                info_dialog.querySelector(".deploy").insertAdjacentHTML('beforeend',data.content);
                info_dialog.querySelector(".deploy>li:last-child").scrollIntoView();
            }
            if (data.completed) {
                clearInterval(intervalId);
            }
        })
        .catch((error) => {
            handleError(error);
        })
}