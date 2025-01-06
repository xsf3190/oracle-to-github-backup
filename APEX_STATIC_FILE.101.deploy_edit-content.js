/*
** EDIT CONTENT - WRAP CONTENT OF <main> IN CKEDITOR
** INCLUDE DEPLOY BUTTON IN CKEDITOR TOOLBAR
*/

import { output_dialog, dropdown_details } from "./deploy_elements.min.js";
import { callAPI } from "./deploy_callAPI.min.js";

const CK_CSS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css";
const CK_JS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.js";

let endpoint, intervalId;

const handleError = (error) => {
    const article = output_dialog.querySelector("article");
    article.replaceChildren();
    article.insertAdjacentHTML('afterbegin',error);
    output_dialog.showModal();
}

export const init = async (element) => {
    if (document.querySelector("head > link[href='" + CK_CSS + "']")) {
        return;
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
            initialdata = data.html;
            last_update = data.last_update;
        })
        .catch((error) => {
            handleError(error);
            return;
        });
    
    /* Get apprpriate set of plugins from CKEDITOR CDN */
    const { ClassicEditor, Essentials, Alignment, Autosave, BlockQuote, Bold, ButtonView, Clipboard, Code, CodeBlock, GeneralHtmlSupport, Heading, HorizontalLine,
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
                           Deploy, GeneralHtmlSupport, Heading, HorizontalLine, 
                           Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageInsertViaUrl, 
                           Italic, Link, List, Media, Paragraph, 
                           SelectAll, SourceEditing, Underline, WordCount ],
                toolbar: [ 'heading', '|', 'undo', 'redo', 'selectAll', '|', 'horizontalLine', 'bold', 'italic',
                           'underline', 'code', 'alignment', 'link', 
                            'bulletedList', 'numberedList', 'blockQuote','codeBlock','insertImage', 'sourceEditing', '|', 'media', '|', 'deploy'],
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
                plugins: [ Essentials,  Alignment, Autosave, BlockQuote, Bold, Clipboard,
                           Deploy, GeneralHtmlSupport, Heading, HorizontalLine, 
                           Italic, Link, List, Media, Paragraph, 
                           Underline, WordCount ],
                toolbar: [ 'heading', '|', 'undo', 'redo', '|', 'horizontalLine', 'bold', 'italic',
                           'underline', 'alignment', 'link', 
                           'bulletedList', 'numberedList', 'blockQuote', '|', 'media', '|', 'deploy'],
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

    /* Put editor status element at end of the toolbar. Initialize with last updated */
    const toolbar = document.querySelector(".ck-toolbar__items");
    toolbar.insertAdjacentHTML('afterend','<span id="editor-status"></span>');
    document.querySelector("#editor-status").textContent = last_update;

    /* Listen for request to show MEDIA  */
    toolbar.querySelector(".show-media").addEventListener("click", () => {
        show_media();
    });

    /* Listen for DEPLOY requests */
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
** USER CLICKS MEDIA BUTTON
*/
const show_media = async () => {
    const content = output_dialog.querySelector("article");
    const showmore = output_dialog.querySelector(".show-more");
    callAPI("cloudinary/:ID/:PAGE","GET","?request=list")
        .then( (data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.thumbnails);
            showmore.classList.add("visually-hidden");
            output_dialog.showModal();
        })
        .catch((error) => {
            handleError(error);
        });;
}

/*
** USER CLICKS DEPLOY BUTTON
*/
const deploy_website = async () => {
    const content = output_dialog.querySelector("article");
    const showmore = output_dialog.querySelector(".show-more");
    callAPI("deploy-website/:ID","POST",{})
        .then( (data) => {
            content.replaceChildren();
            content.insertAdjacentHTML('afterbegin',data.content);
            showmore.classList.add("visually-hidden");
            output_dialog.showModal();
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
** SHOW NETLIFY DEPLOYMENT PROGRESS
*/
const getDeploymentStatus = () => {
    callAPI("deploy-website/:ID","GET")
        .then( (data) => {
            if (data.content) {
                output_dialog.querySelector(".deploy").insertAdjacentHTML('beforeend',data.content);
            }
            if (data.completed) {
                clearInterval(intervalId);
            }
        })
        .catch((error) => {
            handleError(error);
        })
}