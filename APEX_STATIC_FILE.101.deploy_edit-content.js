/*
** EDIT CONTENT - WRAP CONTENT OF <main> IN CKEDITOR
** INCLUDE DEPLOY BUTTON IN CKEDITOR TOOLBAR
*/

import { dropdown_details, header } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

const CK_CSS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css";
const CK_JS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.js";

const info_dialog = document.querySelector("dialog.info");

let endpoint, intervalId;

export const init = async (element) => {
    if (document.querySelector("head > link[href='" + CK_CSS + "']")) {
        return;
    }
    
    endpoint = element.dataset.endpoint;
    
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
                    tooltip: 'Select Uploaded Image',
                    withText: true
                } );
                return button;
            } );
        }
    }
    
    /* Configure CKEDITOR */
    let editor;

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
        show_media("copy");
    });

    /* Listen for DEPLOY requests */
    const toolbar = document.querySelector(".ck-toolbar");
    toolbar.querySelector(".deploy-website").addEventListener("click", () => {
        dropdown_details.querySelector("button.publish-website").click();
    });

    /* Hide all other elements in <main> when in Editor mode */
    document.querySelectorAll("main > *:not(.ck)").forEach ((ele) => {
        ele.style.display = "none";
    })
    
    dropdown_details.removeAttribute("open");

    document.querySelector("#editor").scrollIntoView({ behavior: 'smooth', block: 'end' });
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
** USER CLICKS MEDIA BUTTON. SHOW LIST OF MEDIA. ALLOW USER TO COPY URL
*/
export const show_media = async (request) => {
    callAPI("upload-media/:ID/:PAGE","GET","?request="+request)
        .then( (data) => {
            info_dialog.querySelector("header>h4").textContent = data.heading;

            const media = info_dialog.querySelector("article");
            media.replaceChildren();
            media.insertAdjacentHTML('afterbegin',data.thumbnails);
            info_dialog.showModal();

            switch (request) {
                case "copy":
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
                    break;
                case "hero":
                    media.querySelectorAll(".copy-url").forEach( (button) => {
                        button.addEventListener("click", async (e) => {
                            const hero_asset_id = e.target.closest("li").dataset.id;
                            callAPI("edit-header/:ID","POST",{hero_asset_id: hero_asset_id})
                                .then( (data) => {
                                    header.querySelector("img")?.remove();
                                    header.querySelector("div").insertAdjacentHTML('afterbegin',data.img);
                                })
                                .catch((error) => {
                                    handleError(error);
                                })
                        });
                    });
                    break;
                }
        })
        .catch((error) => {
            handleError(error);
        });
}