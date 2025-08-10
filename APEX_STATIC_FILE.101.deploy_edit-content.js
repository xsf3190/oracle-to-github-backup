/*
** EDIT CONTENT - WRAP CONTENT OF <main> IN CKEDITOR
** INCLUDE DEPLOY BUTTON IN CKEDITOR TOOLBAR
*/

import { output_dialog } from "deploy_elements";
import { callAPI, handleError } from "deploy_callAPI";

const CK_CSS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.css";
const CK_JS = "https://cdn.ckeditor.com/ckeditor5/43.2.0/ckeditor5.js";

let endpoint;

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
            Italic, Link, List, MenuBarMenuListItemButtonView, Paragraph, Plugin, SelectAll, ShowBlocks, SourceEditing, Underline, WordCount
            } = await import(CK_JS)
            .catch((error) => {
                handleError(error);
                return;
            })

    /* Add "Upload Image" button to toolbar */
    class UploadImage extends Plugin {
        init() {
            const editor = this.editor;
            editor.ui.componentFactory.add( 'uploadImage', () => {
                const button = new ButtonView();
                button.set( {
                    label: 'Upload Image',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M1.201 1C.538 1 0 1.47 0 2.1v14.363c0 .64.534 1.037 1.186 1.037h9.494a3 3 0 0 1-.414-.287 3 3 0 0 1-1.055-2.03 3 3 0 0 1 .693-2.185l.383-.455-.02.018-3.65-3.41a.695.695 0 0 0-.957-.034L1.5 13.6V2.5h15v5.535a2.97 2.97 0 0 1 1.412.932l.088.105V2.1c0-.63-.547-1.1-1.2-1.1zm11.713 2.803a2.146 2.146 0 0 0-2.049 1.992 2.14 2.14 0 0 0 1.28 2.096 2.13 2.13 0 0 0 2.644-3.11 2.13 2.13 0 0 0-1.875-.978"/><path d="M15.522 19.1a.79.79 0 0 0 .79-.79v-5.373l2.059 2.455a.79.79 0 1 0 1.211-1.015l-3.352-3.995a.79.79 0 0 0-.995-.179.8.8 0 0 0-.299.221l-3.35 3.99a.79.79 0 1 0 1.21 1.017l1.936-2.306v5.185c0 .436.353.79.79.79"/><path d="M15.522 19.1a.79.79 0 0 0 .79-.79v-5.373l2.059 2.455a.79.79 0 1 0 1.211-1.015l-3.352-3.995a.79.79 0 0 0-.995-.179.8.8 0 0 0-.299.221l-3.35 3.99a.79.79 0 1 0 1.21 1.017l1.936-2.306v5.185c0 .436.353.79.79.79"/></svg>',
                    tooltip: 'Upload Image',
                    withText: false
                } );
                button.on('execute', (_) => {
                    import("deploy_upload-media")
                    .then((module) => {
                        module.init();
                    })
                    .catch((error) => {
                        console.error(error);
                        console.error("Failed to load module deploy_upload-media");
                    });
                });
                return button;
            } );
        }
    }
    
    /* Add "List Images" button to toolbar */
    class ListImages extends Plugin {
        init() {
            const editor = this.editor;
            editor.ui.componentFactory.add( 'listImages', () => {
                const button = new ButtonView();
                button.set( {
                    label: 'List Image URLs',
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" fill="white" stroke="black" stroke-width="20"/><text x="10" y="70" fill="red" font-size="40" font-weight="900" font-family="system-ui">URL</text>',
                    tooltip: 'List Image URLs',
                    withText: false
                } );
                button.on('execute', (_) => {
                    callAPI("upload-media/:ID/:PAGE","GET","?request=image")
                    .then( (data) => {
                        const heading = output_dialog.querySelector("header>:first-child");
                        heading.textContent = data.heading;

                        const article = output_dialog.querySelector("article");
                        article.replaceChildren();
                        article.insertAdjacentHTML('afterbegin',data.thumbnails);
                        
                        const footer = output_dialog.querySelector("footer");
                        footer.replaceChildren();
                        footer.insertAdjacentHTML('afterbegin',"<span>" + article.querySelector(".carousel").childElementCount + " images</span>");

                        output_dialog.showModal();

                        article.querySelectorAll("button").forEach( (button) => {
                            button.addEventListener("click", async (e) => {
                                article.querySelectorAll(".copied").forEach( (copied) => {
                                    copied.classList.toggle("copied");
                                });
                                e.target.closest("li").classList.toggle("copied");
                                try {
                                    await navigator.clipboard.writeText(e.target.src);
                                } catch (error) {
                                    handleError(error);
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        handleError(error);
                    });
                });
                return button;
            } );
        }
    }

    /* Configure CKEDITOR */
    let editor;

    editor = await ClassicEditor.create( document.querySelector( '#editor' ), {
        plugins: [ Essentials,  Alignment, Autosave, BlockQuote, Bold, Clipboard, Code, CodeBlock,  
                    FontColor, GeneralHtmlSupport, Heading, HorizontalLine, 
                    Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageInsert, ImageInsertViaUrl, 
                    Italic, Link, List, ListImages, Paragraph, 
                    SelectAll, ShowBlocks, SourceEditing, Underline, UploadImage, WordCount ],
        toolbar: [ 'heading', '|', 'undo', 'redo',  '|', 'bold', 'italic',
                    'link', 
                    'bulletedList', 'numberedList', '|', 'uploadImage', 'listImages', 'insertImage'],
        menuBar: {
            isVisible: true
        },
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
    toolbar_items.insertAdjacentHTML('afterend','<span id="editor-status"></span>');
    
    /* Put Last Update date in editor status element */
    document.querySelector("#editor-status").textContent = last_update;

    /* Listen for request to show MEDIA  */
    // toolbar_items.querySelector(".show-media").addEventListener("click", () => {
        // show_media("copy");
    // });

    /* Hide all other elements in <main> when in Editor mode */
    document.querySelectorAll("main > *:not(.ck)").forEach ((ele) => {
        ele.style.display = "none";
    })

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
